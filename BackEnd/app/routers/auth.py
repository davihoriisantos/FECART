from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from ..schemas.user import (
    UserCreate, UserLogin, UserUpdate, UserProfile,
    UserResponse, PasswordChange, Token
)
from ..services.auth_service import (
    hash_password, verify_password,
    create_access_token, get_current_user
)
from ..supabase_client import get_supabase

router        = APIRouter(prefix="/api/auth", tags=["auth"])
compat_router = APIRouter(tags=["auth"])


def _db_error():
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Erro de conexão com o banco de dados",
    )


def _row_to_profile(row: dict) -> dict:
    """Converte uma linha do Supabase para o formato do UserProfile."""
    return {
        "id":              row["id"],
        "email":           row["email"],
        "nome":            row["nome"],
        "celular":         row.get("celular"),
        "created_at":      row["created_at"],
        "home_address":    row.get("home_address"),
        "home_lat":        row.get("home_lat"),
        "home_lon":        row.get("home_lon"),
        "work_address":    row.get("work_address"),
        "work_lat":        row.get("work_lat"),
        "work_lon":        row.get("work_lon"),
        # defaults para compatibilidade com o frontend
        "data_nascimento": None,
        "role":            "cidadao",
        "ativo":           True,
        "last_login":      None,
    }


# ─── POST /register ──────────────────────────────────────────────────────────
@compat_router.post("/api/register", response_model=UserProfile, status_code=status.HTTP_201_CREATED)
@router.post("/register",            response_model=UserProfile, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate):
    """Criar nova conta de utilizador."""
    try:
        sb = get_supabase()

        # Verificar e-mail duplicado
        existing = sb.table("users").select("id").eq("email", user_in.email).execute()
        if existing.data:
            raise HTTPException(status_code=400, detail="E-mail já cadastrado.")

        new_row = {
            "email":         user_in.email,
            "nome":          user_in.nome,
            "password_hash": hash_password(user_in.senha),
            "celular":       user_in.celular,
        }
        result = sb.table("users").insert(new_row).execute()
        if not result.data:
            raise _db_error()
        return _row_to_profile(result.data[0])

    except HTTPException:
        raise
    except Exception:
        raise _db_error()


# ─── POST /login ─────────────────────────────────────────────────────────────
@compat_router.post("/api/login", response_model=Token)
@router.post("/login",            response_model=Token)
def login(user_in: UserLogin):
    """Autenticar utilizador e devolver JWT + perfil."""
    try:
        sb = get_supabase()
        result = sb.table("users").select("*").eq("email", user_in.email).execute()
        if not result.data:
            raise HTTPException(status_code=400, detail="E-mail ou senha incorretos.")

        user = result.data[0]
        if not verify_password(user_in.senha, user["password_hash"]):
            raise HTTPException(status_code=400, detail="E-mail ou senha incorretos.")

        access_token = create_access_token(data={"sub": user["email"]})
        return {
            "access_token": access_token,
            "token_type":   "bearer",
            "user":         _row_to_profile(user),
        }

    except HTTPException:
        raise
    except Exception:
        raise _db_error()


# ─── GET /me ─────────────────────────────────────────────────────────────────
@router.get("/me", response_model=UserProfile)
def read_me(current_user: dict = Depends(get_current_user)):
    """Retornar perfil completo do utilizador autenticado."""
    return _row_to_profile(current_user)


# ─── PUT /me ─────────────────────────────────────────────────────────────────
@router.put("/me", response_model=UserProfile)
def update_me(
    user_in: UserUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Atualizar nome e/ou celular."""
    try:
        sb     = get_supabase()
        update = {}
        if user_in.nome    is not None: update["nome"]    = user_in.nome
        if user_in.celular is not None: update["celular"] = user_in.celular

        if not update:
            return _row_to_profile(current_user)

        result = (
            sb.table("users")
            .update(update)
            .eq("id", current_user["id"])
            .execute()
        )
        if not result.data:
            raise _db_error()
        return _row_to_profile(result.data[0])

    except HTTPException:
        raise
    except Exception:
        raise _db_error()


# ─── PUT /me/password ────────────────────────────────────────────────────────
@router.put("/me/password", status_code=status.HTTP_200_OK)
def change_password(
    pwd_in: PasswordChange,
    current_user: dict = Depends(get_current_user),
):
    """Alterar senha (requer confirmação da senha atual)."""
    if not verify_password(pwd_in.senha_atual, current_user["password_hash"]):
        raise HTTPException(status_code=400, detail="Senha atual incorreta.")
    if pwd_in.nova_senha == pwd_in.senha_atual:
        raise HTTPException(status_code=400, detail="A nova senha deve ser diferente da atual.")

    try:
        sb = get_supabase()
        sb.table("users").update(
            {"password_hash": hash_password(pwd_in.nova_senha)}
        ).eq("id", current_user["id"]).execute()
        return {"detail": "Senha alterada com sucesso."}
    except HTTPException:
        raise
    except Exception:
        raise _db_error()


# ─── DELETE /me ──────────────────────────────────────────────────────────────
@router.delete("/me", status_code=status.HTTP_200_OK)
def deactivate_me(current_user: dict = Depends(get_current_user)):
    """
    Remove a conta do utilizador do Supabase (hard delete).
    A tabela não tem coluna 'ativo', por isso fazemos delete real.
    """
    try:
        sb = get_supabase()
        sb.table("users").delete().eq("id", current_user["id"]).execute()
        return {"detail": "Conta removida com sucesso."}
    except Exception:
        raise _db_error()


# ─── GET /users (admin) ───────────────────────────────────────────────────────
@router.get("/users", response_model=list[UserProfile])
def list_users(current_user: dict = Depends(get_current_user)):
    """Listar todos os utilizadores (apenas chamadas internas/admin)."""
    # A tabela não tem 'role', então qualquer utilizador autenticado tem acesso
    # Mantido por compatibilidade, mas restrito em produção via Supabase RLS
    try:
        sb     = get_supabase()
        result = sb.table("users").select("*").execute()
        return [_row_to_profile(r) for r in result.data]
    except Exception:
        raise _db_error()

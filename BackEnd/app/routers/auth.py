from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.user import User
from ..schemas.user import (
    UserCreate, UserLogin, UserUpdate, UserProfile,
    UserResponse, PasswordChange, Token
)
from ..services.auth_service import (
    hash_password, verify_password,
    create_access_token, get_current_user
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


# ─── POST /register ──────────────────────────────────────────────────────────
@router.post("/register", response_model=UserProfile, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    """Criar nova conta de usuário."""
    if db.query(User).filter(User.email == user_in.email).first():
        raise HTTPException(status_code=400, detail="E-mail já cadastrado.")

    new_user = User(
        email           = user_in.email,
        nome            = user_in.nome,
        hashed_password = hash_password(user_in.senha),
        celular         = user_in.celular,
        data_nascimento = user_in.data_nascimento,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


# ─── POST /login ─────────────────────────────────────────────────────────────
@router.post("/login", response_model=Token)
def login(user_in: UserLogin, db: Session = Depends(get_db)):
    """Autenticar usuário e retornar JWT + perfil completo."""
    user = db.query(User).filter(User.email == user_in.email).first()
    if not user or not verify_password(user_in.senha, user.hashed_password):
        raise HTTPException(status_code=400, detail="E-mail ou senha incorretos.")
    if not user.ativo:
        raise HTTPException(status_code=403, detail="Conta desativada. Entre em contato com o suporte.")

    # Atualizar last_login
    user.last_login = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)

    access_token = create_access_token(data={"sub": user.email})
    return {
        "access_token": access_token,
        "token_type":   "bearer",
        "user":         user,
    }


# ─── GET /me ─────────────────────────────────────────────────────────────────
@router.get("/me", response_model=UserProfile)
def read_me(current_user: User = Depends(get_current_user)):
    """Retornar perfil completo do usuário autenticado."""
    return current_user


# ─── PUT /me ─────────────────────────────────────────────────────────────────
@router.put("/me", response_model=UserProfile)
def update_me(
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Atualizar dados do perfil (nome, celular, data_nascimento)."""
    if user_in.nome is not None:
        current_user.nome = user_in.nome
    if user_in.celular is not None:
        current_user.celular = user_in.celular
    if user_in.data_nascimento is not None:
        current_user.data_nascimento = user_in.data_nascimento

    db.commit()
    db.refresh(current_user)
    return current_user


# ─── PUT /me/password ────────────────────────────────────────────────────────
@router.put("/me/password", status_code=status.HTTP_200_OK)
def change_password(
    pwd_in: PasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Alterar senha (requer confirmação da senha atual)."""
    if not verify_password(pwd_in.senha_atual, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Senha atual incorreta.")
    if pwd_in.nova_senha == pwd_in.senha_atual:
        raise HTTPException(status_code=400, detail="A nova senha deve ser diferente da atual.")

    current_user.hashed_password = hash_password(pwd_in.nova_senha)
    db.commit()
    return {"detail": "Senha alterada com sucesso."}


# ─── DELETE /me ──────────────────────────────────────────────────────────────
@router.delete("/me", status_code=status.HTTP_200_OK)
def deactivate_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Desativar conta (soft delete — preserva dados no banco)."""
    current_user.ativo = False
    db.commit()
    return {"detail": "Conta desativada com sucesso."}


# ─── GET /users (admin only) ─────────────────────────────────────────────────
@router.get("/users", response_model=list[UserProfile])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Listar todos os usuários (somente admin)."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Acesso restrito a administradores.")
    return db.query(User).all()

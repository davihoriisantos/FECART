from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List

from ..schemas.historico_busca import HistoricoBuscaCreate, HistoricoBuscaOut
from ..services.auth_service import get_current_user
from ..supabase_client import get_supabase

router = APIRouter(prefix="/api/historico", tags=["historico"])

MAX_HISTORY = 50


def _db_error():
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Erro de conexão com o banco de dados",
    )


def _map_history(row: dict) -> dict:
    return {
        "id":               row["id"],
        "usuario_id":       row["user_id"],
        "termo_busca":      row["query_text"],
        "lat":              row.get("lat"),
        "lon":              row.get("lon"),
        "bairro":           None,
        "dados_adicionais": None,
        "criado_em":        row["created_at"],
    }


# ─── POST /busca ──────────────────────────────────────────────────────────────
@router.post("/busca", response_model=HistoricoBuscaOut, status_code=status.HTTP_201_CREATED)
def create_historico_busca(
    busca_in: HistoricoBuscaCreate,
    current_user: dict = Depends(get_current_user),
):
    try:
        sb  = get_supabase()
        uid = current_user["id"]

        # Upsert: se o termo já existe, atualiza lat/lon e timestamp
        existing_res = (
            sb.table("search_history")
            .select("*")
            .eq("user_id", uid)
            .eq("query_text", busca_in.termo_busca.strip())
            .limit(1)
            .execute()
        )

        if existing_res.data:
            existing = existing_res.data[0]
            update_payload: dict = {"created_at": datetime.now(timezone.utc).isoformat()}
            if busca_in.lat is not None: update_payload["lat"] = busca_in.lat
            if busca_in.lon is not None: update_payload["lon"] = busca_in.lon

            upd = (
                sb.table("search_history")
                .update(update_payload)
                .eq("id", existing["id"])
                .execute()
            )
            retorno = upd.data[0] if upd.data else existing
        else:
            ins = sb.table("search_history").insert({
                "user_id":    uid,
                "query_text": busca_in.termo_busca.strip(),
                "lat":        busca_in.lat,
                "lon":        busca_in.lon,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }).execute()
            if not ins.data:
                raise _db_error()
            retorno = ins.data[0]

        # Limita a MAX_HISTORY entradas
        all_ids_res = (
            sb.table("search_history")
            .select("id")
            .eq("user_id", uid)
            .order("created_at", desc=True)
            .execute()
        )
        all_ids = [r["id"] for r in (all_ids_res.data or [])]
        if len(all_ids) > MAX_HISTORY:
            sb.table("search_history").delete().in_("id", all_ids[MAX_HISTORY:]).execute()

        return _map_history(retorno)

    except HTTPException:
        raise
    except Exception:
        raise _db_error()


# ─── GET /busca ───────────────────────────────────────────────────────────────
@router.get("/busca", response_model=List[HistoricoBuscaOut])
def get_historico_busca(
    limit: int = Query(20, le=50),
    current_user: dict = Depends(get_current_user),
):
    try:
        sb = get_supabase()
        res = (
            sb.table("search_history")
            .select("*")
            .eq("user_id", current_user["id"])
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return [_map_history(r) for r in (res.data or [])]
    except Exception:
        raise _db_error()


# ─── DELETE /busca/{id} ───────────────────────────────────────────────────────
@router.delete("/busca/{item_id}")
def delete_historico_busca_item(
    item_id: int,
    current_user: dict = Depends(get_current_user),
):
    try:
        sb = get_supabase()
        # Garante que o item pertence ao utilizador
        check = (
            sb.table("search_history")
            .select("id")
            .eq("id", item_id)
            .eq("user_id", current_user["id"])
            .execute()
        )
        if not check.data:
            raise HTTPException(status_code=404, detail="Item não encontrado")
        sb.table("search_history").delete().eq("id", item_id).execute()
        return {"detail": "Removido com sucesso."}
    except HTTPException:
        raise
    except Exception:
        raise _db_error()


# ─── DELETE /busca (limpar tudo) ──────────────────────────────────────────────
@router.delete("/busca")
def clear_historico_busca(current_user: dict = Depends(get_current_user)):
    try:
        sb  = get_supabase()
        res = (
            sb.table("search_history")
            .delete()
            .eq("user_id", current_user["id"])
            .execute()
        )
        return {"deleted": len(res.data or [])}
    except Exception:
        raise _db_error()

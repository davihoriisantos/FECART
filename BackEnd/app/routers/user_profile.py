from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status

from ..schemas.historico_busca import HistoricoBuscaCreate, HistoricoBuscaOut
from ..schemas.user import SavedPlaceUpdate
from ..services.auth_service import get_current_user
from ..supabase_client import get_supabase

router = APIRouter(prefix="/api/user", tags=["user-profile"])

MAX_HISTORY = 50


def _db_error():
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Erro de conexão com o banco de dados",
    )


def _place(row: dict, prefix: str) -> dict | None:
    """Constrói o objeto de local salvo a partir de colunas do Supabase."""
    address = row.get(f"{prefix}_address")
    lat     = row.get(f"{prefix}_lat")
    lon     = row.get(f"{prefix}_lon")
    if not address and (lat is None or lon is None):
        return None
    return {
        "type":    prefix,
        "address": address or ("Casa" if prefix == "home" else "Trabalho"),
        "lat":     lat if lat is not None else -23.5505,
        "lon":     lon if lon is not None else -46.6333,
    }


def _map_history(row: dict) -> dict:
    """Mapeia colunas do Supabase para o formato esperado pelo frontend."""
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


# ─── GET /profile ─────────────────────────────────────────────────────────────
@router.get("/profile")
def get_profile(current_user: dict = Depends(get_current_user)):
    try:
        sb = get_supabase()
        history_res = (
            sb.table("search_history")
            .select("*")
            .eq("user_id", current_user["id"])
            .order("created_at", desc=True)
            .limit(MAX_HISTORY)
            .execute()
        )
        history = [_map_history(r) for r in (history_res.data or [])]
    except Exception:
        raise _db_error()

    return {
        "user": {
            "id":              current_user["id"],
            "email":           current_user["email"],
            "nome":            current_user["nome"],
            "celular":         current_user.get("celular"),
            "created_at":      current_user["created_at"],
            # defaults de compatibilidade
            "data_nascimento": None,
            "role":            "cidadao",
            "ativo":           True,
            "last_login":      None,
        },
        "saved_places": {
            "home": _place(current_user, "home"),
            "work": _place(current_user, "work"),
        },
        "history": history,
    }


# ─── PUT /saved-places ────────────────────────────────────────────────────────
@router.put("/saved-places")
def update_saved_place(
    place: SavedPlaceUpdate,
    current_user: dict = Depends(get_current_user),
):
    try:
        sb   = get_supabase()
        addr = (place.address or "").strip()

        if not addr:
            update = {
                f"{place.type}_address": None,
                f"{place.type}_lat":     None,
                f"{place.type}_lon":     None,
            }
        else:
            update = {
                f"{place.type}_address": addr,
                f"{place.type}_lat":     place.lat if place.lat is not None else -23.5505,
                f"{place.type}_lon":     place.lon if place.lon is not None else -46.6333,
            }

        result = (
            sb.table("users")
            .update(update)
            .eq("id", current_user["id"])
            .execute()
        )
        if not result.data:
            raise _db_error()

        updated = result.data[0]
        return {"saved_place": _place(updated, place.type)}

    except HTTPException:
        raise
    except Exception:
        raise _db_error()


# ─── POST /history ────────────────────────────────────────────────────────────
@router.post("/history", response_model=HistoricoBuscaOut, status_code=status.HTTP_201_CREATED)
def create_history(
    item: HistoricoBuscaCreate,
    current_user: dict = Depends(get_current_user),
):
    try:
        sb  = get_supabase()
        uid = current_user["id"]
        normalized = item.termo_busca.strip()

        # Anti-duplicata: verifica o registo mais recente com o mesmo query_text
        latest_res = (
            sb.table("search_history")
            .select("*")
            .eq("user_id", uid)
            .eq("query_text", normalized)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if latest_res.data:
            existing = latest_res.data[0]
            same_lat = (existing.get("lat") is None and item.lat is None) or (
                existing.get("lat") is not None
                and item.lat is not None
                and abs(existing["lat"] - item.lat) < 0.000001
            )
            same_lon = (existing.get("lon") is None and item.lon is None) or (
                existing.get("lon") is not None
                and item.lon is not None
                and abs(existing["lon"] - item.lon) < 0.000001
            )
            if same_lat and same_lon:
                # Atualiza o timestamp para "mover para o topo"
                upd = (
                    sb.table("search_history")
                    .update({"created_at": datetime.now(timezone.utc).isoformat()})
                    .eq("id", existing["id"])
                    .execute()
                )
                return _map_history(upd.data[0] if upd.data else existing)

        # Inserir novo registo
        new_row = {
            "user_id":    uid,
            "query_text": normalized,
            "lat":        item.lat,
            "lon":        item.lon,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        ins = sb.table("search_history").insert(new_row).execute()
        if not ins.data:
            raise _db_error()
        inserted = ins.data[0]

        # Limitar a MAX_HISTORY registos por utilizador (apaga os mais antigos)
        all_ids_res = (
            sb.table("search_history")
            .select("id")
            .eq("user_id", uid)
            .order("created_at", desc=True)
            .execute()
        )
        all_ids = [r["id"] for r in (all_ids_res.data or [])]
        if len(all_ids) > MAX_HISTORY:
            ids_to_delete = all_ids[MAX_HISTORY:]
            sb.table("search_history").delete().in_("id", ids_to_delete).execute()

        return _map_history(inserted)

    except HTTPException:
        raise
    except Exception:
        raise _db_error()

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.historico_busca import HistoricoBuscaRegiao
from ..models.user import User
from ..schemas.historico_busca import HistoricoBuscaCreate, HistoricoBuscaOut
from ..schemas.user import SavedPlaceUpdate
from ..services.auth_service import get_current_user


router = APIRouter(prefix="/api/user", tags=["user-profile"])


def _place(user: User, prefix: str):
    lat = getattr(user, f"{prefix}_lat")
    lon = getattr(user, f"{prefix}_lon")
    if lat is None or lon is None:
        return None
    return {
        "type": prefix,
        "address": getattr(user, f"{prefix}_address"),
        "lat": lat,
        "lon": lon,
    }


@router.get("/profile")
def get_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    history = (
        db.query(HistoricoBuscaRegiao)
        .filter(HistoricoBuscaRegiao.usuario_id == current_user.id)
        .order_by(HistoricoBuscaRegiao.criado_em.desc())
        .limit(50)
        .all()
    )
    return {
        "user": {
            "id": current_user.id,
            "email": current_user.email,
            "nome": current_user.nome,
            "celular": current_user.celular,
            "data_nascimento": current_user.data_nascimento,
            "role": current_user.role,
            "ativo": current_user.ativo,
            "created_at": current_user.created_at,
            "last_login": current_user.last_login,
        },
        "saved_places": {
            "home": _place(current_user, "home"),
            "work": _place(current_user, "work"),
        },
        "history": history,
    }


@router.put("/saved-places")
def update_saved_place(
    place: SavedPlaceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    setattr(current_user, f"{place.type}_address", place.address)
    setattr(current_user, f"{place.type}_lat", place.lat)
    setattr(current_user, f"{place.type}_lon", place.lon)
    db.commit()
    db.refresh(current_user)
    return {"saved_place": _place(current_user, place.type)}


@router.post("/history", response_model=HistoricoBuscaOut, status_code=status.HTTP_201_CREATED)
def create_history(
    item: HistoricoBuscaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    latest = (
        db.query(HistoricoBuscaRegiao)
        .filter(HistoricoBuscaRegiao.usuario_id == current_user.id)
        .order_by(HistoricoBuscaRegiao.criado_em.desc())
        .first()
    )
    normalized_term = item.termo_busca.strip().casefold()
    if latest and latest.termo_busca.strip().casefold() == normalized_term:
        same_lat = (latest.lat is None and item.lat is None) or (
            latest.lat is not None and item.lat is not None and abs(latest.lat - item.lat) < 0.000001
        )
        same_lon = (latest.lon is None and item.lon is None) or (
            latest.lon is not None and item.lon is not None and abs(latest.lon - item.lon) < 0.000001
        )
        if same_lat and same_lon:
            return latest

    history = HistoricoBuscaRegiao(usuario_id=current_user.id, **item.model_dump())
    db.add(history)
    db.commit()
    db.refresh(history)

    stale_entries = (
        db.query(HistoricoBuscaRegiao)
        .filter(HistoricoBuscaRegiao.usuario_id == current_user.id)
        .order_by(HistoricoBuscaRegiao.criado_em.desc(), HistoricoBuscaRegiao.id.desc())
        .offset(50)
        .all()
    )
    for stale in stale_entries:
        db.delete(stale)
    if stale_entries:
        db.commit()
    return history

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone

from ..database import get_db
from ..models.historico_busca import HistoricoBuscaRegiao
from ..schemas.historico_busca import HistoricoBuscaCreate, HistoricoBuscaOut
from ..services.auth_service import get_current_user
from ..models.user import User

router = APIRouter(prefix="/api/historico", tags=["historico"])

@router.post("/busca", response_model=HistoricoBuscaOut, status_code=status.HTTP_201_CREATED)
def create_historico_busca(
    busca_in: HistoricoBuscaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Regra anti-duplicata
    existente = db.query(HistoricoBuscaRegiao).filter(
        HistoricoBuscaRegiao.usuario_id == current_user.id,
        HistoricoBuscaRegiao.termo_busca == busca_in.termo_busca
    ).first()

    if existente:
        existente.criado_em = datetime.now(timezone.utc)
        if busca_in.lat is not None:
            existente.lat = busca_in.lat
        if busca_in.lon is not None:
            existente.lon = busca_in.lon
        if busca_in.bairro is not None:
            existente.bairro = busca_in.bairro
        if busca_in.dados_adicionais is not None:
            existente.dados_adicionais = busca_in.dados_adicionais
        db.commit()
        db.refresh(existente)
        retorno = existente
    else:
        novo = HistoricoBuscaRegiao(
            usuario_id=current_user.id,
            **busca_in.model_dump()
        )
        db.add(novo)
        db.commit()
        db.refresh(novo)
        retorno = novo

    # Limita histórico a máximo 50 entradas por usuário (remove as mais antigas)
    historicos = db.query(HistoricoBuscaRegiao).filter(
        HistoricoBuscaRegiao.usuario_id == current_user.id
    ).order_by(HistoricoBuscaRegiao.criado_em.desc()).all()
    
    if len(historicos) > 50:
        for hist_to_delete in historicos[50:]:
            db.delete(hist_to_delete)
        db.commit()

    return retorno

@router.get("/busca", response_model=List[HistoricoBuscaOut])
def get_historico_busca(
    limit: int = Query(20, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    historicos = db.query(HistoricoBuscaRegiao).filter(
        HistoricoBuscaRegiao.usuario_id == current_user.id
    ).order_by(HistoricoBuscaRegiao.criado_em.desc()).limit(limit).all()
    return historicos

@router.delete("/busca/{id}")
def delete_historico_busca_item(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    item = db.query(HistoricoBuscaRegiao).filter(
        HistoricoBuscaRegiao.id == id,
        HistoricoBuscaRegiao.usuario_id == current_user.id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    
    db.delete(item)
    db.commit()
    return {"detail": "Removido com sucesso."}

@router.delete("/busca")
def clear_historico_busca(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    deleted_count = db.query(HistoricoBuscaRegiao).filter(
        HistoricoBuscaRegiao.usuario_id == current_user.id
    ).delete()
    db.commit()
    return {"deleted": deleted_count}

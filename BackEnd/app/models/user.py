from sqlalchemy import Boolean, Column, Integer, String, DateTime, Date
from datetime import datetime, timezone
from ..database import Base


class User(Base):
    __tablename__ = "users"

    id               = Column(Integer,  primary_key=True, index=True, autoincrement=True)
    email            = Column(String(255), unique=True, index=True, nullable=False)
    nome             = Column(String(255), nullable=False)
    hashed_password  = Column(String(255), nullable=False)
    celular          = Column(String(20),  nullable=True)
    data_nascimento  = Column(Date,        nullable=True)
    role             = Column(String(50),  default='cidadao')   # admin | operador | cidadao
    ativo            = Column(Boolean,     default=True)
    created_at       = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_login       = Column(DateTime, nullable=True)

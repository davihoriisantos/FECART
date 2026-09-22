import re
from typing import Optional
from datetime import datetime, date
from pydantic import BaseModel, EmailStr, field_validator


# ─── Helpers ──────────────────────────────────────────────────────────────────

_PHONE_RE  = re.compile(r'^\(\d{2}\) \d{4,5}-\d{4}$')
_STRONG_PW = re.compile(r'^(?=.*[A-Za-z])(?=.*\d).{8,}$')


def _validate_phone(v: Optional[str]) -> Optional[str]:
    """Aceita None ou formato (XX) XXXXX-XXXX."""
    if v is None or v.strip() == '':
        return None
    cleaned = v.strip()
    if not _PHONE_RE.match(cleaned):
        raise ValueError('Celular inválido. Use o formato (XX) XXXXX-XXXX')
    return cleaned


def _validate_password(v: str) -> str:
    """Mínimo 8 caracteres, pelo menos 1 letra e 1 número."""
    if not _STRONG_PW.match(v):
        raise ValueError(
            'Senha fraca. Use pelo menos 8 caracteres com letras e números.'
        )
    return v


# ─── Schemas de entrada ────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    nome:            str
    email:           EmailStr
    senha:           str
    celular:         Optional[str] = None
    data_nascimento: Optional[date] = None

    @field_validator('senha')
    @classmethod
    def senha_forte(cls, v: str) -> str:
        return _validate_password(v)

    @field_validator('celular')
    @classmethod
    def celular_formato(cls, v: Optional[str]) -> Optional[str]:
        return _validate_phone(v)

    @field_validator('nome')
    @classmethod
    def nome_nao_vazio(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError('Nome muito curto.')
        return v


class UserLogin(BaseModel):
    email: EmailStr
    senha: str


class UserUpdate(BaseModel):
    """Campos permitidos para edição do perfil."""
    nome:            Optional[str]  = None
    celular:         Optional[str]  = None
    data_nascimento: Optional[date] = None

    @field_validator('celular')
    @classmethod
    def celular_formato(cls, v: Optional[str]) -> Optional[str]:
        return _validate_phone(v)

    @field_validator('nome')
    @classmethod
    def nome_nao_vazio(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if len(v) < 2:
                raise ValueError('Nome muito curto.')
        return v


class PasswordChange(BaseModel):
    """Para a rota PUT /me/password."""
    senha_atual: str
    nova_senha:  str

    @field_validator('nova_senha')
    @classmethod
    def nova_senha_forte(cls, v: str) -> str:
        return _validate_password(v)


# ─── Schemas de saída ─────────────────────────────────────────────────────────

class UserResponse(BaseModel):
    id:         int
    email:      str
    nome:       str
    role:       str
    ativo:      bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserProfile(BaseModel):
    """Resposta completa com todos os campos do perfil."""
    id:              int
    email:           str
    nome:            str
    celular:         Optional[str]
    data_nascimento: Optional[date]
    role:            str
    ativo:           bool
    created_at:      datetime
    last_login:      Optional[datetime]
    home_address:    Optional[str] = None
    home_lat:        Optional[float] = None
    home_lon:        Optional[float] = None
    work_address:    Optional[str] = None
    work_lat:        Optional[float] = None
    work_lon:        Optional[float] = None

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type:   str
    user:         UserProfile


class SavedPlaceUpdate(BaseModel):
    type: str
    address: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None

    @field_validator('type')
    @classmethod
    def valid_type(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in ('home', 'work'):
            raise ValueError("type deve ser 'home' ou 'work'.")
        return normalized

import re
from typing import Optional
from datetime import datetime, date
from pydantic import BaseModel, EmailStr, field_validator, ConfigDict


# ─── Helpers ──────────────────────────────────────────────────────────────────

_PHONE_RE  = re.compile(r'^\d{10,11}$')
_STRONG_PW = re.compile(r'^(?=.*[A-Za-z])(?=.*\d)[\s\S]{8,}$')


def _validate_phone(v: Optional[str]) -> Optional[str]:
    """Aceita celular com/sem máscara e normaliza para 10 ou 11 dígitos."""
    if v is None or v.strip() == '':
        return None
    cleaned = re.sub(r'\D', '', v)
    if not _PHONE_RE.match(cleaned):
        raise ValueError('Celular inválido. Informe 10 ou 11 dígitos.')
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
    nome:    str
    email:   EmailStr
    senha:   str
    celular: Optional[str] = None

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
    nome:    Optional[str] = None
    celular: Optional[str] = None

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
    """Resposta básica (usado internamente)."""
    id:         int
    email:      str
    nome:       str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserProfile(BaseModel):
    """
    Resposta completa do perfil.
    Campos não presentes na tabela Supabase recebem defaults compatíveis
    com o frontend existente.
    """
    id:              int
    email:           str
    nome:            str
    celular:         Optional[str] = None
    # Campos não existentes no Supabase — mantidos com defaults para compatibilidade
    data_nascimento: Optional[date] = None
    role:            str = 'cidadao'
    ativo:           bool = True
    last_login:      Optional[datetime] = None
    # Campos reais do Supabase
    created_at:      datetime
    home_address:    Optional[str] = None
    home_lat:        Optional[float] = None
    home_lon:        Optional[float] = None
    work_address:    Optional[str] = None
    work_lat:        Optional[float] = None
    work_lon:        Optional[float] = None

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type:   str
    user:         UserProfile


class SavedPlaceUpdate(BaseModel):
    type:    str
    address: Optional[str] = None
    lat:     Optional[float] = None
    lon:     Optional[float] = None

    @field_validator('type')
    @classmethod
    def valid_type(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in ('home', 'work'):
            raise ValueError("type deve ser 'home' ou 'work'.")
        return normalized

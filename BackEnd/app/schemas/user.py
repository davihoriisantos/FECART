from pydantic import BaseModel, EmailStr
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    nome: str

class UserCreate(UserBase):
    senha: str

class UserLogin(BaseModel):
    email: EmailStr
    senha: str

class UserResponse(UserBase):
    id: int
    role: str
    ativo: bool
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

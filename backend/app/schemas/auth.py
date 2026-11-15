from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.schemas.common import ORMModel, Role


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=1, max_length=512)


class UserRead(ORMModel):
    id: int
    username: str
    email: str | None
    full_name: str | None
    role: Role
    auth_source: str
    is_active: bool
    created_at: datetime
    last_login_at: datetime | None


class LoginResponse(BaseModel):
    user: UserRead
    csrf_token: str
    token_type: str = "cookie"


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserRead


class CsrfResponse(BaseModel):
    csrf_token: str


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=100, pattern=r"^[A-Za-z0-9._@-]+$")
    email: EmailStr | None = None
    full_name: str | None = Field(default=None, max_length=200)
    role: Role = "lecteur_direction"
    password: str = Field(min_length=12, max_length=512)


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    full_name: str | None = Field(default=None, max_length=200)
    role: Role | None = None
    is_active: bool | None = None
    password: str | None = Field(default=None, min_length=12, max_length=512)

from uuid import UUID

from pydantic import BaseModel, Field

from app.models.enums import AccountType


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=256)


class UserOut(BaseModel):
    id: UUID
    username: str
    display_name: str
    account_type: AccountType

    model_config = {"from_attributes": True}

from pydantic import BaseModel
from typing import List, Optional
from datetime import date, datetime

class WorkEntryBase(BaseModel):
    date: date
    shift: str
    task: str
    amount: float

class WorkEntryCreate(WorkEntryBase):
    pass

class WorkEntryUpdate(WorkEntryBase):
    # For updates, we require all fields to be sent
    # This simplifies validation and avoids Optional issues
    pass

class WorkEntry(WorkEntryBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class UserBase(BaseModel):
    username: str
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str
    role: Optional[str] = "user"

class User(UserBase):
    id: int
    role: str
    entries: List[WorkEntry] = []

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class AnnualRate(BaseModel):
    year: int
    rate: float

    class Config:
        from_attributes = True

class UserPasswordUpdate(BaseModel):
    old_password: str
    new_password: str

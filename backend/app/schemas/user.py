from typing import Optional
from pydantic import BaseModel

class User(BaseModel):
    id: str
    username: str
    email: Optional[str] = None

from typing import List, Optional
from pydantic import BaseModel

class PlannerItem(BaseModel):
    course_code: str
    planned_term: str

class PlannerResponse(BaseModel):
    items: List[PlannerItem]

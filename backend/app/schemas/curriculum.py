from typing import List, Optional, Dict
from pydantic import BaseModel

class CurriculumCourse(BaseModel):
    code: str
    name: str
    status: str
    prerequisites: Optional[List[str]] = None

class CurriculumResponse(BaseModel):
    courses: List[CurriculumCourse]

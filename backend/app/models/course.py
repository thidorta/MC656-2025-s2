from pydantic import BaseModel
from typing import Optional

class CourseBase(BaseModel):
    codigo: str
    nome: str
    creditos: int
    descricao: Optional[str] = None

class CourseCreate(CourseBase):
    pass

class Course(CourseBase):
    id: int
    
    class Config:
        from_attributes = True

class CourseResponse(Course):
    pass

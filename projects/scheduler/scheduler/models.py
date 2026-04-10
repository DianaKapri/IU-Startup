from pydantic import BaseModel, Field
from typing import List, Dict, Optional


class Teacher(BaseModel):
    id: str
    name: str
    subjects: List[str]
    max_hours_per_week: int
    unavailable_slots: List[str] = Field(default_factory=list)
    preferred_slots: List[str] = Field(default_factory=list)


class SchoolClass(BaseModel):
    id: str
    name: str
    grade: int
    subjects: Dict[str, int]


class Room(BaseModel):
    id: str
    name: str
    capacity: int
    specialization: Optional[str] = None


class TimeGrid(BaseModel):
    days: List[str]
    periods_per_day: int


class SchoolData(BaseModel):
    classes: List[SchoolClass]
    teachers: List[Teacher]
    rooms: List[Room]
    time_grid: TimeGrid

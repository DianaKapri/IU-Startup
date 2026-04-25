"""Pydantic-схемы вход/выход для CP-SAT solver.

Совместимы с форматом, который выдаёт services/template-parser.js
из Node-бэкенда. Это позволит передавать данные через JSON между
двумя стэками без преобразования.
"""
from __future__ import annotations
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ─── Входные модели ─────────────────────────────────────────────


class CurriculumEntry(BaseModel):
    classId: str
    subject: str
    weeklyHours: int = Field(ge=0, le=40)
    teacherId: Optional[str] = None
    teacherName: Optional[str] = None
    roomId: Optional[str] = None


class TeacherConstraint(BaseModel):
    teacherName: Optional[str] = None
    methodDay: Optional[str] = None  # "Пн".."Сб" или None
    unavailableDays: List[str] = Field(default_factory=list)
    maxLessonsPerDay: Optional[int] = None


class Room(BaseModel):
    id: str
    type: Optional[str] = None
    capacity: Optional[int] = None
    floor: Optional[int] = None
    equipment: Optional[str] = None


class GeneratorInput(BaseModel):
    classes: List[str]
    curriculum: List[CurriculumEntry]
    weekDays: int = Field(default=5, ge=5, le=6)
    constraints: Dict[str, TeacherConstraint] = Field(default_factory=dict)
    rooms: List[Room] = Field(default_factory=list)
    studentCounts: Dict[str, int] = Field(default_factory=dict)
    shifts: Dict[str, int] = Field(default_factory=dict)
    timeLimitSeconds: float = Field(default=60.0, ge=1.0, le=1800.0)
    seed: int = 0


# ─── Выходные модели ────────────────────────────────────────────


class GeneratorSummary(BaseModel):
    classesCount: int
    placedLessons: int
    unplacedLessons: int = 0
    softPenalty: int = 0
    status: str  # "optimal" | "feasible" | "infeasible" | "unknown"
    solveTimeMs: int
    buildTimeMs: int
    variablesCount: int


class Violation(BaseModel):
    ruleId: str
    severity: str  # "hard" | "soft"
    classId: Optional[str] = None
    message: str
    details: Dict[str, Any] = Field(default_factory=dict)


class GeneratorOutput(BaseModel):
    ok: bool
    schedule: Dict[str, List[List[str]]] = Field(default_factory=dict)
    summary: GeneratorSummary
    warnings: List[str] = Field(default_factory=list)
    violations: List[Violation] = Field(default_factory=list)
    error: Optional[str] = None

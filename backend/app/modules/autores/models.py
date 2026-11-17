from typing import List, Optional

from sqlmodel import Field, Relationship

from app.core.base import BaseModel


class Autor(BaseModel, table=True):
    __tablename__ = "autor"

    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(index=True)
    nacionalidad: Optional[str] = None
    # Soft delete: las bajas lógicas no borran la fila, marcan activo = false.
    activo: bool = Field(default=True, index=True)
    autorias: List["LibroAutor"] = Relationship(back_populates="autor")

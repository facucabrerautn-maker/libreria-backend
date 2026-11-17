from typing import List

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload
from fastapi import HTTPException

from app.modules.clientes.models import Cliente, PerfilCliente
from app.modules.clientes.schemas import (
    ClienteCreate,
    ClienteRead,
    ClienteUpdate,
    PerfilCreate,
    PerfilRead,
)
from app.modules.ventas.models import Venta, RenglonVenta
from app.modules.ventas.schemas import VentaRead


async def create_cliente(session: AsyncSession, cliente_in: ClienteCreate) -> ClienteRead:
    """Crea un cliente. Si el email ya existe, responde 409 con mensaje propio."""
    cliente = Cliente.model_validate(cliente_in)
    session.add(cliente)
    try:
        await session.commit()
        await session.refresh(cliente)
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(
            status_code=409,
            detail="Ya existe un cliente con ese email",
        ) from exc

    # Recargar con el perfil precargado para no disparar carga perezosa
    # al serializar ClienteRead (perfil es una relación uno a uno).
    result = await session.execute(
        select(Cliente)
        .options(joinedload(Cliente.perfil))
        .where(Cliente.id == cliente.id)
    )
    cliente_con_perfil = result.scalar_one()
    return ClienteRead.model_validate(cliente_con_perfil)


async def list_clientes(
    session: AsyncSession,
    limit: int = 20,
    offset: int = 0,
    incluir_inactivos: bool = False,
) -> List[ClienteRead]:
    """Lista clientes con su perfil y paginación.

    Por defecto excluye las bajas lógicas; `incluir_inactivos=True` las muestra
    para poder restaurarlas con PATCH.
    """
    if limit < 1:
        limit = 1
    if limit > 100:
        limit = 100
    if offset < 0:
        offset = 0

    query = select(Cliente).options(joinedload(Cliente.perfil))
    if not incluir_inactivos:
        query = query.where(Cliente.activo.is_(True))

    result = await session.execute(
        query.order_by(Cliente.id).offset(offset).limit(limit)
    )
    clientes = result.scalars().all()
    return [ClienteRead.model_validate(c) for c in clientes]


async def get_cliente(session: AsyncSession, cliente_id: int) -> ClienteRead:
    """Obtiene un cliente por su id con su perfil (404 si no existe o está dado de baja)."""
    result = await session.execute(
        select(Cliente)
        .options(joinedload(Cliente.perfil))
        .where(Cliente.id == cliente_id, Cliente.activo.is_(True))
    )
    cliente = result.scalar_one_or_none()
    if cliente is None:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return ClienteRead.model_validate(cliente)


async def update_cliente(
    session: AsyncSession, cliente_id: int, cliente_in: ClienteUpdate
) -> ClienteRead:
    """Actualiza un cliente parcialmente (solo campos enviados).

    Busca también las bajas lógicas para permitir restaurarlas enviando
    `{"activo": true}`.
    """
    result = await session.execute(
        select(Cliente)
        .options(joinedload(Cliente.perfil))
        .where(Cliente.id == cliente_id)
    )
    cliente = result.scalar_one_or_none()
    if cliente is None:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    update_data = cliente_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(cliente, field, value)

    session.add(cliente)
    try:
        await session.commit()
        await session.refresh(cliente)
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(
            status_code=409,
            detail="Ya existe un cliente con ese email",
        ) from exc

    result = await session.execute(
        select(Cliente)
        .options(joinedload(Cliente.perfil))
        .where(Cliente.id == cliente.id)
    )
    cliente_con_perfil = result.scalar_one()
    return ClienteRead.model_validate(cliente_con_perfil)


async def delete_cliente(session: AsyncSession, cliente_id: int) -> None:
    """Baja lógica de un cliente (marca activo = false). 404 si no existe o ya está dado de baja."""
    cliente = await session.get(Cliente, cliente_id)
    if cliente is None or not cliente.activo:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    cliente.activo = False
    session.add(cliente)
    await session.commit()


async def create_perfil_cliente(
    session: AsyncSession, cliente_id: int, perfil_in: PerfilCreate
) -> PerfilRead:
    """Crea un perfil para un cliente. 404 si el cliente no existe o está dado de baja."""
    cliente = await session.get(Cliente, cliente_id)
    if cliente is None or not cliente.activo:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    # El UNIQUE en perfil_cliente.cliente_id garantiza que no haya dos perfiles.
    perfil = PerfilCliente(
        cliente_id=cliente_id,
        telefono=perfil_in.telefono,
        direccion=perfil_in.direccion,
    )
    session.add(perfil)
    try:
        await session.commit()
        await session.refresh(perfil)
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(
            status_code=409,
            detail="El cliente ya tiene un perfil",
        ) from exc
    return PerfilRead.model_validate(perfil)


async def list_ventas_por_cliente(
    session: AsyncSession, cliente_id: int, limit: int = 20, offset: int = 0
) -> List[VentaRead]:
    """Obtiene las ventas de un cliente con carga anticipada y paginación."""
    cliente = await session.get(Cliente, cliente_id)
    if cliente is None or not cliente.activo:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    if limit < 1:
        limit = 1
    if limit > 100:
        limit = 100
    if offset < 0:
        offset = 0

    result = await session.execute(
        select(Venta)
        .options(
            joinedload(Venta.cliente),
            selectinload(Venta.renglones).selectinload(RenglonVenta.libro),
        )
        .where(Venta.cliente_id == cliente_id)
        .order_by(Venta.fecha.desc(), Venta.id.desc())
        .offset(offset)
        .limit(limit)
    )
    ventas = result.scalars().all()
    return [VentaRead.model_validate(v) for v in ventas]

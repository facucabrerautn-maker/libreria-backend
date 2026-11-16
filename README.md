# Librería — API de Catálogo y Ventas

API REST asíncrona para una librería de barrio que gestiona su catálogo de libros y sus ventas. Desarrollado como parcial de Programación III (Unidades 1 a 4).

## Integrantes

- Facundo Cabrera
- Nahuel Olmos
- Agustin Pereyra
- Ignacio Ariza

## Stack

- Python 3.12
- FastAPI 0.111
- SQLModel 0.0.37
- SQLAlchemy 2.0 (async)
- asyncpg 0.32.0
- PostgreSQL 16
- python-dotenv 1.0
- uvicorn
- Docker (python:3.12-alpine)

## Levantar el proyecto desde cero

Todos los comandos del backend se ejecutan desde la carpeta `backend/`.

1. Clonar el repositorio y entrar en `backend/`: `cd backend`
2. Crear el entorno virtual: `python -m venv .venv`
3. Activarlo: `.venv\Scripts\activate` (Windows) o `source .venv/bin/activate` (Linux/Mac)
4. Instalar dependencias: `pip install -r requirements.txt`
5. Copiar `.env.example` a `.env` y completar `DATABASE_URL`.
6. Arrancar el servidor: `uvicorn app.main:app --reload`

El servidor crea las tablas al arrancar con `create_all` (SQLAlchemy async). El
proyecto no usa Alembic ni migraciones: no hay `alembic.ini` ni `migrations/`.

> Nota: se usa `sqlmodel==0.0.37` porque SQLModel 0.0.24 no es compatible con
> Pydantic 2.14 (falla al importar con `Field 'id' requires a type annotation`).

## Carga de datos iniciales

El proyecto incluye un script idempotente que deja la base en un estado inicial
conocido: 2 editoriales, 2 géneros, 3 autores, 4 libros y 2 clientes con ids
previsibles. Borra los datos existentes antes de cargar (no crea ventas).

```bash
python -m scripts.seed
```

Dentro del contenedor:

```bash
docker exec libreria python -m scripts.seed
```

Requiere `DATABASE_URL` en el entorno o en el archivo `.env`.

## Estructura del proyecto

```
backend/
  app/
    main.py               # Aplicación, lifespan (create_all), registro de routers
    core/
      config.py           # Lectura de DATABASE_URL desde el entorno
      database.py         # Motor, fábrica de sesiones, dependencia get_session
    modules/
      <modulo>/
        models.py         # Modelos de tabla, restricciones y relaciones
        schemas.py        # DTO de entrada (Create, Update) y de salida (Read)
        service.py        # Lógica, traducción de errores, lecturas con precarga
        router.py         # Rutas HTTP: reciben, delegan y declaran la respuesta
  test/                   # Archivos .http con casos de prueba
  scripts/
    seed.py               # Datos iniciales (python -m scripts.seed)
  Dockerfile
  .dockerignore
  .env.example
  requirements.txt
frontend/                 # HTML, CSS y JavaScript nativos + Dockerfile con Nginx
evidencias/
DEPLOY.md
README.md
```

Módulos mínimos: `health`, `editoriales`, `generos`, `autores`, `libros`, `clientes`, `ventas`.

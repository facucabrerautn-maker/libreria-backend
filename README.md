# Librería — API de Catálogo y Ventas

Aplicación web para una librería de barrio que gestiona su catálogo de libros, sus clientes y sus ventas. Desarrollada para Programación III (Tecnicatura Universitaria en Programación, UTN):

- **Backend** (`backend/`): API REST asíncrona con FastAPI y PostgreSQL (parcial, Unidades 1 a 4).
- **Frontend** (`frontend/`): pantallas en HTML, CSS y JavaScript nativos conectadas a la API (Evaluación Global), servidas por Nginx dentro de una imagen Docker.

## Grupo

- Grupo: 7 — «Necesitamos Gente»
- URL pública: https://libreria.devfacu.me/ (detalles del despliegue en `DEPLOY.md`)

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

## Frontend y aplicación integrada

El frontend usa HTML, CSS y JavaScript nativos, sin dependencias. Todas las peticiones salen de `frontend/public/js/api.js` con `fetch` y la base `/api`; Nginx reenvía `/api/` al backend (`frontend/default.conf.template`), de modo que `/api/libros/` llega a FastAPI como `/libros/`.

Pantallas: Catálogo, Libros (alta), Clientes (alta y consulta por id), Ventas (borrador y confirmación) e Historial.

Contrato con la API: el alta de libros envía `stock` y `autores` (`autor_id`, `rol`, `orden`). Para seleccionar autores y clientes se usan las consultas individuales `GET /autores/{id}` y `GET /clientes/{id}`, porque la API no expone listados de ambos. El borrador de la venta se guarda en memoria; los importes confirmados vienen siempre de la API.

### Probar todo en local

1. Backend (desde `backend/`, con `DATABASE_URL` en el `.env`):

   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   python -m scripts.seed
   ```

2. Frontend (desde `frontend/`, con Docker iniciado):

   ```bash
   docker build -t libreria-frontend .
   docker run --rm --name libreria-frontend \
     -p 127.0.0.1:8080:80 \
     --add-host=host.docker.internal:host-gateway \
     -e API_UPSTREAM=host.docker.internal:8000 libreria-frontend
   ```

   En Docker Desktop se omite `--add-host`. `API_UPSTREAM` tiene la forma `host:puerto`, sin `http://` ni barra final.

3. Abrir `http://127.0.0.1:8080` y comprobar que `http://127.0.0.1:8080/api/health/ready` responde `200`.

Los pasos de despliegue en Easypanel, las variables y la verificación están en [`DEPLOY.md`](DEPLOY.md).

## Pruebas y evidencia

- `backend/test/*.http`: casos por módulo del parcial.
- `backend/test/global.http`: casos G-01 a G-07 del Global, pensados para ejecutarse desde la URL pública con datos ficticios (cambiar la variable `base`).
- `evidencias/`: capturas y registros de los casos. Las imágenes `D-*` y los archivos `C-07_*` corresponden al parcial; la evidencia del Global se agrega con el prefijo `G-`.

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

# Despliegue — Librería (Global de Programación III)

La aplicación se publica en una VPS administrada con **Easypanel**, con dos servicios *App* en el mismo proyecto:

| Servicio | Build Path | Qué hace | Puerto interno |
|----------|------------|----------|----------------|
| `backend` | `/backend` | API FastAPI (Uvicorn) conectada a PostgreSQL | 8000 |
| `frontend` | `/frontend` | Nginx: sirve el HTML/CSS/JS y reenvía `/api/` al backend | 80 |

El navegador solo habla con el frontend. Nginx reenvía `/api/…` al backend por la red interna, así que el backend no se expone a Internet.

## Datos del despliegue

> Completar antes de la entrega.

| Dato | Valor |
|------|-------|
| Grupo | 7 — «Necesitamos Gente» |
| URL pública (frontend, HTTPS) | https://libreria.devfacu.me/ |
| Repositorio | https://github.com/facucabrerautn-maker/libreria-backend |
| Rama desplegada | `main` |
| Commit desplegado | _(hash corto)_ |
| Proyecto de Easypanel | `libreria` |
| Nombre interno del backend | `libreria_backend` |
| `API_UPSTREAM` del frontend | `libreria_backend:8000` |
| Fecha del último despliegue | _(dd/mm/aaaa)_ |

## Rutas y puertos

| Pieza | Valor |
|-------|-------|
| Build Path del backend | `/backend` (Dockerfile: `Dockerfile`) |
| Build Path del frontend | `/frontend` (Dockerfile: `Dockerfile`) |
| Puerto interno del backend | `8000` (Uvicorn en `0.0.0.0`), solo red interna, sin dominio propio |
| Puerto interno del frontend | `80` (Nginx) |
| Dominio del frontend | HTTPS asignado por Easypanel → protocolo interno HTTP, puerto de destino `80` |
| PostgreSQL | Servicio de la VPS; el puerto no se publica |

## Variables de entorno

Los valores reales se cargan en **Environment** de cada servicio. Nunca se versionan ni se hornean en la imagen. El archivo `backend/.env.example` muestra solo la forma.

| Servicio | Variable | Forma del valor |
|----------|----------|-----------------|
| backend | `DATABASE_URL` | `postgresql+asyncpg://USUARIO:CLAVE@HOST:PUERTO/BASE` (host y puerto internos que figuran en **Credentials** del servicio Postgres) |
| backend | `SQL_ECHO` | Opcional. `false` por defecto |
| frontend | `API_UPSTREAM` | `NOMBRE_INTERNO_BACKEND:8000`, sin `http://` ni barra final (por ejemplo `grupoN_backend:8000`) |

## Proxy de Nginx

`frontend/default.conf.template` se versiona con el código. Nginx sustituye `API_UPSTREAM` al iniciar el contenedor:

- `location /` sirve los archivos estáticos desde `/usr/share/nginx/html`.
- `location /api/` hace `proxy_pass http://${API_UPSTREAM}/;`. La barra final quita el prefijo, de modo que `/api/libros/` llega a FastAPI como `/libros/`.

El cliente HTTP del frontend (`frontend/public/js/api.js`) usa `/api` como base y conserva la barra final de las colecciones (`/api/libros/`).

## Migraciones y tablas

El proyecto **no usa Alembic**. El backend crea las tablas que falten al arrancar con `create_all` (SQLAlchemy async), dentro del `lifespan` de `app/main.py`. No existen `alembic.ini` ni `migrations/`, y el `CMD` del backend arranca Uvicorn directamente.

## Carga inicial (datos ficticios)

Con el servicio `backend` en ejecución, desde **Shell** de Easypanel (carpeta de trabajo `/app`):

```bash
python -m scripts.seed
```

El script crea las tablas si faltan, **vacía** las tablas del dominio (`renglon_venta`, `venta`, `perfil_cliente`, `cliente`, `libro_autor`, `libro`, `autor`, `genero`, `editorial`) y vuelve a insertar el estado inicial. No crea ventas.

> **Ejecutarlo una sola vez en una base nueva.** Sobre una base con datos borra todo, incluidas las ventas registradas. Después de un redespliegue no se vuelve a correr: los datos viven en PostgreSQL, no en el contenedor.

Datos que deja:

| Entidad | Ids |
|---------|-----|
| Editoriales | 1 Editorial Sudamericana, 2 Anagrama |
| Géneros | 1 Novela, 2 Cuento |
| Autores | 1 Julio Cortázar, 2 Jorge Luis Borges, 3 Ricardo Piglia |
| Libros | 1 Rayuela, 2 Bestiario, 3 Ficciones, 4 Respiración artificial |
| Clientes | 1 Ana Gómez, 2 Tomás Ríos |

## Pasos de despliegue

1. **Backend.** En el proyecto: *New Service → App*, nombre `backend`. En **Source**, seleccionar el repositorio y la rama; Build Path `/backend`. En **Build**, Dockerfile con ruta `Dockerfile`.
2. En **Environment** cargar `DATABASE_URL` (driver `postgresql+asyncpg`). Pulsar **Deploy** y revisar los logs del build y del arranque.
3. Sin dominio propio: si Easypanel asignó uno automático, quitarlo para que el backend quede en la red interna.
4. En **Shell** del backend comprobar la salud y cargar los datos:

   ```bash
   python -c "from urllib.request import urlopen; print(urlopen('http://127.0.0.1:8000/health/ready').status)"
   python -m scripts.seed
   ```

   La primera línea debe imprimir `200`.
5. **Frontend.** *New Service → App*, nombre `frontend`. Misma rama; Build Path `/frontend`, Dockerfile `Dockerfile`.
6. En **Environment** cargar `API_UPSTREAM=<nombre interno del backend>:8000`.
7. En **Domains** usar el dominio HTTPS asignado, con protocolo interno **HTTP** y puerto de destino **80**.
8. **Deploy**. Abrir el dominio público y agregar `/api/health/ready`: debe responder `200`. Probar el catálogo y registrar una venta de prueba.

## Prueba local de la imagen del frontend

Con el backend local en el puerto 8000 y `DATABASE_URL` configurada:

```bash
# Backend (desde backend/)
uvicorn app.main:app --host 0.0.0.0 --port 8000
python -m scripts.seed

# Frontend (desde frontend/)
docker build -t libreria-frontend .
docker run --rm --name libreria-frontend \
  -p 127.0.0.1:8080:80 \
  --add-host=host.docker.internal:host-gateway \
  -e API_UPSTREAM=host.docker.internal:8000 libreria-frontend
```

En Docker Desktop se omite `--add-host`. Abrir `http://127.0.0.1:8080` y comprobar que `/api/health/ready` responde `200`.

## Imagen del backend

`backend/Dockerfile`: base `python:3.12-alpine`, dependencias instaladas antes de copiar el código, usuario sin privilegios (`appuser`, UID 65532) y `HEALTHCHECK` sobre `GET /health/ready` con `wget` y la dirección `127.0.0.1`. Ningún secreto va dentro de la imagen.

## Actualización

1. Subir los cambios a la rama desplegada.
2. En Easypanel, **Deploy** del servicio que cambió (backend, frontend o ambos).
3. Revisar los logs del build y el arranque.
4. No ejecutar el seed de nuevo. Comprobar que `/api/health/ready` responde `200` y que el catálogo y el historial conservan sus datos.

## Diagnóstico

| Síntoma | Qué revisar |
|---------|-------------|
| Falla un `COPY` del build | Build Path, nombres exactos de archivos y carpeta `public/` |
| Nginx no arranca o `/api/` devuelve 502 | Logs del frontend, `API_UPSTREAM`, nombre interno, puerto y si el backend está en ejecución |
| `/api/health/ready` falla | Logs del backend, `DATABASE_URL`, conexión a PostgreSQL |
| Una petición de la API devuelve 404 | Red del navegador: prefijo `/api` y barra final de la ruta |

## Verificación (G-01 a G-07)

Los casos están escritos en `backend/test/global.http`. Se ejecutan desde la URL pública con datos ficticios y la evidencia queda en `evidencias/`.

| Caso | Resultado esperado | Resultado observado | Evidencia |
|------|--------------------|---------------------|-----------|
| G-01 Catálogo | Búsqueda por título, paginación con `limit` y `offset`, búsqueda sin coincidencias y detalle | _(completar)_ | _(archivo)_ |
| G-02 Alta de libro | Libro creado con stock, género opcional y autorías; detalle consultable; ISBN repetido → 409 | _(completar)_ | _(archivo)_ |
| G-03 Alta de cliente | Cliente creado y recuperado por id; email repetido → 409 | _(completar)_ | _(archivo)_ |
| G-04 Venta | Venta con dos renglones → 201; el detalle coincide tras recargar | _(completar)_ | _(archivo)_ |
| G-05 Precio histórico | `PATCH /libros/{id}` cambia el precio y la venta anterior conserva sus importes | _(completar)_ | _(archivo)_ |
| G-06 Rechazo | Id inexistente → 409; renglones repetidos → 422; el historial queda igual | _(completar)_ | _(archivo)_ |
| G-07 Despliegue | La imagen del frontend se construye, la URL abre por HTTPS, `/api/health/ready` → 200 y los datos siguen tras un redespliegue | _(completar)_ | _(archivo)_ |

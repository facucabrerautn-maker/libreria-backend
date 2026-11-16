# Librería — Global de Programación III.
# Guía de despliegue, ejercicio 4. Se construye desde esta carpeta (frontend/).
#
#   docker build -t libreria-frontend .
#   docker run --rm --name libreria-frontend \
#     -p 127.0.0.1:8080:80 \
#     --add-host=host.docker.internal:host-gateway \
#     -e API_UPSTREAM=host.docker.internal:8000 libreria-frontend
#
# En Docker Desktop se omite la línea --add-host.
# API_UPSTREAM tiene la forma host:puerto, sin http:// ni barra final.

FROM nginx:1.30-alpine
ENV NGINX_ENVSUBST_FILTER=^API_UPSTREAM$
COPY public/ /usr/share/nginx/html/
COPY default.conf.template /etc/nginx/templates/default.conf.template
EXPOSE 80

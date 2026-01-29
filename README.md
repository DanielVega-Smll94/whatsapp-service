# 🚀 WhatsApp Service - JB ProAdvisor & Sophielandia

Este servicio es un backend robusto basado en `whatsapp-web.js` que permite el envío de mensajes de texto y documentos (PDF/Imágenes) emulando el comportamiento de Evolution API. Está diseñado para correr en **Docker** detrás de **Nginx Proxy Manager**.

---

## 🛠️ Estructura de Archivos en el VPS

Antes de iniciar, asegúrate de que tu carpeta de proyecto en el VPS tenga esta estructura:

```text
whatsapp-service/
├── src/                # Carpeta con tu código fuente .ts
├── sessions/           # Carpeta para persistencia (se crea manualmente)
├── Dockerfile          # Configuración de la imagen Docker
├── docker-compose.yml  # Orquestación de contenedores
├── package.json        # Dependencias del proyecto
├── tsconfig.json       # Configuración de TypeScript
└── .dockerignore       # Archivos excluidos del build
```

## ⚙️ Configuración del Entorno (Docker Compose)
Asegúrate de que tu docker-compose.yml tenga el nombre correcto de tu red de Nginx Proxy Manager (ej. proxy_network o npm_network).

```bash
version: '3.8'

services:
  whatsapp-service:
    build: .
    container_name: whatsapp-service
    restart: always
    volumes:
      - ./sessions:/app/sessions
    environment:
      - PORT=3000
      - API_KEY=tu_clave_secreta_aqui
      - WEBHOOK_URL=[https://yyy.com/webhook/nombre](https://yyy/webhook/nombre)
      - NODE_ENV=production
    networks:
      - proxy_network

networks:
  proxy_network:
    external: true
```

## 🚀 Despliegue en 3 Pasos
1. Preparar Permisos de Carpeta
En la terminal de tu VPS, dentro de la carpeta del proyecto, ejecuta esto para que Docker pueda escribir la sesión:

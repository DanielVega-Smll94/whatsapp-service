FROM ghcr.io/puppeteer/puppeteer:21.5.0

# Cambiamos al usuario root para instalar dependencias y manejar carpetas
USER root

# Instalamos librerías adicionales que a veces faltan en imágenes slim
RUN apt-get update && apt-get install -y \
    libxshmfence1 \
    libglu1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiamos archivos de dependencias
COPY package*.json ./
COPY tsconfig.json ./

# Instalamos dependencias (incluyendo las de desarrollo para compilar)
RUN npm install

# Copiamos el resto del código
COPY . .

# Compilamos el proyecto de TypeScript a JavaScript
RUN npm run build

# Creamos la carpeta de sesiones y damos permisos
RUN mkdir -p /app/sessions && chmod -R 777 /app/sessions

# Exponemos el puerto definido en tu config (3000)
EXPOSE 3000

# Comando para arrancar la aplicación
CMD ["node", "dist/server.js"]
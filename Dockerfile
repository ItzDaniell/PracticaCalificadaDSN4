# Etapa 1: Construcción
FROM node:18-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Etapa 2: Runtime
FROM node:18-alpine

WORKDIR /app

# Copiar las dependencias instaladas desde la etapa anterior
COPY --from=builder /app/node_modules ./node_modules

# Copiar el resto de la aplicación
COPY . .

# Crear archivo .env si no existe
RUN if [ ! -f .env ]; then cp .env.example .env; fi

# Exponer puerto 3000
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Comando de inicio
CMD ["npm", "start"]

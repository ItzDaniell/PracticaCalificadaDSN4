# 🔐 Aplicación de Autenticación 2FA

Aplicación web con autenticación de dos factores (2FA) usando Express.js, MySQL y Google Authenticator.

## 📋 Requisitos Previos

Asegúrate de tener instalados los siguientes componentes en tu sistema:

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (incluye Docker Compose)
- [Git](https://git-scm.com/downloads)

## 🚀 Instalación y Ejecución con Docker Compose

Sigue estos pasos para desplegar la aplicación en tu entorno local:

### 1. Clonar el repositorio

Abre tu terminal y ejecuta:

```bash
git clone https://github.com/ItzDaniell/PracticaCalificadaDSN4.git
cd PracticaCalificadaDSN4
```

### 2. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto basándote en el ejemplo proporcionado:

**En Windows (PowerShell):**
```powershell
copy .env.example .env
```

**En Linux/Mac:**
```bash
cp .env.example .env
```

El archivo `.env` ya viene preconfigurado para funcionar con Docker, pero puedes revisar su contenido:

```env
DB_HOST=db
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root123
DB_NAME=auth_db
SESSION_SECRET=secret_key
NODE_ENV=production
PORT=3000
```

### 3. Iniciar la aplicación

Ejecuta el siguiente comando para construir e iniciar los contenedores en segundo plano:

```bash
docker-compose up -d --build
```

### 4. Verificar el estado

Puedes ver si los contenedores están corriendo correctamente con:

```bash
docker-compose ps
```

Deberías ver dos servicios activos: `app` y `db`.

### 5. Acceder a la aplicación

Abre tu navegador web y visita:

[http://localhost:3000](http://localhost:3000)

## 🛑 Detener la aplicación

Para detener y eliminar los contenedores:

```bash
docker-compose down
```

Si deseas detenerlos y también eliminar los volúmenes de datos (borrar la base de datos):

```bash
docker-compose down -v
```

## 🔍 Solución de problemas comunes

- **Puerto ocupado**: Si el puerto 3000 o 3306 están ocupados, puedes cambiarlos en el archivo `docker-compose.yml` y en el `.env`.
- **Error de conexión a BD**: El contenedor de la aplicación espera a que la base de datos esté lista, pero si falla al inicio, intenta reiniciar el contenedor de la app: `docker-compose restart app`.
- **Ver logs**: Para ver qué está pasando dentro de los contenedores:
  ```bash
  docker-compose logs -f
  ```

## 👤 Autor

Desarrollado como práctica calificada para el curso de Desarrollo de Soluciones en la Nube.

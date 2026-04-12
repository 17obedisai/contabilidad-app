# Coocentral App

Sistema de evaluación de desempeño y productividad para el equipo de contabilidad de la **Cooperativa Central de Caficultores del Huila (Coocentral)**.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React + Vite, react-router-dom, axios |
| Backend | FastAPI, Motor (async MongoDB), pydantic-settings, python-jose, bcrypt |
| Base de datos | MongoDB |
| Deploy frontend | Vercel |
| Deploy backend | Render |

---

## Setup local

### Requisitos previos

- Python 3.11+
- Node.js 18+
- MongoDB corriendo en `localhost:27017` (o una URI de Atlas)

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env              # editar si es necesario
uvicorn main:app --reload
```

El servidor queda en `http://localhost:8000`. La documentación interactiva está en `/docs`.

#### Variables de entorno (`backend/.env`)

| Variable | Descripción | Default |
|----------|-------------|---------|
| `MONGO_URL` | URI de conexión a MongoDB | `mongodb://localhost:27017` |
| `DB_NAME` | Nombre de la base de datos | `contabilidad` |
| `SECRET_KEY` | Clave secreta para JWT — **cambiar en producción** | — |
| `ALGORITHM` | Algoritmo JWT | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Duración del token | `60` |
| `CORS_ORIGINS` | Origins permitidos (separados por coma) | `http://localhost:5173` |

#### Seed de datos

Carga usuarios, quizzes (12 meses × 15 preguntas), tareas iniciales e ítems del tablero:

```bash
cd backend
source venv/bin/activate
python seed.py
```

El seed es idempotente: puede correrse varias veces sin duplicar registros.

### Frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

La variable `VITE_API_URL` en `frontend/.env` apunta por defecto a `http://localhost:8000`. Para cambiarla:

```
VITE_API_URL=https://tu-backend.onrender.com
```

---

## Deploy

### Backend en Render

1. Crear un **Web Service** apuntando a la carpeta `backend/`.
2. **Build command:** `pip install -r requirements.txt`
3. **Start command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Agregar las variables de entorno en el panel de Render:
   - `MONGO_URL` → URI de MongoDB Atlas (incluye usuario y contraseña)
   - `DB_NAME` → `contabilidad`
   - `SECRET_KEY` → valor seguro (ej. `openssl rand -hex 32`)
   - `CORS_ORIGINS` → URL del frontend en Vercel (ej. `https://coocentral-app.vercel.app`)
5. Correr el seed una vez desde la consola de Render o con `python seed.py` localmente apuntando a Atlas.

### Frontend en Vercel

1. Importar el repositorio en Vercel y configurar el **Root Directory** como `frontend`.
2. Framework preset: **Vite**.
3. Agregar variable de entorno:
   - `VITE_API_URL` → URL del backend en Render (ej. `https://coocentral-api.onrender.com`)
4. Deploy. Vercel detecta Vite automáticamente.

> **Orden de deploy:** primero el backend (para tener la URL), luego el frontend con esa URL en `VITE_API_URL`.

### MongoDB Atlas (base de datos en la nube)

1. Crear un cluster gratuito en [cloud.mongodb.com](https://cloud.mongodb.com).
2. Crear un usuario de base de datos con permisos de lectura/escritura.
3. En **Network Access**, agregar `0.0.0.0/0` para permitir conexiones desde Render.
4. Copiar la Connection String y usarla como `MONGO_URL` en Render.

---

## Credenciales de acceso (desarrollo)

Tras correr el seed, los usuarios y contraseñas iniciales están definidos en `backend/seed.py`. Todos los nicks son en minúsculas.

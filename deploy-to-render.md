# Deploy to Render (Free Cloud Hosting)

## Backend Deployment (render.com)

1. Create account at https://render.com
2. Click "New Web Service"
3. Connect your GitHub repo (push this project to GitHub first)
4. Set:
   - Root Directory: `backend`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add environment variable: `DATABASE_URL` (use PostgreSQL add-on or leave as SQLite)
6. Deploy — your URL will be: `https://your-app.onrender.com`

## Frontend Deployment

Option A — Bundle with backend (recommended):
```
cd frontend
npm run build
# This copies files to backend/static/
# The FastAPI server will serve the frontend
```

Option B — Deploy frontend to Vercel:
1. Push `frontend/` to GitHub
2. Import to Vercel, set `VITE_API_URL` and `VITE_WS_URL` env vars
3. Build command: `npm run build`, Output: `dist`

## Agent Configuration (each PC)

In `agent/.env`:
```
SERVER_URL=https://your-app.onrender.com
STATION_NAME=PC-01
REPORT_INTERVAL=30
```

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from datetime import datetime
import asyncio
import json
import os

from database import engine, SessionLocal
from models import Base, Device, PrintJob
import models

from routers import devices, print_jobs, settings as settings_router, network_scan

Base.metadata.create_all(bind=engine)

app = FastAPI(title="PisoNet Manager API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(devices.router)
app.include_router(print_jobs.router)
app.include_router(settings_router.router)
app.include_router(network_scan.router)


# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        data = json.dumps(message)
        dead = []
        for connection in self.active_connections:
            try:
                await connection.send_text(data)
            except Exception:
                dead.append(connection)
        for c in dead:
            self.disconnect(c)


manager = ConnectionManager()


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await asyncio.sleep(5)
            db = SessionLocal()
            try:
                from datetime import timedelta
                cutoff = datetime.utcnow() - timedelta(minutes=2)
                db.query(Device).filter(Device.last_seen < cutoff).update({"is_online": False})
                db.commit()

                devices_data = db.query(Device).all()
                recent_jobs = (
                    db.query(PrintJob, Device)
                    .join(Device, PrintJob.device_id == Device.id)
                    .order_by(PrintJob.printed_at.desc())
                    .limit(5)
                    .all()
                )

                online = sum(1 for d in devices_data if d.is_online)

                await manager.broadcast({
                    "type": "update",
                    "timestamp": datetime.utcnow().isoformat(),
                    "stats": {
                        "total": len(devices_data),
                        "online": online,
                        "offline": len(devices_data) - online,
                    },
                    "devices": [
                        {
                            "id": d.id,
                            "station_name": d.station_name,
                            "hostname": d.hostname,
                            "ip_address": d.ip_address,
                            "mac_address": d.mac_address,
                            "is_online": d.is_online,
                            "has_printer": d.has_printer,
                            "printer_name": d.printer_name,
                            "bytes_sent": d.bytes_sent,
                            "bytes_received": d.bytes_received,
                            "last_seen": d.last_seen.isoformat() if d.last_seen else None,
                        }
                        for d in devices_data
                    ],
                    "recent_print_jobs": [
                        {
                            "id": job.id,
                            "document_name": job.document_name,
                            "printer_name": job.printer_name,
                            "total_pages": job.total_pages,
                            "total_cost": job.total_cost,
                            "printed_at": job.printed_at.isoformat(),
                            "station_name": device.station_name,
                        }
                        for job, device in recent_jobs
                    ],
                })
            finally:
                db.close()

    except WebSocketDisconnect:
        manager.disconnect(websocket)


@app.get("/api/health")
def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


# Serve React frontend in production
if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        index = os.path.join("static", "index.html")
        if os.path.exists(index):
            return FileResponse(index)
        return {"detail": "Frontend not built yet"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)

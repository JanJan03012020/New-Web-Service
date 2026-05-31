from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import List, Optional
from pydantic import BaseModel
import json

from database import get_db
from models import Device, NetworkScan

router = APIRouter(prefix="/api/devices", tags=["devices"])


class DeviceReport(BaseModel):
    mac_address: str
    ip_address: str
    hostname: str
    station_name: Optional[str] = None
    os_info: Optional[str] = None
    has_printer: bool = False
    printer_name: Optional[str] = None
    bytes_sent: float = 0
    bytes_received: float = 0
    api_key: Optional[str] = None


class DeviceUpdate(BaseModel):
    station_name: Optional[str] = None
    cost_per_page: Optional[float] = None


@router.post("/report")
def report_device(data: DeviceReport, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.mac_address == data.mac_address).first()

    if device:
        device.ip_address = data.ip_address
        device.hostname = data.hostname
        device.is_online = True
        device.has_printer = data.has_printer
        device.printer_name = data.printer_name
        device.bytes_sent = data.bytes_sent
        device.bytes_received = data.bytes_received
        device.last_seen = datetime.utcnow()
        if data.os_info:
            device.os_info = data.os_info
        if data.station_name and not device.station_name:
            device.station_name = data.station_name
    else:
        device = Device(
            mac_address=data.mac_address,
            ip_address=data.ip_address,
            hostname=data.hostname,
            station_name=data.station_name or data.hostname,
            os_info=data.os_info,
            has_printer=data.has_printer,
            printer_name=data.printer_name,
            bytes_sent=data.bytes_sent,
            bytes_received=data.bytes_received,
            is_online=True,
        )
        db.add(device)

    db.commit()
    db.refresh(device)
    return {"status": "ok", "device_id": device.id}


@router.get("/")
def list_devices(db: Session = Depends(get_db)):
    # Mark devices offline if not seen in 2 minutes
    cutoff = datetime.utcnow() - timedelta(minutes=2)
    db.query(Device).filter(Device.last_seen < cutoff).update({"is_online": False})
    db.commit()

    devices = db.query(Device).all()
    return [
        {
            "id": d.id,
            "mac_address": d.mac_address,
            "ip_address": d.ip_address,
            "hostname": d.hostname,
            "station_name": d.station_name,
            "os_info": d.os_info,
            "is_online": d.is_online,
            "has_printer": d.has_printer,
            "printer_name": d.printer_name,
            "bytes_sent": d.bytes_sent,
            "bytes_received": d.bytes_received,
            "last_seen": d.last_seen.isoformat() if d.last_seen else None,
            "first_seen": d.first_seen.isoformat() if d.first_seen else None,
        }
        for d in devices
    ]


@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    cutoff = datetime.utcnow() - timedelta(minutes=2)
    db.query(Device).filter(Device.last_seen < cutoff).update({"is_online": False})
    db.commit()

    total = db.query(Device).count()
    online = db.query(Device).filter(Device.is_online == True).count()
    with_printer = db.query(Device).filter(Device.has_printer == True).count()

    total_sent = db.query(func.sum(Device.bytes_sent)).scalar() or 0
    total_recv = db.query(func.sum(Device.bytes_received)).scalar() or 0

    return {
        "total_devices": total,
        "online_devices": online,
        "offline_devices": total - online,
        "devices_with_printer": with_printer,
        "total_bytes_sent": total_sent,
        "total_bytes_received": total_recv,
    }


@router.put("/{device_id}")
def update_device(device_id: int, data: DeviceUpdate, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    if data.station_name:
        device.station_name = data.station_name
    db.commit()
    return {"status": "ok"}


@router.delete("/{device_id}")
def delete_device(device_id: int, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    db.delete(device)
    db.commit()
    return {"status": "deleted"}

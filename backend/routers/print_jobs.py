from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel

from database import get_db
from models import PrintJob, Device, Settings

router = APIRouter(prefix="/api/print-jobs", tags=["print_jobs"])


class PrintJobCreate(BaseModel):
    mac_address: str
    document_name: str
    printer_name: str
    pages: int = 1
    copies: int = 1


@router.post("/")
def create_print_job(data: PrintJobCreate, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.mac_address == data.mac_address).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not registered")

    cost_setting = db.query(Settings).filter(Settings.key == "cost_per_page").first()
    cost_per_page = float(cost_setting.value) if cost_setting else 2.0

    total_pages = data.pages * data.copies
    total_cost = total_pages * cost_per_page

    job = PrintJob(
        device_id=device.id,
        document_name=data.document_name,
        printer_name=data.printer_name,
        pages=data.pages,
        copies=data.copies,
        total_pages=total_pages,
        cost_per_page=cost_per_page,
        total_cost=total_cost,
        printed_at=datetime.utcnow(),
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return {"status": "ok", "job_id": job.id, "total_cost": total_cost}


@router.get("/")
def list_print_jobs(
    limit: int = Query(50, le=500),
    offset: int = Query(0),
    device_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    q = db.query(PrintJob, Device).join(Device, PrintJob.device_id == Device.id)
    if device_id:
        q = q.filter(PrintJob.device_id == device_id)
    q = q.order_by(desc(PrintJob.printed_at))
    total = q.count()
    results = q.offset(offset).limit(limit).all()

    return {
        "total": total,
        "jobs": [
            {
                "id": job.id,
                "document_name": job.document_name,
                "printer_name": job.printer_name,
                "pages": job.pages,
                "copies": job.copies,
                "total_pages": job.total_pages,
                "cost_per_page": job.cost_per_page,
                "total_cost": job.total_cost,
                "status": job.status,
                "printed_at": job.printed_at.isoformat(),
                "station_name": device.station_name,
                "device_hostname": device.hostname,
                "device_ip": device.ip_address,
            }
            for job, device in results
        ],
    }


@router.get("/stats")
def print_stats(db: Session = Depends(get_db)):
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = datetime.utcnow() - timedelta(days=7)

    total_jobs = db.query(PrintJob).count()
    today_jobs = db.query(PrintJob).filter(PrintJob.printed_at >= today).count()

    total_pages = db.query(func.sum(PrintJob.total_pages)).scalar() or 0
    today_pages = (
        db.query(func.sum(PrintJob.total_pages))
        .filter(PrintJob.printed_at >= today)
        .scalar()
        or 0
    )

    total_revenue = db.query(func.sum(PrintJob.total_cost)).scalar() or 0
    today_revenue = (
        db.query(func.sum(PrintJob.total_cost))
        .filter(PrintJob.printed_at >= today)
        .scalar()
        or 0
    )

    # Top stations by print volume this week
    top_stations = (
        db.query(Device.station_name, func.sum(PrintJob.total_pages).label("pages"))
        .join(PrintJob, Device.id == PrintJob.device_id)
        .filter(PrintJob.printed_at >= week_ago)
        .group_by(Device.station_name)
        .order_by(desc("pages"))
        .limit(5)
        .all()
    )

    return {
        "total_jobs": total_jobs,
        "today_jobs": today_jobs,
        "total_pages": total_pages,
        "today_pages": today_pages,
        "total_revenue": round(total_revenue, 2),
        "today_revenue": round(today_revenue, 2),
        "top_stations": [{"station": s, "pages": p} for s, p in top_stations],
    }


@router.get("/daily-summary")
def daily_summary(days: int = Query(7, le=30), db: Session = Depends(get_db)):
    results = []
    for i in range(days - 1, -1, -1):
        day = datetime.utcnow() - timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day.replace(hour=23, minute=59, second=59, microsecond=999999)

        jobs = db.query(PrintJob).filter(
            PrintJob.printed_at >= day_start,
            PrintJob.printed_at <= day_end,
        ).count()

        pages = db.query(func.sum(PrintJob.total_pages)).filter(
            PrintJob.printed_at >= day_start,
            PrintJob.printed_at <= day_end,
        ).scalar() or 0

        revenue = db.query(func.sum(PrintJob.total_cost)).filter(
            PrintJob.printed_at >= day_start,
            PrintJob.printed_at <= day_end,
        ).scalar() or 0

        results.append({
            "date": day_start.strftime("%Y-%m-%d"),
            "jobs": jobs,
            "pages": pages,
            "revenue": round(revenue, 2),
        })

    return results

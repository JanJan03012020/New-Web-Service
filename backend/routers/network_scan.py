from fastapi import APIRouter, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session
from fastapi import Depends
from datetime import datetime
import json
import threading

from database import get_db
from models import NetworkScan
from network_scanner import scan_network, get_local_ip, get_network_range

router = APIRouter(prefix="/api/network", tags=["network"])

# Scan state (in-memory — resets on restart)
_scan_state = {
    "running": False,
    "progress": 0,
    "total": 0,
    "result": None,
    "error": None,
    "started_at": None,
}
_scan_lock = threading.Lock()


def _run_scan(db_factory):
    global _scan_state
    with _scan_lock:
        _scan_state["running"] = True
        _scan_state["progress"] = 0
        _scan_state["result"] = None
        _scan_state["error"] = None
        _scan_state["started_at"] = datetime.utcnow().isoformat()

    def on_progress(done, total):
        with _scan_lock:
            _scan_state["progress"] = done
            _scan_state["total"] = total

    try:
        result = scan_network(progress_callback=on_progress)
        with _scan_lock:
            _scan_state["result"] = result
            _scan_state["running"] = False

        # Persist to DB
        db = db_factory()
        try:
            record = NetworkScan(
                devices_found=result["devices_found"],
                scan_data=json.dumps(result),
            )
            db.add(record)
            db.commit()
        finally:
            db.close()

    except Exception as e:
        with _scan_lock:
            _scan_state["error"] = str(e)
            _scan_state["running"] = False


@router.post("/scan/start")
def start_scan(db: Session = Depends(get_db)):
    with _scan_lock:
        if _scan_state["running"]:
            return {"status": "already_running", "message": "Scan already in progress"}

    from database import SessionLocal
    thread = threading.Thread(target=_run_scan, args=(SessionLocal,), daemon=True)
    thread.start()
    return {"status": "started", "message": "Network scan started"}


@router.get("/scan/status")
def scan_status():
    with _scan_lock:
        state = dict(_scan_state)
    return {
        "running": state["running"],
        "progress": state["progress"],
        "total": state["total"],
        "percent": round((state["progress"] / state["total"]) * 100) if state["total"] > 0 else 0,
        "error": state["error"],
        "started_at": state["started_at"],
        "has_result": state["result"] is not None,
    }


@router.get("/scan/result")
def scan_result():
    with _scan_lock:
        result = _scan_state.get("result")
    if not result:
        raise HTTPException(status_code=404, detail="No scan result yet. Run /scan/start first.")
    return result


@router.get("/scan/history")
def scan_history(limit: int = 10, db: Session = Depends(get_db)):
    scans = (
        db.query(NetworkScan)
        .order_by(NetworkScan.scanned_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": s.id,
            "scanned_at": s.scanned_at.isoformat(),
            "devices_found": s.devices_found,
        }
        for s in scans
    ]


@router.get("/scan/history/{scan_id}")
def scan_history_detail(scan_id: int, db: Session = Depends(get_db)):
    scan = db.query(NetworkScan).filter(NetworkScan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return json.loads(scan.scan_data)


@router.get("/info")
def network_info():
    local_ip = get_local_ip()
    network = get_network_range(local_ip)
    return {
        "local_ip": local_ip,
        "network": str(network),
        "total_hosts": network.num_addresses - 2,
    }

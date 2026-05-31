"""
PisoNet Agent — runs on each Windows PC in the pisonet.
Reports device info + print jobs to the cloud management server.
"""
import os
import sys
import time
import logging
import requests
import threading
from dotenv import load_dotenv

from network_info import get_all_info
from print_monitor import PrintMonitor, get_installed_printers, get_default_printer

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("pisonet_agent.log"),
    ],
)
logger = logging.getLogger(__name__)

SERVER_URL = os.getenv("SERVER_URL", "http://localhost:8000")
STATION_NAME = os.getenv("STATION_NAME", "")
REPORT_INTERVAL = int(os.getenv("REPORT_INTERVAL", "30"))  # seconds


def get_printer_info():
    printers = get_installed_printers()
    default = get_default_printer()
    return {
        "has_printer": len(printers) > 0,
        "printer_name": default or (printers[0] if printers else None),
    }


def report_device():
    try:
        info = get_all_info()
        printer_info = get_printer_info()
        payload = {
            **info,
            **printer_info,
        }
        if STATION_NAME:
            payload["station_name"] = STATION_NAME

        resp = requests.post(
            f"{SERVER_URL}/api/devices/report",
            json=payload,
            timeout=10,
        )
        if resp.status_code == 200:
            logger.info(f"Device reported: {info['hostname']} ({info['ip_address']})")
        else:
            logger.warning(f"Device report failed: {resp.status_code}")
    except requests.ConnectionError:
        logger.warning(f"Cannot reach server at {SERVER_URL}")
    except Exception as e:
        logger.error(f"Report error: {e}")


def on_print_job(job: dict):
    try:
        info = get_all_info()
        payload = {
            "mac_address": info["mac_address"],
            "document_name": job["document_name"],
            "printer_name": job["printer_name"],
            "pages": max(job.get("pages", 1), 1),
            "copies": max(job.get("copies", 1), 1),
        }
        resp = requests.post(
            f"{SERVER_URL}/api/print-jobs/",
            json=payload,
            timeout=10,
        )
        if resp.status_code == 200:
            data = resp.json()
            logger.info(
                f"Print job logged: {job['document_name']} "
                f"({payload['pages']} pages x {payload['copies']} copies) "
                f"= PHP {data.get('total_cost', '?')}"
            )
        else:
            logger.warning(f"Print job report failed: {resp.status_code} {resp.text}")
    except Exception as e:
        logger.error(f"Print job report error: {e}")


def periodic_report():
    while True:
        report_device()
        time.sleep(REPORT_INTERVAL)


def main():
    logger.info("=" * 50)
    logger.info("PisoNet Agent Starting")
    logger.info(f"Server: {SERVER_URL}")
    logger.info(f"Station: {STATION_NAME or 'auto-detect'}")
    logger.info(f"Report interval: {REPORT_INTERVAL}s")
    logger.info("=" * 50)

    # Initial report
    report_device()

    # Start periodic reporting in background
    t = threading.Thread(target=periodic_report, daemon=True)
    t.start()

    # Start print monitor
    monitor = PrintMonitor(callback=on_print_job)
    monitor.start()

    logger.info("Agent running. Press Ctrl+C to stop.")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        logger.info("Agent stopped.")
        monitor.stop()


if __name__ == "__main__":
    main()

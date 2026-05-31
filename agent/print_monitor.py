import threading
import time
import logging

logger = logging.getLogger(__name__)


def get_installed_printers():
    """Return list of installed printer names on Windows."""
    try:
        import win32print
        printers = win32print.EnumPrinters(
            win32print.PRINTER_ENUM_LOCAL | win32print.PRINTER_ENUM_CONNECTIONS
        )
        return [p[2] for p in printers]
    except ImportError:
        logger.warning("win32print not available")
        return []
    except Exception as e:
        logger.error(f"Error getting printers: {e}")
        return []


def get_default_printer():
    try:
        import win32print
        return win32print.GetDefaultPrinter()
    except Exception:
        return None


def get_print_jobs_wmi():
    """Return current/recent print jobs via WMI."""
    jobs = []
    try:
        import wmi
        c = wmi.WMI()
        for job in c.Win32_PrintJob():
            jobs.append({
                "document_name": job.Document or "Unknown",
                "printer_name": job.Name.split(",")[0] if job.Name else "Unknown",
                "pages": job.TotalPages or 1,
                "copies": 1,
                "status": job.Status or "Unknown",
                "job_id": job.JobId,
            })
    except Exception as e:
        logger.error(f"WMI print job error: {e}")
    return jobs


class PrintMonitor:
    """
    Monitors the Windows print spooler for new print jobs.
    Calls callback(job_dict) whenever a new job is detected.
    """

    def __init__(self, callback):
        self.callback = callback
        self.seen_jobs = set()
        self._stop = threading.Event()
        self._thread = None

    def start(self):
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()
        logger.info("Print monitor started")

    def stop(self):
        self._stop.set()

    def _run(self):
        while not self._stop.is_set():
            try:
                self._check_jobs()
            except Exception as e:
                logger.error(f"Print monitor error: {e}")
            time.sleep(3)

    def _check_jobs(self):
        try:
            import win32print
            printers = win32print.EnumPrinters(
                win32print.PRINTER_ENUM_LOCAL | win32print.PRINTER_ENUM_CONNECTIONS
            )
            for _, _, printer_name, _ in printers:
                try:
                    handle = win32print.OpenPrinter(printer_name)
                    jobs = win32print.EnumJobs(handle, 0, 100, 1)
                    win32print.ClosePrinter(handle)
                    for job in jobs:
                        job_id = job.get("JobId")
                        doc = job.get("pDocument", "Unknown Document")
                        pages = job.get("TotalPages", 0) or job.get("PagesPrinted", 1) or 1
                        status = job.get("Status", 0)

                        key = f"{printer_name}:{job_id}:{doc}"
                        if key not in self.seen_jobs:
                            self.seen_jobs.add(key)
                            # Limit cache size
                            if len(self.seen_jobs) > 1000:
                                self.seen_jobs = set(list(self.seen_jobs)[-500:])
                            self.callback({
                                "document_name": doc,
                                "printer_name": printer_name,
                                "pages": pages,
                                "copies": job.get("Copies", 1) or 1,
                                "job_id": job_id,
                            })
                except Exception:
                    pass
        except ImportError:
            # Fallback to WMI if win32print not available
            for job in get_print_jobs_wmi():
                key = f"{job['printer_name']}:{job['job_id']}:{job['document_name']}"
                if key not in self.seen_jobs:
                    self.seen_jobs.add(key)
                    self.callback(job)

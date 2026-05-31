import socket
import uuid
import platform
import psutil
import subprocess
import re


def get_mac_address():
    mac = uuid.getnode()
    return ":".join(("%012X" % mac)[i:i+2] for i in range(0, 12, 2))


def get_ip_address():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


def get_hostname():
    return socket.gethostname()


def get_os_info():
    return f"{platform.system()} {platform.release()} {platform.version()}"


def get_network_stats():
    counters = psutil.net_io_counters()
    return {
        "bytes_sent": counters.bytes_sent,
        "bytes_received": counters.bytes_recv,
    }


def get_all_info():
    stats = get_network_stats()
    return {
        "mac_address": get_mac_address(),
        "ip_address": get_ip_address(),
        "hostname": get_hostname(),
        "os_info": get_os_info(),
        "bytes_sent": stats["bytes_sent"],
        "bytes_received": stats["bytes_received"],
    }

"""
LAN Network Scanner — discovers all devices on the local subnet.
Uses ping sweep + ARP table. Works for wired and wireless devices.
"""
import subprocess
import socket
import ipaddress
import platform
import re
import concurrent.futures
from datetime import datetime


# Common MAC OUI prefixes to guess connection type / vendor
WIFI_VENDORS = {
    "00:16:EA", "00:17:F2", "00:1A:11", "00:1C:BF", "00:1D:E0",
    "00:21:6A", "00:22:6B", "00:23:14", "00:24:D6", "00:26:CB",
    "40:4A:03", "48:5D:60", "58:6D:8F", "60:57:18", "74:DA:38",
    "7C:2E:BD", "88:1D:FC", "A0:63:91", "B4:E6:2D", "D0:57:7B",
}

VENDOR_MAP = {
    "00:50:56": "VMware",    "00:0C:29": "VMware",
    "08:00:27": "VirtualBox","00:1A:A0": "Dell",
    "00:14:22": "Dell",      "00:21:70": "Dell",
    "3C:97:0E": "HP",        "FC:15:B4": "HP",
    "00:1F:29": "HP",        "00:23:AE": "Cisco",
    "00:0F:66": "Cisco",     "00:1E:49": "Cisco",
    "AC:BC:32": "Apple",     "F0:18:98": "Apple",
    "3C:15:C2": "Apple",     "00:1C:42": "Parallels",
    "28:D2:44": "Xiaomi",    "FC:64:BA": "Xiaomi",
    "10:02:B5": "Samsung",   "00:15:99": "Samsung",
    "E8:4E:CE": "Huawei",    "54:89:98": "Huawei",
    "50:C7:BF": "TP-Link",   "C4:E9:84": "TP-Link",
    "18:D6:C7": "TP-Link",
}


def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except Exception:
        return "127.0.0.1"
    finally:
        s.close()


def get_network_range(local_ip: str, prefix_len: int = 24):
    net = ipaddress.IPv4Network(f"{local_ip}/{prefix_len}", strict=False)
    return net


def ping_host(ip: str) -> bool:
    """Ping a single IP. Returns True if reachable."""
    flag = "-n" if platform.system() == "Windows" else "-c"
    wait = "-w" if platform.system() == "Windows" else "-W"
    try:
        result = subprocess.run(
            ["ping", flag, "1", wait, "300", str(ip)],
            capture_output=True,
            timeout=2,
        )
        return result.returncode == 0
    except Exception:
        return False


def get_arp_table() -> dict:
    """
    Read system ARP cache. Returns {ip: mac} dict.
    Works on Windows (arp -a) and Linux.
    """
    entries = {}
    try:
        result = subprocess.run(["arp", "-a"], capture_output=True, text=True, timeout=5)
        output = result.stdout

        if platform.system() == "Windows":
            # Windows: "  192.168.1.1        aa-bb-cc-dd-ee-ff     dynamic"
            for line in output.splitlines():
                m = re.search(
                    r"(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\s+([\da-fA-F]{2}[-:][\da-fA-F]{2}[-:][\da-fA-F]{2}[-:][\da-fA-F]{2}[-:][\da-fA-F]{2}[-:][\da-fA-F]{2})",
                    line,
                )
                if m:
                    ip = m.group(1)
                    mac = m.group(2).replace("-", ":").upper()
                    entries[ip] = mac
        else:
            # Linux: "192.168.1.1 ether aa:bb:cc:dd:ee:ff"
            for line in output.splitlines():
                m = re.search(
                    r"(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}).*?([\da-fA-F]{2}:[\da-fA-F]{2}:[\da-fA-F]{2}:[\da-fA-F]{2}:[\da-fA-F]{2}:[\da-fA-F]{2})",
                    line,
                )
                if m:
                    entries[m.group(1)] = m.group(2).upper()
    except Exception:
        pass
    return entries


def resolve_hostname(ip: str) -> str:
    try:
        return socket.gethostbyaddr(ip)[0]
    except Exception:
        return ""


def get_vendor(mac: str) -> str:
    if not mac:
        return "Unknown"
    prefix = mac[:8].upper()
    return VENDOR_MAP.get(prefix, "Unknown")


def guess_connection_type(mac: str) -> str:
    if not mac:
        return "Unknown"
    prefix = mac[:8].upper()
    if prefix in WIFI_VENDORS:
        return "Wireless"
    return "LAN / Wireless"


def scan_network(progress_callback=None) -> dict:
    """
    Full network scan:
    1. Ping sweep (parallel)
    2. Read ARP table
    3. Resolve hostnames
    Returns scan result dict.
    """
    local_ip = get_local_ip()
    network = get_network_range(local_ip)
    hosts = [str(h) for h in network.hosts()]
    total = len(hosts)

    scanned = 0
    alive_ips = set()

    # Parallel ping sweep
    with concurrent.futures.ThreadPoolExecutor(max_workers=64) as executor:
        futures = {executor.submit(ping_host, ip): ip for ip in hosts}
        for future in concurrent.futures.as_completed(futures):
            ip = futures[future]
            scanned += 1
            try:
                if future.result():
                    alive_ips.add(ip)
            except Exception:
                pass
            if progress_callback:
                progress_callback(scanned, total)

    # Read ARP table (captures more than just ping-responsive hosts)
    arp = get_arp_table()
    for ip, mac in arp.items():
        if ip in hosts:
            alive_ips.add(ip)

    # Build device list
    devices = []
    local_ip_str = local_ip

    for ip in sorted(alive_ips, key=lambda x: [int(p) for p in x.split(".")]):
        mac = arp.get(ip, "")
        hostname = resolve_hostname(ip)
        vendor = get_vendor(mac)
        conn_type = guess_connection_type(mac)
        is_gateway = ip.endswith(".1") or ip.endswith(".254")
        is_self = ip == local_ip_str

        devices.append({
            "ip_address": ip,
            "mac_address": mac or "N/A",
            "hostname": hostname or ip,
            "vendor": vendor,
            "connection_type": conn_type,
            "is_gateway": is_gateway,
            "is_self": is_self,
            "is_alive": ip in alive_ips,
        })

    return {
        "local_ip": local_ip,
        "network": str(network),
        "total_scanned": total,
        "devices_found": len(devices),
        "scanned_at": datetime.utcnow().isoformat(),
        "devices": devices,
    }

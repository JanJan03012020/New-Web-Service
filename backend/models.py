from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    mac_address = Column(String, unique=True, index=True)
    ip_address = Column(String)
    hostname = Column(String)
    station_name = Column(String)
    os_info = Column(String)
    is_online = Column(Boolean, default=False)
    has_printer = Column(Boolean, default=False)
    printer_name = Column(String, nullable=True)
    bytes_sent = Column(Float, default=0)
    bytes_received = Column(Float, default=0)
    last_seen = Column(DateTime, default=datetime.utcnow)
    first_seen = Column(DateTime, default=datetime.utcnow)
    api_key = Column(String, nullable=True)

    print_jobs = relationship("PrintJob", back_populates="device")


class PrintJob(Base):
    __tablename__ = "print_jobs"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id"))
    document_name = Column(String)
    printer_name = Column(String)
    pages = Column(Integer, default=1)
    copies = Column(Integer, default=1)
    total_pages = Column(Integer, default=1)
    cost_per_page = Column(Float, default=2.0)
    total_cost = Column(Float, default=0)
    status = Column(String, default="completed")
    printed_at = Column(DateTime, default=datetime.utcnow)

    device = relationship("Device", back_populates="print_jobs")


class NetworkScan(Base):
    __tablename__ = "network_scans"

    id = Column(Integer, primary_key=True, index=True)
    scanned_at = Column(DateTime, default=datetime.utcnow)
    devices_found = Column(Integer, default=0)
    scan_data = Column(Text)


class Settings(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True)
    value = Column(String)
    updated_at = Column(DateTime, default=datetime.utcnow)

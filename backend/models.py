from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Date
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True) # Usually email or employee ID
    full_name = Column(String)
    hashed_password = Column(String)
    role = Column(String, default="user") # "admin" or "user"

    entries = relationship("WorkEntry", back_populates="owner")

class WorkEntry(Base):
    __tablename__ = "work_entries"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date)
    shift = Column(String) # Mañana, Tarde, Noche
    task = Column(String) # Sacos, Quemadores, Filtros
    amount = Column(Float) # Hours
    created_at = Column(DateTime, default=datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="entries")

class AnnualRate(Base):
    __tablename__ = "annual_rates"

    year = Column(Integer, primary_key=True)
    rate = Column(Float) # Euros per hour

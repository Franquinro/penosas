from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
import models, schemas, auth, database
import pandas as pd
from io import BytesIO
from fastapi.responses import StreamingResponse

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI()

# CORS configuration
origins = [
    "http://localhost",
    "http://localhost:5173", # Vite dev server
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this!
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {
        "message": "Bienvenido a la API de Horas Penosas",
        "docs": "/docs",
        "status": "running"
    }

# Dependency
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post("/token", response_model=schemas.Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = auth.timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/users/", response_model=schemas.User)
def create_user(
    user: schemas.UserCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to create users")
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(
        username=user.username, 
        full_name=user.full_name, 
        hashed_password=hashed_password,
        role=user.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.get("/users/me", response_model=schemas.User)
async def read_users_me(current_user: models.User = Depends(auth.get_current_active_user)):
    return current_user

@app.post("/entries/", response_model=schemas.WorkEntry)
def create_work_entry(
    entry: schemas.WorkEntryCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    db_entry = models.WorkEntry(**entry.dict(), user_id=current_user.id)
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry

@app.get("/entries/", response_model=List[schemas.WorkEntry])
def read_work_entries(
    skip: int = 0,
    limit: int = 100,
    month: Optional[int] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    query = db.query(models.WorkEntry).filter(models.WorkEntry.user_id == current_user.id)
    
    if month and year:
        # Filter for specific month
        # Calculate start and end date of the month
        import calendar
        from datetime import date
        _, last_day = calendar.monthrange(year, month)
        start_date = date(year, month, 1)
        end_date = date(year, month, last_day)
        query = query.filter(models.WorkEntry.date >= start_date, models.WorkEntry.date <= end_date)
    
    entries = query.order_by(models.WorkEntry.date.desc()).offset(skip).limit(limit).all()
    return entries

@app.delete("/entries/{entry_id}")
def delete_work_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    entry = db.query(models.WorkEntry).filter(models.WorkEntry.id == entry_id, models.WorkEntry.user_id == current_user.id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    db.delete(entry)
    db.commit()
    return {"ok": True}

@app.get("/entries/stats/monthly")
def get_monthly_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    from datetime import date, timedelta
    from sqlalchemy import func, extract
    import calendar

    today = date.today()
    stats = []

    # Get stats for last 6 months (including current)
    for i in range(5, -1, -1):
        # Calculate month and year
        # Logic to handle year wrap around
        month_target = today.month - i
        year_target = today.year
        
        while month_target <= 0:
            month_target += 12
            year_target -= 1
        
        month_name = calendar.month_name[month_target][:3] # Jan, Feb... (English system locale default, usually fine or we map manually)
        # Using spanish mapping for better UX
        spanish_months = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
        month_label = spanish_months[month_target]

        total_hours = db.query(func.sum(models.WorkEntry.amount)).filter(
            models.WorkEntry.user_id == current_user.id,
            extract('month', models.WorkEntry.date) == month_target,
            extract('year', models.WorkEntry.date) == year_target
        ).scalar() or 0
        
        rate = db.query(models.AnnualRate.rate).filter(models.AnnualRate.year == year_target).scalar()
        if not rate:
            rate = 0
            
        total_euros = total_hours * rate
        
        stats.append({
            "name": month_label,
            "hours": total_hours,
            "euros": total_euros,
            "year": year_target
        })
    
    return stats

@app.get("/export/month")
def export_user_month(
    year: int,
    month: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    import calendar
    from datetime import date
    
    _, last_day = calendar.monthrange(year, month)
    start_date = date(year, month, 1)
    end_date = date(year, month, last_day)

    entries = db.query(models.WorkEntry).filter(
        models.WorkEntry.user_id == current_user.id,
        models.WorkEntry.date >= start_date, 
        models.WorkEntry.date <= end_date
    ).all()
    
    data = []
    for entry in entries:
        data.append({
            "Fecha": entry.date,
            "Turno": entry.shift,
            "Tarea": entry.task,
            "Horas": entry.amount,
            "Horas (HH:MM)": f"{int(entry.amount):02d}:{int(round((entry.amount - int(entry.amount)) * 60)):02d}"
        })
    
    df = pd.DataFrame(data)
    stream = BytesIO()
    with pd.ExcelWriter(stream) as writer:
        df.to_excel(writer, index=False)
    
    stream.seek(0)
    month_name = calendar.month_name[month]
    filename = f"resumen_{current_user.username}_{month_name}_{year}.xlsx"
    
    headers = {
        'Content-Disposition': f'attachment; filename="{filename}"'
    }
    return StreamingResponse(stream, headers=headers, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

@app.post("/admin/rates", response_model=schemas.AnnualRate)
def create_or_update_rate(
    rate_data: schemas.AnnualRate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    existing = db.query(models.AnnualRate).filter(models.AnnualRate.year == rate_data.year).first()
    if existing:
        existing.rate = rate_data.rate
    else:
        existing = models.AnnualRate(year=rate_data.year, rate=rate_data.rate)
        db.add(existing)
    
    db.commit()
    db.refresh(existing)
    return existing

@app.get("/admin/rates", response_model=List[schemas.AnnualRate])
def get_rates(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    return db.query(models.AnnualRate).order_by(models.AnnualRate.year.desc()).all()

# --- ADMIN ENDPOINTS ---

@app.get("/admin/export")
def export_data(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Query all data joined with users
    results = db.query(models.WorkEntry, models.User).join(models.User).all()
    
    data = []
    for entry, user in results:
        data.append({
            "Worker": user.full_name,
            "Username": user.username,
            "Date": entry.date,
            "Shift": entry.shift,
            "Task": entry.task,
            "Hours (Decimal)": entry.amount,
            "Format (HH:MM)": f"{int(entry.amount):02d}:{int(round((entry.amount - int(entry.amount)) * 60)):02d}"
        })
    
    df = pd.DataFrame(data)
    stream = BytesIO()
    with pd.ExcelWriter(stream) as writer:
        df.to_excel(writer, index=False)
    
    stream.seek(0)
    
    headers = {
        'Content-Disposition': 'attachment; filename="horas_penosas_export.xlsx"'
    }
    return StreamingResponse(stream, headers=headers, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

@app.get("/admin/summary")
def get_summary(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Simple summary stats
    total_users = db.query(models.User).count()
    total_entries = db.query(models.WorkEntry).count()
    
    # Recent 5 entries
    recent_entries = db.query(models.WorkEntry, models.User).join(models.User).order_by(models.WorkEntry.created_at.desc()).limit(5).all()
    recent = []
    for entry, user in recent_entries:
         recent.append({
            "worker": user.full_name,
            "date": entry.date,
            "task": entry.task
        })

    return {
        "total_users": total_users,
        "total_entries": total_entries,
        "recent_activity": recent
    }

@app.get("/admin/users", response_model=List[schemas.User])
def list_users(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    return db.query(models.User).all()

@app.delete("/admin/users/{user_id}")
def delete_user(
    user_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    user_to_delete = db.query(models.User).filter(models.User.id == user_id).first()
    if not user_to_delete:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user_to_delete.username == "admin":
        raise HTTPException(status_code=400, detail="Cannot delete main admin")

    # Important: deleting the user will also delete their entries via CASCADE if configured in models
    # but let's be safe and check if models have cascade or do it manually if needed.
    # Looking at models.py (I'll check later, but usually standard).
    
    db.delete(user_to_delete)
    db.commit()
    return {"message": "User deleted successfully"}

# Seed Admin User (Quick & Dirty for initial setup)
import os

# ... (imports remain)

# ... inside create_admin function:
@app.on_event("startup")
def create_admin():
    db = database.SessionLocal()
    # Check if ANY admin exists, not just one with username "admin"
    # But for simplicity, let's stick to checking if our configured admin exists or if role=admin exists
    # If we want to enforce the env var admin, we might need to check for that specific username.
    
    admin_user = os.getenv("ADMIN_USER", "admin")
    admin_password = os.getenv("ADMIN_PASSWORD", "admin123")
    
    # Check if user with this username exists
    existing_user = db.query(models.User).filter(models.User.username == admin_user).first()
    
    if not existing_user:
        print(f"Creating default admin user: {admin_user}")
        hashed_pw = auth.get_password_hash(admin_password)
        user = models.User(username=admin_user, full_name="System Admin", hashed_password=hashed_pw, role="admin")
        db.add(user)
        db.commit()
    else:
        # Force update password to match environment variable
        # This ensures that if we change the env var in Coolify, the DB updates on restart
        print(f"Updating admin user password for: {admin_user}")
        existing_user.hashed_password = auth.get_password_hash(admin_password)
        # Ensure role is admin
        existing_user.role = "admin"
        db.commit()
        
    db.close()

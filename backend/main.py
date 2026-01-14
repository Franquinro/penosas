from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
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
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
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
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    entries = db.query(models.WorkEntry).filter(models.WorkEntry.user_id == current_user.id).offset(skip).limit(limit).all()
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
            "Hours": entry.amount
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

# Seed Admin User (Quick & Dirty for initial setup)
@app.on_event("startup")
def create_admin():
    db = database.SessionLocal()
    admin = db.query(models.User).filter(models.User.role == "admin").first()
    if not admin:
        # Default admin: admin / admin123
        # IN PROD: Change this immediately
        print("Creating default admin user...")
        hashed_pw = auth.get_password_hash("admin123")
        user = models.User(username="admin", full_name="System Admin", hashed_password=hashed_pw, role="admin")
        db.add(user)
        db.commit()
    db.close()

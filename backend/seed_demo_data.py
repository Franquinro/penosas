import random
from datetime import date, timedelta
from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models
import auth
import calendar

# Initialize tables if not exist (ensures script works even on fresh db)
models.Base.metadata.create_all(bind=engine)

def seed_data():
    db: Session = SessionLocal()
    
    try:
        # Define demo users
        demo_users = ["demo1", "demo2"]
        
        for username in demo_users:
            print(f"Processing user: {username}")
            
            # 1. Create User if not exists
            user = db.query(models.User).filter(models.User.username == username).first()
            if not user:
                hashed_pw = auth.get_password_hash("demo123")
                user = models.User(
                    username=username,
                    full_name=f"Usuario {username.capitalize()}",
                    hashed_password=hashed_pw,
                    role="user"
                )
                db.add(user)
                db.commit()
                db.refresh(user)
                print(f"  Created user {username}")
            else:
                print(f"  User {username} already exists, clearing previous entries...")
                # Optional: Clear existing entries for a clean slate
                db.query(models.WorkEntry).filter(models.WorkEntry.user_id == user.id).delete()
                db.commit()

            # 2. Generate Data for last 6 months
            today = date.today()
            
            # Shifts and Tasks for random selection
            shifts = ["Mañana", "Tarde", "Noche"]
            tasks = ["Sacos", "Quemadores", "Filtros", "Otros"]

            for i in range(6):
                # Calculate year and month
                # i=0 is current month, i=1 is previous, etc.
                month_target = today.month - i
                year_target = today.year
                
                while month_target <= 0:
                    month_target += 12
                    year_target -= 1
                
                # Determine how many days in this month
                _, last_day = calendar.monthrange(year_target, month_target)
                
                # Randomize totals for this month
                num_entries = random.randint(8, 12)
                total_hours_target = random.uniform(20.0, 30.0)
                
                # Generate unique random days
                # Ensure we don't pick days in the future if we are in current month
                max_d = last_day
                if month_target == today.month and year_target == today.year:
                    max_d = today.day
                
                possible_days = list(range(1, max_d + 1))
                if len(possible_days) < num_entries:
                    selected_days = possible_days # Not enough days passed in current month
                else:
                    selected_days = random.sample(possible_days, num_entries)
                
                selected_days.sort()

                # Distribute hours (rough algo)
                base_hours = total_hours_target / len(selected_days) if selected_days else 0

                for day in selected_days:
                    entry_date = date(year_target, month_target, day)
                    
                    # Add variance to hours
                    hours = base_hours * random.uniform(0.8, 1.2)
                    hours = round(hours * 2) / 2 # Round to nearest 0.5 for realism

                    entry = models.WorkEntry(
                        user_id=user.id,
                        date=entry_date,
                        shift=random.choice(shifts),
                        task=random.choice(tasks),
                        amount=hours
                    )
                    db.add(entry)
                
                print(f"  Month {month_target}/{year_target}: Added {len(selected_days)} entries (~{total_hours_target:.1f}h)")
            
            db.commit()
            print(f"  Commit successful for {username}")

    except Exception as e:
        print(f"Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()

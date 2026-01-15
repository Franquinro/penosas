import os
import sys

# Add current dir to sys.path to ensure imports work if run directly
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, DB_PATH
import models

def print_status():
    print(f"\n--- DIAGNOSTICO BBDD: {DB_PATH} ---")
    print(f"ENV ADMIN_USER: {os.getenv('ADMIN_USER', 'No definido')}")
    
    if not os.path.exists(DB_PATH):
        print("❌ EL ARCHIVO DE BBDD NO EXISTE.")
        return

    try:
        session = SessionLocal()
        users = session.query(models.User).all()
        print(f"✅ Conexión exitosa. Total Usuarios: {len(users)}")
        for u in users:
            print(f"   👤 Usuario: '{u.username}' | Rol: {u.role} | ID: {u.id}")
        session.close()
    except Exception as e:
        print(f"❌ Error leyendo BBDD: {e}")
    print("-------------------------------------------\n")

def nuke_db():
    print(f"\n⚠️  ATENCION: BORRANDO BASE DE DATOS EN: {DB_PATH}")
    try:
        if os.path.exists(DB_PATH):
            os.remove(DB_PATH)
            print("✅ Archivo .db borrado correctamente.")
            print("♻️  REINICIA EL CONTENEDOR AHORA PARA REGENERARLA.")
        else:
            print("ℹ️  El archivo no existía.")
    except Exception as e:
        print(f"❌ Error al borrar: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "nuke":
        nuke_db()
    else:
        print_status()
        print("Para borrar la BBDD usa: python debug_utils.py nuke")

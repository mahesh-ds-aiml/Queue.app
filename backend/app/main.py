import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.config import settings
from app.database import engine, Base, SessionLocal
from app.routers import auth, slots, settings as settings_router, orders, owner, predict
from app.services.cleanup_service import cleanup_old_collected_files

# Create tables
Base.metadata.create_all(bind=engine)

# Periodic background task runner for file cleanup
async def periodic_cleanup_task():
    while True:
        try:
            db = SessionLocal()
            removed = cleanup_old_collected_files(db)
            db.close()
            if removed > 0:
                print(f"[Cleanup Task] Auto-deleted {removed} old file(s) for collected orders > 24h.")
        except Exception as e:
            print(f"[Cleanup Task Error] {e}")
        await asyncio.sleep(3600)  # Check every hour

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    cleanup_task = asyncio.create_task(periodic_cleanup_task())
    yield
    # Shutdown
    cleanup_task.cancel()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Uploads dir static access for preview if needed
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

# Include API Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(slots.router, prefix=settings.API_V1_STR)
app.include_router(settings_router.router, prefix=settings.API_V1_STR)
app.include_router(orders.router, prefix=settings.API_V1_STR)
app.include_router(owner.router, prefix=settings.API_V1_STR)
app.include_router(predict.router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "app": settings.PROJECT_NAME,
        "status": "running",
        "docs": "/docs",
        "api_v1": settings.API_V1_STR
    }

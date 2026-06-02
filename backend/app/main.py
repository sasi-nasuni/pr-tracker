import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routes import health, pull_requests, team

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

app = FastAPI(
    title="GitHub PR Tracker API",
    description="Backend API for the GitHub PR Tracker Dashboard",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)

# Register routes
app.include_router(pull_requests.router)
app.include_router(team.router)
app.include_router(health.router)


@app.get("/")
async def root():
    return {"message": "GitHub PR Tracker API", "docs": "/docs"}

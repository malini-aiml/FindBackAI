from ai_matching import calculate_text_similarity
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Literal
from sqlalchemy.orm import Session

from database import Base, engine, SessionLocal
import models


# ==================================================
# FIND BACK AI - FASTAPI BACKEND
# ==================================================

app = FastAPI(
    title="FindBack AI API",
    description="Backend API for FindBack AI Lost and Found System",
    version="1.0.0"
)


# ==================================================
# CORS CONFIGURATION
# ==================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8081",
        "http://127.0.0.1:8081",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================================================
# CREATE DATABASE TABLES
# ==================================================

Base.metadata.create_all(bind=engine)


# ==================================================
# DATABASE SESSION
# ==================================================

def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


# ==================================================
# ITEM REQUEST MODEL
# ==================================================

class ItemCreate(BaseModel):
    type: Literal["lost", "found"]
    item_name: str
    description: str
    location: str
    date: str
    time: str
    image: str = ""
    status: str = "Searching"


# ==================================================
# HOME
# ==================================================

@app.get("/")
def home():
    return {
        "message": "FindBack AI Backend is running"
    }


# ==================================================
# HEALTH CHECK
# ==================================================

@app.get("/health")
def health():
    return {
        "status": "healthy"
    }
class TextMatchRequest(BaseModel):
    text1: str
    text2: str


@app.post("/ai/text-similarity")
def text_similarity(request: TextMatchRequest):
    score = calculate_text_similarity(
        request.text1,
        request.text2
    )

    return {
        "text1": request.text1,
        "text2": request.text2,
        "similarity_score": score
    }


# ==================================================
# CREATE ITEM
# ==================================================

@app.post("/items")
def create_item(
    item: ItemCreate,
    db: Session = Depends(get_db)
):

    new_item = models.Item(
        type=item.type,
        item_name=item.item_name,
        description=item.description,
        location=item.location,
        date=item.date,
        time=item.time,
        image=item.image,
        status=item.status
    )

    db.add(new_item)
    db.commit()
    db.refresh(new_item)

    return {
        "message": "Item report saved successfully",
        "item": {
            "id": new_item.id,
            "type": new_item.type,
            "item_name": new_item.item_name,
            "description": new_item.description,
            "location": new_item.location,
            "date": new_item.date,
            "time": new_item.time,
            "image": new_item.image,
            "status": new_item.status
        }
    }


# ==================================================
# GET ALL ITEMS
# ==================================================

@app.get("/items")
def get_items(
    db: Session = Depends(get_db)
):

    items = db.query(models.Item).all()

    return {
        "count": len(items),
        "items": [
            {
                "id": item.id,
                "type": item.type,
                "item_name": item.item_name,
                "description": item.description,
                "location": item.location,
                "date": item.date,
                "time": item.time,
                "image": item.image,
                "status": item.status
            }
            for item in items
        ]
    }
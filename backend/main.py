from passlib.context import CryptContext
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


pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
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
# REQUEST MODELS
# ==================================================

class UserCreate(BaseModel):
    name: str
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class ItemCreate(BaseModel):
    user_id: int
    type: Literal["lost", "found"]
    item_name: str
    description: str
    location: str
    date: str
    time: str
    image: str = ""
    status: str = "Searching"


class TextMatchRequest(BaseModel):
    text1: str
    text2: str


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


# ==================================================
# AI TEXT SIMILARITY
# ==================================================

@app.post("/ai/text-similarity")
def text_similarity(
    request: TextMatchRequest
):
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

    # Check whether the user exists
    user = (
        db.query(models.User)
        .filter(
            models.User.id == item.user_id
        )
        .first()
    )

    if not user:
        return {
            "message": "User not found"
        }

    # Create new item
    new_item = models.Item(
        user_id=item.user_id,
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
            "user_id": new_item.user_id,
            "uploaded_by": user.name,
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

    result = []

    for item in items:

        # Find the user who uploaded the item
        user = (
            db.query(models.User)
            .filter(
                models.User.id == item.user_id
            )
            .first()
        )

        result.append({
            "id": item.id,
            "user_id": item.user_id,
            "uploaded_by": (
                user.name
                if user
                else "Unknown User"
            ),
            "type": item.type,
            "item_name": item.item_name,
            "description": item.description,
            "location": item.location,
            "date": item.date,
            "time": item.time,
            "image": item.image,
            "status": item.status
        })

    return {
        "count": len(result),
        "items": result
    }


# ==================================================
# GET USER CONTACT DETAILS
# ==================================================

@app.get("/users/{user_id}/contact")
def get_user_contact(
    user_id: int,
    db: Session = Depends(get_db)
):

    user = (
        db.query(models.User)
        .filter(
            models.User.id == user_id
        )
        .first()
    )

    if not user:
        return {
            "message": "User not found"
        }

    return {
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email
        }
    }


# ==================================================
# REGISTER USER
# ==================================================

@app.post("/auth/register")
def register_user(
    user: UserCreate,
    db: Session = Depends(get_db)
):

    existing_user = (
        db.query(models.User)
        .filter(
            models.User.email == user.email
        )
        .first()
    )

    if existing_user:
        return {
            "message": "Email already registered"
        }

    hashed_password = pwd_context.hash(
        user.password
    )

    new_user = models.User(
        name=user.name,
        email=user.email,
        password_hash=hashed_password
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "Account created successfully",
        "user": {
            "id": new_user.id,
            "name": new_user.name,
            "email": new_user.email
        }
    }


# ==================================================
# LOGIN USER
# ==================================================

@app.post("/auth/login")
def login_user(
    user: UserLogin,
    db: Session = Depends(get_db)
):

    existing_user = (
        db.query(models.User)
        .filter(
            models.User.email == user.email
        )
        .first()
    )

    if not existing_user:
        return {
            "message": "Invalid email or password"
        }

    if not pwd_context.verify(
        user.password,
        existing_user.password_hash
    ):
        return {
            "message": "Invalid email or password"
        }

    return {
        "message": "Login successful",
        "user": {
            "id": existing_user.id,
            "name": existing_user.name,
            "email": existing_user.email
        }
    }
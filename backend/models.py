from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from database import Base
from datetime import datetime


class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)

    # User who created the report
    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
        index=True
    )

    type = Column(String, nullable=False)
    item_name = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    location = Column(String, nullable=False)
    date = Column(String, nullable=False)
    time = Column(String, nullable=False)
    image = Column(String, nullable=True)
    status = Column(String, default="Searching")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
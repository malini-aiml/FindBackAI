from sqlalchemy import Column, Integer, String, Text
from database import Base


class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)

    type = Column(String, nullable=False)
    item_name = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    location = Column(String, nullable=False)
    date = Column(String, nullable=False)
    time = Column(String, nullable=False)
    image = Column(String, nullable=True)
    status = Column(String, default="Searching")
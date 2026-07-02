from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.messages.models import MessageType


class WebSocketEvent(BaseModel):
    type: str
    payload: dict[str, Any] = Field(default_factory=dict)


class MessageSendPayload(BaseModel):
    chat_id: UUID
    text: str = Field(default="", max_length=4000)
    type: MessageType = MessageType.TEXT
    attachment_url: str | None = Field(default=None, max_length=500)
    attachment_mime_type: str | None = Field(default=None, max_length=120)
    attachment_name: str | None = Field(default=None, max_length=255)
    attachment_size: int | None = None
    reply_to_id: UUID | None = None


class MessageReadPayload(BaseModel):
    chat_id: UUID
    message_id: UUID | None = None


class TypingPayload(BaseModel):
    chat_id: UUID


class MessageReactionSetPayload(BaseModel):
    message_id: UUID
    emoji: str = Field(min_length=1, max_length=32)


ClientEventType = Literal[
    "message.send",
    "message.read",
    "message.reaction.set",
    "typing.start",
    "typing.stop",
    "ping",
]

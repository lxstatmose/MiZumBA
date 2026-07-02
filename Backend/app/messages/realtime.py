from uuid import UUID

from sqlmodel import Session

from app.chats.service import get_chat_member_user_ids
from app.messages.schemas import MessagePublic, MessageReactionsUpdate
from app.websocket.broadcaster import publish_to_users


def _event(event_type: str, payload: dict) -> dict:
    return {"type": event_type, "payload": payload}


async def broadcast_message_reactions_updated(
    session: Session,
    *,
    update: MessageReactionsUpdate,
    actor_user_id: UUID,
) -> None:
    del actor_user_id
    member_ids = get_chat_member_user_ids(session, update.chat_id)
    await publish_to_users(
        member_ids,
        _event("message.reactions.updated", update.model_dump(mode="json")),
    )


async def broadcast_message_updated(
    session: Session,
    *,
    message_public: MessagePublic,
    actor_user_id: UUID,
) -> None:
    del actor_user_id
    member_ids = get_chat_member_user_ids(session, message_public.chat_id)
    await publish_to_users(
        member_ids,
        _event("message.updated", {"message": message_public.model_dump(mode="json")}),
    )

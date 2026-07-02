from uuid import UUID

from fastapi import APIRouter, Depends, Response, status
from sqlmodel import Session

from app.auth.dependencies import get_current_user
from app.auth.schemas import MessageResponse
from app.core.database import get_session
from app.messages.realtime import broadcast_message_reactions_updated, broadcast_message_updated
from app.messages.schemas import (
    MessagePublic,
    MessageReactionCreate,
    MessageReactionPublic,
    MessageReactionsUpdate,
    MessageUpdate,
)
from app.messages.service import (
    delete_message,
    list_message_reactions,
    remove_message_reaction,
    set_message_reaction,
    transcribe_message_audio,
    update_message,
)
from app.users.models import User

router = APIRouter(prefix="/messages", tags=["messages"])


@router.patch("/{message_id}", response_model=MessagePublic)
def edit_message(
    message_id: UUID,
    payload: MessageUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> MessagePublic:
    return update_message(
        session,
        message_id=message_id,
        current_user=current_user,
        text=payload.text,
    )


@router.post("/{message_id}/transcribe", response_model=MessagePublic)
async def transcribe_message(
    message_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> MessagePublic:
    message_public = transcribe_message_audio(session, message_id=message_id, current_user=current_user)
    await broadcast_message_updated(session, message_public=message_public, actor_user_id=current_user.id)
    return message_public


@router.delete("/{message_id}", response_model=MessageResponse, status_code=status.HTTP_200_OK)
def remove_message(
    message_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> MessageResponse:
    delete_message(session, message_id=message_id, current_user=current_user)
    return MessageResponse(message="Message deleted successfully")


@router.get("/{message_id}/reactions", response_model=list[MessageReactionPublic])
def get_reactions(
    message_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> list[MessageReactionPublic]:
    return list_message_reactions(session, message_id=message_id, current_user=current_user)


@router.post("/{message_id}/reactions", response_model=MessageReactionsUpdate)
async def react_to_message(
    message_id: UUID,
    payload: MessageReactionCreate,
    response: Response,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> MessageReactionsUpdate:
    result = set_message_reaction(
        session,
        message_id=message_id,
        current_user=current_user,
        emoji=payload.emoji,
    )
    response.status_code = status.HTTP_200_OK if result.action == "removed" else status.HTTP_201_CREATED
    await broadcast_message_reactions_updated(session, update=result, actor_user_id=current_user.id)
    return result


@router.delete("/{message_id}/reactions", response_model=MessageReactionsUpdate | MessageResponse)
async def delete_reaction(
    message_id: UUID,
    payload: MessageReactionCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> MessageReactionsUpdate | MessageResponse:
    result = remove_message_reaction(
        session,
        message_id=message_id,
        current_user=current_user,
        emoji=payload.emoji,
    )
    if result is None:
        return MessageResponse(message="Reaction removed successfully")
    await broadcast_message_reactions_updated(session, update=result, actor_user_id=current_user.id)
    return result

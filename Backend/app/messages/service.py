import re
from collections import defaultdict
from typing import Literal
from uuid import UUID

from sqlmodel import Session, select

from app.audio.service import _load_whisper_model
from app.chats.models import Chat
from app.chats.service import get_chat_member_user_ids, require_chat_member
from app.common.exceptions import bad_request, forbidden, not_found
from app.core.config import get_settings
from app.core.utc_const import UTC, datetime
from app.files.models import FileAsset
from app.messages.models import Message, MessageReaction, MessageType
from app.messages.schemas import MessagePublic, MessageReactionPublic, MessageReactionSummary, MessageReactionsUpdate
from app.notifications.service import (
    create_mention_notification,
    create_new_message_notifications,
    create_reaction_notification,
)
from app.users.models import User
from app.users.service import get_user_by_id, get_user_by_username


def _summarize_reactions(
    reactions: list[MessageReaction],
    current_user_id: UUID,
) -> tuple[list[MessageReactionSummary], str | None]:
    by_emoji: dict[str, list[UUID]] = defaultdict(list)
    my_reaction: str | None = None
    for reaction in reactions:
        by_emoji[reaction.emoji].append(reaction.user_id)
        if reaction.user_id == current_user_id:
            my_reaction = reaction.emoji
    summaries = [
        MessageReactionSummary(emoji=emoji, count=len(user_ids), user_ids=user_ids)
        for emoji, user_ids in sorted(by_emoji.items())
    ]
    return summaries, my_reaction


def _load_reactions_by_message_id(session: Session, message_ids: list[UUID]) -> dict[UUID, list[MessageReaction]]:
    if not message_ids:
        return {}
    statement = select(MessageReaction).where(MessageReaction.message_id.in_(message_ids))
    grouped: dict[UUID, list[MessageReaction]] = defaultdict(list)
    for reaction in session.exec(statement).all():
        grouped[reaction.message_id].append(reaction)
    return grouped


def _build_reactions_update(
    session: Session,
    *,
    message: Message,
    current_user_id: UUID,
    action: Literal["added", "removed", "changed"],
) -> MessageReactionsUpdate:
    reactions = session.exec(select(MessageReaction).where(MessageReaction.message_id == message.id)).all()
    summaries, my_reaction = _summarize_reactions(reactions, current_user_id)
    return MessageReactionsUpdate(
        message_id=message.id,
        chat_id=message.chat_id,
        reactions=summaries,
        my_reaction=my_reaction,
        action=action,
    )


def message_to_public(
    session: Session,
    message: Message,
    *,
    current_user_id: UUID | None = None,
    reactions: list[MessageReaction] | None = None,
) -> MessagePublic:
    summaries: list[MessageReactionSummary] = []
    my_reaction: str | None = None
    if current_user_id is not None:
        if reactions is None:
            reactions = session.exec(select(MessageReaction).where(MessageReaction.message_id == message.id)).all()
        summaries, my_reaction = _summarize_reactions(reactions, current_user_id)

    return MessagePublic(
        id=message.id,
        chat_id=message.chat_id,
        sender_id=message.sender_id,
        sender=get_user_by_id(session, message.sender_id),
        text=message.text,
        type=message.type,
        attachment_url=message.attachment_url,
        attachment_mime_type=message.attachment_mime_type,
        attachment_name=message.attachment_name,
        attachment_size=message.attachment_size,
        reply_to_id=message.reply_to_id,
        created_at=message.created_at,
        updated_at=message.updated_at,
        edited_at=message.edited_at,
        deleted_at=message.deleted_at,
        reactions=summaries,
        my_reaction=my_reaction,
    )


def reaction_to_public(session: Session, reaction: MessageReaction) -> MessageReactionPublic:
    return MessageReactionPublic(
        id=reaction.id,
        message_id=reaction.message_id,
        user_id=reaction.user_id,
        user=get_user_by_id(session, reaction.user_id),
        emoji=reaction.emoji,
        created_at=reaction.created_at,
    )


def _create_mention_notifications(session: Session, *, message: Message, actor: User) -> None:
    usernames = {match.group(1).lower() for match in re.finditer(r"@([a-zA-Z0-9_]{3,50})", message.text)}
    if not usernames:
        return

    member_ids = set(get_chat_member_user_ids(session, message.chat_id))
    for username in usernames:
        mentioned_user = get_user_by_username(session, username)
        if mentioned_user and mentioned_user.id in member_ids and mentioned_user.id != actor.id:
            create_mention_notification(
                session,
                user_id=mentioned_user.id,
                actor=actor,
                chat_id=message.chat_id,
                message_id=message.id,
            )


def list_chat_messages(
    session: Session,
    *,
    chat_id: UUID,
    current_user: User,
    limit: int = 50,
    before_message_id: UUID | None = None,
) -> list[MessagePublic]:
    require_chat_member(session, chat_id, current_user)

    statement = select(Message).where(Message.chat_id == chat_id)
    if before_message_id:
        before_message = session.get(Message, before_message_id)
        if not before_message or before_message.chat_id != chat_id:
            raise not_found("Message not found")
        statement = statement.where(Message.created_at < before_message.created_at)

    statement = statement.order_by(Message.created_at.desc()).limit(limit)
    messages = list(session.exec(statement).all())
    messages.reverse()
    reactions_by_message = _load_reactions_by_message_id(session, [message.id for message in messages])
    return [
        message_to_public(
            session,
            message,
            current_user_id=current_user.id,
            reactions=reactions_by_message.get(message.id, []),
        )
        for message in messages
    ]


def create_message(
    session: Session,
    *,
    chat_id: UUID,
    current_user: User,
    text: str,
    message_type: MessageType = MessageType.TEXT,
    attachment_url: str | None = None,
    attachment_mime_type: str | None = None,
    attachment_name: str | None = None,
    attachment_size: int | None = None,
    reply_to_id: UUID | None = None,
) -> MessagePublic:
    chat = session.get(Chat, chat_id)
    if not chat:
        raise not_found("Chat not found")
    require_chat_member(session, chat_id, current_user)

    if reply_to_id:
        reply_to = session.get(Message, reply_to_id)
        if not reply_to or reply_to.chat_id != chat_id:
            raise not_found("Reply message not found")

    if message_type == MessageType.AUDIO:
        if not attachment_url:
            raise bad_request("Audio messages require an attachment")
        if not attachment_mime_type or not attachment_mime_type.startswith("audio/"):
            raise bad_request("Audio messages require an audio attachment")

    if message_type == MessageType.IMAGE and not attachment_url:
        raise bad_request("Image messages require an attachment")

    now = datetime.now(UTC)
    message = Message(
        chat_id=chat_id,
        sender_id=current_user.id,
        text=text.strip(),
        type=message_type,
        attachment_url=attachment_url,
        attachment_mime_type=attachment_mime_type,
        attachment_name=attachment_name,
        attachment_size=attachment_size,
        reply_to_id=reply_to_id,
        created_at=now,
        updated_at=now,
    )
    session.add(message)
    session.commit()
    session.refresh(message)

    chat.last_message_id = message.id
    chat.updated_at = now
    session.add(chat)
    session.commit()
    session.refresh(message)
    create_new_message_notifications(
        session,
        recipient_ids=get_chat_member_user_ids(session, chat_id),
        actor=current_user,
        chat_id=chat_id,
        message_id=message.id,
        text=message.text,
    )
    _create_mention_notifications(session, message=message, actor=current_user)
    return message_to_public(session, message, current_user_id=current_user.id)


def get_message_for_user(session: Session, message_id: UUID, current_user: User) -> Message:
    message = session.get(Message, message_id)
    if not message:
        raise not_found("Message not found")
    require_chat_member(session, message.chat_id, current_user)
    return message


def update_message(
    session: Session,
    *,
    message_id: UUID,
    current_user: User,
    text: str,
) -> MessagePublic:
    message = get_message_for_user(session, message_id, current_user)
    if message.sender_id != current_user.id:
        raise forbidden("Only sender can edit message")
    if message.deleted_at:
        raise not_found("Message not found")

    now = datetime.now(UTC)
    message.text = text.strip()
    message.edited_at = now
    message.updated_at = now
    session.add(message)
    session.commit()
    session.refresh(message)
    return message_to_public(session, message, current_user_id=current_user.id)


def transcribe_message_audio(
    session: Session,
    *,
    message_id: UUID,
    current_user: User,
) -> MessagePublic:
    message = get_message_for_user(session, message_id, current_user)
    if message.type != MessageType.AUDIO or not message.attachment_url:
        raise bad_request("Message is not an audio message")
    if message.deleted_at:
        raise not_found("Message not found")

    file_asset = session.exec(select(FileAsset).where(FileAsset.url == message.attachment_url)).first()
    if not file_asset:
        raise not_found("Audio file not found")

    settings = get_settings()
    model = _load_whisper_model(settings.whisper_model_name)
    result = model.transcribe(
        file_asset.storage_path,
        language=settings.whisper_default_language or None,
    )

    transcription = (result.get("text") or "").strip()
    if not transcription:
        transcription = "[Empty transcription]"

    now = datetime.now(UTC)
    message.text = transcription
    message.updated_at = now
    session.add(message)
    session.commit()
    session.refresh(message)
    return message_to_public(session, message, current_user_id=current_user.id)


def delete_message(session: Session, *, message_id: UUID, current_user: User) -> None:
    message = get_message_for_user(session, message_id, current_user)
    if message.sender_id != current_user.id:
        raise forbidden("Only sender can delete message")
    if message.deleted_at:
        return

    now = datetime.now(UTC)
    message.deleted_at = now
    message.updated_at = now
    session.add(message)
    session.commit()


def list_message_reactions(session: Session, *, message_id: UUID, current_user: User) -> list[MessageReactionPublic]:
    message = get_message_for_user(session, message_id, current_user)
    statement = select(MessageReaction).where(MessageReaction.message_id == message.id)
    return [reaction_to_public(session, reaction) for reaction in session.exec(statement).all()]


def set_message_reaction(
    session: Session,
    *,
    message_id: UUID,
    current_user: User,
    emoji: str,
) -> MessageReactionsUpdate:
    message = get_message_for_user(session, message_id, current_user)
    emoji = emoji.strip()
    if not emoji:
        raise bad_request("Emoji is required")

    existing = session.exec(
        select(MessageReaction).where(
            MessageReaction.message_id == message.id,
            MessageReaction.user_id == current_user.id,
        )
    ).first()

    if existing:
        if existing.emoji == emoji:
            session.delete(existing)
            session.commit()
            return _build_reactions_update(session, message=message, current_user_id=current_user.id, action="removed")

        existing.emoji = emoji
        existing.created_at = datetime.now(UTC)
        session.add(existing)
        session.commit()
        session.refresh(existing)
        if message.sender_id != current_user.id:
            create_reaction_notification(
                session,
                user_id=message.sender_id,
                actor=current_user,
                chat_id=message.chat_id,
                message_id=message.id,
                emoji=emoji,
            )
        return _build_reactions_update(session, message=message, current_user_id=current_user.id, action="changed")

    reaction = MessageReaction(message_id=message.id, user_id=current_user.id, emoji=emoji)
    session.add(reaction)
    session.commit()
    session.refresh(reaction)
    if message.sender_id != current_user.id:
        create_reaction_notification(
            session,
            user_id=message.sender_id,
            actor=current_user,
            chat_id=message.chat_id,
            message_id=message.id,
            emoji=emoji,
        )
    return _build_reactions_update(session, message=message, current_user_id=current_user.id, action="added")


def add_message_reaction(
    session: Session,
    *,
    message_id: UUID,
    current_user: User,
    emoji: str,
) -> MessageReactionsUpdate:
    return set_message_reaction(
        session,
        message_id=message_id,
        current_user=current_user,
        emoji=emoji,
    )


def remove_message_reaction(
    session: Session,
    *,
    message_id: UUID,
    current_user: User,
    emoji: str | None = None,
) -> MessageReactionsUpdate | None:
    message = get_message_for_user(session, message_id, current_user)
    statement = select(MessageReaction).where(
        MessageReaction.message_id == message.id,
        MessageReaction.user_id == current_user.id,
    )
    if emoji:
        statement = statement.where(MessageReaction.emoji == emoji)
    reaction = session.exec(statement).first()
    if not reaction:
        return None

    session.delete(reaction)
    session.commit()
    return _build_reactions_update(session, message=message, current_user_id=current_user.id, action="removed")

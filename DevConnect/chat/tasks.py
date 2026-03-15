import re
from celery import shared_task
from django.contrib.auth import get_user_model

User = get_user_model()


@shared_task
def send_notification(message_id):
    """
    Background task: parse @mentions from a message and create Notifications.
    Runs in the Celery worker process, NOT in Django/Daphne.
    """
    from .models import Message, Notification

    try:
        message = Message.objects.select_related("sender", "room").get(id=message_id)
    except Message.DoesNotExist:
        return

    # Parse all @username patterns
    mentioned_usernames = re.findall(r"@(\w+)", message.content)
    if not mentioned_usernames:
        return

    # Find actual users who are members of the room
    room_members = message.room.members.filter(username__in=mentioned_usernames)

    # Create notifications (skip self-mentions)
    notifications = [
        Notification(
            user=member,        # matches your model field name
            message=message,    # ForeignKey to the Message
        )
        for member in room_members
        if member != message.sender
    ]

    if notifications:
        Notification.objects.bulk_create(notifications)

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Notification


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_notifications(request):
    """Get all unread notifications for the current user."""
    notifications = Notification.objects.filter(
        user=request.user, is_read=False
    ).select_related("message__sender", "message__room")

    data = [
        {
            "id": n.id,
            "sender": n.message.sender.username,
            "room_id": n.message.room.id,
            "room_name": n.message.room.name,
            "message_preview": n.message.content[:100],
            "created_at": n.created_at,
        }
        for n in notifications
    ]
    return Response(data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, notification_id):
    """Mark a single notification as read."""
    try:
        notification = Notification.objects.get(id=notification_id, user=request.user)
        notification.is_read = True
        notification.save()
        return Response({"message": "Marked as read"})
    except Notification.DoesNotExist:
        return Response({"error": "Not found"}, status=404)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_all_read(request):
    """Mark all notifications as read."""
    Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
    return Response({"message": "All marked as read"})

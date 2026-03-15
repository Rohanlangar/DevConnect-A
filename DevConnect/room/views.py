from django.shortcuts import render
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import get_user_model
from .models import Room
from rest_framework.response import Response
from chat.models import Message
from .serializers import RoomSerializer, MessageSerializer
from .pagination import MessageCursorPagination

User = get_user_model()


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_room(request):
    """
    Create a new chat room.
    The authenticated user becomes the creator and first member.
    """
    user = request.user
    room_name = request.data.get("name")
    description = request.data.get("description")

    room = Room.objects.create(
        name=room_name,
        description=description,
        created_by=user
    )
    room.members.add(request.user)

    # Return the full serialized room object instead of a manual dict
    serializer = RoomSerializer(room)
    return Response({
        "message": "Room created succefully",
        "room_id": room.id,
        "room": serializer.data
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def join_room(request):
    """Join an existing room by room_id."""
    user = request.user
    room_id = request.data.get("room_id")

    if not room_id:
        return Response({"Message": "Room id is required"}, status=400)

    try:
        room = Room.objects.get(id=room_id)
    except Room.DoesNotExist:
        return Response({"Message": "Room doesnt exists"}, status=404)

    if room.members.filter(id=user.id).exists():
        return Response({"Message": "Your are already a member"}, status=400)

    room.members.add(user)
    return Response({"Message": "Joined room succefully"})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def getAllMsg(request, roomId):
    """
    Retrieve messages for a room with CURSOR PAGINATION.

    Cursor pagination works like this:
    1. First request: GET /room/getAllMsg/<roomId>/
       → Returns the 50 most recent messages + a `next` cursor URL
    2. Load older: GET /room/getAllMsg/<roomId>/?cursor=<token>
       → Returns the next 50 older messages

    The response shape changes from a flat array to:
    {
        "next": "http://..../getAllMsg/1/?cursor=cD0yMDI...",   # URL for older messages (or null)
        "previous": "http://..../getAllMsg/1/?cursor=cj0x...", # URL for newer messages (or null)
        "results": [
            {"id": 1, "sender": "rohan", "content": "hello", "created_at": "..."},
            ...
        ]
    }
    """
    try:
        room = Room.objects.get(id=roomId)
    except Room.DoesNotExist:
        return Response({"error": "Room not found"}, status=404)

    # Get all messages for this room, ordered by -created_at (newest first)
    # The cursor paginator will handle slicing and cursor tokens
    msgs = Message.objects.filter(room=room).order_by("-created_at")

    # Apply cursor pagination
    paginator = MessageCursorPagination()
    page = paginator.paginate_queryset(msgs, request)

    # Serialize the page of messages
    serializer = MessageSerializer(page, many=True)

    # Return paginated response (includes next/previous cursor URLs)
    return paginator.get_paginated_response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def getAllRoom(request):
    """Get all rooms the user has NOT joined."""
    user = request.user
    rooms = Room.objects.exclude(members=user)
    serializer = RoomSerializer(rooms, many=True)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def getRoomsUserHaveJoined(request):
    """Get all rooms the user HAS joined."""
    user = request.user
    rooms = Room.objects.filter(members=user)
    serializer = RoomSerializer(rooms, many=True)
    return Response(serializer.data)


def room(request, room_id):
    room = Room.objects.get(id=room_id)
    return render(request, "room.html", {"room_id": room_id, "user_id": request.user.id})


def index(request):
    return render(request, "index.html")


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def getRoomMembers(request, roomId):
    """Get all members of a room (for @mention autocomplete)."""
    try:
        room = Room.objects.get(id=roomId)
    except Room.DoesNotExist:
        return Response({"error": "Room not found"}, status=404)

    members = room.members.all()
    data = [{"id": m.id, "username": m.username} for m in members]
    return Response(data)

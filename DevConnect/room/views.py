from django.shortcuts import render
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import get_user_model
from .models import Room, Task
from rest_framework.response import Response
from chat.models import Message
from .serializers import RoomSerializer, MessageSerializer, TaskSerializer
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
    """Retrieve messages for a room with cursor pagination."""
    try:
        room = Room.objects.get(id=roomId)
    except Room.DoesNotExist:
        return Response({"error": "Room not found"}, status=404)

    msgs = Message.objects.filter(room=room).order_by("-created_at")

    paginator = MessageCursorPagination()
    page = paginator.paginate_queryset(msgs, request)
    serializer = MessageSerializer(page, many=True)
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


# ─── Task Endpoints ────────────────────────────────────────────


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_task(request, roomId):
    """Create a task in a room. Only the room creator can create tasks."""
    user = request.user

    try:
        room = Room.objects.get(id=roomId)
    except Room.DoesNotExist:
        return Response({"error": "Room not found"}, status=404)

    if room.created_by != user:
        return Response({"error": "Only the room creator can create tasks"}, status=403)

    name = request.data.get("name")
    description = request.data.get("description", "")

    if not name:
        return Response({"error": "Task name is required"}, status=400)

    task = Task.objects.create(
        room=room,
        name=name,
        description=description,
        created_by=user,
    )
    # Assign to all room members
    task.assigned.set(room.members.all())

    serializer = TaskSerializer(task)
    return Response(serializer.data, status=201)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_tasks(request, roomId):
    """Get all tasks for a room."""
    try:
        room = Room.objects.get(id=roomId)
    except Room.DoesNotExist:
        return Response({"error": "Room not found"}, status=404)

    tasks = Task.objects.filter(room=room)
    serializer = TaskSerializer(tasks, many=True)
    return Response(serializer.data)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def update_task_status(request, taskId):
    """Update a task's status. Any assigned member can update."""
    try:
        task = Task.objects.get(id=taskId)
    except Task.DoesNotExist:
        return Response({"error": "Task not found"}, status=404)

    # Check if user is assigned to this task
    if not task.assigned.filter(id=request.user.id).exists():
        return Response({"error": "You are not assigned to this task"}, status=403)

    new_status = request.data.get("status")
    if new_status not in ["pending", "in_progress", "completed"]:
        return Response({"error": "Invalid status. Use: pending, in_progress, completed"}, status=400)

    task.status = new_status
    task.save()
    serializer = TaskSerializer(task)
    return Response(serializer.data)



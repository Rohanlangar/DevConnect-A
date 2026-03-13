from django.shortcuts import render
from rest_framework.decorators import api_view,permission_classes
from rest_framework.permissions import IsAuthenticated,AllowAny
from django.contrib.auth import get_user_model
from .models import Room
from rest_framework.response import Response
from django.db.models import Q
from chat.models import Message

User = get_user_model()

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_room(request):
    user = request.user
    room_name = request.data.get("name")
    description = request.data.get("description")

    room = Room.objects.create(
        name = room_name,
        description = description,
        created_by = user
    )

    room.members.add(request.user)

    return Response({
        "message" : "Room created succefully",
        "room_id" : room.id
    })
    

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def join_room(request):
    user = request.user
    room_id = request.data.get("room_id")

    if not room_id : 
        return Response({"Message" : "Room id is required"})
    
    room = Room.objects.get(id = room_id)
    if not room :
        return Response ({"Message" : "Room doesnt exists"})
    
    if room.members.filter(id = user.id).exists():
        return Response ({"Message" : "Your are already a member"})
    
    room.members.add(user)
    return Response({"Message" : "Joined room succefully"})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def getAllMsg(request,roomId):
    room = Room.objects.get(id=roomId)
    msgs = Message.objects.filter(room=room)

    data = [
        {
            "sender": msg.sender.username if hasattr(msg.sender, 'username') else str(msg.sender),
            "content": msg.content,
            "created_at": msg.created_at
        }
        for msg in msgs
    ]

    return Response(data)

    
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def getAllRoom(request):
    user = request.user
    rooms = Room.objects.exclude(members=user)
    data = [
        {
            "id": room.id,
            "name": room.name
        }
        for room in rooms
    ]
    return Response(data)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def getRoomsUserHaveJoined(request):
    user = request.user
    rooms = Room.objects.filter(members=user)
    data = [
        {
            "id": room.id,
            "name": room.name
        }
        for room in rooms
    ]
    return Response(data)


    
def room(request, room_id):
    room = Room.objects.get(id = room_id)
    return render(request, "room.html", {"room_id" : room_id,"user_id" : request.user.id})

from django.shortcuts import render


def index(request):
    return render(request, "index.html")


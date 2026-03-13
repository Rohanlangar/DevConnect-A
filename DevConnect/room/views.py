from django.shortcuts import render
from rest_framework.decorators import api_view,permission_classes
from rest_framework.permissions import IsAuthenticated,AllowAny
from django.contrib.auth import get_user_model
from .models import Room
from rest_framework.response import Response

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
    
    
def room(request, room_id):
    room = Room.objects.get(id = room_id)
    return render(request, "room.html", {"room_id" : room_id,"user_id" : request.user.id})

from django.shortcuts import render


def index(request):
    return render(request, "index.html")
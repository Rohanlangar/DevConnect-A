# from django.shortcuts import render
# from rest_framework.decorators import api_view,permission_classes
# from rest_framework.response import Response
# from rest_framework.permissions import IsAuthenticated,AllowAny
# from .models import Message
# from room.models import Room

# @api_view(["POST"])
# @permission_classes([IsAuthenticated])
# def sendmessage(request,room_id):
#     user = request.user
#     content = request.data.get("content")

#     if not room_id or not content:
#         return Response({"error": "room_id and content required"}, status=400)

#     try:
#         room = Room.objects.get(id=room_id)
#     except Room.DoesNotExist:
#         return Response({"error": "Room not found"}, status=404)

#     # Check if user is member
#     if not room.members.filter(id=user.id).exists():
#         return Response({"error": "Not allowed"}, status=403)

#     # Create message
#     message = Message.objects.create(
#         room=room,
#         sender=user,
#         content=content
#     )

#     message = room.messages.all()

#     data = [
#         {
#             "sender": msg.sender.username,
#             "content": msg.content,
#             "time": msg.created_at
#         }
#         for msg in message
#     ]

#     return Response(data)


# @api_view(["GET"])
# @permission_classes([IsAuthenticated])
# def getmsg(request,room_id):

#     room = Room.objects.get(id = room_id)

#     message = room.messages.all()

#     data = [
#         {
#             "sender": msg.sender.username,
#             "content": msg.content,
#             "time": msg.created_at
#         }
#         for msg in message
#     ]

#     return Response(data)


# # chat/views.py

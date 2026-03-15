from django.shortcuts import render
from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth import get_user_model
from .serializers.user_serializers import SignupSerializer, UserSerializer
from rest_framework.authtoken.models import Token

User = get_user_model()


@api_view(["POST"])
@permission_classes([AllowAny])
def signup(request):
    serializer = SignupSerializer(data=request.data)

    if serializer.is_valid():
        serializer.save()
        return Response({"message": "user created succefully"})
    return Response({"message": "Check constraint"})


@api_view(["POST"])
@permission_classes([AllowAny])
def login_user(request):
    username = request.data.get("username")
    password = request.data.get("password")

    user = authenticate(username=username, password=password)

    if user:
        token, created = Token.objects.get_or_create(user=user)
        return Response({"message": "login succefully", "token": token.key})
    return Response({"message": "check credentials"})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_user(request):
    logout(request)
    return Response({"message": "logout succefully"})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def profile(request):
    """
    Return the authenticated user's profile using UserSerializer.
    Before: manually built {"id": ..., "username": ..., "email": ...}
    After:  UserSerializer handles the conversion automatically.
    """
    serializer = UserSerializer(request.user)
    return Response(serializer.data)




from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Room, Task
from chat.models import Message

User = get_user_model()


class RoomSerializer(serializers.ModelSerializer):
    created_by = serializers.CharField(source="created_by.username", read_only=True)
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Room
        fields = ["id", "name", "description", "created_by", "member_count", "created_at"]
        read_only_fields = ["id", "created_by", "created_at"]

    def get_member_count(self, obj):
        return obj.members.count()


class MessageSerializer(serializers.ModelSerializer):
    sender = serializers.CharField(source="sender.username", read_only=True)

    class Meta:
        model = Message
        fields = ["id", "sender", "content", "created_at"]
        read_only_fields = ["id", "sender", "created_at"]


class TaskSerializer(serializers.ModelSerializer):
    created_by = serializers.CharField(source="created_by.username", read_only=True)
    assigned = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = ["id", "room", "name", "description", "status", "created_by", "assigned", "created_at"]
        read_only_fields = ["id", "created_by", "created_at"]

    def get_assigned(self, obj):
        return [{"id": u.id, "username": u.username} for u in obj.assigned.all()]


from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for the User model.

    This replaces the manual dict in the profile view:
        Before: Response({"id": user.id, "username": user.username, "email": user.email})
        After:  Response(UserSerializer(user).data)

    Benefits:
    - Single source of truth for the User API shape
    - If you add fields to User (bio, avatar, etc.), just add them to `fields` here
    - Can be nested inside other serializers (e.g., MessageSerializer could include full sender info)
    """

    class Meta:
        model = User
        fields = ["id", "username", "email"]
        read_only_fields = ["id"]


class SignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["username", "email", "password"]

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)
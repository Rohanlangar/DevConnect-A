from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class Room(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="created_rooms"
    )
    members = models.ManyToManyField(
        User,
        related_name="joined_rooms",
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name 
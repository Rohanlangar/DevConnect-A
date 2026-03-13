from django.urls import path
from . import views

urlpatterns = [
    path("createRoom/",views.create_room),
    path("joinroom/",views.join_room),
    path("", views.index, name="index"),
    path("<str:room_id>/", views.room, name="room"),
]
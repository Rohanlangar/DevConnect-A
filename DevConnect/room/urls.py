from django.urls import path
from . import views

urlpatterns = [
    path("createRoom/",views.create_room),
    path("joinroom/",views.join_room),
    path("", views.index, name="index"),
    path("getAllRoom/",views.getAllRoom),
    path("JoinedRooms/",views.getRoomsUserHaveJoined),
    path("getAllMsg/<str:roomId>/",views.getAllMsg),
    path("members/<str:roomId>/",views.getRoomMembers),
    # Task endpoints
    path("tasks/<str:roomId>/", views.get_tasks),
    path("tasks/<str:roomId>/create/", views.create_task),
    path("tasks/update/<int:taskId>/", views.update_task_status),
    path("<str:room_id>/", views.room, name="room"),
]
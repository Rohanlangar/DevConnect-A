from django.urls import path
from . import views

urlpatterns = [
    path("notifications/", views.get_notifications),
    path("notifications/<int:notification_id>/read/", views.mark_notification_read),
    path("notifications/read-all/", views.mark_all_read),
]
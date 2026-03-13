from django.urls import path
from . import views

urlpatterns = [
    path("signup/",views.signup),
    path("login/",views.login_user),
    path("logout/",views.logout_user),
    path("getprofile/",views.profile),
]
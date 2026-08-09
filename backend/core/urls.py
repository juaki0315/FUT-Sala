from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("players", views.PlayerProfileViewSet, basename="player")
router.register("initial-votes", views.InitialVoteViewSet, basename="initial-vote")
router.register("matches", views.MatchViewSet, basename="match")
router.register("match-votes", views.MatchVoteViewSet, basename="match-vote")

urlpatterns = [
    path("register/", views.RegisterView.as_view(), name="register"),
    path("auth/me/", views.CurrentUserView.as_view(), name="current-user"),
    path("", include(router.urls)),
]

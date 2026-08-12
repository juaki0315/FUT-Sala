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
    path("auth/change-password/", views.ChangePasswordView.as_view(), name="change-password"),
    path("admin/users-overview/", views.AdminUsersOverviewView.as_view(), name="admin-users-overview"),
    path("admin/users/<int:pk>/", views.AdminUserDetailView.as_view(), name="admin-user-detail"),
    path("activity/", views.ActivityFeedView.as_view(), name="activity-feed"),
    path("", include(router.urls)),
]

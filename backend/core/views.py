from django.contrib.auth import get_user_model
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from . import services
from .models import EvaluatorAssignment, InitialVote, Match, MatchPlayer, MatchVote, PlayerProfile
from .serializers import (
    ChangePasswordSerializer,
    InitialVoteSerializer,
    MatchPlayerSerializer,
    MatchSerializer,
    MatchVoteSerializer,
    PlayerProfileSerializer,
    UserRegisterSerializer,
    UserSerializer,
    UserUpdateSerializer,
)

User = get_user_model()


class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return request.user and request.user.is_authenticated and request.user.is_staff


class CurrentUserView(APIView):
    """Identidad básica del usuario autenticado, exista o no PlayerProfile (p.ej. admins)."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user).data)


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save()
        return Response({"detail": "Contraseña actualizada correctamente."})


class AdminUsersOverviewView(APIView):
    """
    Panel de admin: metadatos de cuenta y estado de participación de cada
    usuario (última conexión, votos de calibración pendientes/hechos,
    participación en votaciones de partidos).
    """

    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        finished_matches_count = Match.objects.filter(is_finished=True).count()
        users = User.objects.select_related("profile").order_by("username")

        data = []
        for u in users:
            profile = getattr(u, "profile", None)

            assigned_target_ids = set(
                EvaluatorAssignment.objects.filter(voter=u).values_list("target_id", flat=True)
            )
            completed_evaluations = (
                InitialVote.objects.filter(voter=u, target_id__in=assigned_target_ids).count()
                if assigned_target_ids
                else 0
            )
            voted_matches = (
                MatchVote.objects.filter(voter=u).values("match_id").distinct().count()
            )

            data.append({
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "is_staff": u.is_staff,
                "date_joined": u.date_joined,
                "last_login": u.last_login,
                "has_profile": profile is not None,
                "calibrated": profile.calibrated if profile else None,
                "overall_rating": profile.overall_rating if profile else None,
                "photo_url": (
                    PlayerProfileSerializer(profile, context={"request": request}).data["photo_url"]
                    if profile
                    else ""
                ),
                "assigned_evaluations": len(assigned_target_ids),
                "completed_evaluations": completed_evaluations,
                "finished_matches": finished_matches_count,
                "voted_matches": voted_matches,
            })
        return Response(data)


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = UserRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {"id": user.id, "username": user.username},
            status=status.HTTP_201_CREATED,
        )


class PlayerProfileViewSet(viewsets.ModelViewSet):
    queryset = PlayerProfile.objects.select_related("user").all()
    serializer_class = PlayerProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_update(self, serializer):
        profile = self.get_object()
        if profile.user_id != self.request.user.id and not self.request.user.is_staff:
            raise permissions.PermissionDenied("Solo puedes editar tu propia carta.")
        # Un jugador normal solo puede tocar estética, no atributos (esos van por votos/admin)
        allowed_fields = {"photo", "card_style"}
        if not self.request.user.is_staff:
            for field in list(serializer.validated_data.keys()):
                if field not in allowed_fields:
                    serializer.validated_data.pop(field)
        serializer.save()

    @action(detail=False, methods=["get"])
    def me(self, request):
        profile = get_object_or_404(PlayerProfile, user=request.user)
        return Response(PlayerProfileSerializer(profile, context={"request": request}).data)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAdminUser])
    def calibrate(self, request, pk=None):
        """Admin: dispara el cálculo de valoración inicial a partir de los InitialVote recibidos."""
        profile = self.get_object()
        try:
            services.apply_initial_rating(profile)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(PlayerProfileSerializer(profile, context={"request": request}).data)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAdminUser])
    def assign_evaluators(self, request, pk=None):
        """Admin: define qué usuarios concretos deben valorar a este jugador nuevo."""
        profile = self.get_object()
        voter_ids = request.data.get("voter_ids", [])
        EvaluatorAssignment.objects.filter(target=profile).exclude(voter_id__in=voter_ids).delete()
        existing_ids = set(
            EvaluatorAssignment.objects.filter(target=profile).values_list("voter_id", flat=True)
        )
        for voter_id in voter_ids:
            if voter_id not in existing_ids and voter_id != profile.user_id:
                EvaluatorAssignment.objects.create(target=profile, voter_id=voter_id)
        return Response(PlayerProfileSerializer(profile, context={"request": request}).data)


class InitialVoteViewSet(viewsets.ModelViewSet):
    queryset = InitialVote.objects.all()
    serializer_class = InitialVoteSerializer
    permission_classes = [permissions.IsAuthenticated]
    # Un voto de calibración no se puede editar ni borrar una vez emitido.
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        qs = super().get_queryset()
        target = self.request.query_params.get("target")
        if target:
            qs = qs.filter(target_id=target)
        return qs

    def perform_create(self, serializer):
        serializer.save(voter=self.request.user)


class MatchViewSet(viewsets.ModelViewSet):
    queryset = Match.objects.prefetch_related("participants__player__user").all().order_by("-date_played")
    serializer_class = MatchSerializer
    permission_classes = [IsAdminOrReadOnly]

    def perform_create(self, serializer):
        match = serializer.save(created_by=self.request.user)
        services.expire_previous_totw()
        return match

    @action(detail=True, methods=["post"])
    def add_players(self, request, pk=None):
        """Admin: asigna jugadores a Equipo A / Equipo B. Body: [{player, team}, ...]"""
        match = self.get_object()
        entries = request.data if isinstance(request.data, list) else request.data.get("players", [])
        created = []
        for entry in entries:
            mp, _ = MatchPlayer.objects.update_or_create(
                match=match, player_id=entry["player"], defaults={"team": entry["team"]}
            )
            created.append(mp)
        return Response(MatchPlayerSerializer(created, many=True).data)

    @action(detail=True, methods=["post"])
    def finish(self, request, pk=None):
        """Admin: cierra el partido con el marcador final y evoluciona las medias."""
        match = self.get_object()
        if match.is_finished:
            return Response(
                {"detail": "Este partido ya fue finalizado."}, status=status.HTTP_400_BAD_REQUEST
            )
        match.team_a_score = request.data.get("team_a_score")
        match.team_b_score = request.data.get("team_b_score")
        match.is_finished = True
        match.save()
        try:
            services.apply_match_result_evolution(match)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(MatchSerializer(match).data)

    @action(detail=True, methods=["post"])
    def generate_totw(self, request, pk=None):
        """Admin: calcula el Top 5 de la votación post-partido y aplica los boosts TOTJ."""
        match = self.get_object()
        try:
            updated = services.generate_totw(match)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(MatchPlayerSerializer(updated, many=True).data)

    @action(detail=True, methods=["get"])
    def current_totw(self, request, pk=None):
        entries = MatchPlayer.objects.filter(match_id=pk, is_totw=True).order_by("totw_rank")
        return Response(MatchPlayerSerializer(entries, many=True).data)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def vote(self, request, pk=None):
        """
        Un jugador emite su Top 5 de la jornada en una sola petición atómica.
        Body: {"votes": [{"voted_player": id, "points": 1-5}, ...]} (1 a 5 entradas).
        Evita el 500 por IntegrityError que daba el POST directo a /match-votes/
        cuando el mismo usuario intentaba votar dos veces en el mismo partido.
        """
        match = self.get_object()
        if not match.is_finished:
            return Response(
                {"detail": "El partido todavía no ha finalizado."}, status=status.HTTP_400_BAD_REQUEST
            )
        if MatchVote.objects.filter(match=match, voter=request.user).exists():
            return Response(
                {"detail": "Ya has votado en este partido. Los votos no se pueden editar."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        entries = request.data.get("votes", [])
        if not entries or len(entries) > 5:
            return Response(
                {"detail": "Debes elegir entre 1 y 5 jugadores."}, status=status.HTTP_400_BAD_REQUEST
            )
        player_ids = [e.get("voted_player") for e in entries]
        points_list = [e.get("points") for e in entries]
        if len(set(player_ids)) != len(player_ids):
            return Response({"detail": "No puedes repetir jugador."}, status=status.HTTP_400_BAD_REQUEST)
        if len(set(points_list)) != len(points_list) or any(
            p not in (1, 2, 3, 4, 5) for p in points_list
        ):
            return Response({"detail": "Puntos de voto inválidos."}, status=status.HTTP_400_BAD_REQUEST)

        created = []
        with transaction.atomic():
            for entry in entries:
                serializer = MatchVoteSerializer(
                    data={"match": match.id, **entry}, context={"request": request}
                )
                serializer.is_valid(raise_exception=True)
                created.append(serializer.save(voter=request.user))
        return Response(MatchVoteSerializer(created, many=True).data, status=status.HTTP_201_CREATED)


class MatchVoteViewSet(viewsets.ModelViewSet):
    queryset = MatchVote.objects.all()
    serializer_class = MatchVoteSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "head", "options"]

    def get_queryset(self):
        qs = super().get_queryset()
        match = self.request.query_params.get("match")
        if match:
            qs = qs.filter(match_id=match)
        return qs

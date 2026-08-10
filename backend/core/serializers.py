from django.contrib.auth import get_user_model
from rest_framework import serializers

from . import services
from .models import EvaluatorAssignment, InitialVote, Match, MatchPlayer, MatchVote, PlayerProfile

User = get_user_model()

PREVIEW_MIN_VOTES = 5


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "is_staff"]


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["username", "email"]
        extra_kwargs = {"email": {"required": False}}

    def validate_username(self, value):
        qs = User.objects.filter(username=value).exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Ese nombre de usuario ya está en uso.")
        return value


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=6)

    def validate_current_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("La contraseña actual no es correcta.")
        return value


class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ["id", "username", "email", "password"]

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        PlayerProfile.objects.create(user=user)
        return user


class PlayerProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)
    overall_rating = serializers.IntegerField(read_only=True)
    current_card_rating = serializers.SerializerMethodField()
    is_totw_active = serializers.SerializerMethodField()
    initial_votes_count = serializers.SerializerMethodField()
    assigned_voters_count = serializers.SerializerMethodField()
    assigned_voter_ids = serializers.SerializerMethodField()
    preview_rating = serializers.SerializerMethodField()
    photo = serializers.ImageField(write_only=True, required=False, allow_null=True)
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model = PlayerProfile
        fields = [
            "id", "user", "username", "photo", "photo_url", "card_style",
            "ritmo", "tiro", "pase", "regate", "defensa", "fisico",
            "pierna_mala", "filigranas", "calibrated",
            "overall_rating", "current_card_rating", "is_totw_active",
            "initial_votes_count", "assigned_voters_count", "assigned_voter_ids",
            "preview_rating",
        ]
        read_only_fields = ["user", "calibrated"]

    def get_current_card_rating(self, obj):
        return obj.current_card_rating()

    def get_is_totw_active(self, obj):
        return obj.active_totw_boost() is not None

    def get_initial_votes_count(self, obj):
        return obj.initial_votes_received.count()

    def get_assigned_voters_count(self, obj):
        return obj.evaluator_assignments.count()

    def get_assigned_voter_ids(self, obj):
        return list(obj.evaluator_assignments.values_list("voter_id", flat=True))

    def get_photo_url(self, obj):
        if not obj.photo:
            return ""
        request = self.context.get("request")
        url = obj.photo.url
        return request.build_absolute_uri(url) if request else url

    def get_preview_rating(self, obj):
        if obj.initial_votes_received.count() < PREVIEW_MIN_VOTES:
            return None
        try:
            values = services.calculate_initial_rating(obj)
        except ValueError:
            return None
        overall = round(sum(values[f] for f in services.ATTR_FIELDS) / len(services.ATTR_FIELDS))
        return {**values, "overall_rating": overall}


class EvaluatorAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = EvaluatorAssignment
        fields = ["id", "target", "voter"]


class InitialVoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = InitialVote
        fields = [
            "id", "voter", "target", "ritmo", "tiro", "pase", "regate",
            "defensa", "fisico", "pierna_mala", "filigranas", "created_at",
        ]
        read_only_fields = ["voter", "created_at"]

    def validate(self, attrs):
        request = self.context["request"]
        target = attrs.get("target") or getattr(self.instance, "target", None)
        if target and target.user_id == request.user.id:
            raise serializers.ValidationError("Un jugador no puede votarse a sí mismo.")
        if target:
            assigned_ids = set(target.evaluator_assignments.values_list("voter_id", flat=True))
            if assigned_ids and request.user.id not in assigned_ids:
                raise serializers.ValidationError(
                    "No estás asignado como evaluador de este jugador."
                )
            if not self.instance and InitialVote.objects.filter(
                voter=request.user, target=target
            ).exists():
                raise serializers.ValidationError(
                    "Ya has votado a este jugador. Los votos no se pueden editar."
                )
        return attrs


class MatchPlayerSerializer(serializers.ModelSerializer):
    player_detail = PlayerProfileSerializer(source="player", read_only=True)

    class Meta:
        model = MatchPlayer
        fields = [
            "id", "match", "player", "player_detail", "team",
            "is_totw", "totw_boost", "totw_rank",
        ]


class MatchSerializer(serializers.ModelSerializer):
    participants = MatchPlayerSerializer(many=True, read_only=True)

    class Meta:
        model = Match
        fields = [
            "id", "date_played", "team_a_score", "team_b_score",
            "is_finished", "totw_generated", "created_by", "created_at", "participants",
        ]
        read_only_fields = ["created_by", "created_at", "is_finished", "totw_generated"]


class MatchVoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = MatchVote
        fields = ["id", "match", "voter", "voted_player", "points"]
        read_only_fields = ["voter"]

    def validate(self, attrs):
        request = self.context["request"]
        voted_player = attrs.get("voted_player")
        if voted_player and voted_player.user_id == request.user.id:
            raise serializers.ValidationError("No puedes votarte a ti mismo.")
        return attrs

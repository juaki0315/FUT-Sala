from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


ATTR_VALIDATORS = [MinValueValidator(1), MaxValueValidator(99)]
STAR_VALIDATORS = [MinValueValidator(1), MaxValueValidator(5)]


class PlayerProfile(models.Model):
    """Carta FIFA-style del jugador (1:1 con el User)."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile"
    )
    photo = models.ImageField(upload_to="player_photos/", blank=True, null=True)
    card_style = models.CharField(max_length=30, default="gold")

    # Atributos principales (1-99)
    ritmo = models.PositiveSmallIntegerField(default=50, validators=ATTR_VALIDATORS)
    tiro = models.PositiveSmallIntegerField(default=50, validators=ATTR_VALIDATORS)
    pase = models.PositiveSmallIntegerField(default=50, validators=ATTR_VALIDATORS)
    regate = models.PositiveSmallIntegerField(default=50, validators=ATTR_VALIDATORS)
    defensa = models.PositiveSmallIntegerField(default=50, validators=ATTR_VALIDATORS)
    fisico = models.PositiveSmallIntegerField(default=50, validators=ATTR_VALIDATORS)

    # Habilidades especiales (1-5 estrellas)
    pierna_mala = models.PositiveSmallIntegerField(default=3, validators=STAR_VALIDATORS)
    filigranas = models.PositiveSmallIntegerField(default=3, validators=STAR_VALIDATORS)

    # Media dinámica acumulada por resultados de partidos (con decimales)
    base_average = models.DecimalField(max_digits=5, decimal_places=2, default=50)

    calibrated = models.BooleanField(
        default=False, help_text="True una vez completada la valoración inicial por votos"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def overall_rating(self) -> int:
        """OVR = media de los 6 atributos principales, redondeada."""
        attrs = [self.ritmo, self.tiro, self.pase, self.regate, self.defensa, self.fisico]
        return round(sum(attrs) / len(attrs))

    def active_totw_boost(self):
        """Devuelve el MatchPlayer con boost TOTJ vigente (si existe)."""
        return (
            MatchPlayer.objects.filter(player=self, is_totw=True)
            .order_by("-match__date_played")
            .first()
        )

    def current_card_rating(self) -> int:
        """OVR mostrado en la carta, incluyendo boost TOTJ temporal si sigue vigente."""
        boost_entry = self.active_totw_boost()
        boost = boost_entry.totw_boost if boost_entry else 0
        return self.overall_rating + boost

    def __str__(self):
        return f"{self.user.username} (OVR {self.overall_rating})"


class Match(models.Model):
    date_played = models.DateTimeField()
    team_a_score = models.PositiveSmallIntegerField(null=True, blank=True)
    team_b_score = models.PositiveSmallIntegerField(null=True, blank=True)
    is_finished = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="matches_created"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Partido {self.date_played:%Y-%m-%d} ({self.team_a_score}-{self.team_b_score})"


class MatchPlayer(models.Model):
    TEAM_CHOICES = (("A", "Equipo A"), ("B", "Equipo B"))

    match = models.ForeignKey(Match, on_delete=models.CASCADE, related_name="participants")
    player = models.ForeignKey(PlayerProfile, on_delete=models.CASCADE, related_name="match_history")
    team = models.CharField(max_length=1, choices=TEAM_CHOICES)
    is_totw = models.BooleanField(default=False)  # Equipo de la Jornada
    totw_boost = models.PositiveSmallIntegerField(default=0)
    totw_rank = models.PositiveSmallIntegerField(null=True, blank=True)  # 1..5

    class Meta:
        unique_together = ("match", "player")

    def __str__(self):
        return f"{self.player.user.username} - {self.match} ({self.team})"


class InitialVote(models.Model):
    """Voto de calibración inicial para un jugador nuevo."""

    voter = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="initial_votes_cast"
    )
    target = models.ForeignKey(
        PlayerProfile, on_delete=models.CASCADE, related_name="initial_votes_received"
    )

    ritmo = models.PositiveSmallIntegerField(validators=ATTR_VALIDATORS)
    tiro = models.PositiveSmallIntegerField(validators=ATTR_VALIDATORS)
    pase = models.PositiveSmallIntegerField(validators=ATTR_VALIDATORS)
    regate = models.PositiveSmallIntegerField(validators=ATTR_VALIDATORS)
    defensa = models.PositiveSmallIntegerField(validators=ATTR_VALIDATORS)
    fisico = models.PositiveSmallIntegerField(validators=ATTR_VALIDATORS)
    pierna_mala = models.PositiveSmallIntegerField(validators=STAR_VALIDATORS)
    filigranas = models.PositiveSmallIntegerField(validators=STAR_VALIDATORS)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("voter", "target")

    def clean(self):
        from django.core.exceptions import ValidationError

        if self.voter_id and self.target_id and self.voter_id == self.target.user_id:
            raise ValidationError("Un jugador no puede votarse a sí mismo.")


class EvaluatorAssignment(models.Model):
    """El admin designa qué usuarios concretos deben valorar a un jugador nuevo."""

    target = models.ForeignKey(
        PlayerProfile, on_delete=models.CASCADE, related_name="evaluator_assignments"
    )
    voter = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="evaluation_assignments"
    )

    class Meta:
        unique_together = ("target", "voter")

    def __str__(self):
        return f"{self.voter} debe valorar a {self.target}"


class MatchVote(models.Model):
    """Voto post-partido: hasta 5 preferidos en orden de mérito (5..1 puntos)."""

    match = models.ForeignKey(Match, on_delete=models.CASCADE, related_name="votes")
    voter = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="match_votes_cast"
    )
    voted_player = models.ForeignKey(
        PlayerProfile, on_delete=models.CASCADE, related_name="match_votes_received"
    )
    points = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])

    class Meta:
        unique_together = (("match", "voter", "voted_player"), ("match", "voter", "points"))

    def __str__(self):
        return f"{self.voter} -> {self.voted_player} ({self.points}pts) [{self.match}]"

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

    # Crecimiento fraccional acumulado (0.5/0.75/1 por partido) pendiente de
    # convertirse en puntos enteros sobre los 6 atributos principales.
    growth_carry = models.DecimalField(max_digits=6, decimal_places=2, default=0)

    # Goles/asistencias acumulados desde el último punto de tiro/pase ganado
    # (cada 4 goles = +1 tiro, cada 3 asistencias = +1 pase, permanente).
    goal_progress = models.PositiveSmallIntegerField(default=0)
    assist_progress = models.PositiveSmallIntegerField(default=0)

    # Último partido cuya "revelación" (resultado, TOTJ, insignias nuevas) ya
    # se le ha mostrado a este jugador al abrir la app. Evita repetírsela.
    last_reveal_seen_match = models.ForeignKey(
        "Match", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )

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
    # Evita aplicar dos veces el crecimiento permanente del TOTJ si el admin
    # pulsa "Generar Equipo de la Jornada" más de una vez sobre el mismo partido.
    totw_generated = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="matches_created"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    # Momento real en que se cerró / se generó el TOTJ (independiente de
    # date_played, que es solo la fecha del partido). Se usan para ordenar
    # el feed de actividad y para detectar la "revelación" pendiente de cada
    # jugador sin depender de una fecha que el admin puede haber puesto en
    # el pasado o el futuro.
    finished_at = models.DateTimeField(null=True, blank=True)
    totw_generated_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Partido {self.date_played:%Y-%m-%d} ({self.team_a_score}-{self.team_b_score})"


class MatchPlayer(models.Model):
    TEAM_CHOICES = (("A", "Equipo A"), ("B", "Equipo B"))

    match = models.ForeignKey(Match, on_delete=models.CASCADE, related_name="participants")
    player = models.ForeignKey(PlayerProfile, on_delete=models.CASCADE, related_name="match_history")
    # Nulo mientras el jugador está solo convocado: el admin asigna equipo
    # al cerrar el partido, junto con el resultado.
    team = models.CharField(max_length=1, choices=TEAM_CHOICES, null=True, blank=True)
    is_totw = models.BooleanField(default=False)  # Equipo de la Jornada
    totw_boost = models.PositiveSmallIntegerField(default=0)
    totw_rank = models.PositiveSmallIntegerField(null=True, blank=True)  # 1..5
    goals = models.PositiveSmallIntegerField(default=0)
    assists = models.PositiveSmallIntegerField(default=0)

    class Meta:
        unique_together = ("match", "player")

    def __str__(self):
        return f"{self.player.user.username} - {self.match} ({self.team})"


class PlayerBadge(models.Model):
    """Insignia desbloqueada de forma permanente por un jugador."""

    player = models.ForeignKey(PlayerProfile, on_delete=models.CASCADE, related_name="badges")
    code = models.CharField(max_length=40)
    unlocked_at = models.DateTimeField(auto_now_add=True)
    # Partido que la desbloqueó (si aplica), para poder mostrarla en la
    # "revelación" del jugador tras esa jornada. No se sobreescribe.
    match = models.ForeignKey(
        "Match", on_delete=models.SET_NULL, null=True, blank=True, related_name="badges_awarded"
    )

    class Meta:
        unique_together = ("player", "code")
        ordering = ["-unlocked_at"]

    def __str__(self):
        return f"{self.player.user.username} - {self.code}"


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


PERFORMANCE_REVIEW_ATTRS = ("ritmo", "tiro", "pase", "regate", "defensa", "fisico")
PERFORMANCE_REVIEW_MAX_DELTA = 3
# Presupuesto total (suma de valores absolutos) que cada votante puede
# repartir entre los atributos de UN mismo compañero: p.ej. +2 regate y
# +1 fisico gasta los 3 puntos; subir o bajar 1 punto cuenta igual.
PERFORMANCE_REVIEW_BUDGET = 3


class MatchPerformanceReview(models.Model):
    """
    Marca que un convocado ya emitió su "Revisión de Lloros" de este
    partido (aunque no puntúe a nadie). Cada voto se aplica al instante
    (ver services.submit_performance_review); esto solo sirve para saber
    quién ha votado ya y evitar que vote dos veces.
    """

    match = models.ForeignKey(Match, on_delete=models.CASCADE, related_name="performance_reviews")
    voter = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="performance_reviews_cast"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("match", "voter")


class MatchPerformanceVote(models.Model):
    """
    Voto individual de la "Revisión de Lloros": un convocado reparte, para
    otro convocado, hasta PERFORMANCE_REVIEW_BUDGET puntos (subir o bajar,
    en valor absoluto) entre los 6 atributos, p.ej. +2 regate y +1 fisico.
    Una fila por (partido, votante, objetivo, atributo).
    """

    ATTR_CHOICES = [(f, f) for f in PERFORMANCE_REVIEW_ATTRS]

    match = models.ForeignKey(Match, on_delete=models.CASCADE, related_name="performance_votes")
    voter = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="performance_votes_cast"
    )
    target = models.ForeignKey(
        PlayerProfile, on_delete=models.CASCADE, related_name="performance_votes_received"
    )
    attribute = models.CharField(max_length=10, choices=ATTR_CHOICES)
    delta = models.SmallIntegerField(
        validators=[
            MinValueValidator(-PERFORMANCE_REVIEW_MAX_DELTA),
            MaxValueValidator(PERFORMANCE_REVIEW_MAX_DELTA),
        ]
    )

    class Meta:
        unique_together = ("match", "voter", "target", "attribute")

    def __str__(self):
        return f"{self.voter} -> {self.target} {self.attribute} {self.delta:+d} [{self.match}]"


class MatchPerformanceApplied(models.Model):
    """
    Cuánto se ha aplicado ya a la carta de `target` para (partido, atributo)
    por la Revisión de Lloros. Al llegar un voto nuevo sobre esa misma
    estadística se recalcula la media entre quienes ya han votado y solo se
    aplica la diferencia respecto a `applied_value`, para que cada voto
    surta efecto al instante sin esperar a que voten todos los convocados.
    """

    ATTR_CHOICES = [(f, f) for f in PERFORMANCE_REVIEW_ATTRS]

    match = models.ForeignKey(Match, on_delete=models.CASCADE, related_name="performance_applied")
    target = models.ForeignKey(PlayerProfile, on_delete=models.CASCADE, related_name="performance_applied")
    attribute = models.CharField(max_length=10, choices=ATTR_CHOICES)
    applied_value = models.SmallIntegerField(default=0)

    class Meta:
        unique_together = ("match", "target", "attribute")

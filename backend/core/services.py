"""
Lógica de negocio de FUT-Sala Tracker:
  1. Cálculo de valoración inicial con control de "trolling" de votos.
  2. Evolución dinámica de la media base tras un partido finalizado.
  3. Generación del Equipo de la Jornada (TOTJ) tras la votación post-partido.
"""

from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction

from .models import InitialVote, MatchPlayer, MatchVote, PlayerProfile

ATTR_FIELDS = ["ritmo", "tiro", "pase", "regate", "defensa", "fisico"]
STAR_FIELDS = ["pierna_mala", "filigranas"]

TOTW_BOOSTS = {1: 5, 2: 4, 3: 3, 4: 2, 5: 1}
MVP_PERMANENT_BONUS = Decimal("0.5")

WIN_DELTA = Decimal("0.2")
LOSS_DELTA = Decimal("-0.1")
DRAW_DELTA = Decimal("0.0")


def _trimmed_weighted_average(values: list[int]) -> float:
    """
    Aplica la fórmula de control de trolling:
      Atributo Base = (Vmax*0.5 + Vmin*0.5 + sum(Vresto)) / ((N-2) + 1)

    Si solo hay 1 o 2 votos, se usa la media simple normal (no hay "resto" que aislar).
    """
    n = len(values)
    if n == 0:
        raise ValueError("No hay votos para calcular la media.")
    if n <= 2:
        return sum(values) / n

    v_max = max(values)
    v_min = min(values)
    # Quitamos UNA ocurrencia del máximo y UNA del mínimo para formar "el resto"
    resto = values.copy()
    resto.remove(v_max)
    resto.remove(v_min)

    numerator = (v_max * 0.5) + (v_min * 0.5) + sum(resto)
    denominator = (n - 2) + 1
    return numerator / denominator


def calculate_initial_rating(target_profile: PlayerProfile) -> dict:
    """
    Calcula los atributos base de un jugador nuevo a partir de todos los
    InitialVote recibidos, aplicando la fórmula de control de trolling
    a cada atributo por separado. No persiste cambios: devuelve el dict resultante.
    """
    votes = list(InitialVote.objects.filter(target=target_profile))
    if not votes:
        raise ValueError("El jugador no tiene votos de calibración inicial todavía.")

    result = {}
    for field in ATTR_FIELDS + STAR_FIELDS:
        values = [getattr(v, field) for v in votes]
        avg = _trimmed_weighted_average(values)
        # Redondeo estándar (medio hacia arriba), respetando rango de cada tipo
        rounded = int(Decimal(avg).quantize(0, rounding=ROUND_HALF_UP)) if False else round(avg)
        if field in STAR_FIELDS:
            rounded = max(1, min(5, rounded))
        else:
            rounded = max(1, min(99, rounded))
        result[field] = rounded

    return result


@transaction.atomic
def apply_initial_rating(target_profile: PlayerProfile) -> PlayerProfile:
    """Calcula y persiste la valoración inicial en la carta del jugador."""
    values = calculate_initial_rating(target_profile)
    for field, value in values.items():
        setattr(target_profile, field, value)
    target_profile.base_average = Decimal(
        sum(values[f] for f in ATTR_FIELDS) / len(ATTR_FIELDS)
    ).quantize(Decimal("0.01"))
    target_profile.calibrated = True
    target_profile.save()
    return target_profile


@transaction.atomic
def apply_match_result_evolution(match) -> None:
    """
    Aplica la evolución dinámica de la media base a todos los participantes
    de un partido ya finalizado, según el resultado (+0.2 victoria, -0.1
    derrota, 0.0 empate).
    """
    if not match.is_finished or match.team_a_score is None or match.team_b_score is None:
        raise ValueError("El partido debe estar finalizado y con marcador para evolucionar medias.")

    if match.team_a_score > match.team_b_score:
        delta_a, delta_b = WIN_DELTA, LOSS_DELTA
    elif match.team_a_score < match.team_b_score:
        delta_a, delta_b = LOSS_DELTA, WIN_DELTA
    else:
        delta_a, delta_b = DRAW_DELTA, DRAW_DELTA

    for mp in match.participants.select_related("player"):
        delta = delta_a if mp.team == "A" else delta_b
        profile = mp.player
        profile.base_average = profile.base_average + delta
        profile.save(update_fields=["base_average"])


@transaction.atomic
def generate_totw(match) -> list[MatchPlayer]:
    """
    A partir de los MatchVote del partido, calcula el ranking (suma de puntos),
    toma el Top 5 y les asigna la carta especial TOTJ con boost temporal.
    El MVP (1er lugar) recibe además +0.5 permanente en base_average.
    Devuelve la lista de MatchPlayer actualizados en orden de ranking.
    """
    votes = MatchVote.objects.filter(match=match).select_related("voted_player")
    if not votes:
        raise ValueError("No hay votos post-partido registrados para este partido.")

    tally: dict[int, int] = {}
    for v in votes:
        tally[v.voted_player_id] = tally.get(v.voted_player_id, 0) + v.points

    ranking = sorted(tally.items(), key=lambda kv: kv[1], reverse=True)[:5]

    # Reset de estado TOTJ previo de este partido (idempotencia)
    MatchPlayer.objects.filter(match=match).update(is_totw=False, totw_boost=0, totw_rank=None)

    updated = []
    for rank, (player_id, _points) in enumerate(ranking, start=1):
        mp, _ = MatchPlayer.objects.get_or_create(
            match=match, player_id=player_id, defaults={"team": "A"}
        )
        mp.is_totw = True
        mp.totw_boost = TOTW_BOOSTS[rank]
        mp.totw_rank = rank
        mp.save()
        updated.append(mp)

        if rank == 1:
            profile = mp.player
            profile.base_average = profile.base_average + MVP_PERMANENT_BONUS
            profile.save(update_fields=["base_average"])

    return updated


@transaction.atomic
def expire_previous_totw() -> int:
    """
    La carta TOTJ caduca automáticamente al crearse el siguiente partido.
    Se llama al crear un nuevo Match. Devuelve el nº de cartas expiradas.
    """
    qs = MatchPlayer.objects.filter(is_totw=True)
    count = qs.count()
    qs.update(is_totw=False, totw_boost=0, totw_rank=None)
    return count

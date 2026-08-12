"""
Lógica de negocio de FUT-Sala Tracker:
  1. Cálculo de valoración inicial con control de "trolling" de votos.
  2. Crecimiento permanente de los atributos tras un partido finalizado.
  3. Generación del Equipo de la Jornada (TOTJ) tras la votación post-partido.
"""

from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction

from .models import InitialVote, MatchPlayer, MatchVote, PlayerProfile

ATTR_FIELDS = ["ritmo", "tiro", "pase", "regate", "defensa", "fisico"]
STAR_FIELDS = ["pierna_mala", "filigranas"]

TOTW_BOOSTS = {1: 5, 2: 4, 3: 3, 4: 2, 5: 1}

# Crecimiento permanente de los 6 atributos principales tras un partido,
# según el resultado del equipo del jugador.
GROWTH_BY_OUTCOME = {
    "win": Decimal("1"),
    "draw": Decimal("0.75"),
    "loss": Decimal("0.5"),
}
# Bonus adicional, permanente, para quien sale en el Equipo de la Jornada
# (aparte del boost temporal de OVR que ya recibe su carta).
TOTW_GROWTH_BONUS = Decimal("1")

# Cada N goles/asistencias de un jugador suman +1 permanente al atributo
# correspondiente (tiro/pase).
GOALS_PER_TIRO_POINT = 4
ASSISTS_PER_PASE_POINT = 3


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
    target_profile.calibrated = True
    target_profile.save()
    return target_profile


def _apply_permanent_growth(profile: PlayerProfile, delta: Decimal) -> None:
    """
    Acumula crecimiento fraccional (0.5/0.75/1 por partido) en growth_carry y,
    en cuanto se completa una unidad entera, la reparte como +1 punto en cada
    uno de los 6 atributos principales (tope 99). Así un empate o una derrota
    no se pierden por redondeo: dos empates (0.75+0.75=1.5) sí terminan dando
    un punto real tarde o temprano.
    """
    profile.growth_carry = profile.growth_carry + delta
    whole = int(profile.growth_carry)
    if whole > 0:
        for field in ATTR_FIELDS:
            setattr(profile, field, min(99, getattr(profile, field) + whole))
        profile.growth_carry = profile.growth_carry - whole
    profile.save(update_fields=[*ATTR_FIELDS, "growth_carry"])


@transaction.atomic
def apply_match_result_evolution(match) -> None:
    """
    Aplica el crecimiento permanente de atributos a todos los participantes
    de un partido ya finalizado, según el resultado de su equipo
    (+1 victoria, +0.75 empate, +0.5 derrota — nunca se resta).
    """
    if not match.is_finished or match.team_a_score is None or match.team_b_score is None:
        raise ValueError("El partido debe estar finalizado y con marcador para evolucionar medias.")

    if match.team_a_score > match.team_b_score:
        outcome_a, outcome_b = "win", "loss"
    elif match.team_a_score < match.team_b_score:
        outcome_a, outcome_b = "loss", "win"
    else:
        outcome_a = outcome_b = "draw"

    for mp in match.participants.select_related("player"):
        outcome = outcome_a if mp.team == "A" else outcome_b
        _apply_permanent_growth(mp.player, GROWTH_BY_OUTCOME[outcome])


def _apply_stat_growth(profile: PlayerProfile, goals: int, assists: int) -> None:
    """
    Acumula goles/asistencias en goal_progress/assist_progress y, al superar
    el umbral (4 goles / 3 asistencias), suma +1 permanente a tiro/pase
    respectivamente (tope 99). El resto se queda guardado para la próxima vez.
    """
    update_fields = []
    if goals:
        profile.goal_progress += goals
        whole = profile.goal_progress // GOALS_PER_TIRO_POINT
        if whole:
            profile.tiro = min(99, profile.tiro + whole)
            profile.goal_progress -= whole * GOALS_PER_TIRO_POINT
            update_fields.append("tiro")
        update_fields.append("goal_progress")
    if assists:
        profile.assist_progress += assists
        whole = profile.assist_progress // ASSISTS_PER_PASE_POINT
        if whole:
            profile.pase = min(99, profile.pase + whole)
            profile.assist_progress -= whole * ASSISTS_PER_PASE_POINT
            update_fields.append("pase")
        update_fields.append("assist_progress")
    if update_fields:
        profile.save(update_fields=update_fields)


@transaction.atomic
def record_match_stats(match, stats: dict) -> None:
    """
    Registra los goles/asistencias de cada participante de un partido
    (introducidos por el admin al cerrar el resultado) y aplica el
    crecimiento permanente de tiro/pase correspondiente. `stats` es un dict
    {player_id: {"goals": int, "assists": int}}; solo se llama una vez, en el
    mismo momento en que se cierra el partido.
    """
    for mp in match.participants.select_related("player"):
        entry = stats.get(mp.player_id) or stats.get(str(mp.player_id)) or {}
        goals = int(entry.get("goals") or 0)
        assists = int(entry.get("assists") or 0)
        if goals or assists:
            mp.goals = goals
            mp.assists = assists
            mp.save(update_fields=["goals", "assists"])
            _apply_stat_growth(mp.player, goals, assists)


def get_player_stats(profile: PlayerProfile) -> dict:
    """Estadísticas de carrera de un jugador: partidos, V/E/D, goles, asistencias."""
    history = list(
        MatchPlayer.objects.filter(player=profile, match__is_finished=True).select_related("match")
    )
    wins = losses = draws = goals = assists = 0
    for mp in history:
        match = mp.match
        if match.team_a_score is None or match.team_b_score is None:
            continue
        if match.team_a_score == match.team_b_score:
            draws += 1
        elif (match.team_a_score > match.team_b_score) == (mp.team == "A"):
            wins += 1
        else:
            losses += 1
        goals += mp.goals
        assists += mp.assists
    return {
        "matches_played": len(history),
        "wins": wins,
        "losses": losses,
        "draws": draws,
        "goals": goals,
        "assists": assists,
    }


def get_player_match_history(profile: PlayerProfile) -> list[dict]:
    """
    Historial partido a partido de un jugador: fecha, resultado desde su
    perspectiva, si ganó/empató/perdió, y sus goles/asistencias ese día.
    Más reciente primero.
    """
    history = (
        MatchPlayer.objects.filter(player=profile, match__is_finished=True)
        .select_related("match")
        .order_by("-match__date_played")
    )
    entries = []
    for mp in history:
        match = mp.match
        if match.team_a_score is None or match.team_b_score is None:
            continue
        own_score = match.team_a_score if mp.team == "A" else match.team_b_score
        rival_score = match.team_b_score if mp.team == "A" else match.team_a_score
        if own_score == rival_score:
            result = "draw"
        elif own_score > rival_score:
            result = "win"
        else:
            result = "loss"
        entries.append({
            "match_id": match.id,
            "date_played": match.date_played,
            "own_score": own_score,
            "rival_score": rival_score,
            "result": result,
            "is_totw": mp.is_totw,
            "goals": mp.goals,
            "assists": mp.assists,
        })
    return entries


@transaction.atomic
def generate_totw(match) -> list[MatchPlayer]:
    """
    A partir de los MatchVote del partido, calcula el ranking (suma de puntos),
    toma el Top 5 y les asigna la carta especial TOTJ con boost temporal, más
    un +1 permanente en los 6 atributos para cada uno de los 5 (aparte del
    boost temporal). Solo se puede generar una vez por partido.
    Devuelve la lista de MatchPlayer actualizados en orden de ranking.
    """
    if match.totw_generated:
        raise ValueError("El Equipo de la Jornada de este partido ya fue generado.")

    votes = MatchVote.objects.filter(match=match).select_related("voted_player")
    if not votes:
        raise ValueError("No hay votos post-partido registrados para este partido.")

    tally: dict[int, int] = {}
    for v in votes:
        tally[v.voted_player_id] = tally.get(v.voted_player_id, 0) + v.points

    ranking = sorted(tally.items(), key=lambda kv: kv[1], reverse=True)[:5]

    # Reset de estado TOTJ previo de este partido (idempotencia visual)
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

        _apply_permanent_growth(mp.player, TOTW_GROWTH_BONUS)

    match.totw_generated = True
    match.save(update_fields=["totw_generated"])

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

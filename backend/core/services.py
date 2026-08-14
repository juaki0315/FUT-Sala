"""
Lógica de negocio de FUT-Sala Tracker:
  1. Cálculo de valoración inicial con control de "trolling" de votos.
  2. Crecimiento permanente de los atributos tras un partido finalizado.
  3. Generación del Equipo de la Jornada (TOTJ) tras la votación post-partido.
"""

from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from django.db.models import Max
from django.utils import timezone

from .models import InitialVote, Match, MatchPlayer, MatchVote, PlayerBadge, PlayerProfile

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
    totw_count = MatchPlayer.objects.filter(player=profile, totw_rank__isnull=False).count()
    return {
        "matches_played": len(history),
        "wins": wins,
        "losses": losses,
        "draws": draws,
        "goals": goals,
        "assists": assists,
        "totw_count": totw_count,
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
    match.totw_generated_at = timezone.now()
    match.save(update_fields=["totw_generated", "totw_generated_at"])

    return updated


@transaction.atomic
def expire_previous_totw() -> int:
    """
    La carta TOTJ caduca automáticamente al crearse el siguiente partido.
    Se llama al crear un nuevo Match. Devuelve el nº de cartas expiradas.
    Solo se desactiva `is_totw` (lo único que afecta al boost visual/temporal
    vigente); `totw_boost` y `totw_rank` se conservan como registro histórico
    para poder contar apariciones pasadas en el TOTJ (insignias, estadísticas).
    """
    qs = MatchPlayer.objects.filter(is_totw=True)
    count = qs.count()
    qs.update(is_totw=False)
    return count


BADGE_DEFINITIONS = {
    "hat_trick": {
        "name": "Hat-trick",
        "description": "Marcó 3 o más goles en un partido.",
    },
    "manita": {
        "name": "Manita",
        "description": "Marcó 5 o más goles en un partido.",
    },
    "playmaker": {
        "name": "Asistente",
        "description": "Dio 3 o más asistencias en un partido.",
    },
    "streak_3_wins": {
        "name": "Racha ganadora",
        "description": "3 victorias seguidas.",
    },
    "unbeaten_5": {
        "name": "Invicto",
        "description": "5 partidos seguidos sin perder.",
    },
    "scoring_streak_3": {
        "name": "Racha goleadora",
        "description": "Marcó en 3 partidos seguidos.",
    },
    "matches_3": {
        "name": "Debutante",
        "description": "3 partidos disputados.",
    },
    "matches_6": {
        "name": "Habitual",
        "description": "6 partidos disputados.",
    },
    "matches_10": {
        "name": "Veterano",
        "description": "10 partidos disputados.",
    },
    "totw_first": {
        "name": "Convocado",
        "description": "Primera convocatoria al Equipo de la Jornada.",
    },
    "mvp": {
        "name": "MVP",
        "description": "Fue el jugador más votado de una jornada.",
    },
}


def _unlock_badge(profile: PlayerProfile, code: str, match=None) -> None:
    PlayerBadge.objects.get_or_create(player=profile, code=code, defaults={"match": match})


def evaluate_badges_for_player(profile: PlayerProfile, match=None) -> None:
    """
    Recalcula todas las condiciones de insignias a partir del estado actual
    del jugador y desbloquea (de forma permanente e idempotente) las que
    correspondan. Las insignias ya desbloqueadas nunca se revocan, aunque la
    racha que las originó se rompa más adelante. `match` (si se indica) queda
    registrado como el partido que originó cada insignia nueva, para poder
    mostrarlo en la "revelación" post-jornada del jugador.
    """
    history = get_player_match_history(profile)  # más reciente primero
    matches_played = len(history)

    if matches_played >= 3:
        _unlock_badge(profile, "matches_3", match)
    if matches_played >= 6:
        _unlock_badge(profile, "matches_6", match)
    if matches_played >= 10:
        _unlock_badge(profile, "matches_10", match)

    for h in history:
        if h["goals"] >= 3:
            _unlock_badge(profile, "hat_trick", match)
        if h["goals"] >= 5:
            _unlock_badge(profile, "manita", match)
        if h["assists"] >= 3:
            _unlock_badge(profile, "playmaker", match)

    win_streak = 0
    no_loss_streak = 0
    scoring_streak = 0
    for h in reversed(history):  # más antiguo -> más reciente, para rachas consecutivas reales
        win_streak = win_streak + 1 if h["result"] == "win" else 0
        if win_streak >= 3:
            _unlock_badge(profile, "streak_3_wins", match)

        no_loss_streak = no_loss_streak + 1 if h["result"] in ("win", "draw") else 0
        if no_loss_streak >= 5:
            _unlock_badge(profile, "unbeaten_5", match)

        scoring_streak = scoring_streak + 1 if h["goals"] > 0 else 0
        if scoring_streak >= 3:
            _unlock_badge(profile, "scoring_streak_3", match)

    totw_entries = MatchPlayer.objects.filter(player=profile, totw_rank__isnull=False)
    if totw_entries.exists():
        _unlock_badge(profile, "totw_first", match)
    if totw_entries.filter(totw_rank=1).exists():
        _unlock_badge(profile, "mvp", match)


def get_pending_reveal(profile: PlayerProfile) -> dict | None:
    """
    Devuelve la "revelación" pendiente del jugador: el partido más reciente
    en el que jugó, ya cerrado y con TOTJ generado, que todavía no se le ha
    mostrado (comparado con `last_reveal_seen_match`). None si no hay nada
    pendiente.
    """
    mp = (
        MatchPlayer.objects.filter(
            player=profile, match__is_finished=True, match__totw_generated=True
        )
        .exclude(match_id=profile.last_reveal_seen_match_id)
        .select_related("match")
        .order_by("-match__totw_generated_at", "-match__finished_at")
        .first()
    )
    if not mp:
        return None

    match = mp.match
    own_score = match.team_a_score if mp.team == "A" else match.team_b_score
    rival_score = match.team_b_score if mp.team == "A" else match.team_a_score
    if own_score == rival_score:
        result = "draw"
    elif own_score > rival_score:
        result = "win"
    else:
        result = "loss"

    new_badges = PlayerBadge.objects.filter(player=profile, match=match)

    return {
        "match_id": match.id,
        "date_played": match.date_played,
        "own_score": own_score,
        "rival_score": rival_score,
        "result": result,
        "goals": mp.goals,
        "assists": mp.assists,
        "is_totw": mp.totw_rank is not None,
        "totw_rank": mp.totw_rank,
        "totw_boost": mp.totw_boost,
        "new_badges": [
            {
                "code": b.code,
                "name": BADGE_DEFINITIONS[b.code]["name"],
                "description": BADGE_DEFINITIONS[b.code]["description"],
            }
            for b in new_badges
        ],
    }


def get_activity_feed(request, limit: int = 30) -> list[dict]:
    """
    Combina, en un único feed cronológico, los eventos relevantes del grupo:
    partidos convocados/cerrados, TOTJ generado e insignias desbloqueadas.
    Se computa al vuelo a partir de las tablas existentes (nada se guarda por
    separado), igual que el resto de datos derivados de la app.
    """

    def photo_url(profile):
        if not profile.photo:
            return ""
        return request.build_absolute_uri(profile.photo.url) if request else profile.photo.url

    events = []

    for match in Match.objects.order_by("-created_at")[:limit]:
        events.append({
            "type": "match_created",
            "timestamp": match.created_at,
            "match_id": match.id,
            "date_played": match.date_played,
        })
        if match.is_finished and match.finished_at:
            events.append({
                "type": "match_finished",
                "timestamp": match.finished_at,
                "match_id": match.id,
                "date_played": match.date_played,
                "team_a_score": match.team_a_score,
                "team_b_score": match.team_b_score,
            })
        if match.totw_generated and match.totw_generated_at:
            totw = list(
                MatchPlayer.objects.filter(match=match, totw_rank__isnull=False)
                .select_related("player__user")
                .order_by("totw_rank")
            )
            events.append({
                "type": "totw_generated",
                "timestamp": match.totw_generated_at,
                "match_id": match.id,
                "date_played": match.date_played,
                "totw": [
                    {
                        "player_id": mp.player_id,
                        "username": mp.player.user.username,
                        "photo_url": photo_url(mp.player),
                        "rank": mp.totw_rank,
                    }
                    for mp in totw
                ],
            })

    for badge in (
        PlayerBadge.objects.select_related("player__user").order_by("-unlocked_at")[:limit]
    ):
        events.append({
            "type": "badge_unlocked",
            "timestamp": badge.unlocked_at,
            "player_id": badge.player_id,
            "username": badge.player.user.username,
            "photo_url": photo_url(badge.player),
            "badge_code": badge.code,
            "badge_name": BADGE_DEFINITIONS[badge.code]["name"],
        })

    events.sort(key=lambda e: e["timestamp"], reverse=True)
    return events[:limit]


def _longest_streak(history_oldest_first: list[dict], predicate) -> int:
    """Longitud de la racha consecutiva más larga que cumple `predicate`."""
    best = current = 0
    for h in history_oldest_first:
        if predicate(h):
            current += 1
            best = max(best, current)
        else:
            current = 0
    return best


def get_records(request=None) -> list[dict]:
    """
    "Muro de récords": mejores marcas históricas del grupo, individuales y de
    partido. Se recalcula al vuelo a partir de los datos existentes, sin
    tablas propias. Cada récord puede tener varios poseedores empatados.
    """

    def photo_url(profile):
        if not profile.photo:
            return ""
        return request.build_absolute_uri(profile.photo.url) if request else profile.photo.url

    def player_holder(profile, value, extra=None):
        d = {
            "player_id": profile.id,
            "username": profile.user.username,
            "photo_url": photo_url(profile),
            "value": value,
        }
        if extra:
            d.update(extra)
        return d

    profiles = list(PlayerProfile.objects.select_related("user").all())
    records = []

    # --- Mejor actuación individual en un único partido ---
    max_goals = (
        MatchPlayer.objects.filter(match__is_finished=True).aggregate(Max("goals"))["goals__max"] or 0
    )
    if max_goals > 0:
        rows = MatchPlayer.objects.filter(match__is_finished=True, goals=max_goals).select_related(
            "player__user", "match"
        )
        records.append({
            "code": "goals_match",
            "name": "Más goles en un partido",
            "unit": "goles",
            "type": "player",
            "holders": [
                player_holder(mp.player, mp.goals, {"match_id": mp.match_id, "date_played": mp.match.date_played})
                for mp in rows
            ],
        })

    max_assists = (
        MatchPlayer.objects.filter(match__is_finished=True).aggregate(Max("assists"))["assists__max"] or 0
    )
    if max_assists > 0:
        rows = MatchPlayer.objects.filter(match__is_finished=True, assists=max_assists).select_related(
            "player__user", "match"
        )
        records.append({
            "code": "assists_match",
            "name": "Más asistencias en un partido",
            "unit": "asistencias",
            "type": "player",
            "holders": [
                player_holder(mp.player, mp.assists, {"match_id": mp.match_id, "date_played": mp.match.date_played})
                for mp in rows
            ],
        })

    # --- Marcas de carrera (acumuladas) ---
    stats_by_player = {p.id: get_player_stats(p) for p in profiles}

    def career_record(key, code, name, unit):
        max_val = max((s[key] for s in stats_by_player.values()), default=0)
        if max_val <= 0:
            return None
        holders = [player_holder(p, max_val) for p in profiles if stats_by_player[p.id][key] == max_val]
        return {"code": code, "name": name, "unit": unit, "type": "player", "holders": holders}

    for rec in [
        career_record("goals", "career_goals", "Máximo goleador histórico", "goles"),
        career_record("assists", "career_assists", "Máximo asistente histórico", "asistencias"),
        career_record("matches_played", "career_matches", "Más partidos disputados", "partidos"),
        career_record("wins", "career_wins", "Más victorias", "victorias"),
        career_record("totw_count", "career_totw", "Más veces en el TOTJ", "veces"),
    ]:
        if rec:
            records.append(rec)

    # --- Más veces MVP (rank 1 del TOTJ) ---
    mvp_counts = {p.id: MatchPlayer.objects.filter(player=p, totw_rank=1).count() for p in profiles}
    max_mvp = max(mvp_counts.values(), default=0)
    if max_mvp > 0:
        records.append({
            "code": "career_mvp",
            "name": "Más veces MVP",
            "unit": "veces",
            "type": "player",
            "holders": [player_holder(p, max_mvp) for p in profiles if mvp_counts[p.id] == max_mvp],
        })

    # --- Más insignias conseguidas ---
    badge_counts = {p.id: p.badges.count() for p in profiles}
    max_badges = max(badge_counts.values(), default=0)
    if max_badges > 0:
        records.append({
            "code": "badge_count",
            "name": "Más insignias conseguidas",
            "unit": "insignias",
            "type": "player",
            "holders": [player_holder(p, max_badges) for p in profiles if badge_counts[p.id] == max_badges],
        })

    # --- Rachas más largas de la historia (no solo si superaron un umbral) ---
    streak_defs = [
        ("longest_win_streak", "Racha de victorias más larga", "partidos seguidos", lambda h: h["result"] == "win"),
        (
            "longest_unbeaten_streak",
            "Racha invicta más larga",
            "partidos seguidos",
            lambda h: h["result"] in ("win", "draw"),
        ),
        ("longest_scoring_streak", "Racha goleadora más larga", "partidos seguidos", lambda h: h["goals"] > 0),
    ]
    for code, name, unit, predicate in streak_defs:
        best_val = 0
        best_players = []
        for p in profiles:
            history_oldest_first = list(reversed(get_player_match_history(p)))
            val = _longest_streak(history_oldest_first, predicate)
            if val > best_val:
                best_val = val
                best_players = [p]
            elif val == best_val and val > 0:
                best_players.append(p)
        if best_val > 0:
            records.append({
                "code": code,
                "name": name,
                "unit": unit,
                "type": "player",
                "holders": [player_holder(p, best_val) for p in best_players],
            })

    # --- Récords de partido (sin poseedor individual) ---
    finished = list(
        Match.objects.filter(is_finished=True, team_a_score__isnull=False, team_b_score__isnull=False)
    )
    if finished:
        def match_entry(m, value):
            return {
                "match_id": m.id,
                "date_played": m.date_played,
                "value": value,
                "team_a_score": m.team_a_score,
                "team_b_score": m.team_b_score,
            }

        combined_val = max(m.team_a_score + m.team_b_score for m in finished)
        records.append({
            "code": "match_combined_goals",
            "name": "Partido más goleador",
            "unit": "goles totales",
            "type": "match",
            "holders": [
                match_entry(m, combined_val) for m in finished if m.team_a_score + m.team_b_score == combined_val
            ],
        })

        biggest_val = max(abs(m.team_a_score - m.team_b_score) for m in finished)
        if biggest_val > 0:
            records.append({
                "code": "match_biggest_win",
                "name": "Victoria más abultada",
                "unit": "goles de diferencia",
                "type": "match",
                "holders": [
                    match_entry(m, biggest_val)
                    for m in finished
                    if abs(m.team_a_score - m.team_b_score) == biggest_val
                ],
            })

    return records

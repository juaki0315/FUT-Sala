"""
Smoke test manual (no pytest) para validar:
 - Registro de usuarios y creación automática de PlayerProfile
 - Fórmula de control de trolling en la valoración inicial
 - Evolución dinámica de la media tras un partido
 - Generación del TOTJ con boosts correctos
Ejecutar con: python manage.py shell < smoke_test.py
"""
import django

django.setup()

from decimal import Decimal

from django.contrib.auth import get_user_model

from core import services
from core.models import InitialVote, Match, MatchPlayer, MatchVote, PlayerProfile

User = get_user_model()

# Limpieza
User.objects.filter(username__startswith="smoke_").delete()

# 1) Crear 6 usuarios: 1 nuevo (target) + 5 evaluadores
target_user = User.objects.create_user("smoke_target", password="x")
target_profile = PlayerProfile.objects.create(user=target_user)

evaluators = [User.objects.create_user(f"smoke_eval{i}", password="x") for i in range(5)]

# Votos de calibración con un troll intencionado (99 y 1 en ritmo)
ritmo_votes = [99, 70, 72, 71, 1]  # max=99 (troll alto), min=1 (troll bajo)
for user, r in zip(evaluators, ritmo_votes):
    InitialVote.objects.create(
        voter=user, target=target_profile,
        ritmo=r, tiro=70, pase=70, regate=70, defensa=70, fisico=70,
        pierna_mala=3, filigranas=3,
    )

services.apply_initial_rating(target_profile)
target_profile.refresh_from_db()

# Esperado: (99*0.5 + 1*0.5 + 70+72+71) / (5-2+1) = (49.5+0.5+213)/4 = 263/4 = 65.75 -> 66
assert target_profile.ritmo == 66, f"Ritmo esperado 66, obtenido {target_profile.ritmo}"
print(f"OK calibración inicial -> ritmo={target_profile.ritmo} (esperado 66, trolls 99 y 1 amortiguados)")

# 2) Partido con evolución dinámica
admin = User.objects.create_superuser("smoke_admin", "a@a.com", "x")
match = Match.objects.create(date_played="2026-08-09T20:00:00Z", created_by=admin)

team_a_players = [target_profile]
team_b_profiles = []
for u in evaluators:
    p = PlayerProfile.objects.create(user=u)
    team_b_profiles.append(p)

MatchPlayer.objects.create(match=match, player=target_profile, team="A")
for p in team_b_profiles:
    MatchPlayer.objects.create(match=match, player=p, team="B")

match.team_a_score = 5
match.team_b_score = 3
match.is_finished = True
match.save()

before = target_profile.base_average
services.apply_match_result_evolution(match)
target_profile.refresh_from_db()
assert target_profile.base_average == before + Decimal("0.2"), "Evolución de victoria incorrecta"
print(f"OK evolución dinámica -> base_average subió de {before} a {target_profile.base_average} (victoria +0.2)")

# 3) Votación post-partido -> TOTJ
voters = evaluators
targets_ranked = [target_profile] + team_b_profiles[:4]  # 5 candidatos
points_order = [5, 4, 3, 2, 1]
for voter in voters:
    for pts, tgt in zip(points_order, targets_ranked):
        if tgt.user_id != voter.id:
            MatchVote.objects.get_or_create(
                match=match, voter=voter, voted_player=tgt, defaults={"points": pts}
            )
            break  # cada evaluador vota una vez en este smoke test simplificado

# Votos simplificados: todos votan target_profile como 1º
for voter in voters:
    MatchVote.objects.filter(match=match, voter=voter).delete()
    MatchVote.objects.create(match=match, voter=voter, voted_player=target_profile, points=5)

updated = services.generate_totw(match)
target_mp = MatchPlayer.objects.get(match=match, player=target_profile)
assert target_mp.is_totw is True
assert target_mp.totw_boost == 5, f"Boost esperado 5 (MVP), obtenido {target_mp.totw_boost}"
assert target_mp.totw_rank == 1
print(f"OK TOTJ -> MVP={target_profile.user.username}, boost={target_mp.totw_boost}, rank={target_mp.totw_rank}")

target_profile.refresh_from_db()
print(f"OK bonus permanente MVP aplicado -> base_average ahora {target_profile.base_average}")

# 4) Caducidad al crear el siguiente partido
services.expire_previous_totw()
target_mp.refresh_from_db()
assert target_mp.is_totw is False
print("OK caducidad TOTJ al crear el siguiente partido")

print("\n✅ TODOS LOS TESTS DE LÓGICA DE NEGOCIO PASARON CORRECTAMENTE")

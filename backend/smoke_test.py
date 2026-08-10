"""
Smoke test manual (no pytest) para validar:
 - Registro de usuarios y creación automática de PlayerProfile
 - Fórmula de control de trolling en la valoración inicial
 - Crecimiento permanente de atributos tras un partido (victoria/empate/derrota)
 - Acumulación fraccional (growth_carry) en empates/derrotas sucesivos
 - Generación del TOTJ con boosts correctos + bonus permanente para los 5
 - Guards de idempotencia (no se puede generar el TOTJ dos veces)
Ejecutar con: python manage.py shell < smoke_test.py
"""
import django

django.setup()

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

# 2) Partido con crecimiento permanente por victoria (+1 a los 6 atributos)
admin = User.objects.create_superuser("smoke_admin", "a@a.com", "x")
match = Match.objects.create(date_played="2026-08-09T20:00:00Z", created_by=admin)

team_b_profiles = [PlayerProfile.objects.create(user=u) for u in evaluators]

MatchPlayer.objects.create(match=match, player=target_profile, team="A")
for p in team_b_profiles:
    MatchPlayer.objects.create(match=match, player=p, team="B")

match.team_a_score = 5
match.team_b_score = 3
match.is_finished = True
match.save()

services.apply_match_result_evolution(match)
target_profile.refresh_from_db()
loser = team_b_profiles[0]
loser.refresh_from_db()
assert target_profile.ritmo == 67, f"Ritmo esperado 67 tras victoria (+1), obtenido {target_profile.ritmo}"
assert target_profile.growth_carry == 0, "Una victoria (+1 exacto) no debe dejar resto en growth_carry"
assert loser.ritmo == 50, f"El equipo perdedor solo suma +0.5, no debe redondear ya a 51, obtenido {loser.ritmo}"
assert float(loser.growth_carry) == 0.5, f"Esperado 0.5 de resto tras una derrota, obtenido {loser.growth_carry}"
print(f"OK crecimiento por victoria -> ritmo {66}->{target_profile.ritmo} (+1); derrota deja 0.5 en growth_carry")

# 3) Un segundo empate para el "loser" debe completar el punto acumulado (0.5+0.75=1.25 -> +1)
match2 = Match.objects.create(date_played="2026-08-10T20:00:00Z", created_by=admin)
MatchPlayer.objects.create(match=match2, player=loser, team="A")
MatchPlayer.objects.create(match=match2, player=target_profile, team="B")
match2.team_a_score = 2
match2.team_b_score = 2
match2.is_finished = True
match2.save()
services.apply_match_result_evolution(match2)
loser.refresh_from_db()
assert loser.ritmo == 51, f"0.5 (derrota) + 0.75 (empate) = 1.25 -> +1 real, obtenido {loser.ritmo}"
assert float(loser.growth_carry) == 0.25, f"Debe quedar 0.25 de resto, obtenido {loser.growth_carry}"
print(f"OK acumulación fraccional -> derrota(+0.5) + empate(+0.75) = +1 real, resto 0.25 en growth_carry")

# 4) Votación post-partido -> TOTJ (sobre el primer partido)
for voter in evaluators:
    MatchVote.objects.filter(match=match, voter=voter).delete()
    MatchVote.objects.create(match=match, voter=voter, voted_player=target_profile, points=5)

ritmo_before_totw = target_profile.ritmo
updated = services.generate_totw(match)
target_mp = MatchPlayer.objects.get(match=match, player=target_profile)
assert target_mp.is_totw is True
assert target_mp.totw_boost == 5, f"Boost esperado 5 (MVP), obtenido {target_mp.totw_boost}"
assert target_mp.totw_rank == 1
target_profile.refresh_from_db()
assert target_profile.ritmo == ritmo_before_totw + 1, "El TOTJ debe sumar +1 permanente aparte del boost temporal"
print(
    f"OK TOTJ -> MVP={target_profile.user.username}, boost={target_mp.totw_boost}, "
    f"rank={target_mp.totw_rank}, ritmo permanente {ritmo_before_totw}->{target_profile.ritmo}"
)

# 5) No se puede generar el TOTJ dos veces para el mismo partido
try:
    services.generate_totw(match)
    raise AssertionError("Se esperaba un ValueError al generar el TOTJ dos veces")
except ValueError as e:
    print(f"OK idempotencia TOTJ -> segunda llamada rechazada: {e}")

# 6) Caducidad al crear el siguiente partido
services.expire_previous_totw()
target_mp.refresh_from_db()
assert target_mp.is_totw is False
print("OK caducidad TOTJ al crear el siguiente partido")

print("\n✅ TODOS LOS TESTS DE LÓGICA DE NEGOCIO PASARON CORRECTAMENTE")

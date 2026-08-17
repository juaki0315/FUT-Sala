"""
Repara los votos de la Revisión de Lloros que quedaron a medio aplicar con
la lógica antigua (esperar a que votaran todos los convocados): si un
partido tenía votos pero no había votado el 100% de los convocados, esos
votos nunca llegaron a aplicarse. Con la lógica nueva (aplicación al
instante) solo se reconcilian los pares (objetivo, atributo) que toca un
voto nuevo, así que sin este backfill esos partidos se quedarían aplicados
a medias para siempre.

Los partidos donde YA habían votado todos los convocados se saltan: bajo la
lógica antigua eso disparaba la aplicación automática en su momento, así
que volver a aplicarlos aquí duplicaría el efecto.
"""
from django.db import migrations

PERFORMANCE_REVIEW_MAX_DELTA = 3


def backfill_pending_reviews(apps, schema_editor):
    MatchPlayer = apps.get_model("core", "MatchPlayer")
    MatchPerformanceReview = apps.get_model("core", "MatchPerformanceReview")
    MatchPerformanceVote = apps.get_model("core", "MatchPerformanceVote")
    MatchPerformanceApplied = apps.get_model("core", "MatchPerformanceApplied")
    PlayerProfile = apps.get_model("core", "PlayerProfile")

    match_ids = MatchPerformanceVote.objects.values_list("match_id", flat=True).distinct()
    for match_id in match_ids:
        total_participants = MatchPlayer.objects.filter(match_id=match_id).count()
        submitted = MatchPerformanceReview.objects.filter(match_id=match_id).count()
        if total_participants and submitted >= total_participants:
            # Ya se aplicó automáticamente bajo la lógica antigua; no lo repetimos.
            continue

        pairs = (
            MatchPerformanceVote.objects.filter(match_id=match_id)
            .values_list("target_id", "attribute")
            .distinct()
        )
        for target_id, attribute in pairs:
            deltas = list(
                MatchPerformanceVote.objects.filter(
                    match_id=match_id, target_id=target_id, attribute=attribute
                ).values_list("delta", flat=True)
            )
            if not deltas:
                continue
            avg = round(sum(deltas) / len(deltas))
            avg = max(-PERFORMANCE_REVIEW_MAX_DELTA, min(PERFORMANCE_REVIEW_MAX_DELTA, avg))

            tracker, _ = MatchPerformanceApplied.objects.get_or_create(
                match_id=match_id, target_id=target_id, attribute=attribute,
                defaults={"applied_value": 0},
            )
            incremental = avg - tracker.applied_value
            if incremental == 0:
                continue

            profile = PlayerProfile.objects.get(pk=target_id)
            current = getattr(profile, attribute)
            setattr(profile, attribute, max(1, min(99, current + incremental)))
            profile.save(update_fields=[attribute])

            tracker.applied_value = avg
            tracker.save(update_fields=["applied_value"])


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0010_remove_match_performance_review_applied_and_more"),
    ]

    operations = [
        migrations.RunPython(backfill_pending_reviews, migrations.RunPython.noop),
    ]

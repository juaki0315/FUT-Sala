from django.contrib import admin

from .models import (
    EvaluatorAssignment,
    InitialVote,
    Match,
    MatchPlayer,
    MatchVote,
    PlayerBadge,
    PlayerProfile,
)


@admin.register(PlayerProfile)
class PlayerProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "overall_rating", "growth_carry", "calibrated"]
    list_filter = ["calibrated", "card_style"]
    search_fields = ["user__username"]


@admin.register(Match)
class MatchAdmin(admin.ModelAdmin):
    list_display = ["id", "date_played", "team_a_score", "team_b_score", "is_finished", "totw_generated"]
    list_filter = ["is_finished"]


@admin.register(MatchPlayer)
class MatchPlayerAdmin(admin.ModelAdmin):
    list_display = ["match", "player", "team", "goals", "assists", "is_totw", "totw_boost", "totw_rank"]
    list_editable = ["goals", "assists"]
    list_filter = ["team", "is_totw"]
    search_fields = ["player__user__username"]
    list_select_related = ["match", "player__user"]


@admin.register(InitialVote)
class InitialVoteAdmin(admin.ModelAdmin):
    list_display = ["voter", "target", "created_at"]


@admin.register(EvaluatorAssignment)
class EvaluatorAssignmentAdmin(admin.ModelAdmin):
    list_display = ["target", "voter"]


@admin.register(MatchVote)
class MatchVoteAdmin(admin.ModelAdmin):
    list_display = ["match", "voter", "voted_player", "points"]


@admin.register(PlayerBadge)
class PlayerBadgeAdmin(admin.ModelAdmin):
    list_display = ["player", "code", "match", "unlocked_at"]
    list_filter = ["code"]
    search_fields = ["player__user__username"]

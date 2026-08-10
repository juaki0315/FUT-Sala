from django.contrib import admin

from .models import EvaluatorAssignment, InitialVote, Match, MatchPlayer, MatchVote, PlayerProfile


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
    list_display = ["match", "player", "team", "is_totw", "totw_boost", "totw_rank"]
    list_filter = ["team", "is_totw"]


@admin.register(InitialVote)
class InitialVoteAdmin(admin.ModelAdmin):
    list_display = ["voter", "target", "created_at"]


@admin.register(EvaluatorAssignment)
class EvaluatorAssignmentAdmin(admin.ModelAdmin):
    list_display = ["target", "voter"]


@admin.register(MatchVote)
class MatchVoteAdmin(admin.ModelAdmin):
    list_display = ["match", "voter", "voted_player", "points"]

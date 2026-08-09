# FUT-Sala Tracker — Backend (Fase 1)

API REST en Django + Django REST Framework + SimpleJWT que implementa:

- Modelos: `PlayerProfile`, `Match`, `MatchPlayer`, `InitialVote`, `MatchVote`.
- **Valoración inicial con control de trolling**: el voto máximo y el mínimo
  pesan 0.5×, el resto pesa 1×, dividido entre `(N-2)+1`.
- **Evolución dinámica de la media** tras cada partido: +0.2 victoria, -0.1
  derrota, 0.0 empate.
- **Generación del Equipo de la Jornada (TOTJ)**: ranking por puntos (5→1)
  de la votación post-partido, boosts +5/+4/+3/+2/+1 OVR, +0.5 permanente
  al MVP, y caducidad automática al crear el siguiente partido.

## Arrancar en local

```bash
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser   # usuario admin
python manage.py runserver
```

La API queda en `http://localhost:8000/api/` y el panel de admin en `/admin/`.

## Autenticación (JWT)

```
POST /api/auth/token/            {"username": "...", "password": "..."}  -> {access, refresh}
POST /api/auth/token/refresh/    {"refresh": "..."}                       -> {access}
POST /api/register/              {"username", "email", "password"}        -> crea User + PlayerProfile
```

Incluir en cada request: `Authorization: Bearer <access_token>`

## Endpoints principales

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/players/` | Listado de cartas |
| GET | `/api/players/me/` | Mi carta |
| PATCH | `/api/players/{id}/` | Editar estética (foto, estilo) — solo el dueño |
| POST | `/api/players/{id}/calibrate/` | **Admin**: calcula valoración inicial desde los `InitialVote` |
| POST | `/api/initial-votes/` | Votar la calibración de un jugador nuevo |
| GET | `/api/initial-votes/?target={id}` | Ver votos recibidos por un jugador |
| POST | `/api/matches/` | **Admin**: crear partido (caduca el TOTJ anterior) |
| POST | `/api/matches/{id}/add_players/` | **Admin**: asignar jugadores a Equipo A/B |
| POST | `/api/matches/{id}/finish/` | **Admin**: cerrar partido con marcador → evoluciona medias |
| POST | `/api/match-votes/` | Votar Top 5 post-partido `{match, voted_player, points}` |
| POST | `/api/matches/{id}/generate_totw/` | **Admin**: genera el TOTJ desde los votos |
| GET | `/api/matches/{id}/current_totw/` | Ver el TOTJ vigente de un partido |

## Tests de lógica de negocio

```bash
python manage.py shell < smoke_test.py
```

Valida la fórmula anti-trolling, la evolución de medias, el cálculo del
TOTJ y su caducidad, con datos de ejemplo.

## Siguiente fase

Fase 2 (Frontend React + Tailwind + componente Carta FIFA + navegación
móvil) — decir cuándo continuar.

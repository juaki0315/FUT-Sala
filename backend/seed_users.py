"""
Crea los usuarios base del grupo (jugadores normales) con su PlayerProfile
asociado (carta en 50, sin calibrar todavía).

Convención de datos mock (editable en versiones posteriores por cada jugador):
  - email:    <nombre_minúscula>@gmail.com
  - password: <Nombre>123

Ejecutar desde la carpeta backend/ con el entorno virtual activado:
  python manage.py shell < seed_users.py
"""
import django

django.setup()

from django.contrib.auth import get_user_model

from core.models import PlayerProfile

User = get_user_model()

NOMBRES = [
    "Ernesto",
    "Naim",
    "Guille",
    "Yander",
    "Luis",
    "Ivan",
    "FulvioCo",
    "Charizard",
    "JunVi",
    "Javifresh",
    "Markito",
]

creados, existentes = [], []

for nombre in NOMBRES:
    email = f"{nombre.lower()}@gmail.com"
    password = f"{nombre}123"

    user, was_created = User.objects.get_or_create(
        username=nombre,
        defaults={"email": email},
    )

    if was_created:
        user.set_password(password)
        user.is_staff = False  # todos usuarios normales
        user.save()
        PlayerProfile.objects.get_or_create(user=user)
        creados.append(nombre)
    else:
        existentes.append(nombre)

print(f"\n✅ Usuarios creados ({len(creados)}): {', '.join(creados) or '—'}")
if existentes:
    print(f"⚠️  Ya existían, se omitieron ({len(existentes)}): {', '.join(existentes)}")

print("\nCredenciales mock generadas (nombre123 / nombre@gmail.com):")
for nombre in NOMBRES:
    print(f"  {nombre:<12} usuario={nombre:<12} password={nombre}123  email={nombre.lower()}@gmail.com")

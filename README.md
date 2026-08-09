# FUT-Sala Tracker

App web mobile-first para dinamizar partidos semanales de fútbol sala entre
amigos, con cartas estilo FIFA Ultimate Team, valoración por votos, y
Equipo de la Jornada (TOTJ).

```
futsala-tracker/
├── backend/    Django + DRF + SimpleJWT (API REST + lógica de negocio)
└── frontend/   React (Vite) + Tailwind + Framer Motion (PWA mobile-first)
```

## Arranque rápido (2 terminales)

**Terminal 1 — Backend**
```bash
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```
→ API en `http://localhost:8000/api/` · Admin en `http://localhost:8000/admin/`

**Terminal 2 — Frontend**
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```
→ App en `http://localhost:5173`

## Primer uso

1. Con el backend arrancado, crea tu superusuario (paso de arriba). Este
   usuario tendrá permisos de administrador (`is_staff`) en la app.
2. Abre `http://localhost:5173/registro` y crea tu cuenta de jugador.
3. Inicia sesión con tu superusuario para acceder a los controles de admin:
   crear partidos (⚽ Partidos → botón +), asignar jugadores a Equipo A/B,
   cerrar el marcador y generar el Equipo de la Jornada.
4. Cualquier jugador logueado puede votar su Top 5 tras un partido finalizado
   desde la pantalla del partido.

## Detalle de cada parte

Cada carpeta tiene su propio `README.md` con la lista completa de endpoints
(backend) y de pantallas (frontend), y con instrucciones de arranque más
detalladas.

## Próxima fase sugerida

Fase 4 del documento original: pulido UX, pantalla dedicada para votar la
calibración inicial de jugadores nuevos, y exportación PWA (ya cuenta con
`manifest.json` base — falta el service worker para uso offline completo).

# FUT-Sala Tracker — Frontend (Fase 2)

PWA mobile-first en React (Vite) + Tailwind CSS v4 + Framer Motion + Lucide,
conectada a la API Django de la Fase 1.

## Qué incluye

- **Autenticación JWT** (login, registro, refresh automático de token).
- **Componente Carta FIFA** (`PlayerCard`): variante oro base y variante TOTJ
  (negro/morado/oro con animación de brillo tipo foil).
- **Navegación inferior**: Inicio · Mi Carta · Partidos · TOTJ.
- **Inicio**: próximo partido + banner del Equipo de la Jornada vigente.
- **Mi Carta**: vista detallada, edición de foto de perfil, progresión de media.
- **Partidos**: historial, creación (admin), alineaciones por equipo,
  asignación de jugadores (admin), cierre de marcador (admin), votación
  post-partido (Top 5 con puntos 5→1), generación del TOTJ (admin).
- **TOTJ**: galería de las 5 cartas especiales de la jornada vigente.

Diseño: paleta "pista de futsal bajo focos nocturnos" (verde-negro + oro +
acento azul-hielo), tipografía Teko (marcador deportivo) + Inter (cuerpo).

## Arrancar en local

Requiere Node.js 18+.

```bash
npm install
cp .env.example .env
npm run dev
```

Abre http://localhost:5173. Por defecto apunta a la API en
http://localhost:8000/api — el backend (Fase 1) debe estar corriendo
antes para poder loguearte.

Si tu backend corre en otra URL, edítala en `.env`:

```
VITE_API_URL=http://localhost:8000/api
```

## Compilar para producción

```bash
npm run build
```

Genera la carpeta `dist/` lista para servir estáticamente (Netlify, Vercel,
Nginx, etc.) o para instalarse como PWA en el móvil.

## Primer uso

1. Arranca el backend y crea un superusuario (`python manage.py createsuperuser`).
2. Entra a `/registro` y crea tu cuenta de jugador — se creará tu
   `PlayerProfile` automáticamente con atributos en 50 (carta base).
3. Inicia sesión como superusuario (el `is_staff` da acceso a los controles
   de administrador: crear partidos, asignar equipos, cerrar marcador y
   generar el TOTJ).
4. Para calibrar la carta de un jugador nuevo: los demás jugadores votan sus
   atributos vía `POST /api/initial-votes/`, y el admin dispara
   `POST /api/players/{id}/calibrate/` (todavía sin pantalla dedicada en
   esta fase — se puede hacer desde `/admin/` de Django o con la API
   directamente; es candidato para la Fase 4 de pulido UX).

import {
  Target,
  Hand,
  Send,
  Flame,
  ShieldCheck,
  Zap,
  Medal,
  Award,
  Trophy,
  Star,
  Crown,
} from "lucide-react";

export const BADGE_CATALOG = [
  { code: "hat_trick", name: "Hat-trick", description: "Marcó 3 o más goles en un partido.", icon: Target },
  { code: "manita", name: "Manita", description: "Marcó 5 o más goles en un partido.", icon: Hand },
  { code: "playmaker", name: "Asistente", description: "Dio 3 o más asistencias en un partido.", icon: Send },
  { code: "streak_3_wins", name: "Racha ganadora", description: "3 victorias seguidas.", icon: Flame },
  { code: "unbeaten_5", name: "Invicto", description: "5 partidos seguidos sin perder.", icon: ShieldCheck },
  { code: "scoring_streak_3", name: "Racha goleadora", description: "Marcó en 3 partidos seguidos.", icon: Zap },
  { code: "matches_3", name: "Debutante", description: "3 partidos disputados.", icon: Medal },
  { code: "matches_6", name: "Habitual", description: "6 partidos disputados.", icon: Award },
  { code: "matches_10", name: "Veterano", description: "10 partidos disputados.", icon: Trophy },
  { code: "totw_first", name: "Convocado", description: "Primera convocatoria al Equipo de la Jornada.", icon: Star },
  { code: "mvp", name: "MVP", description: "Fue el jugador más votado de una jornada.", icon: Crown },
];

export const BADGE_ICONS = Object.fromEntries(BADGE_CATALOG.map((b) => [b.code, b.icon]));

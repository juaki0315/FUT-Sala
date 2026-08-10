import { motion } from "framer-motion";
import { Star, Zap, Target, Compass, Shield as ShieldIcon, Dumbbell, Sparkles } from "lucide-react";

const ATTR_ICONS = { RIT: Zap, TIR: Target, PAS: Compass, REG: Sparkles, DEF: ShieldIcon, FIS: Dumbbell };

// Tramos de carta según el OVR base (no el boost temporal de TOTJ, que tiene
// su propia estética morado+dorado por encima de cualquier tramo).
function getTier(overall) {
  if (overall >= 70) return "gold";
  if (overall >= 58) return "silver";
  return "bronze";
}

const TIER_ACCENT = {
  bronze: "text-bronze-400",
  silver: "text-silver-300",
  gold: "text-gold-400",
};

const TIER_BORDER = {
  bronze: "border-bronze-400/40",
  silver: "border-silver-400/40",
  gold: "border-gold-400/40",
};

const TIER_RING = {
  bronze: "border-bronze-400",
  silver: "border-silver-300",
  gold: "border-gold-400",
};

function Stars({ count }) {
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={11}
          className={i < count ? "fill-current" : "text-current opacity-20"}
        />
      ))}
    </span>
  );
}

/**
 * PlayerCard — el elemento de identidad visual de la app.
 * Todas las cartas comparten el mismo cuerpo "carbón"; el único distintivo
 * del tramo (bronce/plata/oro, según OVR) es el color del aro de la foto y
 * de los números — nada de etiquetas de texto sobre la carta.
 * La TOTJ (Equipo de la Jornada) es su propio nivel especial, temporal,
 * por encima de cualquier tramo: morado+dorado con brillo.
 */
export default function PlayerCard({ player, size = "md", animated = true }) {
  if (!player) return null;

  const isTotw = player.is_totw_active;
  const ovr = player.current_card_rating ?? player.overall_rating;
  const tier = getTier(player.overall_rating);

  const dims = size === "sm" ? "w-36" : size === "lg" ? "w-64" : "w-48";
  // En "sm" la fila OVR+estrellas ya casi llena el ancho disponible, así que
  // el aro tiene que ser más pequeño para no recortarse contra el borde.
  const avatarSize = size === "sm" ? "h-12 w-12" : size === "lg" ? "h-28 w-28" : "h-20 w-20";
  const avatarText = size === "lg" ? "text-3xl" : size === "sm" ? "text-base" : "text-2xl";

  const frame = isTotw
    ? "bg-gradient-to-b from-pitch-950 via-totw-purple to-gold-500 text-gold-300"
    : `bg-gradient-to-b from-pitch-700 via-pitch-800 to-pitch-900 text-floodlight-300 border ${TIER_BORDER[tier]}`;

  const accent = isTotw ? "text-gold-300" : TIER_ACCENT[tier];
  const ringColor = isTotw ? "border-gold-300" : TIER_RING[tier];

  const Wrapper = animated ? motion.div : "div";
  const animProps = animated
    ? {
        // Sin rotateY: combinar una transformación 3D con overflow-hidden hace
        // que Safari/iOS no recorte bien el aro de la foto durante el giro
        // (se ve "salirse" de la carta un instante en las cartas pequeñas).
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.5, ease: "easeOut" },
        whileTap: { scale: 0.97 },
      }
    : {};

  return (
    <Wrapper
      {...animProps}
      className={`relative ${dims} shrink-0 aspect-[2/3] rounded-2xl ${frame} p-3 flex flex-col shadow-xl shadow-black/40 overflow-hidden ${
        isTotw ? "card-sheen ring-1 ring-gold-400/60" : ""
      }`}
    >
      {/* Cabecera: OVR + estrellas + foto */}
      <div className="flex items-center justify-between">
        <div className="text-left leading-none shrink-0">
          <div className={`font-display text-4xl font-semibold ${accent}`}>{ovr}</div>
          <div className="mt-1 flex flex-col gap-0.5 text-[10px] font-semibold opacity-80">
            <Stars count={player.pierna_mala} />
            <Stars count={player.filigranas} />
          </div>
        </div>
        <div
          className={`${avatarSize} shrink-0 rounded-full bg-white/5 overflow-hidden flex items-center justify-center ${
            size === "sm" ? "border-2" : "border-[3px]"
          } ${ringColor} shadow-lg shadow-black/40`}
        >
          {player.photo_url ? (
            <img src={player.photo_url} alt={player.username} className="h-full w-full object-cover" />
          ) : (
            <span className={`font-display ${avatarText}`}>{player.username?.[0]?.toUpperCase() ?? "?"}</span>
          )}
        </div>
      </div>

      {/* Nombre */}
      <div className="mt-2 border-b border-current/20 pb-1.5 text-center font-display text-lg font-semibold uppercase tracking-wide truncate">
        {player.username}
      </div>

      {/* Atributos */}
      <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs font-semibold">
        {[
          ["RIT", player.ritmo],
          ["TIR", player.tiro],
          ["PAS", player.pase],
          ["REG", player.regate],
          ["DEF", player.defensa],
          ["FIS", player.fisico],
        ].map(([label, val]) => {
          const Icon = ATTR_ICONS[label];
          return (
            <div key={label} className="flex items-center gap-1.5">
              <span className={`font-display text-base w-6 text-right ${accent}`}>{val}</span>
              <Icon size={11} className="opacity-60" />
              <span className="opacity-70 text-[10px]">{label}</span>
            </div>
          );
        })}
      </div>

      {isTotw && (
        <div className="mt-auto pt-1 text-center text-[10px] font-semibold text-gold-300/90">
          +{ovr - player.overall_rating} OVR boost temporal
        </div>
      )}
    </Wrapper>
  );
}

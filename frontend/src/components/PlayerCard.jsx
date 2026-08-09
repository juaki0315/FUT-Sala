import { motion } from "framer-motion";
import { Star, Zap, Target, Compass, Shield as ShieldIcon, Dumbbell, Sparkles } from "lucide-react";

const ATTR_ICONS = { RIT: Zap, TIR: Target, PAS: Compass, REG: Sparkles, DEF: ShieldIcon, FIS: Dumbbell };

function Stars({ count }) {
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={11}
          className={i < count ? "fill-pitch-900 text-pitch-900" : "text-pitch-900/25"}
        />
      ))}
    </span>
  );
}

/**
 * PlayerCard — el elemento de identidad visual de la app.
 * variant: "gold" (base) | "totw" (Equipo de la Jornada, negro/morado/oro con brillo)
 */
export default function PlayerCard({ player, size = "md", animated = true }) {
  if (!player) return null;

  const isTotw = player.is_totw_active;
  const ovr = player.current_card_rating ?? player.overall_rating;

  const dims = size === "sm" ? "w-36" : size === "lg" ? "w-64" : "w-48";

  const frame = isTotw
    ? "bg-gradient-to-b from-pitch-950 via-totw-purple to-gold-500 text-gold-300"
    : "bg-gradient-to-b from-gold-300 via-gold-500 to-gold-600 text-pitch-900";

  const Wrapper = animated ? motion.div : "div";
  const animProps = animated
    ? {
        initial: { opacity: 0, y: 16, rotateY: -8 },
        animate: { opacity: 1, y: 0, rotateY: 0 },
        transition: { duration: 0.5, ease: "easeOut" },
        whileTap: { scale: 0.97 },
      }
    : {};

  return (
    <Wrapper
      {...animProps}
      className={`relative ${dims} aspect-[2/3] rounded-2xl ${frame} p-3 flex flex-col shadow-xl shadow-black/40 overflow-hidden ${
        isTotw ? "card-sheen ring-1 ring-gold-400/60" : ""
      }`}
    >
      {isTotw && (
        <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-gold-500/90 px-2 py-0.5 text-[10px] font-bold text-pitch-900 font-display tracking-wide">
          <Sparkles size={10} /> TOTJ
        </div>
      )}

      {/* Cabecera: OVR + estrellas */}
      <div className="flex items-start justify-between">
        <div className="text-left leading-none">
          <div className="font-display text-4xl font-semibold">{ovr}</div>
          <div className="mt-1 flex flex-col gap-0.5 text-[10px] font-semibold opacity-80">
            <Stars count={player.pierna_mala} />
            <Stars count={player.filigranas} />
          </div>
        </div>
        <div className="h-14 w-14 rounded-full bg-black/15 overflow-hidden ring-2 ring-black/10 flex items-center justify-center">
          {player.photo_url ? (
            <img src={player.photo_url} alt={player.username} className="h-full w-full object-cover" />
          ) : (
            <span className="font-display text-xl">{player.username?.[0]?.toUpperCase() ?? "?"}</span>
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
              <span className="font-display text-base w-6 text-right">{val}</span>
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

import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Sparkles, Goal, Footprints } from "lucide-react";
import { BADGE_ICONS } from "../data/badges";

const RESULT_LABEL = {
  win: { label: "Victoria", className: "text-floodlight-400" },
  draw: { label: "Empate", className: "text-floodlight-300/70" },
  loss: { label: "Derrota", className: "text-red-300" },
};

/** "Sobre" que se abre al entrar tras el cierre de una jornada: resultado, TOTJ e insignias nuevas. */
export default function RevealModal({ reveal, onClose }) {
  const [opened, setOpened] = useState(false);
  if (!reveal) return null;

  const result = RESULT_LABEL[reveal.result];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm px-5">
      <AnimatePresence mode="wait">
        {!opened ? (
          <motion.button
            key="closed"
            onClick={() => setOpened(true)}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col items-center gap-5"
          >
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="h-28 w-28 rounded-3xl bg-gradient-to-br from-gold-500/30 via-totw-purple/30 to-pitch-850 border border-gold-500/50 flex items-center justify-center shadow-lg shadow-black/50"
            >
              <Sparkles size={40} className="text-gold-400" />
            </motion.div>
            <div className="text-center">
              <div className="font-display text-2xl text-floodlight-200">Jornada cerrada</div>
              <div className="text-sm text-floodlight-300/50 mt-1">Toca para ver cómo te fue</div>
            </div>
          </motion.button>
        ) : (
          <motion.div
            key="open"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-sm rounded-2xl bg-pitch-900 border border-pitch-700 p-5 max-h-[85vh] overflow-y-auto"
          >
            <div className="text-center">
              <div className={`text-xs font-semibold uppercase tracking-widest ${result.className}`}>
                {result.label}
              </div>
              <div className="font-display text-5xl text-gold-400 mt-1">
                {reveal.own_score} - {reveal.rival_score}
              </div>
              <div className="text-xs text-floodlight-300/40 mt-1">
                {new Date(reveal.date_played).toLocaleDateString("es-ES", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </div>
            </div>

            {(reveal.goals > 0 || reveal.assists > 0) && (
              <div className="mt-4 flex justify-center gap-4">
                {reveal.goals > 0 && (
                  <div className="flex items-center gap-1.5 text-sm text-floodlight-300">
                    <Goal size={15} className="text-gold-400" /> {reveal.goals} gol
                    {reveal.goals === 1 ? "" : "es"}
                  </div>
                )}
                {reveal.assists > 0 && (
                  <div className="flex items-center gap-1.5 text-sm text-floodlight-300">
                    <Footprints size={15} className="text-gold-400" /> {reveal.assists} asist.
                  </div>
                )}
              </div>
            )}

            {reveal.is_totw && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-5 rounded-xl bg-gradient-to-r from-totw-purple/30 to-transparent border border-totw-purple/40 px-4 py-3 flex items-center gap-3"
              >
                <Trophy size={22} className="text-gold-400 shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gold-200">
                    ¡Estuviste en el Equipo de la Jornada!
                  </div>
                  <div className="text-xs text-floodlight-300/50">Puesto #{reveal.totw_rank}</div>
                </div>
                <div className="font-display text-lg text-gold-400">+{reveal.totw_boost} OVR</div>
              </motion.div>
            )}

            {reveal.new_badges.length > 0 && (
              <div className="mt-5">
                <div className="text-xs font-semibold uppercase tracking-widest text-floodlight-300/50 mb-2 text-center">
                  Insignias conseguidas
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {reveal.new_badges.map((b, i) => {
                    const Icon = BADGE_ICONS[b.code];
                    return (
                      <motion.div
                        key={b.code}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 + i * 0.08 }}
                        className="rounded-xl border border-gold-500/40 bg-gold-500/10 p-3 flex flex-col items-center gap-1.5 text-center"
                      >
                        {Icon && <Icon size={20} className="text-gold-400" />}
                        <span className="text-[11px] font-semibold text-floodlight-300 leading-tight">
                          {b.name}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={onClose}
                className="w-full rounded-xl bg-gold-500 py-3 text-sm font-semibold text-pitch-900"
              >
                Continuar
              </button>
              <Link
                to={`/partidos/${reveal.match_id}`}
                onClick={onClose}
                className="w-full text-center text-xs font-semibold text-floodlight-300/50 hover:text-gold-400 py-1"
              >
                Ver partido completo
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

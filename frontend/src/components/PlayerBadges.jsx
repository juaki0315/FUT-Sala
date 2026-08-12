import { useState } from "react";
import { X } from "lucide-react";
import { BADGE_CATALOG } from "../data/badges";

/** Vitrina de logros: insignias desbloqueadas y pendientes, con detalle al tocar. */
export default function PlayerBadges({ badges }) {
  const [selected, setSelected] = useState(null);
  const unlockedByCode = new Map((badges || []).map((b) => [b.code, b]));

  return (
    <section className="w-full">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-floodlight-300/50 mb-3">
        Vitrina de logros
      </h2>
      <div className="grid grid-cols-3 gap-2">
        {BADGE_CATALOG.map((b) => {
          const unlocked = unlockedByCode.has(b.code);
          const Icon = b.icon;
          return (
            <button
              key={b.code}
              onClick={() => setSelected(b)}
              className={`rounded-xl border p-3 flex flex-col items-center gap-1.5 text-center ${
                unlocked
                  ? "bg-gold-500/10 border-gold-500/40"
                  : "bg-pitch-850 border-pitch-700 opacity-40"
              }`}
            >
              <Icon size={20} className={unlocked ? "text-gold-400" : "text-floodlight-300/40"} />
              <span
                className={`text-[11px] font-semibold leading-tight ${
                  unlocked ? "text-floodlight-300" : "text-floodlight-300/50"
                }`}
              >
                {b.name}
              </span>
            </button>
          );
        })}
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-md rounded-t-2xl bg-pitch-900 border-t border-pitch-700 px-5 pt-5 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`h-11 w-11 rounded-xl border flex items-center justify-center ${
                    unlockedByCode.has(selected.code)
                      ? "bg-gold-500/10 border-gold-500/40"
                      : "bg-pitch-850 border-pitch-700"
                  }`}
                >
                  <selected.icon
                    size={20}
                    className={unlockedByCode.has(selected.code) ? "text-gold-400" : "text-floodlight-300/40"}
                  />
                </div>
                <div>
                  <div className="font-display text-xl text-floodlight-300 leading-none">
                    {selected.name}
                  </div>
                  <div
                    className={`text-[11px] font-semibold uppercase tracking-wide mt-1 ${
                      unlockedByCode.has(selected.code) ? "text-gold-400" : "text-floodlight-300/40"
                    }`}
                  >
                    {unlockedByCode.has(selected.code) ? "Conseguida" : "Pendiente"}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-floodlight-300/50 hover:text-floodlight-300"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-floodlight-300/70">{selected.description}</p>
            {unlockedByCode.has(selected.code) && unlockedByCode.get(selected.code).unlocked_at && (
              <p className="mt-3 text-[11px] text-floodlight-300/40">
                Conseguida el{" "}
                {new Date(unlockedByCode.get(selected.code).unlocked_at).toLocaleDateString("es-ES", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import Layout from "../components/Layout";
import PageHeader from "../components/PageHeader";
import PlayerCard from "../components/PlayerCard";
import { api } from "../api/endpoints";

export default function Totw() {
  const [totw, setTotw] = useState([]);
  const [matchDate, setMatchDate] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await api.listMatches();
      const lastFinished = res.data.find((m) => m.is_finished);
      if (lastFinished) {
        setMatchDate(lastFinished.date_played);
        const t = await api.currentTotw(lastFinished.id);
        setTotw(t.data.sort((a, b) => a.totw_rank - b.totw_rank));
      }
      setLoading(false);
    })();
  }, []);

  return (
    <Layout>
      <PageHeader eyebrow="Cartas especiales" title="TOTJ" />

      <div className="px-5 py-6">
        {matchDate && (
          <p className="text-xs text-floodlight-300/40 mb-5">
            Jornada del{" "}
            {new Date(matchDate).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
            {" · "}vigente hasta el próximo partido
          </p>
        )}

        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] rounded-2xl bg-pitch-850 animate-pulse" />
            ))}
          </div>
        ) : totw.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-pitch-700 p-8 text-center">
            <Trophy size={28} className="mx-auto text-floodlight-300/20 mb-2" />
            <p className="text-sm text-floodlight-300/50">
              Todavía no se ha generado ningún Equipo de la Jornada.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-6 justify-items-center">
            {totw.map((mp, i) => (
              <motion.div
                key={mp.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="flex flex-col items-center gap-2"
              >
                <div className="text-[11px] font-semibold text-gold-400 font-display text-base">
                  #{mp.totw_rank} {mp.totw_rank === 1 ? "· MVP" : ""}
                </div>
                <PlayerCard player={mp.player_detail} size="sm" />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

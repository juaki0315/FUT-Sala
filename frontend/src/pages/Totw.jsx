import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import Layout from "../components/Layout";
import PageHeader from "../components/PageHeader";
import TotwPitch from "../components/TotwPitch";
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
          <TotwPitch entries={totw} />
        )}
      </div>
    </Layout>
  );
}

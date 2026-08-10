import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, Search } from "lucide-react";
import Layout from "../components/Layout";
import { api } from "../api/endpoints";

export default function PlayersBrowser() {
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listPlayers()
      .then((res) => setPlayers(res.data))
      .finally(() => setLoading(false));
  }, []);

  const filtered = players
    .filter((p) => p.username?.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => b.current_card_rating - a.current_card_rating);

  return (
    <Layout>
      <div className="px-5 pt-6 pb-4 flex items-center gap-3 border-b border-pitch-800">
        <button onClick={() => navigate(-1)} className="text-floodlight-300/60">
          <ArrowLeft size={20} />
        </button>
        <div>
          <div className="text-[11px] uppercase tracking-widest text-floodlight-500/70 font-semibold">
            Plantilla
          </div>
          <h1 className="font-display text-2xl text-floodlight-300 leading-none">Jugadores</h1>
        </div>
      </div>

      <div className="px-5 pt-4">
        <div className="flex items-center gap-2 rounded-xl bg-pitch-850 border border-pitch-700 px-3">
          <Search size={16} className="text-floodlight-300/40" />
          <input
            className="flex-1 bg-transparent py-3 text-sm text-floodlight-300 placeholder:text-floodlight-300/30 outline-none"
            placeholder="Buscar jugador..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoCapitalize="none"
          />
        </div>
      </div>

      <div className="px-5 py-4 space-y-2">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-pitch-850 animate-pulse" />
          ))
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-pitch-700 p-6 text-center text-sm text-floodlight-300/50">
            No se encontró ningún jugador.
          </div>
        ) : (
          filtered.map((p) => (
            <Link
              key={p.id}
              to={`/jugadores/${p.id}`}
              className="flex items-center gap-3 rounded-xl bg-pitch-850 border border-pitch-700 px-4 py-3 hover:border-gold-500/40 transition-colors"
            >
              <div className="h-11 w-11 rounded-full bg-floodlight-500/10 flex items-center justify-center text-floodlight-400 font-display text-lg overflow-hidden shrink-0">
                {p.photo_url ? (
                  <img src={p.photo_url} alt={p.username} className="h-full w-full object-cover" />
                ) : (
                  p.username?.[0]?.toUpperCase() ?? "?"
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-floodlight-300 truncate">{p.username}</div>
                <div className="text-xs text-floodlight-300/50">
                  {p.calibrated ? "Carta calibrada" : "Sin calibrar todavía"}
                </div>
              </div>
              <div className="font-display text-2xl text-gold-400 shrink-0">
                {p.current_card_rating}
              </div>
              <ChevronRight size={16} className="text-floodlight-300/30 shrink-0" />
            </Link>
          ))
        )}
      </div>
    </Layout>
  );
}

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Layout from "../components/Layout";
import PlayerCard from "../components/PlayerCard";
import { api } from "../api/endpoints";

export default function PlayerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .getPlayer(id)
      .then((res) => setPlayer(res.data))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <Layout>
      <div className="px-5 pt-6 pb-4 flex items-center gap-3 border-b border-pitch-800">
        <button onClick={() => navigate(-1)} className="text-floodlight-300/60">
          <ArrowLeft size={20} />
        </button>
        <div>
          <div className="text-[11px] uppercase tracking-widest text-floodlight-500/70 font-semibold">
            Ficha de jugador
          </div>
          <h1 className="font-display text-2xl text-floodlight-300 leading-none">
            {player?.username ?? "..."}
          </h1>
        </div>
      </div>

      <div className="px-5 py-8 flex flex-col items-center">
        {loading || !player ? (
          <div className="h-80 w-56 rounded-2xl bg-pitch-850 animate-pulse" />
        ) : (
          <>
            <PlayerCard player={player} size="lg" />
            {!player.calibrated && (
              <div className="mt-4 w-full rounded-xl bg-floodlight-500/10 border border-floodlight-500/30 px-4 py-3 text-xs text-floodlight-300/80 text-center">
                Esta carta todavía no ha sido calibrada por el grupo.
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

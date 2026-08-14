import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronDown, Search, X } from "lucide-react";
import Layout from "../components/Layout";
import { api } from "../api/endpoints";

const ATTR_FIELDS = [
  { key: "ritmo", label: "RIT" },
  { key: "tiro", label: "TIR" },
  { key: "pase", label: "PAS" },
  { key: "regate", label: "REG" },
  { key: "defensa", label: "DEF" },
  { key: "fisico", label: "FIS" },
];

function Avatar({ player }) {
  return (
    <div className="h-16 w-16 shrink-0 rounded-full bg-pitch-900 border-2 border-gold-500/60 overflow-hidden flex items-center justify-center text-floodlight-200 font-display text-xl">
      {player.photo_url ? (
        <img src={player.photo_url} alt="" className="h-full w-full object-cover" />
      ) : (
        player.username?.[0]?.toUpperCase() ?? "?"
      )}
    </div>
  );
}

function PlayerSlot({ label, player, onClick }) {
  return (
    <button
      onClick={onClick}
      className="surface surface-interactive flex-1 flex flex-col items-center gap-2 rounded-2xl p-4"
    >
      {player ? (
        <>
          <Avatar player={player} />
          <div className="text-sm font-semibold text-floodlight-300 truncate max-w-full">{player.username}</div>
          <div className="font-display text-3xl text-gold-400 leading-none">{player.overall_rating}</div>
        </>
      ) : (
        <>
          <div className="h-16 w-16 rounded-full border-2 border-dashed border-pitch-600 flex items-center justify-center text-floodlight-300/30">
            <ChevronDown size={20} />
          </div>
          <div className="text-sm text-floodlight-300/50">{label}</div>
        </>
      )}
    </button>
  );
}

function CompareRow({ label, valueA, valueB }) {
  const aWins = valueA > valueB;
  const bWins = valueB > valueA;
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-2 border-b border-pitch-800 last:border-0">
      <span className={`text-right font-display text-xl ${aWins ? "text-gold-400" : "text-floodlight-300/70"}`}>
        {valueA}
      </span>
      <span className="text-[10px] uppercase tracking-wide text-floodlight-300/40 px-2 text-center w-20">
        {label}
      </span>
      <span className={`text-left font-display text-xl ${bWins ? "text-gold-400" : "text-floodlight-300/70"}`}>
        {valueB}
      </span>
    </div>
  );
}

function PickerSheet({ players, onPick, onClose }) {
  const [query, setQuery] = useState("");
  const filtered = players.filter((p) => p.username?.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-2xl bg-pitch-900 border-t border-pitch-700 max-h-[75vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="font-display text-xl text-floodlight-300">Elige un jugador</h2>
          <button onClick={onClose} className="text-floodlight-300/50 hover:text-floodlight-300">
            <X size={20} />
          </button>
        </div>
        <div className="px-5 pb-3">
          <div className="flex items-center gap-2 rounded-xl bg-pitch-850 border border-pitch-700 px-3">
            <Search size={16} className="text-floodlight-300/40" />
            <input
              autoFocus
              className="flex-1 bg-transparent py-2.5 text-sm text-floodlight-300 placeholder:text-floodlight-300/30 outline-none"
              placeholder="Buscar jugador..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="px-5 pb-6 overflow-y-auto space-y-1.5">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => onPick(p)}
              className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-pitch-850 transition-colors"
            >
              <div className="h-9 w-9 shrink-0 rounded-full bg-pitch-900 border border-gold-500/40 overflow-hidden flex items-center justify-center text-floodlight-200 font-display text-sm">
                {p.photo_url ? (
                  <img src={p.photo_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  p.username?.[0]?.toUpperCase() ?? "?"
                )}
              </div>
              <span className="flex-1 text-left text-sm text-floodlight-300">{p.username}</span>
              <span className="font-display text-lg text-gold-400">{p.overall_rating}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ComparePlayers() {
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [playerA, setPlayerA] = useState(null);
  const [playerB, setPlayerB] = useState(null);
  const [picking, setPicking] = useState(null); // "A" | "B" | null

  useEffect(() => {
    api.listPlayers().then((res) => setPlayers(res.data));
  }, []);

  const handlePick = (player) => {
    if (picking === "A") setPlayerA(player);
    if (picking === "B") setPlayerB(player);
    setPicking(null);
  };

  const bothSelected = playerA && playerB;

  return (
    <Layout>
      <div className="px-5 pt-6 pb-4 flex items-center gap-3 border-b border-pitch-800">
        <button onClick={() => navigate(-1)} className="text-floodlight-300/60">
          <ArrowLeft size={20} />
        </button>
        <div>
          <div className="text-[11px] uppercase tracking-widest text-floodlight-500/70 font-semibold">
            Cara a cara
          </div>
          <h1 className="title-gradient font-display text-2xl leading-none">Comparar jugadores</h1>
        </div>
      </div>

      <div className="px-5 py-5 space-y-5">
        <div className="flex items-stretch gap-3">
          <PlayerSlot label="Jugador A" player={playerA} onClick={() => setPicking("A")} />
          <div className="flex items-center font-display text-lg text-floodlight-300/30">VS</div>
          <PlayerSlot label="Jugador B" player={playerB} onClick={() => setPicking("B")} />
        </div>

        {bothSelected && (
          <>
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-floodlight-300/50 mb-2 text-center">
                Atributos
              </h2>
              <div className="surface rounded-2xl p-4">
                {ATTR_FIELDS.map((f) => (
                  <CompareRow key={f.key} label={f.label} valueA={playerA[f.key]} valueB={playerB[f.key]} />
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-floodlight-300/50 mb-2 text-center">
                Estadísticas
              </h2>
              <div className="surface rounded-2xl p-4">
                <CompareRow label="PARTIDOS" valueA={playerA.stats.matches_played} valueB={playerB.stats.matches_played} />
                <CompareRow label="VICTORIAS" valueA={playerA.stats.wins} valueB={playerB.stats.wins} />
                <CompareRow label="GOLES" valueA={playerA.stats.goals} valueB={playerB.stats.goals} />
                <CompareRow label="ASIST." valueA={playerA.stats.assists} valueB={playerB.stats.assists} />
                <CompareRow label="TOTJ" valueA={playerA.stats.totw_count} valueB={playerB.stats.totw_count} />
                <CompareRow label="INSIGNIAS" valueA={playerA.badges.length} valueB={playerB.badges.length} />
              </div>
            </section>
          </>
        )}
      </div>

      {picking && (
        <PickerSheet
          players={players.filter((p) => p.id !== (picking === "A" ? playerB?.id : playerA?.id))}
          onPick={handlePick}
          onClose={() => setPicking(null)}
        />
      )}
    </Layout>
  );
}

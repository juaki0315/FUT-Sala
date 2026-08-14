import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Target,
  Send,
  Goal,
  Footprints,
  Swords,
  Trophy,
  Star,
  Crown,
  Award,
  Flame,
  ShieldCheck,
  Zap,
  TrendingUp,
} from "lucide-react";
import Layout from "../components/Layout";
import { api } from "../api/endpoints";

const RECORD_ICONS = {
  goals_match: Target,
  assists_match: Send,
  career_goals: Goal,
  career_assists: Footprints,
  career_matches: Swords,
  career_wins: Trophy,
  career_totw: Star,
  career_mvp: Crown,
  badge_count: Award,
  longest_win_streak: Flame,
  longest_unbeaten_streak: ShieldCheck,
  longest_scoring_streak: Zap,
  match_combined_goals: Goal,
  match_biggest_win: TrendingUp,
};

function HolderChip({ record, holder }) {
  if (record.type === "match") {
    return (
      <Link
        to={`/partidos/${holder.match_id}`}
        className="flex items-center justify-between rounded-lg bg-pitch-900/60 px-3 py-2 hover:bg-pitch-900 transition-colors"
      >
        <span className="text-sm text-floodlight-300">
          {holder.team_a_score} - {holder.team_b_score}
        </span>
        <span className="text-[11px] text-floodlight-300/40">
          {new Date(holder.date_played).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
        </span>
      </Link>
    );
  }

  return (
    <Link
      to={`/jugadores/${holder.player_id}`}
      className="flex items-center gap-2.5 rounded-lg bg-pitch-900/60 px-3 py-2 hover:bg-pitch-900 transition-colors"
    >
      <div className="h-8 w-8 shrink-0 rounded-full bg-pitch-900 border border-gold-500/50 overflow-hidden flex items-center justify-center text-floodlight-200 font-display text-sm">
        {holder.photo_url ? (
          <img src={holder.photo_url} alt="" className="h-full w-full object-cover" />
        ) : (
          holder.username?.[0]?.toUpperCase() ?? "?"
        )}
      </div>
      <span className="flex-1 text-sm text-floodlight-300 truncate">{holder.username}</span>
      {holder.match_id && (
        <span className="text-[11px] text-floodlight-300/40">
          {new Date(holder.date_played).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
        </span>
      )}
    </Link>
  );
}

function RecordCard({ record }) {
  const Icon = RECORD_ICONS[record.code] ?? Trophy;
  const tied = record.holders.length > 1;

  return (
    <div className="surface rounded-2xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="glow-gold h-10 w-10 shrink-0 rounded-xl bg-gold-500/15 flex items-center justify-center text-gold-400">
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-floodlight-300">{record.name}</div>
          <div className="font-display text-2xl text-gold-400 leading-none mt-0.5">
            {record.holders[0].value} <span className="text-sm font-body font-normal text-floodlight-300/40">{record.unit}</span>
          </div>
        </div>
      </div>
      <div className="space-y-1.5">
        {record.holders.map((h, i) => (
          <HolderChip key={h.player_id ?? h.match_id ?? i} record={record} holder={h} />
        ))}
      </div>
      {tied && (
        <div className="mt-2 text-[11px] text-floodlight-300/40 text-center">Récord empatado</div>
      )}
    </div>
  );
}

export default function RecordsWall() {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .records()
      .then((res) => setRecords(res.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <div className="px-5 pt-6 pb-4 flex items-center gap-3 border-b border-pitch-800">
        <button onClick={() => navigate(-1)} className="text-floodlight-300/60">
          <ArrowLeft size={20} />
        </button>
        <div>
          <div className="text-[11px] uppercase tracking-widest text-floodlight-500/70 font-semibold">
            Marcas históricas
          </div>
          <h1 className="title-gradient font-display text-2xl leading-none">Muro de récords</h1>
        </div>
      </div>

      <div className="px-5 py-5 space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-pitch-850 animate-pulse" />
          ))
        ) : records.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-pitch-700 p-6 text-center text-sm text-floodlight-300/50">
            Todavía no hay partidos finalizados para generar récords.
          </div>
        ) : (
          records.map((r) => <RecordCard key={r.code} record={r} />)
        )}
      </div>
    </Layout>
  );
}

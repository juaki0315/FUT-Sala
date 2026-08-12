import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, ShieldCheck, ClipboardCheck, Vote, Trash2 } from "lucide-react";
import Layout from "../components/Layout";
import { api } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";

function formatDateTime(value) {
  if (!value) return "Nunca";
  return new Date(value).toLocaleString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ProgressBadge({ done, total, icon: Icon, label }) {
  const complete = total > 0 && done >= total;
  const empty = total === 0;
  return (
    <div
      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
        empty
          ? "bg-pitch-800 text-floodlight-300/40"
          : complete
          ? "bg-floodlight-500/10 text-floodlight-400"
          : "bg-gold-500/10 text-gold-400"
      }`}
    >
      <Icon size={13} />
      {label}: {done}/{total}
    </div>
  );
}

export default function AdminUsersOverview() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.is_staff) {
      setLoading(false);
      return;
    }
    api
      .adminUsersOverview()
      .then((res) => setUsers(res.data))
      .finally(() => setLoading(false));
  }, [user?.is_staff]);

  const handleDelete = async (target) => {
    const confirmed = window.confirm(
      `¿Eliminar a "${target.username}" para siempre?\n\n` +
        "Esto borra su carta, sus votos (emitidos y recibidos), su historial de partidos " +
        "y su cuenta. No se puede deshacer."
    );
    if (!confirmed) return;

    setError("");
    setDeletingId(target.id);
    try {
      await api.deleteUser(target.id);
      setUsers((prev) => prev.filter((u) => u.id !== target.id));
    } catch (err) {
      setError(err.response?.data?.detail || err.friendlyMessage || "No se pudo eliminar el usuario.");
    } finally {
      setDeletingId(null);
    }
  };

  if (!loading && !user?.is_staff) {
    return (
      <Layout>
        <div className="px-5 pt-6 pb-4 flex items-center gap-3 border-b border-pitch-800">
          <button onClick={() => navigate(-1)} className="text-floodlight-300/60">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-display text-2xl text-floodlight-300 leading-none">Usuarios</h1>
        </div>
        <div className="px-5 py-10 text-center text-sm text-floodlight-300/50">
          Esta sección es solo para administradores.
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-5 pt-6 pb-4 flex items-center gap-3 border-b border-pitch-800">
        <button onClick={() => navigate(-1)} className="text-floodlight-300/60">
          <ArrowLeft size={20} />
        </button>
        <div>
          <div className="text-[11px] uppercase tracking-widest text-floodlight-500/70 font-semibold">
            Administración
          </div>
          <h1 className="font-display text-2xl text-floodlight-300 leading-none">Usuarios</h1>
        </div>
      </div>

      <div className="px-5 py-5 space-y-3">
        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            <div className="h-28 rounded-xl bg-pitch-850 animate-pulse" />
            <div className="h-28 rounded-xl bg-pitch-850 animate-pulse" />
          </div>
        ) : (
          users.map((u) => (
            <div key={u.id} className="surface rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-floodlight-500/10 flex items-center justify-center text-floodlight-400 font-display text-lg overflow-hidden shrink-0">
                  {u.photo_url ? (
                    <img src={u.photo_url} alt={u.username} className="h-full w-full object-cover" />
                  ) : (
                    u.username?.[0]?.toUpperCase() ?? "?"
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-floodlight-300 truncate">
                      {u.username}
                    </span>
                    {u.is_staff && (
                      <span className="flex items-center gap-0.5 rounded-full bg-gold-500/15 text-gold-400 text-[10px] font-bold px-1.5 py-0.5">
                        <ShieldCheck size={10} /> ADMIN
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-floodlight-300/50 truncate">{u.email}</div>
                </div>
                {!u.is_staff && (
                  <div className="font-display text-2xl text-gold-400 shrink-0">
                    {u.overall_rating}
                  </div>
                )}
                {!u.is_staff && (
                  <button
                    onClick={() => handleDelete(u)}
                    disabled={deletingId === u.id}
                    className="h-8 w-8 rounded-full flex items-center justify-center text-floodlight-300/40 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40 shrink-0"
                    title="Eliminar usuario"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-floodlight-300/60">
                <div className="flex items-center gap-1.5">
                  <Calendar size={12} /> Alta: {formatDateTime(u.date_joined)}
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={12} /> Últ. conexión: {formatDateTime(u.last_login)}
                </div>
              </div>

              {!u.is_staff && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <ProgressBadge
                    done={u.completed_evaluations}
                    total={u.assigned_evaluations}
                    icon={ClipboardCheck}
                    label="Valoraciones"
                  />
                  <ProgressBadge
                    done={u.voted_matches}
                    total={u.finished_matches}
                    icon={Vote}
                    label="Partidos votados"
                  />
                  {!u.calibrated && (
                    <span className="flex items-center rounded-lg bg-red-500/10 text-red-300 px-2.5 py-1.5 text-xs font-semibold">
                      Sin calibrar
                    </span>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </Layout>
  );
}

import { useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Image as ImageIcon, LogOut, Settings, Upload } from "lucide-react";
import Layout from "../components/Layout";
import PageHeader from "../components/PageHeader";
import PlayerCard from "../components/PlayerCard";
import PlayerStats from "../components/PlayerStats";
import { api } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";

const STYLES = [
  { id: "gold", label: "Oro clásico" },
  { id: "totw", label: "Vista previa TOTJ" },
];

export default function MyCard() {
  const navigate = useNavigate();
  const { user, profile, setProfile, logout } = useAuth();
  const [saving, setSaving] = useState(false);
  const [previewTotw, setPreviewTotw] = useState(false);
  const fileInputRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (!profile) {
    return (
      <Layout>
        <PageHeader eyebrow={user?.username} title="Mi Carta" />
        <div className="px-5 py-10 flex flex-col items-center gap-6 text-center">
          <p className="text-sm text-floodlight-300/50">
            Los administradores no tienen carta de jugador.
          </p>
          <div className="w-full max-w-xs flex flex-col gap-2">
            <Link
              to="/cuenta"
              className="flex items-center justify-center gap-2 rounded-xl border border-pitch-700 px-6 py-3 text-sm font-semibold text-floodlight-300/60 hover:text-gold-400 hover:border-gold-500/40 transition-colors"
            >
              <Settings size={16} /> Ajustes de cuenta
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 rounded-xl border border-pitch-700 px-6 py-3 text-sm font-semibold text-floodlight-300/60 hover:text-red-400 hover:border-red-500/40 transition-colors"
            >
              <LogOut size={16} /> Cerrar sesión
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving(true);
    try {
      const res = await api.uploadPhoto(profile.id, file);
      setProfile({ ...profile, ...res.data });
    } finally {
      setSaving(false);
      e.target.value = "";
    }
  };

  const displayPlayer = previewTotw ? { ...profile, is_totw_active: true } : profile;

  return (
    <Layout>
      <PageHeader eyebrow={`OVR ${profile.overall_rating}`} title="Mi Carta" />

      <div className="px-5 py-6 flex flex-col items-center">
        <PlayerCard player={displayPlayer} size="lg" />

        {!profile.calibrated && (
          <div className="mt-4 w-full rounded-xl bg-floodlight-500/10 border border-floodlight-500/30 px-4 py-3 text-xs text-floodlight-300/80">
            Tu carta aún no ha sido calibrada. Pídele a un administrador que active la
            encuesta inicial para que el grupo valore tus atributos.
          </div>
        )}

        <div className="w-full mt-8">
          <PlayerStats stats={profile.stats} />
        </div>

        {/* Personalización visual */}
        <section className="w-full mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-floodlight-300/50 mb-3">
            Foto de perfil
          </h2>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={handlePhotoChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-pitch-850 border border-dashed border-pitch-700 py-3.5 text-sm font-semibold text-floodlight-300/70 hover:border-gold-500/50 disabled:opacity-60"
          >
            {saving ? (
              <>
                <ImageIcon size={16} className="animate-pulse" /> Subiendo...
              </>
            ) : (
              <>
                <Upload size={16} /> {profile.photo_url ? "Cambiar foto (PNG/JPG)" : "Subir foto (PNG/JPG)"}
              </>
            )}
          </button>
        </section>

        {/* Preview de estilos */}
        <section className="w-full mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-floodlight-300/50 mb-3">
            Vista previa de estilo
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {STYLES.map((s) => (
              <button
                key={s.id}
                onClick={() => setPreviewTotw(s.id === "totw")}
                className={`rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors ${
                  (s.id === "totw") === previewTotw
                    ? "border-gold-500 bg-gold-500/10 text-gold-400"
                    : "border-pitch-700 text-floodlight-300/60"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-floodlight-300/40">
            El estilo TOTJ real solo se activa automáticamente cuando quedas entre los 5
            mejores de la jornada — esto es solo una vista previa.
          </p>
        </section>

        <Link
          to="/cuenta"
          className="w-full mt-8 flex items-center justify-center gap-2 rounded-xl border border-pitch-700 py-3 text-sm font-semibold text-floodlight-300/60 hover:text-gold-400 hover:border-gold-500/40 transition-colors"
        >
          <Settings size={16} /> Ajustes de cuenta
        </Link>
        <button
          onClick={handleLogout}
          className="w-full mt-3 flex items-center justify-center gap-2 rounded-xl border border-pitch-700 py-3 text-sm font-semibold text-floodlight-300/60 hover:text-red-400 hover:border-red-500/40 transition-colors"
        >
          <LogOut size={16} /> Cerrar sesión
        </button>
      </div>
    </Layout>
  );
}

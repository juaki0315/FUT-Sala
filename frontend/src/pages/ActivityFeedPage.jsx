import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Layout from "../components/Layout";
import ActivityFeed from "../components/ActivityFeed";

export default function ActivityFeedPage() {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="px-5 pt-6 pb-4 flex items-center gap-3 border-b border-pitch-800">
        <button onClick={() => navigate(-1)} className="text-floodlight-300/60">
          <ArrowLeft size={20} />
        </button>
        <div>
          <div className="text-[11px] uppercase tracking-widest text-floodlight-500/70 font-semibold">
            Jornada actual
          </div>
          <h1 className="title-gradient font-display text-2xl leading-none">Novedades</h1>
        </div>
      </div>

      <div className="px-5 py-5">
        <ActivityFeed limit={100} showHeader={false} />
      </div>
    </Layout>
  );
}

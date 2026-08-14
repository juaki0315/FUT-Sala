import { NavLink } from "react-router-dom";
import { Home, CreditCard, Swords, Trophy, Medal } from "lucide-react";

const ITEMS = [
  { to: "/", label: "Inicio", icon: Home, end: true },
  { to: "/mi-carta", label: "Mi Carta", icon: CreditCard },
  { to: "/partidos", label: "Partidos", icon: Swords },
  { to: "/totj", label: "TOTJ", icon: Trophy },
  { to: "/records", label: "Hall of Fame", icon: Medal },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md border-t border-pitch-700 bg-pitch-900/95 backdrop-blur pb-[env(safe-area-inset-bottom)] z-40 shadow-[0_-12px_24px_-16px_rgba(0,0,0,0.7)]">
      <div className="flex">
        {ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `relative flex-1 flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                isActive ? "text-gold-400" : "text-floodlight-300/50 hover:text-floodlight-300/80"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute top-0.5 h-9 w-14 rounded-full bg-gold-500/20 blur-lg" />
                )}
                <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} className="relative" />
                <span className="relative">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

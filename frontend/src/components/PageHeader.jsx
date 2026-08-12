export default function PageHeader({ eyebrow, title, action }) {
  return (
    <div className="sticky top-0 z-30 bg-pitch-950/90 backdrop-blur px-5 pt-6 pb-4 border-b border-pitch-800 flex items-end justify-between">
      <div>
        {eyebrow && (
          <div className="flex items-center gap-1.5 mb-1">
            <span className="h-1.5 w-1.5 rounded-full bg-gold-500 shadow-[0_0_8px_2px_rgba(232,185,62,0.6)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-floodlight-500/70">
              {eyebrow}
            </span>
          </div>
        )}
        <h1 className="title-gradient font-display text-3xl font-semibold leading-none">{title}</h1>
      </div>
      {action}
    </div>
  );
}

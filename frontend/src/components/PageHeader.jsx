export default function PageHeader({ eyebrow, title, action }) {
  return (
    <div className="sticky top-0 z-30 bg-pitch-950/90 backdrop-blur px-5 pt-6 pb-4 border-b border-pitch-800 flex items-end justify-between">
      <div>
        {eyebrow && (
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-floodlight-500/70 mb-0.5">
            {eyebrow}
          </div>
        )}
        <h1 className="font-display text-3xl font-semibold text-floodlight-300 leading-none">{title}</h1>
      </div>
      {action}
    </div>
  );
}

import BottomNav from "./BottomNav";

export default function Layout({ children }) {
  return (
    <div className="min-h-screen w-full flex justify-center bg-pitch-950 pitch-texture">
      <div className="w-full max-w-md min-h-screen bg-pitch-950 relative pb-24">
        {children}
        <BottomNav />
      </div>
    </div>
  );
}

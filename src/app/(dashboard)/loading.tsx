export default function DashboardLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-primary-500" />
        <p className="text-xs text-white/30">Loading...</p>
      </div>
    </div>
  );
}

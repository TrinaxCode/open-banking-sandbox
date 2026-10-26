import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { MobileMenu } from "@/components/dashboard/MobileMenu";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { CmdkTrigger } from "@/components/ui/CmdkTrigger";
import { maybeRunDueJobs } from "@/lib/jobs";
import { getNotificationsForUi } from "@/lib/queries";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const userName = session.user.name ?? session.user.email ?? "";

  // Run due scheduled transfers and interest accrual. Throttled by a lock row,
  // so this is a single cheap query on the vast majority of renders; a cron
  // worker can drive the same jobs via POST /api/jobs/run.
  await maybeRunDueJobs(session.user.id);

  const notifications = await getNotificationsForUi(session.user.id);

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-slate-50 dark:bg-[#0a0a0a]">
      <DashboardSidebar userName={userName} />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header — menu + search + notifications + theme + switcher */}
        <header className="relative z-50 flex h-12 items-center justify-between border-b border-zinc-200 bg-white px-3 lg:hidden dark:border-white/[0.06] dark:bg-[#0a0a0a]">
          <MobileMenu userName={userName} />
          <div className="flex items-center gap-1.5">
            <CmdkTrigger variant="mobile" />
            <NotificationBell notifications={notifications} />
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </header>
        {/* Desktop top bar — quick search + notifications */}
        <header className="hidden h-14 items-center justify-between border-b border-zinc-200 bg-white/80 backdrop-blur-md px-6 lg:flex dark:border-white/[0.06] dark:bg-[#0a0a0a]">
          <CmdkTrigger variant="desktop" />
          <div className="flex items-center gap-3">
            <NotificationBell notifications={notifications} />
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden">{children}</main>
      </div>

      {/* Global Interactive Command Palette */}
      <CommandPalette />
    </div>
  );
}

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { MobileMenu } from "@/components/dashboard/MobileMenu";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { runDueRecurringTransfers } from "@/lib/actions";

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

  // Execute any due scheduled transfers on dashboard entry (cron-ready).
  await runDueRecurringTransfers();

  const rawNotifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  const notifications = rawNotifications.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    read: n.read,
    createdAt: n.createdAt.toISOString(),
  }));

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-[#0a0a0a]">
      <DashboardSidebar userName={userName} />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header — menu + notifications + switcher */}
        <header className="flex h-12 items-center justify-between border-b border-white/[0.04] px-3 lg:hidden">
          <MobileMenu userName={userName} />
          <div className="flex items-center gap-1">
            <NotificationBell notifications={notifications} />
            <LanguageSwitcher />
          </div>
        </header>
        {/* Desktop top bar — notifications */}
        <header className="hidden h-12 items-center justify-end border-b border-white/[0.04] px-4 lg:flex">
          <NotificationBell notifications={notifications} />
        </header>
        <main className="flex-1 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

import { AppShell } from "@/components/nav/AppShell";
import { requireViewer } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireViewer();
  return <AppShell viewer={viewer}>{children}</AppShell>;
}

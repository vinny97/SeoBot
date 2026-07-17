import { AppShell } from "@/components/app-shell";
import { isDemoMode } from "@/lib/config/env";
import { requireCurrentProject } from "@/lib/auth/server";
export const dynamic="force-dynamic";
export default async function DashboardLayout({children}:{children:React.ReactNode}){if(!isDemoMode())await requireCurrentProject();return <AppShell>{children}</AppShell>}

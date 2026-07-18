import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/shared/auth/session";
import { Sidebar } from "@/components/Sidebar";
import { LogoutButton } from "@/components/LogoutButton";

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/change-password");

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex flex-1 flex-col gap-8 px-10 py-8">
        {/* Topbar: user block */}
        <div className="flex items-center justify-end">
          <div className="flex items-center gap-3">
            <div className="text-left">
              <div className="flex items-center justify-end gap-2">
                <span className="text-sm font-bold text-ink">{user.fullName}</span>
                {user.isSystemOwner && (
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                    style={{ background: "oklch(0.9 0.01 30)", color: "oklch(0.25 0.01 30)" }}
                  >
                    مالك النظام
                  </span>
                )}
              </div>
              <div className="font-slug text-xs text-muted">{user.email}</div>
            </div>
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full font-bold text-white"
              style={{ background: "oklch(0.16 0.005 30)" }}
            >
              {user.fullName.charAt(0)}
            </span>
            <LogoutButton />
          </div>
        </div>

        {children}
      </main>
    </div>
  );
}

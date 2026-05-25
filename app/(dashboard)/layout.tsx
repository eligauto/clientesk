import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Providers } from "@/components/providers";
import { Nav } from "@/components/nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <Providers session={session}>
      <div className="min-h-dvh bg-gray-50">
        <Nav />
        <main className="max-w-2xl mx-auto px-4 py-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>
    </Providers>
  );
}

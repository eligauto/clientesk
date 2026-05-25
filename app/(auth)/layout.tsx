export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-dvh flex items-center justify-center bg-gray-50 px-4">
      {children}
    </main>
  );
}

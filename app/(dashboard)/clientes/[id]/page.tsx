export default function ClienteDetallePage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900">Cliente</h1>
      <p className="text-sm text-gray-400 mt-1">id: {params.id} — Fase 1</p>
    </div>
  );
}

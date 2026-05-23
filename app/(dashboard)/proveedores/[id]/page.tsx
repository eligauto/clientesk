export default function ProveedorDetallePage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900">Proveedor</h1>
      <p className="text-sm text-gray-400 mt-1">id: {params.id} — Fase 2</p>
    </div>
  );
}

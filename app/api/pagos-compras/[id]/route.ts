import { NextResponse } from "next/server";

// Ruta eliminada en v0.2 — usar /api/pagos-proveedor/:id/cancelar
export async function DELETE() {
  return NextResponse.json(
    {
      error: "Endpoint deprecado. Usar /api/pagos-proveedor/:id/cancelar",
      code: "DEPRECATED",
    },
    { status: 410 },
  );
}

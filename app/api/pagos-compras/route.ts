import { NextResponse } from "next/server";

// Ruta eliminada en v0.2 — los pagos ahora se registran en /api/pagos-proveedor
export async function POST() {
  return NextResponse.json(
    {
      error: "Endpoint deprecado. Usar /api/pagos-proveedor",
      code: "DEPRECATED",
    },
    { status: 410 },
  );
}

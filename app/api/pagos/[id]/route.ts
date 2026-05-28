import { NextResponse } from "next/server";

// Ruta eliminada en v0.2 — usar /api/cobros/:id/cancelar
export async function DELETE() {
  return NextResponse.json(
    {
      error: "Endpoint deprecado. Usar /api/cobros/:id/cancelar",
      code: "DEPRECATED",
    },
    { status: 410 },
  );
}

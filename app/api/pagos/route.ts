import { NextResponse } from "next/server";

// Ruta eliminada en v0.2 — los cobros ahora se registran en /api/cobros
export async function POST() {
  return NextResponse.json(
    { error: "Endpoint deprecado. Usar /api/cobros", code: "DEPRECATED" },
    { status: 410 },
  );
}

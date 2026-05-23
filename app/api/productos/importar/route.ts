import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getAuth, UNAUTHORIZED } from "@/lib/api";
import { prisma } from "@/lib/db";
import { calcPrices } from "@/lib/price-multipliers";

const BATCH_SIZE = 200;

type Row = {
  sku: string | null;
  name: string;
  notes: string | null;
  costPrice: number | null;
};

function parseSheet(buffer: Buffer): { rows: Row[]; errors: string[] } {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: "" });

  const headerIdx = raw.findIndex(
    (row) =>
      row.some((c) => String(c).trim().toUpperCase() === "CODIGO") &&
      row.some((c) => String(c).trim().toUpperCase() === "DESCRIPCION")
  );
  if (headerIdx === -1) {
    return { rows: [], errors: ["No se encontró la fila de encabezados (CODIGO, DESCRIPCION)"] };
  }

  const header    = raw[headerIdx].map((c) => String(c).trim().toUpperCase());
  const codigoIdx = header.indexOf("CODIGO");
  const descIdx   = header.indexOf("DESCRIPCION");
  const marcaIdx  = header.indexOf("MARCA");
  const precioIdx = header.indexOf("PRECIO");

  if (codigoIdx === -1 || descIdx === -1) {
    return { rows: [], errors: ["El archivo no tiene las columnas CODIGO y DESCRIPCION"] };
  }

  const rows: Row[] = [];
  const errors: string[] = [];

  for (let i = headerIdx + 1; i < raw.length; i++) {
    const r    = raw[i];
    const sku  = String(r[codigoIdx] ?? "").trim();
    const name = String(r[descIdx] ?? "").trim();
    if (!sku && !name) continue;
    if (!name) {
      errors.push(`Fila ${i + 1}: descripción vacía (sku=${sku}), omitida`);
      continue;
    }

    let costPrice: number | null = null;
    if (precioIdx !== -1) {
      const rp = r[precioIdx];
      if (rp !== "" && rp != null) {
        const n = typeof rp === "number" ? rp : parseFloat(String(rp).replace(",", "."));
        if (!isNaN(n) && n > 0) costPrice = n;
      }
    }

    rows.push({
      sku: sku || null,
      name,
      notes: marcaIdx !== -1 ? (String(r[marcaIdx] ?? "").trim() || null) : null,
      costPrice,
    });
  }

  return { rows, errors };
}

export async function POST(req: NextRequest) {
  const auth = await getAuth();
  if (!auth) return UNAUTHORIZED;

  const preview = req.nextUrl.searchParams.get("preview") === "1";

  let buffer: Buffer;
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 });
    buffer = Buffer.from(await file.arrayBuffer());
  } catch {
    return NextResponse.json({ error: "Error al leer el archivo" }, { status: 400 });
  }

  const { rows, errors } = parseSheet(buffer);

  if (errors.length > 0 && rows.length === 0) {
    return NextResponse.json({ error: errors[0] }, { status: 422 });
  }

  if (preview) {
    return NextResponse.json({
      total: rows.length,
      sample: rows.slice(0, 5).map((r) => ({
        sku: r.sku,
        name: r.name,
        notes: r.notes,
        costPrice: r.costPrice,
        ...calcPrices(r.costPrice),
      })),
      warnings: errors.slice(0, 5),
    });
  }

  // Products with sku: upsert in batches (updates prices on reimport)
  // Products without sku: createMany + skipDuplicates
  const withSku    = rows.filter((r) => r.sku);
  const withoutSku = rows.filter((r) => !r.sku);

  let processed = 0;

  for (let i = 0; i < withSku.length; i += BATCH_SIZE) {
    const batch = withSku.slice(i, i + BATCH_SIZE);
    await prisma.$transaction(
      batch.map((r) => {
        const prices = calcPrices(r.costPrice);
        return prisma.product.upsert({
          where: { tenantId_sku: { tenantId: auth.tenantId, sku: r.sku! } },
          create: { tenantId: auth.tenantId, sku: r.sku, name: r.name, notes: r.notes, costPrice: r.costPrice, ...prices },
          update: { name: r.name, notes: r.notes, costPrice: r.costPrice, ...prices },
        });
      })
    );
    processed += batch.length;
  }

  if (withoutSku.length > 0) {
    const result = await prisma.product.createMany({
      data: withoutSku.map((r) => {
        const prices = calcPrices(r.costPrice);
        return { tenantId: auth.tenantId, name: r.name, notes: r.notes, costPrice: r.costPrice, ...prices };
      }),
      skipDuplicates: true,
    });
    processed += result.count;
  }

  return NextResponse.json({ total: rows.length, processed });
}

"use client";

import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { fmt, fmtDate } from "@/lib/utils";

export type LedgerEntry =
  | {
      kind: "venta";
      id: string;
      date: string | Date;
      description: string;
      amount: number;
      status: string;
    }
  | {
      kind: "cobro";
      id: string;
      date: string | Date;
      description: string;
      amount: number;
      status: string;
    };

interface Props {
  customerName: string;
  entries: LedgerEntry[];
  totalVendido: number;
  totalCobrado: number;
  saldo: number;
}

// Fila lista para renderizar en la tabla del estado de cuenta.
type DisplayRow = {
  key: string;
  date: string; // ya formateada, o "" para filas sintéticas
  description: string;
  pedido: number | null;
  aCuenta: number | null;
  saldo: number;
  emphasis?: boolean;
};

function monthLabel(date: Date): string {
  const s = date.toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
}

export function EstadoCuentaBtn({
  customerName,
  entries,
  totalVendido,
  totalCobrado,
  saldo,
}: Props) {
  const resumenRef = useRef<HTMLDivElement>(null);
  const detalleRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState<null | "resumen" | "detalle">(
    null,
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);

  // Load logo as base64 so html-to-image can embed it reliably
  useEffect(() => {
    fetch("/logo-ricardo.png")
      .then((r) => {
        if (!r.ok) return null;
        return r.blob();
      })
      .then((blob) => {
        if (!blob) return;
        const reader = new FileReader();
        reader.onload = () => setLogoBase64(reader.result as string);
        reader.readAsDataURL(blob);
      })
      .catch(() => {});
  }, []);

  async function handlePreview(
    mode: "resumen" | "detalle",
    node: HTMLDivElement | null,
  ) {
    if (!node) return;
    setGenerating(mode);
    try {
      const dataUrl = await toPng(node, { cacheBust: true, pixelRatio: 2 });
      setPreviewUrl(dataUrl);
    } finally {
      setGenerating(null);
    }
  }

  function handleDownload() {
    if (!previewUrl) return;
    const link = document.createElement("a");
    link.download = `estado-${customerName.replace(/\s+/g, "-").toLowerCase()}.png`;
    link.href = previewUrl;
    link.click();
  }

  // Movimientos activos, orden cronológico ascendente, con saldo corriente.
  const activeSorted = [...entries]
    .filter((e) => e.status === "active")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let running = 0;
  const allRows: (DisplayRow & { raw: Date })[] = activeSorted.map((e) => {
    if (e.kind === "venta") running += e.amount;
    else running -= e.amount;
    return {
      key: e.id,
      raw: new Date(e.date),
      date: fmtDate(e.date),
      description: e.description,
      pedido: e.kind === "venta" ? e.amount : null,
      aCuenta: e.kind === "cobro" ? e.amount : null,
      saldo: running,
    };
  });

  // Detalle completo: todas las filas.
  const detalleRows: DisplayRow[] = allRows;

  // Resumen: consolida lo anterior al último mes con actividad en "Saldo
  // anterior" y deja en detalle solo los movimientos de ese último mes.
  let resumenRows: DisplayRow[] = allRows;
  let resumenCaption = "";
  if (allRows.length > 0) {
    const lastKey = monthKey(allRows[allRows.length - 1].raw);
    const periodRows = allRows.filter((r) => monthKey(r.raw) === lastKey);
    const priorRows = allRows.filter((r) => monthKey(r.raw) !== lastKey);
    const saldoAnterior = priorRows.length
      ? priorRows[priorRows.length - 1].saldo
      : 0;

    resumenCaption = `Detalle de ${monthLabel(
      allRows[allRows.length - 1].raw,
    )} · movimientos anteriores consolidados`;

    resumenRows = [
      ...(priorRows.length
        ? [
            {
              key: "__saldo_anterior__",
              date: "",
              description: "Saldo anterior",
              pedido: null,
              aCuenta: null,
              saldo: saldoAnterior,
              emphasis: true,
            } as DisplayRow,
          ]
        : []),
      ...periodRows,
    ];
  }

  return (
    <div>
      <button
        onClick={() => handlePreview("resumen", resumenRef.current)}
        disabled={generating !== null || activeSorted.length === 0}
        className="flex items-center justify-center w-full border border-indigo-200 text-indigo-600 text-sm font-medium py-3 rounded-xl mb-2 hover:bg-indigo-50 disabled:opacity-40 transition-colors"
      >
        {generating === "resumen" ? "Generando..." : "Ver estado de cuenta"}
      </button>
      <button
        onClick={() => handlePreview("detalle", detalleRef.current)}
        disabled={generating !== null || activeSorted.length === 0}
        className="flex items-center justify-center w-full text-gray-500 text-xs font-medium py-2 rounded-xl mb-4 hover:text-gray-700 disabled:opacity-40 transition-colors"
      >
        {generating === "detalle" ? "Generando..." : "Detalle completo"}
      </button>

      {/* Preview modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/80"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreviewUrl(null);
          }}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-black/60 shrink-0">
            <span className="text-white text-sm font-medium">
              Estado de cuenta — {customerName}
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleDownload}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Descargar
              </button>
              <button
                onClick={() => setPreviewUrl(null)}
                className="bg-white/10 hover:bg-white/20 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>

          {/* Scrollable image preview */}
          <div className="flex-1 overflow-auto p-4 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Preview estado de cuenta"
              className="rounded-xl shadow-2xl h-auto max-w-full object-contain"
              style={{ maxHeight: "calc(100vh - 80px)" }}
            />
          </div>
        </div>
      )}

      {/* Off-screen render targets */}
      <div className="fixed -left-[9999px] top-0 pointer-events-none">
        <div ref={resumenRef}>
          <StatementSheet
            customerName={customerName}
            logoBase64={logoBase64}
            totalVendido={totalVendido}
            totalCobrado={totalCobrado}
            saldo={saldo}
            rows={resumenRows}
            caption={resumenCaption}
          />
        </div>
        <div ref={detalleRef}>
          <StatementSheet
            customerName={customerName}
            logoBase64={logoBase64}
            totalVendido={totalVendido}
            totalCobrado={totalCobrado}
            saldo={saldo}
            rows={detalleRows}
          />
        </div>
      </div>
    </div>
  );
}

// ── Hoja imprimible reutilizada por resumen y detalle ─────────────────────────
function StatementSheet({
  customerName,
  logoBase64,
  totalVendido,
  totalCobrado,
  saldo,
  rows,
  caption,
}: {
  customerName: string;
  logoBase64: string | null;
  totalVendido: number;
  totalCobrado: number;
  saldo: number;
  rows: DisplayRow[];
  caption?: string;
}) {
  return (
    <div
      style={{
        width: 680,
        fontFamily: "system-ui, sans-serif",
        background: "#fff",
        padding: 32,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <div>
          <p
            style={{
              fontSize: 11,
              color: "#6b7280",
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: 4,
            }}
          >
            Estado de cuenta
          </p>
          <h1
            style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: 0 }}
          >
            {customerName}
          </h1>
          <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
            {new Date().toLocaleDateString("es-AR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        {logoBase64 && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoBase64}
            alt="Ricardo Herramientas"
            style={{ height: 56, objectFit: "contain" }}
          />
        )}
      </div>

      {/* Summary boxes */}
      <div style={{ display: "flex", gap: 12, marginBottom: caption ? 12 : 24 }}>
        {[
          { label: "Total vendido", value: fmt(totalVendido), color: "#111827" },
          { label: "Total cobrado", value: fmt(totalCobrado), color: "#059669" },
          {
            label: "Saldo pendiente",
            value: fmt(saldo),
            color: saldo > 0 ? "#d97706" : "#059669",
          },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              flex: 1,
              background: "#f9fafb",
              borderRadius: 10,
              padding: "12px 14px",
            }}
          >
            <p
              style={{
                fontSize: 10,
                color: "#9ca3af",
                marginBottom: 4,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {s.label}
            </p>
            <p style={{ fontSize: 15, fontWeight: 700, color: s.color, margin: 0 }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {caption && (
        <p style={{ fontSize: 11, color: "#9ca3af", marginBottom: 12 }}>
          {caption}
        </p>
      )}

      {/* Libro diario */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 12,
          tableLayout: "fixed",
        }}
      >
        <colgroup>
          <col style={{ width: 76 }} />
          <col style={{ width: "auto" }} />
          <col style={{ width: 112 }} />
          <col style={{ width: 112 }} />
          <col style={{ width: 112 }} />
        </colgroup>
        <thead>
          <tr style={{ background: "#f3f4f6" }}>
            {[
              { label: "Fecha", align: "left" },
              { label: "Descripción", align: "left" },
              { label: "Pedido", align: "right" },
              { label: "A Cuenta", align: "right" },
              { label: "Saldo", align: "right" },
            ].map(({ label, align }) => (
              <th
                key={label}
                style={{
                  padding: "8px 10px",
                  textAlign: align as "left" | "right",
                  color: "#6b7280",
                  fontWeight: 600,
                  fontSize: 11,
                }}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.key}
              style={{
                background: row.emphasis
                  ? "#eef2ff"
                  : i % 2 === 0
                    ? "#fff"
                    : "#f9fafb",
              }}
            >
              <td
                style={{
                  padding: "7px 10px",
                  color: "#6b7280",
                  whiteSpace: "nowrap",
                }}
              >
                {row.date}
              </td>
              <td
                style={{
                  padding: "7px 10px",
                  color: "#111827",
                  fontWeight: row.emphasis ? 700 : row.pedido !== null ? 500 : 400,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: 0,
                }}
                title={row.description}
              >
                {row.description}
              </td>
              <td style={{ padding: "7px 10px", textAlign: "right", color: "#111827" }}>
                {row.pedido !== null ? fmt(row.pedido) : "—"}
              </td>
              <td style={{ padding: "7px 10px", textAlign: "right", color: "#059669" }}>
                {row.aCuenta !== null ? fmt(row.aCuenta) : "—"}
              </td>
              <td
                style={{
                  padding: "7px 10px",
                  textAlign: "right",
                  fontWeight: 600,
                  color: row.saldo > 0 ? "#d97706" : "#059669",
                }}
              >
                {fmt(row.saldo)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ background: "#f3f4f6", fontWeight: 700 }}>
            <td colSpan={2} style={{ padding: "10px 10px", color: "#111827", fontSize: 13 }}>
              Total
            </td>
            <td style={{ padding: "10px 10px" }} />
            <td style={{ padding: "10px 10px" }} />
            <td
              style={{
                padding: "10px 10px",
                textAlign: "right",
                color: saldo > 0 ? "#d97706" : "#059669",
                fontSize: 14,
              }}
            >
              {fmt(saldo)}
            </td>
          </tr>
        </tfoot>
      </table>

      <p
        style={{
          fontSize: 10,
          color: "#d1d5db",
          textAlign: "center",
          marginTop: 20,
        }}
      >
        Ricardo Herramientas
      </p>
    </div>
  );
}

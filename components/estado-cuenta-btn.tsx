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

export function EstadoCuentaBtn({
  customerName,
  entries,
  totalVendido,
  totalCobrado,
  saldo,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);
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

  async function handlePreview() {
    if (!ref.current) return;
    setGenerating(true);
    try {
      const dataUrl = await toPng(ref.current, {
        cacheBust: true,
        pixelRatio: 2,
      });
      setPreviewUrl(dataUrl);
    } finally {
      setGenerating(false);
    }
  }

  function handleDownload() {
    if (!previewUrl) return;
    const link = document.createElement("a");
    link.download = `estado-${customerName.replace(/\s+/g, "-").toLowerCase()}.png`;
    link.href = previewUrl;
    link.click();
  }

  // Sort oldest → newest and calculate running balance
  const sorted = [...entries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  let running = 0;
  const rows = sorted
    .filter((e) => e.status === "active")
    .map((e) => {
      if (e.kind === "venta") running += e.amount;
      else running -= e.amount;
      return { ...e, running };
    });

  return (
    <div>
      <button
        onClick={handlePreview}
        disabled={generating || entries.length === 0}
        className="flex items-center justify-center w-full border border-indigo-200 text-indigo-600 text-sm font-medium py-3 rounded-xl mb-4 hover:bg-indigo-50 disabled:opacity-40 transition-colors"
      >
        {generating ? "Generando..." : "Ver estado de cuenta"}
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

      {/* Off-screen render target */}
      <div className="fixed -left-[9999px] top-0 pointer-events-none">
        <div
          ref={ref}
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
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "#111827",
                  margin: 0,
                }}
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
          <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
            {[
              {
                label: "Total vendido",
                value: fmt(totalVendido),
                color: "#111827",
              },
              {
                label: "Total cobrado",
                value: fmt(totalCobrado),
                color: "#059669",
              },
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
                <p
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: s.color,
                    margin: 0,
                  }}
                >
                  {s.value}
                </p>
              </div>
            ))}
          </div>

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
              <col style={{ width: 72 }} />
              <col style={{ width: "auto" }} />
              <col style={{ width: 88 }} />
              <col style={{ width: 88 }} />
              <col style={{ width: 88 }} />
            </colgroup>
            <thead>
              <tr style={{ background: "#f3f4f6" }}>
                {[
                  { label: "Fecha", align: "left" },
                  { label: "Descripción", align: "left" },
                  { label: "Debe", align: "right" },
                  { label: "Haber", align: "right" },
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
                  key={row.id}
                  style={{ background: i % 2 === 0 ? "#fff" : "#f9fafb" }}
                >
                  <td
                    style={{
                      padding: "7px 10px",
                      color: "#6b7280",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {fmtDate(row.date)}
                  </td>
                  <td
                    style={{
                      padding: "7px 10px",
                      color: "#111827",
                      fontWeight: row.kind === "venta" ? 500 : 400,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: 0,
                    }}
                    title={row.description}
                  >
                    {row.description}
                  </td>
                  <td
                    style={{
                      padding: "7px 10px",
                      textAlign: "right",
                      color: "#111827",
                    }}
                  >
                    {row.kind === "venta" ? fmt(row.amount) : "—"}
                  </td>
                  <td
                    style={{
                      padding: "7px 10px",
                      textAlign: "right",
                      color: "#059669",
                    }}
                  >
                    {row.kind === "cobro" ? fmt(row.amount) : "—"}
                  </td>
                  <td
                    style={{
                      padding: "7px 10px",
                      textAlign: "right",
                      fontWeight: 600,
                      color: row.running > 0 ? "#d97706" : "#059669",
                    }}
                  >
                    {fmt(row.running)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: "#f3f4f6", fontWeight: 700 }}>
                <td
                  colSpan={2}
                  style={{
                    padding: "10px 10px",
                    color: "#111827",
                    fontSize: 13,
                  }}
                >
                  Total
                </td>
                <td
                  style={{
                    padding: "10px 10px",
                    textAlign: "right",
                    color: "#111827",
                  }}
                >
                  {fmt(totalVendido)}
                </td>
                <td
                  style={{
                    padding: "10px 10px",
                    textAlign: "right",
                    color: "#059669",
                  }}
                >
                  {fmt(totalCobrado)}
                </td>
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
      </div>
    </div>
  );
}

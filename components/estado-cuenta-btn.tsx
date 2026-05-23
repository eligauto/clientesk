"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { fmt, fmtDate } from "@/lib/utils";

interface Transaction {
  id: string;
  date: string | Date;
  product: { name: string; unit: string | null };
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
}

interface Props {
  customerName: string;
  transactions: Transaction[];
  totalVendido: number;
  totalCobrado: number;
  saldo: number;
}

export function EstadoCuentaBtn({
  customerName,
  transactions,
  totalVendido,
  totalCobrado,
  saldo,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);

  async function handleGenerate() {
    if (!ref.current) return;
    setGenerating(true);
    try {
      const dataUrl = await toPng(ref.current, { cacheBust: true, pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = `estado-${customerName.replace(/\s+/g, "-").toLowerCase()}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setGenerating(false);
    }
  }

  const pendingTxs = transactions.filter((t) => t.balanceDue > 0);

  return (
    <div>
      <button
        onClick={handleGenerate}
        disabled={generating || transactions.length === 0}
        className="flex items-center justify-center w-full border border-indigo-200 text-indigo-600 text-sm font-medium py-3 rounded-xl mb-4 hover:bg-indigo-50 disabled:opacity-40 transition-colors"
      >
        {generating ? "Generando imagen..." : "Ver estado de cuenta"}
      </button>

      {/* Off-screen render target */}
      <div className="fixed -left-[9999px] top-0 pointer-events-none">
        <div
          ref={ref}
          style={{ width: 640, fontFamily: "system-ui, sans-serif", background: "#fff", padding: 32 }}
        >
          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
              Estado de cuenta
            </p>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: 0 }}>
              {customerName}
            </h1>
            <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
              {new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" })}
            </p>
          </div>

          {/* Summary boxes */}
          <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
            {[
              { label: "Total vendido", value: fmt(totalVendido), color: "#111827" },
              { label: "Total cobrado", value: fmt(totalCobrado), color: "#059669" },
              { label: "Saldo pendiente", value: fmt(saldo), color: saldo > 0 ? "#d97706" : "#059669" },
            ].map((s) => (
              <div
                key={s.label}
                style={{ flex: 1, background: "#f9fafb", borderRadius: 10, padding: "12px 14px" }}
              >
                <p style={{ fontSize: 10, color: "#9ca3af", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {s.label}
                </p>
                <p style={{ fontSize: 15, fontWeight: 700, color: s.color, margin: 0 }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Table */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#f3f4f6" }}>
                {["Fecha", "Producto", "Cant.", "Precio", "Pagado", "Debe"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "8px 10px",
                      textAlign: h === "Fecha" || h === "Producto" ? "left" : "right",
                      color: "#6b7280",
                      fontWeight: 600,
                      fontSize: 11,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(pendingTxs.length > 0 ? pendingTxs : transactions).map((t, i) => (
                <tr
                  key={t.id}
                  style={{ background: i % 2 === 0 ? "#fff" : "#f9fafb" }}
                >
                  <td style={{ padding: "8px 10px", color: "#374151" }}>{fmtDate(t.date)}</td>
                  <td style={{ padding: "8px 10px", color: "#111827", fontWeight: 500 }}>
                    {t.product.name}
                  </td>
                  <td style={{ padding: "8px 10px", textAlign: "right", color: "#374151" }}>
                    {t.quantity} {t.product.unit ?? "u."}
                  </td>
                  <td style={{ padding: "8px 10px", textAlign: "right", color: "#374151" }}>
                    {fmt(t.unitPrice)}
                  </td>
                  <td style={{ padding: "8px 10px", textAlign: "right", color: "#059669" }}>
                    {fmt(t.amountPaid)}
                  </td>
                  <td
                    style={{
                      padding: "8px 10px",
                      textAlign: "right",
                      fontWeight: 600,
                      color: t.balanceDue > 0 ? "#d97706" : "#059669",
                    }}
                  >
                    {t.balanceDue > 0 ? fmt(t.balanceDue) : "Saldada"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: "#f3f4f6", fontWeight: 700 }}>
                <td colSpan={4} style={{ padding: "10px 10px", color: "#111827" }}>
                  Total
                </td>
                <td style={{ padding: "10px 10px", textAlign: "right", color: "#059669" }}>
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

          {/* Footer */}
          <p style={{ fontSize: 10, color: "#d1d5db", textAlign: "center", marginTop: 20 }}>
            Clientesk
          </p>
        </div>
      </div>
    </div>
  );
}

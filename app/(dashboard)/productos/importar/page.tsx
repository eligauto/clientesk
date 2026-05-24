"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fmt } from "@/lib/utils";
import { calcPrices } from "@/lib/price-multipliers";

const CHUNK_SIZE = 500;

type Row = {
  sku: string | null;
  name: string;
  notes: string | null;
  costPrice: number | null;
};

async function parseSheetClient(file: File): Promise<{ rows: Row[]; errors: string[] }> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(new Uint8Array(buffer), { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: "" });

  const headerIdx = raw.findIndex(
    (row) =>
      row.some((c) => String(c).trim().toUpperCase() === "CODIGO") &&
      row.some((c) => String(c).trim().toUpperCase() === "DESCRIPCION"),
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

  const rows: Row[]      = [];
  const errors: string[] = [];

  for (let i = headerIdx + 1; i < raw.length; i++) {
    const r    = raw[i];
    const sku  = String(r[codigoIdx] ?? "").trim();
    const name = String(r[descIdx]   ?? "").trim();
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
      sku:   sku || null,
      name,
      notes: marcaIdx !== -1 ? String(r[marcaIdx] ?? "").trim() || null : null,
      costPrice,
    });
  }

  return { rows, errors };
}

export default function ImportarProductosPage() {
  const router  = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [file,      setFile]      = useState<File | null>(null);
  const [allRows,   setAllRows]   = useState<Row[]>([]);
  const [sample,    setSample]    = useState<(Row & { priceList: number | null })[]>([]);
  const [warnings,  setWarnings]  = useState<string[]>([]);
  const [previewed, setPreviewed] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [progress,  setProgress]  = useState<{ done: number; total: number } | null>(null);
  const [result,    setResult]    = useState<{ total: number; processed: number } | null>(null);
  const [error,     setError]     = useState("");

  async function handlePreview() {
    if (!file) return;
    setLoading(true);
    setError("");

    const { rows, errors } = await parseSheetClient(file);
    if (rows.length === 0 && errors.length > 0) {
      setError(errors[0]);
      setLoading(false);
      return;
    }

    setAllRows(rows);
    setSample(rows.slice(0, 5).map((r) => ({ ...r, ...calcPrices(r.costPrice) })));
    setWarnings(errors.slice(0, 5));
    setPreviewed(true);
    setLoading(false);
  }

  async function handleImport() {
    if (!allRows.length) return;
    setLoading(true);
    setError("");
    setProgress({ done: 0, total: allRows.length });

    let totalProcessed = 0;

    for (let i = 0; i < allRows.length; i += CHUNK_SIZE) {
      const chunk = allRows.slice(i, i + CHUNK_SIZE);
      const res   = await fetch("/api/productos/importar", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ rows: chunk }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Error al importar");
        setLoading(false);
        setProgress(null);
        return;
      }

      totalProcessed += data.processed;
      setProgress({ done: Math.min(i + CHUNK_SIZE, allRows.length), total: allRows.length });
    }

    setResult({ total: allRows.length, processed: totalProcessed });
    setLoading(false);
    setProgress(null);
  }

  function reset() {
    setFile(null);
    setAllRows([]);
    setSample([]);
    setWarnings([]);
    setPreviewed(false);
    setLoading(false);
    setProgress(null);
    setResult(null);
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="space-y-5 pb-8">
      <div>
        <Link href="/productos" className="text-xs text-gray-400 mb-1 block">
          ← Productos
        </Link>
        <h1 className="text-lg font-semibold text-gray-900">Importar lista de precios</h1>
        <p className="text-xs text-gray-500 mt-1">
          Formato esperado: Excel (.xlsx) con columnas{" "}
          <strong>CODIGO · DESCRIPCION · MARCA · PRECIO</strong>
        </p>
      </div>

      {/* Upload */}
      {!result && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">
              Archivo Excel (.xlsx)
            </label>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setPreviewed(false);
                setAllRows([]);
                setError("");
              }}
              className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
          </div>

          {file && !previewed && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 flex-1 truncate">{file.name}</span>
              <button
                onClick={handlePreview}
                disabled={loading}
                className="bg-gray-100 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-200 disabled:opacity-40"
              >
                {loading ? "Analizando..." : "Vista previa"}
              </button>
            </div>
          )}

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      )}

      {/* Preview */}
      {previewed && !result && (
        <div className="space-y-4">
          <div className="bg-indigo-50 rounded-xl px-4 py-3">
            <p className="text-sm font-semibold text-indigo-900">
              {allRows.length.toLocaleString("es-AR")} productos encontrados
            </p>
            <p className="text-xs text-indigo-600 mt-0.5">
              Los existentes (mismo código) serán actualizados con los nuevos precios.
            </p>
          </div>

          {warnings.length > 0 && (
            <div className="bg-amber-50 rounded-xl px-4 py-3">
              <p className="text-xs font-medium text-amber-800 mb-1">Advertencias</p>
              {warnings.map((w, i) => <p key={i} className="text-xs text-amber-700">{w}</p>)}
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-gray-500 font-medium">Código</th>
                  <th className="px-3 py-2 text-left text-gray-500 font-medium">Descripción</th>
                  <th className="px-3 py-2 text-right text-gray-500 font-medium">Costo</th>
                  <th className="px-3 py-2 text-right text-gray-500 font-medium">Lista</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sample.map((row, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 text-gray-500 font-mono">{row.sku ?? "—"}</td>
                    <td className="px-3 py-2 text-gray-900">{row.name}</td>
                    <td className="px-3 py-2 text-right text-gray-500">
                      {row.costPrice != null ? fmt(row.costPrice) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-900 font-medium">
                      {row.priceList != null ? fmt(row.priceList) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Barra de progreso */}
          {progress && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Importando...</span>
                <span>
                  {progress.done.toLocaleString("es-AR")} /{" "}
                  {progress.total.toLocaleString("es-AR")}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-3">
            <button
              onClick={handleImport}
              disabled={loading}
              className="flex-1 bg-indigo-600 text-white text-sm font-medium py-3 rounded-xl hover:bg-indigo-700 disabled:opacity-40"
            >
              {loading
                ? "Importando..."
                : `Importar ${allRows.length.toLocaleString("es-AR")} productos`}
            </button>
            <button
              onClick={reset}
              disabled={loading}
              className="px-4 py-3 text-sm text-gray-500 hover:text-gray-800 disabled:opacity-40"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Resultado */}
      {result && (
        <div className="space-y-4">
          <div className="bg-green-50 rounded-xl p-5 text-center space-y-1">
            <p className="text-2xl font-bold text-green-700">
              {result.processed.toLocaleString("es-AR")}
            </p>
            <p className="text-sm font-medium text-green-800">productos procesados</p>
            <p className="text-xs text-green-600 mt-1">
              Nuevos creados y existentes actualizados con precios calculados.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/productos")}
              className="flex-1 bg-indigo-600 text-white text-sm font-medium py-3 rounded-xl hover:bg-indigo-700"
            >
              Ver productos
            </button>
            <button onClick={reset} className="px-4 py-3 text-sm text-gray-500 hover:text-gray-800">
              Importar otro
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

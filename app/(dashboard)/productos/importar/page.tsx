"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fmt } from "@/lib/utils";

type PreviewRow = {
  sku: string | null;
  name: string;
  notes: string | null;
  priceList: number | null;
};

type PreviewResult = {
  total: number;
  sample: PreviewRow[];
  warnings: string[];
};

type ImportResult = {
  total: number;
  created: number;
  skipped: number;
};

export default function ImportarProductosPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handlePreview() {
    if (!file) return;
    setLoading(true);
    setError("");
    setPreview(null);

    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/productos/importar?preview=1", { method: "POST", body: fd });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Error al procesar el archivo");
      setLoading(false);
      return;
    }
    setPreview(data);
    setLoading(false);
  }

  async function handleImport() {
    if (!file) return;
    setLoading(true);
    setError("");

    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/productos/importar", { method: "POST", body: fd });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Error al importar");
      setLoading(false);
      return;
    }
    setResult(data);
    setLoading(false);
  }

  function reset() {
    setFile(null);
    setPreview(null);
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
          Formato esperado: Excel (.xlsx) con columnas <strong>CODIGO · DESCRIPCION · MARCA · PRECIO</strong>
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
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                setPreview(null);
                setError("");
              }}
              className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
          </div>

          {file && !preview && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 flex-1 truncate">{file.name}</span>
              <button
                onClick={handlePreview}
                disabled={loading}
                className="bg-gray-100 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-200 disabled:opacity-40"
              >
                {loading ? "Procesando..." : "Vista previa"}
              </button>
            </div>
          )}

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      )}

      {/* Preview */}
      {preview && !result && (
        <div className="space-y-4">
          <div className="bg-indigo-50 rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-indigo-900">
                {preview.total.toLocaleString("es-AR")} productos encontrados
              </p>
              <p className="text-xs text-indigo-600 mt-0.5">
                Los ya existentes (mismo código) serán omitidos, no sobreescritos.
              </p>
            </div>
          </div>

          {preview.warnings.length > 0 && (
            <div className="bg-amber-50 rounded-xl px-4 py-3">
              <p className="text-xs font-medium text-amber-800 mb-1">Advertencias</p>
              {preview.warnings.map((w, i) => (
                <p key={i} className="text-xs text-amber-700">{w}</p>
              ))}
            </div>
          )}

          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Primeras 5 filas</p>
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-gray-500 font-medium">Código</th>
                    <th className="px-3 py-2 text-left text-gray-500 font-medium">Descripción</th>
                    <th className="px-3 py-2 text-left text-gray-500 font-medium">Marca</th>
                    <th className="px-3 py-2 text-right text-gray-500 font-medium">Precio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {preview.sample.map((row, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-gray-500 font-mono">{row.sku ?? "—"}</td>
                      <td className="px-3 py-2 text-gray-900">{row.name}</td>
                      <td className="px-3 py-2 text-gray-500">{row.notes ?? "—"}</td>
                      <td className="px-3 py-2 text-right text-gray-900">
                        {row.priceList != null ? fmt(row.priceList) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-3">
            <button
              onClick={handleImport}
              disabled={loading}
              className="flex-1 bg-indigo-600 text-white text-sm font-medium py-3 rounded-xl hover:bg-indigo-700 disabled:opacity-40"
            >
              {loading ? "Importando..." : `Importar ${preview.total.toLocaleString("es-AR")} productos`}
            </button>
            <button onClick={reset} className="px-4 py-3 text-sm text-gray-500 hover:text-gray-800">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-4">
          <div className="bg-green-50 rounded-xl p-5 text-center space-y-1">
            <p className="text-2xl font-bold text-green-700">
              {result.created.toLocaleString("es-AR")}
            </p>
            <p className="text-sm font-medium text-green-800">productos importados</p>
            {result.skipped > 0 && (
              <p className="text-xs text-green-600 mt-1">
                {result.skipped.toLocaleString("es-AR")} ya existían y fueron omitidos
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => router.push("/productos")}
              className="flex-1 bg-indigo-600 text-white text-sm font-medium py-3 rounded-xl hover:bg-indigo-700"
            >
              Ver productos
            </button>
            <button
              onClick={reset}
              className="px-4 py-3 text-sm text-gray-500 hover:text-gray-800"
            >
              Importar otro
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

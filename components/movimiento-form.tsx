"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FormField } from "@/components/form-field";
import { FormError } from "@/components/form-error";
import { fmt } from "@/lib/utils";
import { inputClass } from "@/lib/ui";

/**
 * Carga rápida estilo Excel: una sola fila con Fecha · Referencia · Debe ·
 * A cuenta. Podés llenar "Debe" (venta), "A cuenta" (cobro) o ambos. Tras
 * guardar, el form queda abierto y limpio para seguir cargando.
 */
export function MovimientoForm({ customerId }: { customerId: string }) {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];

  const [date, setDate] = useState(today);
  const [referencia, setReferencia] = useState("");
  const [debe, setDebe] = useState("");
  const [aCuenta, setACuenta] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  const refInput = useRef<HTMLInputElement>(null);

  const debeNum = parseFloat(debe) || 0;
  const aCuentaNum = parseFloat(aCuenta) || 0;
  const nada = debeNum <= 0 && aCuentaNum <= 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (nada) {
      setError("Ingresá un monto en Debe o en A cuenta");
      return;
    }
    if (debeNum > 0 && !referencia.trim()) {
      setError("La venta necesita una referencia");
      return;
    }
    setLoading(true);
    setError("");

    const res = await fetch("/api/movimientos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId,
        referencia: referencia.trim() || undefined,
        debe: debeNum || undefined,
        aCuenta: aCuentaNum || undefined,
        date,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Error al registrar el movimiento");
      setLoading(false);
      return;
    }

    // Form queda abierto: limpiamos montos y referencia, mantenemos la fecha
    setReferencia("");
    setDebe("");
    setACuenta("");
    setLoading(false);
    router.refresh();
    refInput.current?.focus();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center w-full bg-indigo-600 text-white text-sm font-medium py-3 rounded-xl hover:bg-indigo-700 active:bg-indigo-800 transition-colors"
      >
        + Cargar movimiento
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-gray-200 rounded-xl p-4 space-y-3"
    >
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-gray-800">
          Cargar movimiento
        </h3>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError("");
          }}
          aria-label="Cerrar"
          className="text-gray-400 hover:text-gray-600 active:text-gray-800 transition-colors p-2 -mr-2 -mt-1"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-[7rem_1fr] gap-3">
        <FormField label="Fecha" htmlFor="mov-date">
          <input
            id="mov-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className={inputClass}
          />
        </FormField>
        <FormField label="Referencia" htmlFor="mov-ref">
          <input
            id="mov-ref"
            ref={refInput}
            type="text"
            value={referencia}
            onChange={(e) => setReferencia(e.target.value)}
            placeholder="Ej: morza LUSQTOFF, mpago..."
            className={inputClass}
            autoFocus
          />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Debe (venta)" htmlFor="mov-debe" optional>
          <input
            id="mov-debe"
            type="number"
            inputMode="decimal"
            value={debe}
            onChange={(e) => setDebe(e.target.value)}
            min="0"
            step="any"
            placeholder="0"
            className={inputClass}
          />
        </FormField>
        <FormField label="A cuenta (cobro)" htmlFor="mov-acuenta" optional>
          <input
            id="mov-acuenta"
            type="number"
            inputMode="decimal"
            value={aCuenta}
            onChange={(e) => setACuenta(e.target.value)}
            min="0"
            step="any"
            placeholder="0"
            className={inputClass}
          />
        </FormField>
      </div>

      {!nada && (
        <div className="bg-gray-50 rounded-xl px-4 py-2.5 flex justify-between items-center text-sm">
          <span className="text-gray-600">Neto de esta fila</span>
          <span className="font-semibold text-gray-900">
            {fmt(debeNum - aCuentaNum)}
          </span>
        </div>
      )}

      <FormError error={error} />

      <button
        type="submit"
        disabled={loading || nada}
        className="w-full bg-indigo-600 text-white rounded-lg py-3 text-sm font-medium hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-40 transition-colors"
      >
        {loading ? "Guardando..." : "Agregar fila"}
      </button>
    </form>
  );
}

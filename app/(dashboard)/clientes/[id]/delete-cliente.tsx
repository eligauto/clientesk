"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fmt } from "@/lib/utils";

export function DeleteClienteButton({
  clienteId,
  clienteName,
  transactionCount,
  balanceDue,
}: {
  clienteId: string;
  clienteName: string;
  transactionCount: number;
  balanceDue: number;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  async function handleDelete() {
    setLoading(true);
    setApiError("");
    const res = await fetch(`/api/clientes/${clienteId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/clientes");
      router.refresh();
    } else {
      setLoading(false);
      setApiError("No se pudo eliminar el cliente. Intentá de nuevo.");
    }
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="w-full text-sm text-red-500 hover:text-red-700 active:text-red-800 py-3 transition-colors"
      >
        Eliminar cliente
      </button>
    );
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
      <p className="text-sm font-semibold text-red-800">
        ¿Eliminar a &ldquo;{clienteName}&rdquo;?
      </p>
      {transactionCount > 0 && (
        <p className="text-xs text-red-700">
          Se eliminarán también {transactionCount}{" "}
          {transactionCount === 1 ? "venta" : "ventas"} y todos sus pagos.
        </p>
      )}
      {balanceDue > 0 && (
        <p className="text-xs text-red-700">
          Tiene saldo pendiente de {fmt(balanceDue)}.
        </p>
      )}
      <p className="text-xs text-red-600 font-medium">
        Esta acción no se puede deshacer.
      </p>
      {apiError && (
        <p role="alert" className="text-xs text-red-600">
          {apiError}
        </p>
      )}
      <div className="flex gap-2">
        <button
          onClick={handleDelete}
          disabled={loading}
          className="flex-1 bg-red-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-red-700 active:bg-red-800 disabled:opacity-50 transition-colors"
        >
          {loading ? "Eliminando..." : "Sí, eliminar"}
        </button>
        <button
          onClick={() => {
            setConfirming(false);
            setApiError("");
          }}
          disabled={loading}
          className="flex-1 bg-white border border-gray-200 text-gray-700 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

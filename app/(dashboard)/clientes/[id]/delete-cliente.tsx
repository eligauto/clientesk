"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    let msg = `¿Eliminar a "${clienteName}"?`;
    if (transactionCount > 0) {
      msg += `\n\nSe eliminarán también ${transactionCount} ${transactionCount === 1 ? "venta" : "ventas"} y todos sus pagos.`;
    }
    if (balanceDue > 0) {
      msg += `\n\nTiene saldo pendiente. Esta acción no se puede deshacer.`;
    } else {
      msg += "\n\nEsta acción no se puede deshacer.";
    }

    if (!confirm(msg)) return;
    setLoading(true);

    const res = await fetch(`/api/clientes/${clienteId}`, { method: "DELETE" });

    if (res.ok) {
      router.push("/clientes");
      router.refresh();
    } else {
      setLoading(false);
      alert("No se pudo eliminar el cliente. Intentá de nuevo.");
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="w-full text-sm text-red-500 hover:text-red-700 py-3 disabled:opacity-50 transition-colors"
    >
      {loading ? "Eliminando..." : "Eliminar cliente"}
    </button>
  );
}

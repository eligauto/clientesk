"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeletePurchasePaymentButton({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("¿Anular este pago?")) return;
    setLoading(true);
    await fetch(`/api/pagos-compras/${paymentId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50"
    >
      {loading ? "..." : "Anular"}
    </button>
  );
}

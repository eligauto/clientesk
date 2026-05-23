"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Combobox } from "@/components/combobox";
import { fmt } from "@/lib/utils";

type Customer = { id: string; name: string };
type Product = {
  id: string;
  name: string;
  unit: string | null;
  priceList: number | null;
  priceCredit: number | null;
  priceTransfer: number | null;
  priceCash: number | null;
};

const PRICE_LABELS: Record<string, string> = {
  lista: "Lista",
  credito: "Crédito",
  transferencia: "Transferencia",
  contado: "Contado",
};

const PRICE_FIELDS: Record<string, keyof Product> = {
  lista: "priceList",
  credito: "priceCredit",
  transferencia: "priceTransfer",
  contado: "priceCash",
};

const inputClass =
  "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent";

export function NuevaVentaForm({
  customers,
  products,
  defaultClienteId,
}: {
  customers: Customer[];
  products: Product[];
  defaultClienteId?: string;
}) {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];

  const [clienteId, setClienteId] = useState(defaultClienteId ?? "");
  const [productoId, setProductoId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [priceType, setPriceType] = useState("lista");
  const [unitPrice, setUnitPrice] = useState("");
  const [initialPayment, setInitialPayment] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Auto-fill unit price when product or price type changes
  useEffect(() => {
    const product = products.find((p) => p.id === productoId);
    if (!product) return;
    const field = PRICE_FIELDS[priceType];
    const price = product[field] as number | null;
    if (price !== null) setUnitPrice(String(price));
  }, [productoId, priceType, products]);

  const qty = parseFloat(quantity) || 0;
  const price = parseFloat(unitPrice) || 0;
  const payment = parseFloat(initialPayment) || 0;
  const total = qty * price;
  const balance = Math.max(0, total - payment);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clienteId || !productoId) {
      setError("Seleccioná un cliente y un producto");
      return;
    }
    setLoading(true);
    setError("");

    const res = await fetch("/api/transacciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: clienteId,
        productId: productoId,
        quantity: qty,
        priceType,
        unitPrice: price,
        initialPayment: payment,
        paymentMethod: payment > 0 ? paymentMethod : undefined,
        notes: notes || undefined,
        date,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error al registrar la venta");
      setLoading(false);
      return;
    }

    router.push(`/clientes/${clienteId}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-8">
      <div className="flex items-center gap-3">
        <Link href={clienteId ? `/clientes/${clienteId}` : "/clientes"} className="text-gray-400 text-lg">
          ←
        </Link>
        <h1 className="text-lg font-semibold text-gray-900">Nueva venta</h1>
      </div>

      {/* Cliente */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Cliente <span className="text-red-500">*</span>
        </label>
        <Combobox
          options={customers.map((c) => ({ id: c.id, label: c.name }))}
          value={clienteId}
          onChange={setClienteId}
          placeholder="Buscar cliente..."
          required
        />
      </div>

      {/* Producto */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Producto <span className="text-red-500">*</span>
        </label>
        <Combobox
          options={products.map((p) => ({ id: p.id, label: p.name }))}
          value={productoId}
          onChange={setProductoId}
          placeholder="Buscar producto..."
          required
        />
      </div>

      {/* Cantidad + tipo de precio */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Cantidad
          </label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            min="0.001"
            step="any"
            required
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Tipo de precio
          </label>
          <select
            value={priceType}
            onChange={(e) => setPriceType(e.target.value)}
            className={inputClass}
          >
            {Object.entries(PRICE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Precio unitario */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Precio unitario
        </label>
        <input
          type="number"
          value={unitPrice}
          onChange={(e) => setUnitPrice(e.target.value)}
          min="0"
          step="any"
          required
          placeholder="0.00"
          className={inputClass}
        />
      </div>

      {/* Total */}
      {total > 0 && (
        <div className="bg-gray-50 rounded-xl px-4 py-3 flex justify-between items-center">
          <span className="text-sm text-gray-600">Total</span>
          <span className="text-base font-semibold text-gray-900">{fmt(total)}</span>
        </div>
      )}

      {/* Pago inicial */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Pago inicial
          </label>
          <input
            type="number"
            value={initialPayment}
            onChange={(e) => setInitialPayment(e.target.value)}
            min="0"
            step="any"
            className={inputClass}
          />
        </div>
        {payment > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Método
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className={inputClass}
            >
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>
        )}
      </div>

      {/* Saldo resultante */}
      {total > 0 && balance > 0 && (
        <div className="bg-amber-50 rounded-xl px-4 py-3 flex justify-between items-center">
          <span className="text-sm text-amber-700">Queda debiendo</span>
          <span className="text-base font-semibold text-amber-700">{fmt(balance)}</span>
        </div>
      )}
      {total > 0 && balance === 0 && (
        <div className="bg-green-50 rounded-xl px-4 py-3 flex justify-between items-center">
          <span className="text-sm text-green-700">Saldo</span>
          <span className="text-base font-semibold text-green-700">Saldada ✓</span>
        </div>
      )}

      {/* Fecha */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Fecha
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className={inputClass}
        />
      </div>

      {/* Notas */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Notas (opcional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className={`${inputClass} resize-none`}
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading || !clienteId || !productoId || !unitPrice || qty <= 0}
        className="w-full bg-indigo-600 text-white rounded-xl py-3.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors"
      >
        {loading ? "Registrando..." : "Registrar venta"}
      </button>
    </form>
  );
}

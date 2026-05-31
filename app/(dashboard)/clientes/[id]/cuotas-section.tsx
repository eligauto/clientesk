"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { fmt } from "@/lib/utils";

type Installment = {
  id: string;
  installmentNumber: number;
  dueDate: string;
  expectedAmount: number;
  status: "pending" | "paid" | "cancelled";
};

type Plan = {
  id: string;
  description: string;
  totalAmount: number;
  installmentCount: number;
  frequency: string;
  status: "active" | "completed" | "cancelled";
  installments: Installment[];
};

function installmentStatus(
  inst: Installment,
): "overdue" | "pending" | "paid" | "cancelled" {
  if (inst.status === "paid") return "paid";
  if (inst.status === "cancelled") return "cancelled";
  const due = new Date(inst.dueDate);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today ? "overdue" : "pending";
}

const FREQ_LABEL: Record<string, string> = {
  semanal: "Semanal",
  quincenal: "Quincenal",
  mensual: "Mensual",
};
const STATUS_PLAN_LABEL: Record<string, string> = {
  active: "Activo",
  completed: "Completado",
  cancelled: "Cancelado",
};

function PlanCard({ plan, customerId }: { plan: Plan; customerId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [expandido, setExpandido] = useState(true);

  async function marcarPagada(installmentId: string) {
    await fetch(`/api/cuotas/${installmentId}/pagar`, { method: "PATCH" });
    startTransition(() => router.refresh());
  }

  async function cancelarPlan() {
    if (
      !confirm(
        `¿Cancelar el plan "${plan.description}"? Esta acción cancelará todas las cuotas pendientes.`,
      )
    )
      return;
    await fetch(`/api/planes-cuotas/${plan.id}/cancelar`, { method: "PATCH" });
    startTransition(() => router.refresh());
  }

  const vencidas = plan.installments.filter(
    (i) => installmentStatus(i) === "overdue",
  ).length;
  const pagadas = plan.installments.filter((i) => i.status === "paid").length;

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      {/* Header del plan */}
      <button
        onClick={() => setExpandido((v) => !v)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {plan.description}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {pagadas}/{plan.installmentCount} cuotas ·{" "}
            {FREQ_LABEL[plan.frequency]} · {fmt(plan.totalAmount)}
            {vencidas > 0 && (
              <span className="ml-2 text-red-600 font-medium">
                {vencidas} vencida{vencidas > 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {plan.status === "active" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                cancelarPlan();
              }}
              disabled={pending}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              Cancelar
            </button>
          )}
          <span className="text-gray-400 text-sm">{expandido ? "▲" : "▼"}</span>
        </div>
      </button>

      {/* Lista de cuotas */}
      {expandido && (
        <div className="border-t border-gray-100 divide-y divide-gray-50">
          {plan.installments.map((inst) => {
            const st = installmentStatus(inst);
            const due = new Date(inst.dueDate);
            const dateStr = due.toLocaleDateString("es-AR", {
              day: "2-digit",
              month: "2-digit",
              year: "2-digit",
            });

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dueCopy = new Date(inst.dueDate);
            dueCopy.setHours(0, 0, 0, 0);
            const daysOverdue =
              st === "overdue"
                ? Math.floor((today.getTime() - dueCopy.getTime()) / 86400000)
                : 0;

            return (
              <div key={inst.id} className="flex items-center gap-3 px-4 py-3">
                {/* Ícono de estado */}
                <span className="text-base flex-shrink-0">
                  {st === "paid" && <span className="text-green-500">✓</span>}
                  {st === "overdue" && <span className="text-red-500">⚠</span>}
                  {st === "pending" && <span className="text-gray-300">○</span>}
                  {st === "cancelled" && (
                    <span className="text-gray-300">–</span>
                  )}
                </span>

                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm ${st === "cancelled" ? "line-through text-gray-300" : "text-gray-800"}`}
                  >
                    Cuota {inst.installmentNumber} · {dateStr}
                  </p>
                  {st === "overdue" && (
                    <p className="text-xs text-red-500">
                      Vencida hace {daysOverdue}d
                    </p>
                  )}
                </div>

                <p className="text-sm font-medium text-gray-900 flex-shrink-0">
                  {fmt(inst.expectedAmount)}
                </p>

                {st === "overdue" || st === "pending" ? (
                  <button
                    onClick={() => marcarPagada(inst.id)}
                    disabled={pending}
                    className="text-xs text-indigo-600 font-medium hover:text-indigo-800 flex-shrink-0 min-h-[36px] px-2"
                  >
                    Pagar
                  </button>
                ) : (
                  <span className="w-12 flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface NuevoPlanFormProps {
  customerId: string;
  onCreated: () => void;
}

function NuevoPlanForm({ customerId, onCreated }: NuevoPlanFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    description: "",
    totalAmount: "",
    installmentCount: "6",
    frequency: "mensual",
    firstDueDate: new Date().toISOString().slice(0, 10),
  });

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/planes-cuotas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, customerId }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error al crear el plan");
      return;
    }
    onCreated();
    startTransition(() => router.refresh());
  }

  return (
    <form onSubmit={submit} className="bg-gray-50 rounded-xl p-4 space-y-3">
      <p className="text-sm font-medium text-gray-700">Nuevo plan de cuotas</p>

      <div>
        <label className="text-xs text-gray-500 mb-1 block">Descripción</label>
        <input
          value={form.description}
          onChange={field("description")}
          required
          placeholder="Ej: Taladro Bosch"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">
            Monto total
          </label>
          <input
            type="number"
            min="1"
            step="0.01"
            value={form.totalAmount}
            onChange={field("totalAmount")}
            required
            placeholder="0.00"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Cuotas</label>
          <input
            type="number"
            min="1"
            max="120"
            value={form.installmentCount}
            onChange={field("installmentCount")}
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Frecuencia</label>
          <select
            value={form.frequency}
            onChange={field("frequency")}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value="semanal">Semanal</option>
            <option value="quincenal">Quincenal</option>
            <option value="mensual">Mensual</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">
            Primera cuota
          </label>
          <input
            type="date"
            value={form.firstDueDate}
            onChange={field("firstDueDate")}
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCreated}
          className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-600"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending}
          className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium disabled:opacity-60"
        >
          {pending ? "Creando..." : "Crear plan"}
        </button>
      </div>
    </form>
  );
}

interface Props {
  customerId: string;
  plans: Plan[];
}

export function CuotasSection({ customerId, plans }: Props) {
  const [mostrarForm, setMostrarForm] = useState(false);

  const activos = plans.filter((p) => p.status !== "cancelled");
  const cancelados = plans.filter((p) => p.status === "cancelled");

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-gray-700">
          Cuotas {activos.length > 0 && `(${activos.length})`}
        </h2>
        {!mostrarForm && (
          <button
            onClick={() => setMostrarForm(true)}
            className="text-sm text-indigo-600 font-medium"
          >
            + Nuevo plan
          </button>
        )}
      </div>

      {mostrarForm && (
        <div className="mb-3">
          <NuevoPlanForm
            customerId={customerId}
            onCreated={() => setMostrarForm(false)}
          />
        </div>
      )}

      {activos.length === 0 && !mostrarForm ? (
        <div className="text-center py-8 text-gray-400 text-sm">
          Sin planes de cuotas activos
        </div>
      ) : (
        <div className="space-y-3">
          {activos.map((p) => (
            <PlanCard key={p.id} plan={p} customerId={customerId} />
          ))}
        </div>
      )}

      {cancelados.length > 0 && (
        <details className="mt-4">
          <summary className="text-xs text-gray-400 cursor-pointer select-none">
            {cancelados.length} plan{cancelados.length > 1 ? "es" : ""}{" "}
            cancelado{cancelados.length > 1 ? "s" : ""}
          </summary>
          <div className="space-y-2 mt-2">
            {cancelados.map((p) => (
              <PlanCard key={p.id} plan={p} customerId={customerId} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { CancelEntryBtn } from "@/components/cancel-entry-btn";
import { fmt, fmtDate } from "@/lib/utils";

export type HistorialEntry = {
  kind: "venta" | "cobro";
  id: string;
  date: string; // ISO
  description: string;
  amount: number;
  status: string;
  extra?: string;
};

type Group = {
  key: string;
  label: string;
  entries: HistorialEntry[];
};

function monthLabel(date: Date): string {
  const s = date.toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Agrupa por mes preservando el orden ascendente que ya trae el array. */
function groupByMonth(entries: HistorialEntry[]): Group[] {
  const groups: Group[] = [];
  for (const e of entries) {
    const d = new Date(e.date);
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.entries.push(e);
    } else {
      groups.push({ key, label: monthLabel(d), entries: [e] });
    }
  }
  return groups;
}

export function HistorialCliente({ entries }: { entries: HistorialEntry[] }) {
  const groups = groupByMonth(entries);
  // Mes más reciente (último, porque viene ascendente) abierto por defecto.
  const lastKey = groups.length ? groups[groups.length - 1].key : "";
  const [open, setOpen] = useState<Record<string, boolean>>(
    lastKey ? { [lastKey]: true } : {},
  );

  if (entries.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-10">
        Sin movimientos registrados
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map((g) => {
        const isOpen = open[g.key] ?? false;
        return (
          <div key={g.key}>
            <button
              type="button"
              onClick={() =>
                setOpen((prev) => ({ ...prev, [g.key]: !isOpen }))
              }
              className="flex items-center justify-between w-full text-left px-1 py-1.5"
              aria-expanded={isOpen}
            >
              <span className="text-sm font-medium text-gray-700">
                {g.label}
                <span className="text-gray-400 font-normal ml-1.5">
                  ({g.entries.length})
                </span>
              </span>
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
                className={`text-gray-400 transition-transform ${
                  isOpen ? "rotate-180" : ""
                }`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {isOpen && (
              <ul className="space-y-2 mt-1">
                {g.entries.map((entry) => {
                  const cancelled = entry.status === "cancelled";
                  const editHref =
                    entry.kind === "venta"
                      ? `/transacciones/${entry.id}/editar`
                      : `/cobros/${entry.id}/editar`;
                  const cancelEndpoint =
                    entry.kind === "venta"
                      ? `/api/transacciones/${entry.id}/cancelar`
                      : `/api/cobros/${entry.id}/cancelar`;

                  return (
                    <li
                      key={`${entry.kind}-${entry.id}`}
                      className={`bg-white rounded-xl p-4 border border-gray-100 transition-colors ${
                        cancelled ? "opacity-50" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                                entry.kind === "venta"
                                  ? "bg-indigo-50 text-indigo-600"
                                  : "bg-green-50 text-green-700"
                              }`}
                            >
                              {entry.kind === "venta" ? "Venta" : "Cobro"}
                            </span>
                            {cancelled && (
                              <span className="text-xs text-red-400 font-medium">
                                Anulado
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-medium text-gray-900 truncate mt-1">
                            {entry.description}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {fmtDate(entry.date)}
                            {entry.extra ? ` · ${entry.extra}` : ""}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p
                            className={`text-sm font-semibold ${
                              entry.kind === "venta"
                                ? "text-gray-900"
                                : "text-green-700"
                            }`}
                          >
                            {entry.kind === "cobro" ? "+" : ""}
                            {fmt(entry.amount)}
                          </p>
                          {!cancelled && (
                            <div className="flex items-center gap-2 mt-1 justify-end">
                              <Link
                                href={editHref}
                                className="text-xs text-indigo-500 hover:text-indigo-700 font-medium"
                              >
                                Editar
                              </Link>
                              <CancelEntryBtn endpoint={cancelEndpoint} />
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

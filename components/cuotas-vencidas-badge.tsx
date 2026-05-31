import Link from "next/link";
import { fmt } from "@/lib/utils";

interface Props {
  count: number;
  monto: number;
}

export function CuotasVencidasBadge({ count, monto }: Props) {
  return (
    <Link
      href="/cuotas"
      className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 hover:bg-red-100 transition-colors"
    >
      <div className="flex items-center gap-2">
        <span className="text-red-600 text-base leading-none">⚠</span>
        <div>
          <p className="text-sm font-medium text-red-700">
            {count} {count === 1 ? "cuota vencida" : "cuotas vencidas"}
          </p>
          <p className="text-xs text-red-500">{fmt(monto)} pendiente</p>
        </div>
      </div>
      <span className="text-red-400 text-sm font-medium">Ver →</span>
    </Link>
  );
}

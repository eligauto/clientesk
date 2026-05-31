import { fmt } from "@/lib/utils";

const HIGH_THRESHOLD = 50_000;

export function SaldoBadge({ amount }: { amount: number }) {
  if (amount < -0.005) {
    return (
      <span className="text-xs font-medium text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full">
        A favor {fmt(-amount)}
      </span>
    );
  }
  if (amount <= 0.005) {
    return (
      <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
        Saldado
      </span>
    );
  }
  const isHigh = amount >= HIGH_THRESHOLD;
  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
        isHigh ? "text-red-700 bg-red-50" : "text-amber-700 bg-amber-50"
      }`}
    >
      Debe {fmt(amount)}
    </span>
  );
}

export function StatusBadge({
  balanceDue,
  totalAmount,
}: {
  balanceDue: number;
  totalAmount: number;
}) {
  if (balanceDue <= 0) {
    return (
      <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
        Saldada
      </span>
    );
  }
  if (totalAmount > 0 && balanceDue < totalAmount) {
    return (
      <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
        Parcial
      </span>
    );
  }
  return (
    <span className="text-xs font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
      Pendiente
    </span>
  );
}

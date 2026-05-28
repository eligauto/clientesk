"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  endpoint: string;
  label?: string;
  onSuccess?: () => void;
}

export function CancelEntryBtn({
  endpoint,
  label = "Anular",
  onSuccess,
}: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleCancel() {
    setLoading(true);
    const res = await fetch(endpoint, { method: "PATCH" });
    setLoading(false);
    if (res.ok) {
      setConfirming(false);
      if (onSuccess) onSuccess();
      else router.refresh();
    }
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="text-xs text-red-500 hover:text-red-700 active:text-red-800 font-medium transition-colors py-2 px-2 -my-2 -mx-2"
      >
        {label}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-gray-500">¿Anular?</span>
      <button
        onClick={handleCancel}
        disabled={loading}
        className="text-xs font-medium text-red-600 hover:text-red-800 active:text-red-900 disabled:opacity-50 py-2 px-2 -my-2"
      >
        {loading ? "..." : "Sí"}
      </button>
      <button
        onClick={() => setConfirming(false)}
        className="text-xs text-gray-400 hover:text-gray-600 active:text-gray-800 py-2 px-2 -my-2"
      >
        No
      </button>
    </div>
  );
}

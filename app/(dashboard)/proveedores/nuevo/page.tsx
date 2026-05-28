"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormField } from "@/components/form-field";
import { FormError } from "@/components/form-error";
import { BackLink } from "@/components/back-link";
import { inputClass } from "@/lib/ui";

export default function NuevoProveedorPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/proveedores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phoneWhatsapp: phone, notes }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error al crear el proveedor");
      setLoading(false);
      return;
    }

    const { id } = await res.json();
    setLoading(false);
    router.push(`/proveedores/${id}`);
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <BackLink href="/proveedores" label="Volver a proveedores" />
        <h1 className="text-lg font-semibold text-gray-900">Nuevo proveedor</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Nombre" htmlFor="nombre" required>
          <input
            id="nombre"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
            placeholder="Proveedor Central"
            className={inputClass}
          />
        </FormField>

        <FormField label="Teléfono / WhatsApp" htmlFor="telefono">
          <input
            id="telefono"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+54 9 11 1234-5678"
            className={inputClass}
          />
        </FormField>

        <FormField label="Notas" htmlFor="notas">
          <textarea
            id="notas"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Información adicional..."
            className={`${inputClass} resize-none`}
          />
        </FormField>

        <FormError error={error} />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white rounded-xl py-3.5 text-sm font-medium hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 transition-colors"
        >
          {loading ? "Guardando..." : "Crear proveedor"}
        </button>
      </form>
    </div>
  );
}

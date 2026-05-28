"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FormField } from "@/components/form-field";
import { FormError } from "@/components/form-error";
import { BackLink } from "@/components/back-link";
import { inputClass } from "@/lib/ui";

export default function EditarClientePage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/clientes/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        setName(data.name ?? "");
        setPhone(data.phoneWhatsapp ?? "");
        setAddress(data.address ?? "");
        setNotes(data.notes ?? "");
        setFetching(false);
      });
  }, [params.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch(`/api/clientes/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phoneWhatsapp: phone, address, notes }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error al guardar");
      setLoading(false);
      return;
    }

    setLoading(false);
    router.push(`/clientes/${params.id}`);
    router.refresh();
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-gray-400">Cargando...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <BackLink href={`/clientes/${params.id}`} label="Volver al cliente" />
        <h1 className="text-lg font-semibold text-gray-900">Editar cliente</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Nombre" htmlFor="nombre" required>
          <input
            id="nombre"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className={inputClass}
          />
        </FormField>

        <FormField label="Teléfono / WhatsApp" htmlFor="telefono">
          <input
            id="telefono"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClass}
          />
        </FormField>

        <FormField label="Dirección" htmlFor="direccion">
          <input
            id="direccion"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className={inputClass}
          />
        </FormField>

        <FormField label="Notas" htmlFor="notas">
          <textarea
            id="notas"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </FormField>

        <FormError error={error} />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white rounded-xl py-3.5 text-sm font-medium hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 transition-colors"
        >
          {loading ? "Guardando..." : "Guardar cambios"}
        </button>
      </form>
    </div>
  );
}

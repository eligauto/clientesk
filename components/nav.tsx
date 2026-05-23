"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const links = [
  { href: "/clientes", label: "Clientes" },
  { href: "/proveedores", label: "Proveedores" },
  { href: "/productos", label: "Productos" },
];

export function Nav() {
  const path = usePathname();

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-2xl mx-auto px-4 flex items-center gap-1 h-12">
        <span className="font-semibold text-sm text-gray-900 mr-3">Clientesk</span>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
              path.startsWith(link.href)
                ? "bg-indigo-50 text-indigo-700 font-medium"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {link.label}
          </Link>
        ))}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="ml-auto text-sm text-gray-400 hover:text-gray-700"
        >
          Salir
        </button>
      </div>
    </nav>
  );
}

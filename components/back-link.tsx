import Link from "next/link";

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      prefetch={false}
      className="text-gray-400 text-lg p-1 -ml-1 hover:text-gray-600 active:text-gray-800 transition-colors"
    >
      ←
    </Link>
  );
}

export function FormError({ error }: { error: string }) {
  if (!error) return null;
  return (
    <p
      role="alert"
      className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2"
    >
      {error}
    </p>
  );
}

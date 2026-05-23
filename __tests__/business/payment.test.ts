import { describe, it, expect } from "vitest";

// Lógica de negocio extraída para testing (espeja app/api/pagos/route.ts)
function validatePayment(input: {
  transactionId?: string;
  amount?: number;
  method?: string;
  currentBalanceDue: number;
}): { error: string; code: string } | { newBalanceDue: number } {
  const { transactionId, amount, method, currentBalanceDue } = input;

  if (!transactionId || !amount || !method) {
    return { error: "Campos requeridos faltantes", code: "VALIDATION_ERROR" };
  }

  const amt = Number(amount);

  if (amt <= 0) {
    return { error: "El monto debe ser mayor a 0", code: "VALIDATION_ERROR" };
  }

  if (amt > currentBalanceDue) {
    return { error: "El monto supera el saldo pendiente", code: "VALIDATION_ERROR" };
  }

  return { newBalanceDue: currentBalanceDue - amt };
}

describe("pago parcial — validación", () => {
  const base = { transactionId: "tx-1", method: "efectivo", currentBalanceDue: 1000 };

  it("acepta pago válido parcial", () => {
    const r = validatePayment({ ...base, amount: 400 });
    expect(r).toMatchObject({ newBalanceDue: 600 });
  });

  it("acepta pago que cancela el saldo completo", () => {
    const r = validatePayment({ ...base, amount: 1000 });
    expect(r).toMatchObject({ newBalanceDue: 0 });
  });

  it("rechaza si falta transactionId", () => {
    const r = validatePayment({ ...base, transactionId: undefined, amount: 100 });
    expect(r).toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("rechaza si falta amount", () => {
    const r = validatePayment({ ...base, amount: undefined });
    expect(r).toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("rechaza monto cero (falta campo)", () => {
    // amount=0 es falsy: la ruta API lo trata como campo faltante
    const r = validatePayment({ ...base, amount: 0 });
    expect(r).toHaveProperty("code", "VALIDATION_ERROR");
  });

  it("rechaza monto negativo", () => {
    const r = validatePayment({ ...base, amount: -50 });
    expect(r).toMatchObject({ error: "El monto debe ser mayor a 0" });
  });

  it("rechaza monto mayor al saldo pendiente", () => {
    const r = validatePayment({ ...base, amount: 1500 });
    expect(r).toMatchObject({ error: "El monto supera el saldo pendiente" });
  });
});

describe("pago parcial — actualización de saldo", () => {
  it("decrementa el saldo correctamente", () => {
    const r = validatePayment({
      transactionId: "tx-1",
      amount: 250,
      method: "transferencia",
      currentBalanceDue: 750,
    });
    expect(r).toMatchObject({ newBalanceDue: 500 });
  });

  it("saldo resultante nunca es negativo", () => {
    const r = validatePayment({
      transactionId: "tx-1",
      amount: 750,
      method: "efectivo",
      currentBalanceDue: 750,
    }) as { newBalanceDue: number };
    expect(r.newBalanceDue).toBeGreaterThanOrEqual(0);
  });
});

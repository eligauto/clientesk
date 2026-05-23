import { describe, it, expect } from "vitest";

// Lógica de negocio extraída para testing (espeja app/api/transacciones/route.ts)
function validateTransaction(input: {
  customerId?: string;
  productId?: string;
  quantity?: number;
  priceType?: string;
  unitPrice?: number;
  initialPayment?: number;
}): { error: string; code: string } | { total: number; balanceDue: number } {
  const { customerId, productId, quantity, priceType, unitPrice, initialPayment } = input;

  if (!customerId || !productId || !quantity || !priceType || !unitPrice) {
    return { error: "Campos requeridos faltantes", code: "VALIDATION_ERROR" };
  }

  const qty = Number(quantity);
  const price = Number(unitPrice);
  const payment = Number(initialPayment ?? 0);

  if (qty <= 0 || price <= 0) {
    return { error: "Cantidad y precio deben ser mayores a 0", code: "VALIDATION_ERROR" };
  }

  const total = qty * price;

  if (payment < 0 || payment > total) {
    return { error: "El pago inicial no puede superar el total", code: "VALIDATION_ERROR" };
  }

  return { total, balanceDue: total - payment };
}

describe("nueva venta — validación de campos requeridos", () => {
  const base = {
    customerId: "cust-1",
    productId: "prod-1",
    quantity: 2,
    priceType: "lista",
    unitPrice: 1000,
  };

  it("pasa con datos válidos", () => {
    const result = validateTransaction(base);
    expect(result).not.toHaveProperty("error");
  });

  it("falla si falta customerId", () => {
    const r = validateTransaction({ ...base, customerId: undefined });
    expect(r).toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("falla si falta productId", () => {
    const r = validateTransaction({ ...base, productId: undefined });
    expect(r).toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("falla si falta unitPrice", () => {
    const r = validateTransaction({ ...base, unitPrice: undefined });
    expect(r).toMatchObject({ code: "VALIDATION_ERROR" });
  });
});

describe("nueva venta — cálculos de monto", () => {
  const base = {
    customerId: "cust-1",
    productId: "prod-1",
    priceType: "lista",
  };

  it("calcula total = cantidad × precio", () => {
    const r = validateTransaction({ ...base, quantity: 3, unitPrice: 500 });
    expect(r).toMatchObject({ total: 1500 });
  });

  it("calcula saldo = total - pago inicial", () => {
    const r = validateTransaction({ ...base, quantity: 1, unitPrice: 1000, initialPayment: 300 });
    expect(r).toMatchObject({ total: 1000, balanceDue: 700 });
  });

  it("saldo cero si pago igual al total", () => {
    const r = validateTransaction({ ...base, quantity: 1, unitPrice: 500, initialPayment: 500 });
    expect(r).toMatchObject({ total: 500, balanceDue: 0 });
  });

  it("rechaza cantidad negativa", () => {
    const r = validateTransaction({ ...base, quantity: -1, unitPrice: 100 });
    expect(r).toMatchObject({ error: "Cantidad y precio deben ser mayores a 0" });
  });

  it("rechaza precio cero (falta campo)", () => {
    // unitPrice=0 es falsy: la ruta API lo trata como campo faltante
    const r = validateTransaction({ ...base, quantity: 1, unitPrice: 0 });
    expect(r).toHaveProperty("code", "VALIDATION_ERROR");
  });

  it("rechaza pago mayor al total", () => {
    const r = validateTransaction({ ...base, quantity: 1, unitPrice: 100, initialPayment: 200 });
    expect(r).toMatchObject({ error: "El pago inicial no puede superar el total" });
  });

  it("rechaza pago negativo", () => {
    const r = validateTransaction({ ...base, quantity: 1, unitPrice: 100, initialPayment: -10 });
    expect(r).toMatchObject({ error: "El pago inicial no puede superar el total" });
  });
});

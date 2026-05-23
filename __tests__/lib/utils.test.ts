import { describe, it, expect } from "vitest";
import { fmt, fmtDate } from "@/lib/utils";

describe("fmt", () => {
  it("formats zero", () => {
    const result = fmt(0);
    expect(result).toMatch(/^\$/);
    expect(result).toContain("0");
  });

  it("formats positive integer", () => {
    const result = fmt(1000);
    expect(result).toMatch(/^\$/);
    // Debe contener separador de miles y decimales
    expect(result).toMatch(/1[.,]000[.,]00/);
  });

  it("formats decimal amount", () => {
    const result = fmt(123.5);
    expect(result).toMatch(/^\$/);
    expect(result).toContain("50");
  });

  it("always has two decimal places", () => {
    // El formato es-AR usa coma como separador decimal
    const result = fmt(5);
    expect(result).toMatch(/,\d{2}$|\.00$/);
  });
});

describe("fmtDate", () => {
  it("formats a Date object and includes the year", () => {
    // Usar mediodía para evitar desfase de timezone (ISO midnight es UTC, puede quedar en día anterior)
    const date = new Date("2024-01-15T12:00:00");
    const result = fmtDate(date);
    expect(result).toContain("2024");
    expect(result).toContain("01");
  });

  it("includes day and year from ISO string with time", () => {
    const result = fmtDate("2024-06-30T12:00:00");
    expect(result).toContain("2024");
  });

  it("returns a non-empty string", () => {
    const result = fmtDate(new Date("2024-03-20T12:00:00"));
    expect(result.length).toBeGreaterThan(0);
  });
});

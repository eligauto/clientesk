import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ─── IDs fijos para poder re-ejecutar el seed idempotente ────────────────────

const ORG_ID = "00000000-0000-0000-0000-000000000001";

const PROD = {
  llave:         "1p000000-0000-0000-0000-000000000001",
  destornillador:"1p000000-0000-0000-0000-000000000002",
  taladro:       "1p000000-0000-0000-0000-000000000003",
  sierra:        "1p000000-0000-0000-0000-000000000004",
  nivel:         "1p000000-0000-0000-0000-000000000005",
  cinta:         "1p000000-0000-0000-0000-000000000006",
};

const CUST = {
  central:   "2c000000-0000-0000-0000-000000000001",
  rodriguez: "2c000000-0000-0000-0000-000000000002",
  sur:       "2c000000-0000-0000-0000-000000000003",
  norte:     "2c000000-0000-0000-0000-000000000004",
};

const TXN = {
  c1_llave:  "3t000000-0000-0000-0000-000000000001",
  c1_taladro:"3t000000-0000-0000-0000-000000000002",
  c2_dest:   "3t000000-0000-0000-0000-000000000003",
  c2_sierra: "3t000000-0000-0000-0000-000000000004",
  c3_cinta:  "3t000000-0000-0000-0000-000000000005",
  c3_nivel:  "3t000000-0000-0000-0000-000000000006",
  c4_dest:   "3t000000-0000-0000-0000-000000000007",
};

const PAY = {
  c1_llave_1:  "4p000000-0000-0000-0000-000000000001",
  c1_llave_2:  "4p000000-0000-0000-0000-000000000002",
  c1_taladro_1:"4p000000-0000-0000-0000-000000000003",
  c1_taladro_2:"4p000000-0000-0000-0000-000000000004",
  c2_dest_1:   "4p000000-0000-0000-0000-000000000005",
  c2_sierra_1: "4p000000-0000-0000-0000-000000000006",
  c3_cinta_1:  "4p000000-0000-0000-0000-000000000007",
  c3_nivel_1:  "4p000000-0000-0000-0000-000000000008",
};

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function main() {
  // ── Organización y usuario ────────────────────────────────────────────────
  const org = await prisma.organization.upsert({
    where: { id: ORG_ID },
    update: { name: "Mi Negocio" },
    create: { id: ORG_ID, name: "Mi Negocio" },
  });

  const hash = await bcrypt.hash("clientesk2026", 12);
  await prisma.user.upsert({
    where: { email: "admin@clientesk.dev" },
    update: {},
    create: { tenantId: org.id, email: "admin@clientesk.dev", password: hash },
  });

  // ── Productos ─────────────────────────────────────────────────────────────
  const productosData = [
    { id: PROD.llave,          name: "Llave inglesa 12\"",       unit: "unidad",  priceList: 8500,  priceCredit: 9200,  priceTransfer: 8200,  priceCash: 7800  },
    { id: PROD.destornillador, name: "Destornillador Phillips set 6 pzas", unit: "juego", priceList: 4200,  priceCredit: 4600,  priceTransfer: 4000,  priceCash: 3800  },
    { id: PROD.taladro,        name: "Taladro percutor 500W",    unit: "unidad",  priceList: 45000, priceCredit: 49000, priceTransfer: 43500, priceCash: 41000 },
    { id: PROD.sierra,         name: "Sierra circular 7 1/4\"",  unit: "unidad",  priceList: 72000, priceCredit: 78000, priceTransfer: 69500, priceCash: 66000 },
    { id: PROD.nivel,          name: "Nivel de burbuja 60cm",    unit: "unidad",  priceList: 3800,  priceCredit: 4100,  priceTransfer: 3650,  priceCash: 3500  },
    { id: PROD.cinta,          name: "Cinta métrica 5m",         unit: "unidad",  priceList: 1850,  priceCredit: 2000,  priceTransfer: 1780,  priceCash: 1700  },
  ];

  for (const p of productosData) {
    await prisma.product.upsert({
      where: { id: p.id },
      update: p,
      create: { ...p, tenantId: org.id },
    });
  }

  // ── Clientes ──────────────────────────────────────────────────────────────
  //  balance_due se recalcula al final para que sea consistente con las txns
  const clientesData = [
    { id: CUST.central,   name: "Ferretería Central",       phoneWhatsapp: "+54 9 11 2345-6789", address: "Av. Corrientes 1520, CABA" },
    { id: CUST.rodriguez, name: "Taller Mecánico Rodríguez",phoneWhatsapp: "+54 9 11 3456-7890", address: "Mitre 340, Lanús" },
    { id: CUST.sur,       name: "Herramientas del Sur",     phoneWhatsapp: "+54 9 11 4567-8901", address: "San Martín 89, Quilmes" },
    { id: CUST.norte,     name: "Ferretería Norte",         phoneWhatsapp: "+54 9 11 5678-9012", address: null },
  ];

  for (const c of clientesData) {
    await prisma.customer.upsert({
      where: { id: c.id },
      update: c,
      create: { ...c, tenantId: org.id, balanceDue: 0 },
    });
  }

  // ── Transacciones ─────────────────────────────────────────────────────────
  // Ferretería Central
  //   t1: 5 x Llave inglesa lista ($8500) = $42500 | pagado $20000 | debe $22500
  //   t2: 2 x Taladro crédito ($49000)    = $98000 | pagado $50000 | debe $48000
  // Taller Rodríguez
  //   t3: 3 x Destornillador lista ($4200) = $12600 | pagado $12600 | SALDADA
  //   t4: 1 x Sierra transferencia ($69500)= $69500 | pagado $30000 | debe $39500
  // Herramientas del Sur
  //   t5: 10 x Cinta contado ($1700)      = $17000 | pagado $17000 | SALDADA
  //   t6: 4 x Nivel lista ($3800)         = $15200 | pagado $5000  | debe $10200
  // Ferretería Norte
  //   t7: 8 x Destornillador lista ($4200) = $33600 | pagado $0    | PENDIENTE

  const txnsData = [
    { id: TXN.c1_llave,   customerId: CUST.central,   productId: PROD.llave,          quantity: 5,  priceType: "lista",          unitPrice: 8500,  totalAmount: 42500, amountPaid: 20000, balanceDue: 22500, date: daysAgo(18) },
    { id: TXN.c1_taladro, customerId: CUST.central,   productId: PROD.taladro,        quantity: 2,  priceType: "credito",        unitPrice: 49000, totalAmount: 98000, amountPaid: 50000, balanceDue: 48000, date: daysAgo(10) },
    { id: TXN.c2_dest,    customerId: CUST.rodriguez, productId: PROD.destornillador, quantity: 3,  priceType: "lista",          unitPrice: 4200,  totalAmount: 12600, amountPaid: 12600, balanceDue: 0,     date: daysAgo(25) },
    { id: TXN.c2_sierra,  customerId: CUST.rodriguez, productId: PROD.sierra,         quantity: 1,  priceType: "transferencia",  unitPrice: 69500, totalAmount: 69500, amountPaid: 30000, balanceDue: 39500, date: daysAgo(7)  },
    { id: TXN.c3_cinta,   customerId: CUST.sur,       productId: PROD.cinta,          quantity: 10, priceType: "contado",        unitPrice: 1700,  totalAmount: 17000, amountPaid: 17000, balanceDue: 0,     date: daysAgo(30) },
    { id: TXN.c3_nivel,   customerId: CUST.sur,       productId: PROD.nivel,          quantity: 4,  priceType: "lista",          unitPrice: 3800,  totalAmount: 15200, amountPaid: 5000,  balanceDue: 10200, date: daysAgo(5)  },
    { id: TXN.c4_dest,    customerId: CUST.norte,     productId: PROD.destornillador, quantity: 8,  priceType: "lista",          unitPrice: 4200,  totalAmount: 33600, amountPaid: 0,     balanceDue: 33600, date: daysAgo(2)  },
  ] as const;

  for (const t of txnsData) {
    await prisma.transaction.upsert({
      where: { id: t.id },
      update: { quantity: t.quantity, unitPrice: t.unitPrice, totalAmount: t.totalAmount, amountPaid: t.amountPaid, balanceDue: t.balanceDue, date: t.date },
      create: { ...t, tenantId: org.id },
    });
  }

  // ── Pagos ─────────────────────────────────────────────────────────────────
  const pagosData = [
    { id: PAY.c1_llave_1,   transactionId: TXN.c1_llave,   amount: 10000, method: "efectivo",       paidAt: daysAgo(15) },
    { id: PAY.c1_llave_2,   transactionId: TXN.c1_llave,   amount: 10000, method: "transferencia",   paidAt: daysAgo(8)  },
    { id: PAY.c1_taladro_1, transactionId: TXN.c1_taladro, amount: 30000, method: "efectivo",       paidAt: daysAgo(9)  },
    { id: PAY.c1_taladro_2, transactionId: TXN.c1_taladro, amount: 20000, method: "transferencia",   paidAt: daysAgo(4)  },
    { id: PAY.c2_dest_1,    transactionId: TXN.c2_dest,    amount: 12600, method: "efectivo",       paidAt: daysAgo(24) },
    { id: PAY.c2_sierra_1,  transactionId: TXN.c2_sierra,  amount: 30000, method: "transferencia",   paidAt: daysAgo(6)  },
    { id: PAY.c3_cinta_1,   transactionId: TXN.c3_cinta,   amount: 17000, method: "efectivo",        paidAt: daysAgo(29) },
    { id: PAY.c3_nivel_1,   transactionId: TXN.c3_nivel,   amount: 5000,  method: "efectivo",       paidAt: daysAgo(4)  },
  ] as const;

  for (const p of pagosData) {
    await prisma.payment.upsert({
      where: { id: p.id },
      update: { amount: p.amount, method: p.method as any, paidAt: p.paidAt },
      create: { ...p, tenantId: org.id, method: p.method as any },
    });
  }

  // ── Recalcular balance_due de cada cliente ─────────────────────────────────
  for (const custId of Object.values(CUST)) {
    const { _sum } = await prisma.transaction.aggregate({
      where: { customerId: custId, tenantId: org.id },
      _sum: { balanceDue: true },
    });
    await prisma.customer.update({
      where: { id: custId },
      data: { balanceDue: _sum.balanceDue ?? 0 },
    });
  }

  // ── Reporte ───────────────────────────────────────────────────────────────
  const clientes = await prisma.customer.findMany({
    where: { tenantId: org.id },
    orderBy: { balanceDue: "desc" },
    select: { name: true, balanceDue: true },
  });

  console.log("\n✓ Seed completado\n");
  console.log("Usuario:", "admin@clientesk.dev", "/ clientesk2026");
  console.log("\nClientes y saldos:");
  for (const c of clientes) {
    console.log(`  ${c.name.padEnd(32)} $${Number(c.balanceDue).toLocaleString("es-AR")}`);
  }
  console.log("\nProductos:", productosData.length, "· Transacciones:", txnsData.length, "· Pagos:", pagosData.length);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

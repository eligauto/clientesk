-- v0.2: Libro diario — pagos libres sobre cuenta, status en ventas/compras

-- 1. Nuevo enum para estado de entradas
CREATE TYPE "EntryStatus" AS ENUM ('active', 'cancelled');

-- 2. Crear tabla account_payments (cobros libres sobre cuenta del cliente)
CREATE TABLE "account_payments" (
    "id"          TEXT         NOT NULL,
    "tenant_id"   TEXT         NOT NULL,
    "customer_id" TEXT         NOT NULL,
    "amount"      DECIMAL(12,2) NOT NULL,
    "method"      "PaymentMethod" NOT NULL,
    "date"        DATE         NOT NULL,
    "notes"       TEXT,
    "status"      "EntryStatus" NOT NULL DEFAULT 'active',
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "account_payments_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "account_payments"
    ADD CONSTRAINT "account_payments_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "account_payments"
    ADD CONSTRAINT "account_payments_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customers"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- 3. Crear tabla supplier_payments (pagos libres sobre cuenta del proveedor)
CREATE TABLE "supplier_payments" (
    "id"          TEXT         NOT NULL,
    "tenant_id"   TEXT         NOT NULL,
    "supplier_id" TEXT         NOT NULL,
    "amount"      DECIMAL(12,2) NOT NULL,
    "method"      "PaymentMethod" NOT NULL,
    "date"        DATE         NOT NULL,
    "notes"       TEXT,
    "status"      "EntryStatus" NOT NULL DEFAULT 'active',
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "supplier_payments_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "supplier_payments"
    ADD CONSTRAINT "supplier_payments_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "supplier_payments"
    ADD CONSTRAINT "supplier_payments_supplier_id_fkey"
    FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- 4. Agregar columna status a transactions
ALTER TABLE "transactions"
    ADD COLUMN "status" "EntryStatus" NOT NULL DEFAULT 'active';

-- 5. Agregar columna status a purchases
ALTER TABLE "purchases"
    ADD COLUMN "status" "EntryStatus" NOT NULL DEFAULT 'active';

-- 6. Migrar payments → account_payments
--    Reutilizamos el id para mantener referencias externas coherentes
--    paid_at::date para normalizar la fecha
INSERT INTO "account_payments"
    ("id", "tenant_id", "customer_id", "amount", "method", "date", "notes", "status", "created_at")
SELECT
    p."id",
    p."tenant_id",
    t."customer_id",
    p."amount",
    p."method",
    CAST(p."paid_at" AS DATE),
    p."notes",
    'active'::"EntryStatus",
    p."paid_at"
FROM "payments" p
JOIN "transactions" t ON t."id" = p."transaction_id";

-- 7. Migrar purchase_payments → supplier_payments
INSERT INTO "supplier_payments"
    ("id", "tenant_id", "supplier_id", "amount", "method", "date", "notes", "status", "created_at")
SELECT
    pp."id",
    pp."tenant_id",
    p."supplier_id",
    pp."amount",
    pp."method",
    CAST(pp."paid_at" AS DATE),
    pp."notes",
    'active'::"EntryStatus",
    pp."paid_at"
FROM "purchase_payments" pp
JOIN "purchases" p ON p."id" = pp."purchase_id";

-- 8. Recalcular customer.balance_due con el nuevo modelo
--    balance = sum(ventas activas) - sum(cobros activos)
UPDATE "customers" c
SET "balance_due" = (
    SELECT COALESCE(SUM(t."total_amount"), 0)
    FROM "transactions" t
    WHERE t."customer_id" = c."id"
      AND t."tenant_id"   = c."tenant_id"
      AND t."status"      = 'active'
) - (
    SELECT COALESCE(SUM(ap."amount"), 0)
    FROM "account_payments" ap
    WHERE ap."customer_id" = c."id"
      AND ap."tenant_id"   = c."tenant_id"
      AND ap."status"      = 'active'
);

-- 9. Recalcular supplier.balance_due con el nuevo modelo
UPDATE "suppliers" s
SET "balance_due" = (
    SELECT COALESCE(SUM(p."total_amount"), 0)
    FROM "purchases" p
    WHERE p."supplier_id" = s."id"
      AND p."tenant_id"   = s."tenant_id"
      AND p."status"      = 'active'
) - (
    SELECT COALESCE(SUM(sp."amount"), 0)
    FROM "supplier_payments" sp
    WHERE sp."supplier_id" = s."id"
      AND sp."tenant_id"   = s."tenant_id"
      AND sp."status"      = 'active'
);

-- 10. Eliminar columnas que ya no existen en el nuevo modelo
ALTER TABLE "transactions" DROP COLUMN "amount_paid";
ALTER TABLE "transactions" DROP COLUMN "balance_due";

ALTER TABLE "purchases" DROP COLUMN "amount_paid";
ALTER TABLE "purchases" DROP COLUMN "balance_due";

-- 11. Eliminar tablas obsoletas (datos ya migrados)
DROP TABLE "payments";
DROP TABLE "purchase_payments";

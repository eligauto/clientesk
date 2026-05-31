-- v0.3: Módulo de cuotas — planes de pago con cuotas individuales

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('active', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "InstallmentFrequency" AS ENUM ('semanal', 'quincenal', 'mensual');

-- CreateEnum
CREATE TYPE "InstallmentStatus" AS ENUM ('pending', 'paid', 'cancelled');

-- CreateTable
CREATE TABLE "payment_plans" (
    "id"                TEXT                   NOT NULL,
    "tenant_id"         TEXT                   NOT NULL,
    "customer_id"       TEXT                   NOT NULL,
    "transaction_id"    TEXT,
    "description"       TEXT                   NOT NULL,
    "total_amount"      DECIMAL(12,2)          NOT NULL,
    "installment_count" INTEGER                NOT NULL,
    "frequency"         "InstallmentFrequency" NOT NULL,
    "first_due_date"    DATE                   NOT NULL,
    "status"            "PlanStatus"           NOT NULL DEFAULT 'active',
    "created_at"        TIMESTAMP(3)           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payment_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_plan_installments" (
    "id"                 TEXT                NOT NULL,
    "tenant_id"          TEXT                NOT NULL,
    "plan_id"            TEXT                NOT NULL,
    "customer_id"        TEXT                NOT NULL,
    "installment_number" INTEGER             NOT NULL,
    "due_date"           DATE                NOT NULL,
    "expected_amount"    DECIMAL(12,2)       NOT NULL,
    "status"             "InstallmentStatus" NOT NULL DEFAULT 'pending',
    "created_at"         TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payment_plan_installments_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "payment_plans" ADD CONSTRAINT "payment_plans_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_plans" ADD CONSTRAINT "payment_plans_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_plans" ADD CONSTRAINT "payment_plans_transaction_id_fkey"
    FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_plan_installments" ADD CONSTRAINT "payment_plan_installments_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_plan_installments" ADD CONSTRAINT "payment_plan_installments_plan_id_fkey"
    FOREIGN KEY ("plan_id") REFERENCES "payment_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_plan_installments" ADD CONSTRAINT "payment_plan_installments_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

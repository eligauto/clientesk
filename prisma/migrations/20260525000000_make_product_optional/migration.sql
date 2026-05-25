-- Make productId optional and add productName to transactions
ALTER TABLE "transactions" ALTER COLUMN "product_id" DROP NOT NULL;
ALTER TABLE "transactions" ADD COLUMN "product_name" TEXT;

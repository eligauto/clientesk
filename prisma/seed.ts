import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Mi Negocio",
    },
  });

  const hash = await bcrypt.hash("clientesk2026", 12);

  const user = await prisma.user.upsert({
    where: { email: "admin@clientesk.dev" },
    update: {},
    create: {
      tenantId: org.id,
      email: "admin@clientesk.dev",
      password: hash,
    },
  });

  console.log("Seed OK:", { org: org.name, email: user.email });
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

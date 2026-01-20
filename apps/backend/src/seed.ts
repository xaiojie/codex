import { PrismaClient } from "@prisma/client";
import { createHash } from "crypto";

const prisma = new PrismaClient();

const DEFAULT_ADMIN_EMAIL = "admin@codex.local";
const DEFAULT_ADMIN_NAME = "Admin";

const seedCardCodes = [
  "CRS-START-0001",
  "CRS-START-0002",
  "CRS-START-0003",
  "CRS-START-0004"
];

function hashKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: DEFAULT_ADMIN_EMAIL },
    update: {},
    create: {
      email: DEFAULT_ADMIN_EMAIL,
      name: DEFAULT_ADMIN_NAME
    }
  });

  const existingCodes = await prisma.cardCode.findMany({
    where: { code: { in: seedCardCodes } },
    select: { code: true }
  });
  const existingSet = new Set(existingCodes.map((c) => c.code));
  await prisma.cardCode.createMany({
    data: seedCardCodes
      .filter((code) => !existingSet.has(code))
      .map((code) => ({ code }))
  });

  const sampleKey = "sk-demo-seed-key-should-not-be-used";
  const existingKey = await prisma.apiKey.findFirst({
    where: { name: "Seed Key" }
  });
  if (!existingKey) {
    await prisma.apiKey.create({
      data: {
        userId: admin.id,
        name: "Seed Key",
        prefix: sampleKey.slice(0, 8),
        keyHash: hashKey(sampleKey),
        status: "disabled",
        scopes: { mode: "all" },
        dailyUsdLimit: 5,
        totalUsdLimit: 50
      }
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

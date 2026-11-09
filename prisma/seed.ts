import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  if (process.env.SEED_DEMO_USER !== "true") {
    console.log("Skipping demo user seed. Set SEED_DEMO_USER=true to opt in.");
    return;
  }

  const email = process.env.SEED_DEMO_EMAIL;
  const password = process.env.SEED_DEMO_PASSWORD;
  if (!email || !password || password.length < 12) {
    throw new Error("Set SEED_DEMO_EMAIL and SEED_DEMO_PASSWORD (minimum 12 characters).");
  }

  await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: {},
    create: {
      name: process.env.SEED_DEMO_NAME ?? "Demo Player",
      email: email.toLowerCase(),
      passwordHash: await hash(password, 12),
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

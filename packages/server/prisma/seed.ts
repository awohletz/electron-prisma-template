import { PrismaClient } from "../app/src/generated/client";
import { seed } from "../app/src/seed-util";

const prisma = new PrismaClient({
  log: ["query", "info", "warn", "error"]
});

function main() {
  return seed(prisma);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { prisma } from "./src/lib/prisma";

async function main() {
  await prisma.user.update({
    where: { email: "ersinuzun@hotmail.com" },
    data: { role: "reader" },
  });

  await prisma.user.update({
    where: { email: "ersuzun@gmail.com" },
    data: { role: "admin" },
  });

  const users = await prisma.user.findMany({
    select: {
      email: true,
      role: true,
      status: true,
    },
  });

  console.table(users);
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
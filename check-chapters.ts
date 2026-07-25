import { prisma } from "./src/lib/prisma";

async function main() {
  const chapters = await prisma.chapter.findMany({
    select: {
      id: true,
      title: true,
      content: true,
      position: true,
      status: true,
    },
    orderBy: {
      position: "asc",
    },
  });

  console.dir(chapters, { depth: null });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });

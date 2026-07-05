import { prisma } from "@/server/db/prisma";
prisma.client
  .create({ data: { name: "SMOKE HTTP Archivos" } })
  .then((c) => console.log(c.id))
  .finally(() => prisma.$disconnect());

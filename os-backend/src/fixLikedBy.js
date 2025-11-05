import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function corrigirLikedBy() {
  console.log("Corrigindo campos JSON inválidos...");

  try {
    const result = await prisma.projeto.updateMany({
      where: {
        OR: [
          { comentarios: { equals: null } },
          { comentarios: { equals: [] } },
        ]
      },
      data: {
        comentarios: []
      }
    });

    console.log(`Projetos corrigidos: ${result.count}`);
  } catch (error) {
    console.error("Erro ao corrigir:", error);
  } finally {
    await prisma.$disconnect();
  }
}

corrigirLikedBy();

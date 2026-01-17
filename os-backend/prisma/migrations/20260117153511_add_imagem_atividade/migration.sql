-- AlterTable
ALTER TABLE "Atividade" ADD COLUMN     "imagem" TEXT,
ALTER COLUMN "comentarios" SET DEFAULT '[]';

-- AlterTable
ALTER TABLE "Projeto" ALTER COLUMN "comentarios" SET DEFAULT '[]',
ALTER COLUMN "likedBy" SET DEFAULT '[]';

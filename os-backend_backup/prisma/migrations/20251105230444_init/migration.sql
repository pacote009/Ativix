-- AlterTable
ALTER TABLE "Atividade" ALTER COLUMN "comentarios" SET DEFAULT '[]';

-- AlterTable
ALTER TABLE "Projeto" ALTER COLUMN "comentarios" SET DEFAULT '[]',
ALTER COLUMN "likedBy" SET DEFAULT '[]';

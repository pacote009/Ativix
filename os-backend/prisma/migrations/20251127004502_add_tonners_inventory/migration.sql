-- AlterTable
ALTER TABLE "Atividade" ALTER COLUMN "comentarios" SET DEFAULT '[]';

-- AlterTable
ALTER TABLE "Projeto" ALTER COLUMN "comentarios" SET DEFAULT '[]',
ALTER COLUMN "likedBy" SET DEFAULT '[]';

-- CreateTable
CREATE TABLE "Toner" (
    "id" SERIAL NOT NULL,
    "model" TEXT NOT NULL,
    "sku" TEXT,
    "color" TEXT NOT NULL,
    "capacity" INTEGER,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "minStock" INTEGER NOT NULL DEFAULT 1,
    "supplierId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Toner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Printer" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "model" TEXT,
    "serial" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Printer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TonerMovement" (
    "id" SERIAL NOT NULL,
    "tonerId" INTEGER NOT NULL,
    "printerId" INTEGER,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "note" TEXT,
    "user" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TonerMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Toner_sku_key" ON "Toner"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "Printer_serial_key" ON "Printer"("serial");

-- AddForeignKey
ALTER TABLE "Toner" ADD CONSTRAINT "Toner_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TonerMovement" ADD CONSTRAINT "TonerMovement_tonerId_fkey" FOREIGN KEY ("tonerId") REFERENCES "Toner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TonerMovement" ADD CONSTRAINT "TonerMovement_printerId_fkey" FOREIGN KEY ("printerId") REFERENCES "Printer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

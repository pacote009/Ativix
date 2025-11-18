// src/routes/relatorios.js
import express from "express";
import prisma from "../prismaClient.js";
import { authMiddleware } from "../middlewares/auth.js";

const router = express.Router();

/**
 * Função auxiliar para aplicar filtro por datas
 */
function aplicarFiltroDeDatas(where, dateStart, dateEnd, campo = "createdAt") {
  if (dateStart || dateEnd) {
    const filtro = {};
    if (dateStart) {
      const d = new Date(dateStart);
      if (!isNaN(d)) filtro.gte = d;
    }
    if (dateEnd) {
      const d = new Date(dateEnd);
      if (!isNaN(d)) {
        d.setHours(23, 59, 59, 999);
        filtro.lte = d;
      }
    }
    where[campo] = filtro;
  }
}

/**
 * 1️⃣ Concluídas por usuário
 */
router.get("/concluidas-por-usuario", authMiddleware, async (req, res) => {
  try {
    const { dateStart, dateEnd } = req.query;

    const where = { status: "finalizada" };
    aplicarFiltroDeDatas(where, dateStart, dateEnd, "completedAt");

    const atividades = await prisma.atividade.findMany({
      where
    });

    const porUsuario = {};
    atividades.forEach(a => {
      const user = a.assignedTo || a.concluidoPor || "Não atribuído";
      if (!porUsuario[user]) porUsuario[user] = [];
      porUsuario[user].push(a);
    });

    res.json(porUsuario);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao gerar relatório" });
  }
});

/**
 * 2️⃣ Concluídas por dia
 */
router.get("/concluidas-por-dia", authMiddleware, async (req, res) => {
  try {
    const { dateStart, dateEnd } = req.query;

    const where = { status: "finalizada" };
    aplicarFiltroDeDatas(where, dateStart, dateEnd, "completedAt");

    const atividades = await prisma.atividade.findMany({
      where
    });

    const porDia = {};
    atividades.forEach(a => {
      const user = a.assignedTo || a.concluidoPor || "Não atribuído";
      const dia = new Date(a.completedAt || a.createdAt).toLocaleDateString("pt-BR");

      if (!porDia[user]) porDia[user] = {};
      if (!porDia[user][dia]) porDia[user][dia] = [];

      porDia[user][dia].push(a);
    });

    res.json(porDia);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao gerar relatório" });
  }
});

/**
 * 3️⃣ Concluídas por semana
 */
router.get("/concluidas-por-semana", authMiddleware, async (req, res) => {
  try {
    const { dateStart, dateEnd } = req.query;

    const where = { status: "finalizada" };
    aplicarFiltroDeDatas(where, dateStart, dateEnd, "completedAt");

    const atividades = await prisma.atividade.findMany({
      where
    });

    const porSemana = {};

    atividades.forEach(a => {
      const user = a.assignedTo || a.concluidoPor || "Não atribuído";

      const d = new Date(a.completedAt || a.createdAt);

      // segunda
      const monday = new Date(d);
      monday.setDate(d.getDate() - d.getDay() + 1);

      // domingo
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      const format = dt =>
        dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

      const intervalo = `${format(monday)} - ${format(sunday)}`;

      if (!porSemana[user]) porSemana[user] = {};
      if (!porSemana[user][intervalo]) porSemana[user][intervalo] = [];

      porSemana[user][intervalo].push(a);
    });

    res.json(porSemana);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao gerar relatório" });
  }
});

/**
 * 4️⃣ Fixadas por usuário
 */
/**
 * 4️⃣ Fixadas por usuário (corrigido)
 *
 * Observações:
 * - usa assignedToId para filtrar (campo escalar) — compatível com esquema Prisma comum
 * - inclui assignedTo para poder retornar o username corretamente
 * - aplica filtro por createdAt quando dateStart/dateEnd são passados
 */
router.get("/fixadas-por-usuario", authMiddleware, async (req, res) => {
  try {
    const { dateStart, dateEnd } = req.query;

    // where inicial usando assignedToId (campo escalar) para evitar erro do Prisma
    const where = {
      assignedToId: { not: null }
    };

    // aplicar filtro de datas no createdAt (opcional)
    if (dateStart || dateEnd) {
      const filtro = {};
      if (dateStart) {
        const d = new Date(dateStart);
        if (!isNaN(d)) filtro.gte = d;
      }
      if (dateEnd) {
        const d = new Date(dateEnd);
        if (!isNaN(d)) {
          d.setHours(23, 59, 59, 999);
          filtro.lte = d;
        }
      }
      if (Object.keys(filtro).length > 0) where.createdAt = filtro;
    }

    // buscar incluindo a relação assignedTo para pegar username
    const atividades = await prisma.atividade.findMany({
      where,
      include: { assignedTo: true }
    });

    const fixadas = {};
    atividades.forEach(a => {
      // se include funcionou, pega o username; senão tenta fallback para assignedTo campo bruto
      const user = a.assignedTo?.username || a.assignedTo || "Não atribuído";
      if (!fixadas[user]) fixadas[user] = [];
      fixadas[user].push(a);
    });

    res.json(fixadas);
  } catch (err) {
    console.error("Erro em /relatorios/fixadas-por-usuario:", err);
    res.status(500).json({ error: "Erro ao gerar relatório de fixadas", details: err.message });
  }
});


export default router;

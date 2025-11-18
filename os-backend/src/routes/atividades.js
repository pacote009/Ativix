// src/routes/atividades.js
import express from 'express';
import prisma from '../prismaClient.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = express.Router();

// Listar com filtros, paginação e filtro por intervalo de datas
router.get('/', async (req, res) => {
  try {
    const {
      status,
      order = "desc",
      search = "",
      page = "1",
      limit = "100",
      dateStart,
      dateEnd,
      dateField // opcional: 'createdAt' ou 'completedAt'
    } = req.query;

    console.log('Parâmetros recebidos na rota /atividades:', { status, order, search, page, limit, dateStart, dateEnd, dateField });

    // Monta where
    const where = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      // Postgres aceita mode: "insensitive"
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Decide qual campo de data usar:
    // se o cliente especificou dateField, usa; senão:
    // se status === 'finalizada' => filtra por completedAt, senão createdAt
    const chosenDateField = dateField || (String(status).toLowerCase() === 'finalizada' ? 'completedAt' : 'createdAt');

    if (dateStart || dateEnd) {
      const dateFilter = {};
      if (dateStart) {
        const start = new Date(dateStart);
        if (!isNaN(start)) dateFilter.gte = start;
      }
      if (dateEnd) {
        const end = new Date(dateEnd);
        if (!isNaN(end)) {
          // tornar inclusivo até o final do dia
          end.setHours(23, 59, 59, 999);
          dateFilter.lte = end;
        }
      }
      if (Object.keys(dateFilter).length > 0) {
        where[chosenDateField] = dateFilter;
      }
    }

    // ordenação
    let sortOrder = "desc";
    const orderLower = String(order).toLowerCase();
    if (orderLower === "asc" || orderLower === "mais antigas") sortOrder = "asc";
    else sortOrder = "desc";

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 100);
    const skip = (pageNum - 1) * limitNum;

    // total
    const total = await prisma.atividade.count({ where });

    const list = await prisma.atividade.findMany({
      where,
      include: { assignedTo: true },
      orderBy: [{ [chosenDateField]: sortOrder }],
      skip,
      take: limitNum,
    });

    const mapped = list.map(a => ({
      id: a.id,
      title: a.title,
      description: a.description,
      status: a.status,
      createdAt: a.createdAt,
      completedAt: a.completedAt,
      comentarios: a.comentarios || [],
      assignedTo: a.assignedTo ? a.assignedTo.username : null,
      concluidoPor: a.concluidoPor || null
    }));

    res.json({ data: mapped, total });
  } catch (error) {
    console.error("Erro ao carregar atividades:", error);
    res.status(500).json({ error: "Erro interno no servidor", details: error.message });
  }
});

// Resto das rotas (buscar 1, criar, patch, delete) mantém igual
// (coloque aqui as outras rotas que você já tinha — manterei seus handlers originais)
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const a = await prisma.atividade.findUnique({ where: { id }, include: { assignedTo: true }});
  if (!a) return res.status(404).json({ error: 'Não encontrada' });
  res.json({
    ...a,
    assignedTo: a.assignedTo ? a.assignedTo.username : null
  });
});

// POST /atividades  — com proteção contra duplicatas rápidas
// POST /atividades — versão robusta com logs e fallback
// POST /atividades — handler robusto (substitua o existente)
// POST /atividades — versão rápida usando autor como String (username)
router.post('/', async (req, res) => {
  try {
    const { title, description, status, assignedTo, comentarios, autor } = req.body || {};

    if (!title || !description) {
      return res.status(400).json({ error: "title e description são obrigatórios" });
    }

    // resolve assignedTo -> assignedToId (se enviado)
    let assignedToId = null;
    try {
      if (assignedTo) {
        const u2 = await prisma.user.findUnique({ where: { username: assignedTo }});
        if (u2) assignedToId = u2.id;
      }
    } catch (e) {
      console.error("Erro ao buscar assignedTo (ignorado):", e.message || e);
    }

    // prevenção de duplicatas rápidas (janela)
    const DUP_WINDOW_MS = 5000;
    const recentThreshold = new Date(Date.now() - DUP_WINDOW_MS);

    let duplicateWhere = {
      title,
      description,
      createdAt: { gte: recentThreshold }
    };

    // se cliente enviou autor (string), usa na condição de duplicata
    if (typeof autor !== "undefined" && autor !== null) {
      duplicateWhere = { ...duplicateWhere, autor };
    }

    let maybeDuplicate = null;
    try {
      maybeDuplicate = await prisma.atividade.findFirst({ where: duplicateWhere });
    } catch (dupErr) {
      console.error("Erro ao checar duplicata (ignorado):", dupErr.message || dupErr);
      maybeDuplicate = null;
    }

    if (maybeDuplicate) {
      const existing = await prisma.atividade.findUnique({
        where: { id: maybeDuplicate.id },
        include: { assignedTo: true }
      });
      return res.status(200).json({
        ...existing,
        assignedTo: existing.assignedTo ? existing.assignedTo.username : null,
        autor: existing.autor || null,
        duplicated: true
      });
    }

    // cria atividade usando campo autor (string)
    const created = await prisma.atividade.create({
      data: {
        title,
        description,
        status: status || 'pendente',
        comentarios: comentarios || [],
        autor: typeof autor !== "undefined" ? autor : null,
        ...(assignedToId ? { assignedToId } : {})
      }
    });

    // retorna com usernames (compatível com frontend)
    const full = await prisma.atividade.findUnique({
      where: { id: created.id },
      include: { assignedTo: true }
    });

    return res.status(201).json({
      ...full,
      assignedTo: full.assignedTo ? full.assignedTo.username : null,
      autor: full.autor || null
    });
  } catch (err) {
    console.error("Erro ao criar atividade (POST /atividades) ->", err && err.stack ? err.stack : err);
    return res.status(500).json({ error: "Erro ao criar atividade", details: err && err.message ? err.message : String(err) });
  }
});




router.patch('/:id', authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  const data = { ...req.body };

  if (data.assignedTo) {
    const user = await prisma.user.findUnique({ where: { username: data.assignedTo }});
    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });
    data.assignedToId = user.id;
    delete data.assignedTo;
  }

  if (data.status && String(data.status).toLowerCase() === 'finalizada') {
    data.completedAt = new Date();
    if (!data.concluidoPor) {
      if (req.user && req.user.username) {
        data.concluidoPor = req.user.username;
      } else if (req.user && req.user.id) {
        data.concluidoPor = String(req.user.id);
      }
    }
  }

  try {
    const updated = await prisma.atividade.update({ where: { id }, data });
    const full = await prisma.atividade.findUnique({ where: { id }, include: { assignedTo: true }});
    res.json({ ...full, assignedTo: full.assignedTo ? full.assignedTo.username : null });
  } catch (err) {
    console.error('Erro ao atualizar atividade:', err);
    res.status(500).json({ error: 'Erro ao atualizar atividade', details: err.message });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    // checa permissão
    if (!req.user || String(req.user.role).toUpperCase() !== 'ADMIN') {
      return res.status(403).json({ error: 'Acesso negado: somente administradores podem excluir atividades.' });
    }

    const id = Number(req.params.id);
    // opcional: verificar existência antes de deletar
    const exist = await prisma.atividade.findUnique({ where: { id }});
    if (!exist) return res.status(404).json({ error: 'Atividade não encontrada.' });

    await prisma.atividade.delete({ where: { id }});
    return res.json({ success: true });
  } catch (err) {
    console.error('Erro ao deletar atividade:', err);
    return res.status(500).json({ error: 'Erro ao deletar atividade', details: err.message });
  }
});

export default router;

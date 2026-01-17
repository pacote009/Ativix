// src/routes/atividades.js
import express from 'express';
import prisma from '../prismaClient.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = express.Router();

// --------------------------------------------------------------------------
// GET /atividades (Listagem com filtros)
// --------------------------------------------------------------------------
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
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Decide qual campo de data usar
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
      imagem: a.imagem, // <--- RETORNA A IMAGEM PARA O FRONT
      createdAt: a.createdAt,
      completedAt: a.completedAt,
      comentarios: a.comentarios || [],
      assignedTo: a.assignedTo ? a.assignedTo.username : null,
      concluidoPor: a.concluidoPor || null,
      autor: a.autor
    }));

    res.json({ data: mapped, total });
  } catch (error) {
    console.error("Erro ao carregar atividades:", error);
    res.status(500).json({ error: "Erro interno no servidor", details: error.message });
  }
});

// --------------------------------------------------------------------------
// GET /atividades/:id (Detalhe)
// --------------------------------------------------------------------------
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const a = await prisma.atividade.findUnique({ where: { id }, include: { assignedTo: true }});
  if (!a) return res.status(404).json({ error: 'Não encontrada' });
  res.json({
    ...a,
    assignedTo: a.assignedTo ? a.assignedTo.username : null
  });
});

// --------------------------------------------------------------------------
// POST /atividades (Criação)
// Agora suporta IMAGEM e pega o autor do Token
// --------------------------------------------------------------------------
router.post('/', authMiddleware, async (req, res) => {
  try {
    // 1. Pegamos 'imagem' do body e 'username' do usuário logado (token)
    const { title, description, status, assignedTo, comentarios, imagem } = req.body || {};
    const { username } = req.user; // Veio do authMiddleware

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

    // 2. Prevenção de duplicatas rápidas (janela de 5s)
    const DUP_WINDOW_MS = 5000;
    const recentThreshold = new Date(Date.now() - DUP_WINDOW_MS);

    const duplicateWhere = {
      title,
      description,
      autor: username, // Checa duplicata do mesmo autor
      createdAt: { gte: recentThreshold }
    };

    const maybeDuplicate = await prisma.atividade.findFirst({ where: duplicateWhere });

    if (maybeDuplicate) {
      // Se for duplicata, retorna a existente
      const existing = await prisma.atividade.findUnique({
        where: { id: maybeDuplicate.id },
        include: { assignedTo: true }
      });
      return res.status(200).json({
        ...existing,
        assignedTo: existing.assignedTo ? existing.assignedTo.username : null,
        duplicated: true
      });
    }

    // 3. Cria atividade com a IMAGEM
    const created = await prisma.atividade.create({
      data: {
        title,
        description,
        imagem: imagem || null, // <--- Salva a string Base64 aqui
        status: status || 'pendente',
        comentarios: comentarios || [],
        autor: username, // Autor garantido pelo token
        ...(assignedToId ? { assignedToId } : {})
      }
    });

    // Retorna formatado
    const full = await prisma.atividade.findUnique({
      where: { id: created.id },
      include: { assignedTo: true }
    });

    return res.status(201).json({
      ...full,
      assignedTo: full.assignedTo ? full.assignedTo.username : null
    });

  } catch (err) {
    console.error("Erro ao criar atividade (POST /atividades) ->", err);
    return res.status(500).json({ error: "Erro ao criar atividade", details: err.message });
  }
});

// --------------------------------------------------------------------------
// PATCH /atividades/:id (Atualização)
// --------------------------------------------------------------------------
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

// --------------------------------------------------------------------------
// DELETE /atividades/:id (Exclusão)
// Permite ADMIN ou o PRÓPRIO AUTOR
// --------------------------------------------------------------------------
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { role, username } = req.user;

    // 1. Busca a atividade para verificar quem é o dono
    const atividade = await prisma.atividade.findUnique({ where: { id }});
    if (!atividade) return res.status(404).json({ error: 'Atividade não encontrada.' });

    // 2. Lógica de Permissão
    const isAdmin = String(role).toUpperCase() === 'ADMIN';
    const isAutor = atividade.autor === username;

    // Se não for Admin E não for o Autor, bloqueia
    if (!isAdmin && !isAutor) {
      return res.status(403).json({ error: 'Você não tem permissão para excluir esta atividade.' });
    }

    // 3. Deleta
    await prisma.atividade.delete({ where: { id }});
    return res.json({ success: true, message: "Atividade excluída com sucesso" });

  } catch (err) {
    console.error('Erro ao deletar atividade:', err);
    return res.status(500).json({ error: 'Erro ao deletar atividade', details: err.message });
  }
});

export default router;
import express from 'express';
import prisma from '../prismaClient.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = express.Router();

// Listar com filtros
router.get('/', async (req, res) => {
  try {
    const { status, order = "desc", search = "" } = req.query;

    // ✅ LOG PARA DEBUG: Ver se search chega
    console.log('Parâmetros recebidos na rota /atividades:', { status, order, search });

    const where = {};
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { title: { contains: search } },  // ✅ Temporário: Removido mode: "insensitive" para testar (SQLite pode falhar)
        { description: { contains: search } },
      ];
      // ✅ LOG PARA DEBUG: Ver o where.OR aplicado
      console.log('Filtro OR aplicado para search:', where.OR);
    }

    let sortOrder = "desc";
    const orderLower = order.toString().toLowerCase();

    if (orderLower === "asc" || orderLower === "mais antigas") {
      sortOrder = "asc";
    } else if (orderLower === "desc" || orderLower === "mais recentes") {
      sortOrder = "desc";
    }

    // ✅ Try-catch na query para capturar erro do Prisma
    let list;
    try {
      list = await prisma.atividade.findMany({
        where,
        include: { assignedTo: true },
        orderBy: [{ createdAt: sortOrder }],
      });
    } catch (prismaError) {
      console.error('Erro na query Prisma (provavelmente no where.OR):', prismaError);  // ✅ Log erro exato
      return res.status(500).json({ error: 'Erro na consulta do banco', details: prismaError.message });
    }

    // ✅ LOG PARA DEBUG: Ver quantos itens retornou após filtro
    console.log(`Itens encontrados após filtro (search: "${search}", status: "${status}"):`, list.length);

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

    res.json(mapped);
  } catch (error) {
    console.error("Erro ao carregar atividades:", error);  // ✅ Log geral
    res.status(500).json({ error: "Erro interno no servidor", details: error.message });
  }
});



// Buscar 1
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const a = await prisma.atividade.findUnique({ where: { id }, include: { assignedTo: true }});
  if (!a) return res.status(404).json({ error: 'Não encontrada' });
  res.json({
    ...a,
    assignedTo: a.assignedTo ? a.assignedTo.username : null
  });
});

// Criar (se quiser proteger, adicione authMiddleware)
router.post('/', async (req, res) => {
  const { title, description, status, assignedTo, comentarios } = req.body;
  let assignedToId = null;
  if (assignedTo) {
    const user = await prisma.user.findUnique({ where: { username: assignedTo }});
    if (user) assignedToId = user.id;
  }
  const created = await prisma.atividade.create({
    data: {
      title,
      description,
      status: status || 'pendente',
      comentarios: comentarios || [],
      assignedToId
    }
  });
  const full = await prisma.atividade.findUnique({ where: { id: created.id }, include: { assignedTo: true }});
  res.status(201).json({ ...full, assignedTo: full.assignedTo ? full.assignedTo.username : null });
});

// Atualizar parcialmente (patch)
router.patch('/:id', authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  const data = { ...req.body };

  // Se for trocar assignedTo (frontend envia username), converte para assignedToId
  if (data.assignedTo) {
    const user = await prisma.user.findUnique({ where: { username: data.assignedTo }});
    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });
    data.assignedToId = user.id;
    delete data.assignedTo;
  }

  // Se estiver finalizando, grava completedAt e concluidoPor automaticamente com o usuário autenticado
  if (data.status && String(data.status).toLowerCase() === 'finalizada') {
    data.completedAt = new Date();

    // Se o frontend enviar explicitamente concluidoPor, respeita (mantém compatibilidade),
    // caso contrário, usa o usuário autenticado disponí­vel em req.user
    if (!data.concluidoPor) {
      if (req.user && req.user.username) {
        data.concluidoPor = req.user.username;
      } else if (req.user && req.user.id) {
        // fallback: se você preferir salvar id, ajuste conforme seu schema
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


// Deletar
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  await prisma.atividade.delete({ where: { id }});
  res.json({ success: true });
});

export default router;

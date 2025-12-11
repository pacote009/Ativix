// src/routes/toners.js
import express from 'express';
import prisma from '../prismaClient.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = express.Router();

// Listar toners (filtros simples: color, model, lowStock)
router.get('/', async (req, res) => {
  try {
    const { color, model, lowStock } = req.query;

    // Filtra por color/model no banco (insensitive para model)
    const where = {};
    if (color) where.color = color;
    if (model) where.model = { contains: model, mode: 'insensitive' };

    const toners = await prisma.toner.findMany({
      where,
      include: { supplier: true },
      orderBy: { model: 'asc' }
    });

    let result = toners;
    if (String(lowStock).toLowerCase() === 'true') {
      // Filtra em JS: stock < minStock
      result = toners.filter(t => (t.stock ?? 0) < (t.minStock ?? 0));
    }

    res.json(result);
  } catch (err) {
    console.error('Erro listar toners:', err);
    res.status(500).json({ error: 'Erro ao listar toners', details: err.message });
  }
});

// Criar toner (apenas admin)
router.post('/', authMiddleware, async (req, res) => {
  if (String(req.user.role).toUpperCase() !== 'ADMIN') {
    return res.status(403).json({ error: 'Somente admin' });
  }

  const body = (req.body && typeof req.body === 'object') ? req.body : {};
  const {
    model, sku, color, capacity,
    initialStock = 0,
    minStock = 1,
    location = null,
    supplierId = null
  } = body;

  if (!model || !color) {
    return res.status(400).json({ error: 'model e color são obrigatórios' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.toner.create({
        data: {
          model,
          sku: sku || null,
          color,
          capacity: capacity ?? null,
          stock: Number(initialStock) || 0,
          minStock: Number(minStock) || 1,
          location: location || null,
          supplierId: supplierId ? Number(supplierId) : null
        }
      });

      if (Number(initialStock) && Number(initialStock) > 0) {
        await tx.tonerMovement.create({
          data: {
            tonerId: created.id,
            type: 'entrada',
            quantity: Number(initialStock),
            note: 'Entrada inicial',
            user: req.user?.username || 'system',
            origin: null,
            destination: 'ESTOQUE'
          }
        });
      }

      return created;
    });

    return res.status(201).json(result);
  } catch (err) {
    console.error('Erro ao criar toner (POST /toners):', err);
    if (err && err.code === 'P2002') {
      const target = err.meta?.target || [];
      const field = Array.isArray(target) ? target.join(',') : String(target);
      return res.status(400).json({ error: `Campo duplicado: ${field}` });
    }
    return res.status(500).json({ error: 'Erro ao criar toner', details: err?.message || String(err) });
  }
});

// Atualizar toner (apenas admin)
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    if (String(req.user.role).toUpperCase() !== 'ADMIN') {
      return res.status(403).json({ error: 'Somente administradores podem editar toners.' });
    }

    const id = Number(req.params.id);
    const payload = { ...req.body };

    if (payload.stock !== undefined) payload.stock = Number(payload.stock);
    if (payload.minStock !== undefined) payload.minStock = Number(payload.minStock);

    const updated = await prisma.toner.update({ where: { id }, data: payload });
    res.json(updated);
  } catch (err) {
    console.error('Erro atualizar toner:', err);
    res.status(500).json({ error: 'Erro ao atualizar toner', details: err.message });
  }
});

// Deletar toner (apenas admin)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (String(req.user.role).toUpperCase() !== 'ADMIN') {
      return res.status(403).json({ error: 'Somente administradores podem excluir toners.' });
    }

    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido.' });

    await prisma.$transaction(async (tx) => {
      const exist = await tx.toner.findUnique({ where: { id } });
      if (!exist) {
        const e = new Error('Toner não encontrado');
        e.code = 'NOT_FOUND';
        throw e;
      }

      await tx.tonerMovement.deleteMany({ where: { tonerId: id } });
      await tx.toner.delete({ where: { id } });
    });

    return res.json({ success: true });
  } catch (err) {
    console.error('Erro deletar toner:', err);
    if (err && err.code === 'NOT_FOUND') return res.status(404).json({ error: 'Toner não encontrado.' });
    const details = err?.message || String(err);
    return res.status(500).json({ error: 'Erro ao deletar toner', details });
  }
});


// Movimentações (entrada, instalação, troca, consumo, ajuste)
router.post('/:id/movements', authMiddleware, async (req, res) => {
  try {
    const tonerId = Number(req.params.id);
    const { type, quantity = 0, printerId = null, note = '', origin = null, destination = null } = req.body;
    const user = req.user?.username || 'system';

    if (!type) return res.status(400).json({ error: 'type é obrigatório' });

    const qty = Math.abs(Number(quantity) || 0);
    if (qty <= 0 && type !== 'ajuste') {
      return res.status(400).json({ error: 'quantity deve ser maior que zero' });
    }

    // Usar transação: buscar toner atual, validar e aplicar mudança
    const result = await prisma.$transaction(async (tx) => {
      const toner = await tx.toner.findUnique({ where: { id: tonerId } });
      if (!toner) throw new Error('Toner não encontrado');

      // regras de validação:
      if ((type === 'consumo' || type === 'instalacao') && !destination) {
        // exigir destino ao consumir (para saber para onde foi)
        const e = new Error('destination é obrigatório para consumo/instalacao (local de destino).');
        e.status = 400;
        throw e;
      }

      if (type === 'consumo' || type === 'instalacao' || type === 'troca') {
        // validar estoque suficiente antes de decrementar
        const currentStock = Number(toner.stock ?? 0);
        if (qty > currentStock) {
          const e = new Error('Estoque insuficiente para a operação');
          e.status = 400;
          throw e;
        }
      }

      // agora crio o movimento (após validações)
      const mv = await tx.tonerMovement.create({
        data: {
          tonerId,
          printerId: printerId ? Number(printerId) : null,
          type,
          quantity: (type === 'ajuste') ? qty : qty,
          note,
          user,
          origin: origin || null,
          destination: destination || null
        }
      });

      // ajusta estoque dependendo do tipo
      if (type === 'entrada') {
        if (qty !== 0) {
          await tx.toner.update({ where: { id: tonerId }, data: { stock: { increment: qty } }});
        }
      } else if (type === 'consumo' || type === 'troca' || type === 'instalacao') {
        if (qty !== 0) {
          await tx.toner.update({ where: { id: tonerId }, data: { stock: { decrement: qty } }});
        }
      } else if (type === 'ajuste') {
        // ajuste absoluto: quantity representa estoque final
        const current = await tx.toner.findUnique({ where: { id: tonerId }});
        const final = qty;
        const adjust = final - (current?.stock ?? 0);
        if (adjust !== 0) {
          await tx.toner.update({ where: { id: tonerId }, data: { stock: { increment: adjust } }});
        }
      }

      return mv;
    });

    res.status(201).json(result);
  } catch (err) {
    console.error('Erro adicionar movimento:', err);
    const msg = err?.message || err;
    // responder 400 quando for erro de validação
    if (err && (err.status === 400 || /destination é obrigatório|Estoque insuficiente|quantity deve ser maior que zero/i.test(msg))) {
      return res.status(400).json({ error: msg.toString() });
    }
    res.status(500).json({ error: 'Erro ao adicionar movimento', details: msg.toString() });
  }
});

// Histórico de movimentos
router.get('/:id/movements', async (req, res) => {
  try {
    const tonerId = Number(req.params.id);
    const moves = await prisma.tonerMovement.findMany({
      where: { tonerId },
      orderBy: { createdAt: 'desc' },
      include: { printer: true }
    });
    res.json(moves);
  } catch (err) {
    console.error('Erro listar movimentos:', err);
    res.status(500).json({ error: 'Erro ao listar movimentos', details: err.message });
  }
});

// ---------------------------------------------------------
// RELATÓRIO DE USO DE TONERS
// GET /toners/report/usage?dateStart=YYYY-MM-DD&dateEnd=YYYY-MM-DD
router.get("/report/usage", authMiddleware, async (req, res) => {
  try {
    const { dateStart, dateEnd } = req.query;

    const where = {};
    if (dateStart || dateEnd) {
      where.createdAt = {};
      if (dateStart) where.createdAt.gte = new Date(dateStart);
      if (dateEnd) {
        const e = new Date(dateEnd);
        e.setHours(23, 59, 59, 999);
        where.createdAt.lte = e;
      }
    }

    const toners = await prisma.toner.findMany({
      orderBy: { model: "asc" }
    });

    const movements = await prisma.tonerMovement.findMany({
      where,
      include: { toner: true, printer: true },
      orderBy: { createdAt: "asc" }
    });

    const movementsByToner = {};
    movements.forEach(m => {
      if (!movementsByToner[m.tonerId]) movementsByToner[m.tonerId] = [];
      movementsByToner[m.tonerId].push({
        id: m.id,
        tonerId: m.tonerId,
        printerId: m.printerId,
        printerName: m.printer?.name || null,
        type: m.type,
        quantity: m.quantity,
        note: m.note || null,
        user: m.user || null,
        origin: m.origin || null,
        destination: m.destination || null,
        createdAt: m.createdAt
      });
    });

    const destinationMap = {};
    movements.forEach(m => {
      const dest = m.destination || '—';
      destinationMap[dest] = (destinationMap[dest] || 0) + (m.quantity || 0);
    });
    const topDestinations = Object.entries(destinationMap)
      .map(([destination, quantity]) => ({ destination, quantity }))
      .sort((a,b) => b.quantity - a.quantity)
      .slice(0, 20);

    const entriesPerWeek = {};
    const getISOWeekKey = (d) => {
      const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      const dayNum = date.getUTCDay() || 7;
      date.setUTCDate(date.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1));
      const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1)/7);
      return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2,'0')}`;
    };
    movements.forEach(m => {
      if (m.type === 'entrada') {
        const key = getISOWeekKey(new Date(m.createdAt));
        entriesPerWeek[key] = (entriesPerWeek[key] || 0) + (m.quantity || 0);
      }
    });

    const perTonerStats = {};
    const grouped = {};
    movements.forEach(m => {
      if (!grouped[m.tonerId]) grouped[m.tonerId] = [];
      grouped[m.tonerId].push(m);
    });

    Object.entries(grouped).forEach(([tonerId, mvArr]) => {
      let entries = 0;
      let consumption = 0;
      let timeSamples = [];
      let lastEntryTimes = [];

      mvArr.forEach(m => {
        if (m.type === 'entrada') {
          entries += Math.abs(m.quantity || 0);
          lastEntryTimes.push(new Date(m.createdAt));
        } else if (m.type === 'consumo' || m.type === 'instalacao' || m.type === 'troca') {
          consumption += Math.abs(m.quantity || 0);
          if (lastEntryTimes.length > 0) {
            const entryTime = lastEntryTimes.shift();
            if (entryTime) {
              const days = (new Date(m.createdAt) - entryTime) / (1000*60*60*24);
              if (!Number.isNaN(days) && days >= 0) timeSamples.push(days);
            }
          }
        }
      });

      const avgTimeDays = timeSamples.length ? Math.round((timeSamples.reduce((a,b) => a+b,0)/timeSamples.length) * 10) / 10 : null;
      perTonerStats[tonerId] = { entries, consumption, avgTimeDays, samples: timeSamples.length };
    });

    const currentStockByToner = {};
    toners.forEach(t => {
      currentStockByToner[t.id] = { id: t.id, model: t.model, sku: t.sku, stock: t.stock };
    });

    return res.json({
      topDestinations,
      entriesPerWeek,
      currentStockByToner,
      perTonerStats,
      movementsByToner
    });
  } catch (err) {
    console.error("Erro gerar relatório de toners:", err);
    res.status(500).json({ error: 'Erro ao gerar relatório de toners', details: err.message || String(err) });
  }
});

export default router;

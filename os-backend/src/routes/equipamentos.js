import express from 'express';
import prisma from '../prismaClient.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = express.Router();

const TI_SETOR = 'Setor de TI';

const isAdmin = (req) => String(req.user?.role || '').toUpperCase() === 'ADMIN';

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, room, search } = req.query;
    const where = {};

    if (status) where.status = status;
    if (room) where.room = { contains: room, mode: 'insensitive' };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { assetTag: { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } },
        { allocatedTo: { contains: search, mode: 'insensitive' } }
      ];
    }

    const equipamentos = await prisma.equipment.findMany({
      where,
      include: { movements: { orderBy: { movedAt: 'desc' } } },
      orderBy: { createdAt: 'desc' }
    });

    res.json(equipamentos);
  } catch (error) {
    console.error('Erro ao listar equipamentos:', error);
    res.status(500).json({ error: 'Erro ao listar equipamentos', details: error.message });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      name,
      category,
      assetTag,
      serialNumber,
      purchaseDate,
      arrivalDate,
      room,
      status,
      notes
    } = req.body;

    if (!name) return res.status(400).json({ error: 'name é obrigatório' });

    const created = await prisma.$transaction(async (tx) => {
      const equipamento = await tx.equipment.create({
        data: {
          name,
          category: category || null,
          assetTag: assetTag || null,
          serialNumber: serialNumber || null,
          purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
          arrivalDate: arrivalDate ? new Date(arrivalDate) : new Date(),
          allocatedTo: TI_SETOR,
          room: room || null,
          status: status || 'em_estoque',
          notes: notes || null,
          createdBy: req.user?.username || 'sistema'
        }
      });

      await tx.equipmentMovement.create({
        data: {
          equipmentId: equipamento.id,
          type: 'CHEGADA',
          toLocation: TI_SETOR,
          room: room || null,
          note: notes || 'Registro de chegada do equipamento',
          createdBy: req.user?.username || 'sistema'
        }
      });

      return equipamento;
    });

    res.status(201).json(created);
  } catch (error) {
    console.error('Erro ao criar equipamento:', error);
    if (error?.code === 'P2002') {
      return res.status(400).json({ error: 'Patrimônio ou serial já cadastrados.' });
    }
    res.status(500).json({ error: 'Erro ao criar equipamento', details: error.message });
  }
});

// Alterar equipamento (somente admin)
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'Somente administradores podem alterar equipamentos.' });
    }

    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const payload = { ...req.body };

    if (payload.purchaseDate !== undefined) {
      payload.purchaseDate = payload.purchaseDate ? new Date(payload.purchaseDate) : null;
    }

    const updated = await prisma.equipment.update({
      where: { id },
      data: payload,
    });

    res.json(updated);
  } catch (error) {
    console.error('Erro ao alterar equipamento:', error);
    if (error?.code === 'P2025') return res.status(404).json({ error: 'Equipamento não encontrado.' });
    if (error?.code === 'P2002') return res.status(400).json({ error: 'Patrimônio ou serial já cadastrados.' });
    res.status(500).json({ error: 'Erro ao alterar equipamento', details: error.message });
  }
});

// Excluir equipamento (somente admin)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'Somente administradores podem excluir equipamentos.' });
    }

    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    await prisma.equipment.delete({ where: { id } });

    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir equipamento:', error);
    if (error?.code === 'P2025') return res.status(404).json({ error: 'Equipamento não encontrado.' });
    res.status(500).json({ error: 'Erro ao excluir equipamento', details: error.message });
  }
});

router.patch('/:id/realocar', authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { allocatedTo, room, note, status } = req.body;

    if (!id) return res.status(400).json({ error: 'ID inválido' });
    if (!allocatedTo && !room) return res.status(400).json({ error: 'Informe allocatedTo e/ou room' });

    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.equipment.findUnique({ where: { id } });
      if (!current) {
        const e = new Error('Equipamento não encontrado');
        e.status = 404;
        throw e;
      }

      const updated = await tx.equipment.update({
        where: { id },
        data: {
          allocatedTo: allocatedTo || current.allocatedTo,
          room: room || current.room,
          status: status || 'realocado'
        }
      });

      await tx.equipmentMovement.create({
        data: {
          equipmentId: id,
          type: 'REALOCACAO',
          fromLocation: current.allocatedTo || 'Estoque',
          toLocation: allocatedTo || current.allocatedTo || 'Estoque',
          room: room || current.room,
          note: note || 'Realocação registrada',
          createdBy: req.user?.username || 'sistema'
        }
      });

      return updated;
    });

    res.json(result);
  } catch (error) {
    console.error('Erro ao realocar equipamento:', error);
    if (error.status === 404) return res.status(404).json({ error: error.message });
    res.status(500).json({ error: 'Erro ao realocar equipamento', details: error.message });
  }
});

router.get('/relatorio', authMiddleware, async (req, res) => {
  try {
    const { dateStart, dateEnd, status } = req.query;

    const where = {};
    if (status) where.status = status;

    if (dateStart || dateEnd) {
      where.arrivalDate = {};
      if (dateStart) where.arrivalDate.gte = new Date(dateStart);
      if (dateEnd) {
        const end = new Date(dateEnd);
        end.setHours(23, 59, 59, 999);
        where.arrivalDate.lte = end;
      }
    }

    const equipamentos = await prisma.equipment.findMany({
      where,
      include: { movements: { orderBy: { movedAt: 'desc' } } },
      orderBy: { arrivalDate: 'desc' }
    });

    const resumoStatus = equipamentos.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});

    res.json({
      total: equipamentos.length,
      resumoStatus,
      equipamentos
    });
  } catch (error) {
    console.error('Erro ao gerar relatório de equipamentos:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório', details: error.message });
  }
});

export default router;
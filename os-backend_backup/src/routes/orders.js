import express from 'express';
import prisma from '../prismaClient.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = express.Router();

// Somente usuários autenticados acessam orders
router.get('/', authMiddleware, async (req, res) => {
  const orders = await prisma.order.findMany({ include: { createdBy: true }});
  const mapped = orders.map(o => ({ ...o, createdBy: o.createdBy ? o.createdBy.username : null }));
  res.json(mapped);
});

router.post('/', authMiddleware, async (req, res) => {
  const { title, description } = req.body;
  const created = await prisma.order.create({
    data: { title, description, createdById: req.user.id }
  });
  res.status(201).json(created);
});

router.put('/:id', authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  const updated = await prisma.order.update({ where: { id }, data: req.body });
  res.json(updated);
});

router.delete('/:id', authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  await prisma.order.delete({ where: { id }});
  res.json({ success: true });
});

export default router;

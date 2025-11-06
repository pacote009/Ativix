import express from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../prismaClient.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = express.Router();

// lista de usuários (para dashboard) -> público (remove senha)
router.get('/', async (req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, username: true, email: true, role: true }
  });
  res.json(users);
});

// criar usuário (pode ser usado pelo admin ou por formulário de cadastro)
router.post('/', async (req, res) => {
  try {
    const { name, username, password, email, role } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'username e password obrigatórios' });
    const exists = await prisma.user.findUnique({ where: { username } });
    if (exists) return res.status(400).json({ error: 'username já existe' });
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, username, email, password: hashed, role: role || 'USER' }
    });
    const { password: _, ...userSafe } = user;
    res.status(201).json(userSafe);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// (opcional) deletar usuário — proteger com auth se quiser
router.delete('/:id', authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  // só admin pode deletar
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Somente admin' });
  await prisma.user.delete({ where: { id }});
  res.json({ success: true });
});

export default router;

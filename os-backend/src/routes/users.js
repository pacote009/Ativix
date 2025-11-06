// src/routes/users.js
import express from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../prismaClient.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = express.Router();

// lista de usuários (público, sem senha)
router.get('/', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, username: true, email: true, role: true }
    });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
});

/**
 * Signup público -> sempre cria USER
 * Rota para formulários públicos (não aceita role do body)
 */
router.post('/signup', async (req, res) => {
  try {
    const { name, username, password, email } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'username e password obrigatórios' });

    const exists = await prisma.user.findUnique({ where: { username } });
    if (exists) return res.status(400).json({ error: 'username já existe' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, username, email, password: hashed, role: 'USER' }
    });

    const { password: _, ...userSafe } = user;
    res.status(201).json(userSafe);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

/**
 * Criação de usuário pelo painel (admin)
 * - Rota protegida: é preciso enviar Authorization: Bearer <token>
 * - Se body.role === 'ADMIN', apenas admins podem criar outro ADMIN
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, username, password, email, role } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'username e password obrigatórios' });

    // Se pediu criar ADMIN, só quem é ADMIN pode
    if (role === 'ADMIN' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Somente administradores podem criar outros administradores.' });
    }

    // Evita strings inválidas para role — força USER por padrão
    const finalRole = role === 'ADMIN' ? 'ADMIN' : 'USER';

    const exists = await prisma.user.findUnique({ where: { username } });
    if (exists) return res.status(400).json({ error: 'username já existe' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, username, email, password: hashed, role: finalRole }
    });

    const { password: _, ...userSafe } = user;
    res.status(201).json(userSafe);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

// deletar usuário — protegido (somente admin)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Somente admin' });
    await prisma.user.delete({ where: { id }});
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao deletar usuário' });
  }
});

export default router;

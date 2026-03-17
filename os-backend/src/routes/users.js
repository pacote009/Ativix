// src/routes/users.js
import express from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../prismaClient.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = express.Router();

function isStrongPassword(password = '') {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(String(password));
}

// lista de usuários (público, sem senha)
router.get('/', authMiddleware, async (req, res) => {
  try {
    if (String(req.user?.role || '').toUpperCase() !== 'ADMIN') {
      return res.status(403).json({ error: 'Somente administradores podem listar usuários.' });
    }

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
    if (!isStrongPassword(password)) {
      return res.status(400).json({
        error: 'Senha fraca. Use no mínimo 8 caracteres com maiúscula, minúscula, número e símbolo.'
      });
    }

    const exists = await prisma.user.findUnique({ where: { username } });
    if (exists) return res.status(400).json({ error: 'Não foi possível criar usuário com os dados informados.' });

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
    if (String(req.user?.role || '').toUpperCase() !== 'ADMIN') {
      return res.status(403).json({ error: 'Somente administradores podem criar usuários.' });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({
        error: 'Senha fraca. Use no mínimo 8 caracteres com maiúscula, minúscula, número e símbolo.'
      });
    }

    // Se pediu criar ADMIN, só quem é ADMIN pode
    if (role === 'ADMIN' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Somente administradores podem criar outros administradores.' });
    }

    // Evita strings inválidas para role — força USER por padrão
    const finalRole = role === 'ADMIN' ? 'ADMIN' : 'USER';

    const exists = await prisma.user.findUnique({ where: { username } });
    if (exists) return res.status(400).json({ error: 'Não foi possível criar usuário com os dados informados.' });

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

// reset de senha — protegido (somente admin)
router.patch('/:id/reset-password', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Somente administradores podem resetar senhas.' });
    }

    const id = Number(req.params.id);
    const { newPassword } = req.body;

    if (!id) return res.status(400).json({ error: 'ID inválido.' });
    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({
        error: 'Senha fraca. Use no mínimo 8 caracteres com maiúscula, minúscula, número e símbolo.'
      });
    }

    const hashed = await bcrypt.hash(String(newPassword), 10);

    await prisma.user.update({
      where: { id },
      data: { password: hashed }
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    if (err?.code === 'P2025') return res.status(404).json({ error: 'Usuário não encontrado.' });
    res.status(500).json({ error: 'Erro ao resetar senha' });
  }
});

// deletar usuário — protegido (somente admin)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido.' });
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Somente administradores podem excluir usuários.' });

    const currentUserId = Number(req.user?.id);
    if (currentUserId && currentUserId === id) {
      return res.status(400).json({ error: 'Você não pode excluir seu próprio usuário.' });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true }
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    if (targetUser.role === 'ADMIN') {
      const adminsCount = await prisma.user.count({ where: { role: 'ADMIN' } });
      if (adminsCount <= 1) {
        return res.status(400).json({ error: 'Não é possível excluir o último administrador do sistema.' });
      }
    }

    await prisma.user.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    if (err?.code === 'P2025') return res.status(404).json({ error: 'Usuário não encontrado.' });
    res.status(500).json({ error: 'Erro ao deletar usuário' });
  }
});

export default router;

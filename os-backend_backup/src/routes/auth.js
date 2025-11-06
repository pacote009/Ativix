import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../prismaClient.js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

// register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, username } = req.body;
    if (!name || !password) return res.status(400).json({ error: 'Faltam campos' });

    const uname = username || (email ? email.split('@')[0] : (name.split(' ')[0] + Date.now()));
    const exists = await prisma.user.findUnique({ where: { username: uname } });
    if (exists) return res.status(400).json({ error: 'Username já existe' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, username: uname, password: hashed, role: 'USER' },
    });

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.TOKEN_EXPIRY || '7d' });

    const { password: _, ...userSafe } = user;
    res.json({ token, user: userSafe });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// login (aceita identifier = email ou username)
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) return res.status(400).json({ error: 'Faltam campos' });

    // procura por email ou username
    const user = await prisma.user.findFirst({
      where: { OR: [{ email: identifier }, { username: identifier }] }
    });

    if (!user) return res.status(400).json({ error: 'Usuário não encontrado' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ error: 'Senha inválida' });

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.TOKEN_EXPIRY || '7d' });

    const { password: _, ...userSafe } = user;
    res.json({ token, user: userSafe });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

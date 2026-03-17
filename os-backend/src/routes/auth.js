import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../prismaClient.js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

const loginAttempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

function authRateLimit(req, res, next) {
  const key = `${req.ip}:${req.path}`;
  const now = Date.now();
  const item = loginAttempts.get(key) || { count: 0, resetAt: now + WINDOW_MS };

  if (now > item.resetAt) {
    item.count = 0;
    item.resetAt = now + WINDOW_MS;
  }

  item.count += 1;
  loginAttempts.set(key, item);

  if (item.count > MAX_ATTEMPTS) {
    const retryAfterSec = Math.ceil((item.resetAt - now) / 1000);
    res.setHeader('Retry-After', String(retryAfterSec));
    return res.status(429).json({ error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' });
  }

  return next();
}

function isStrongPassword(password = '') {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(String(password));
}

// register
router.post('/register', authRateLimit, async (req, res) => {
  try {
    const { name, email, password, username } = req.body;
    if (!name || !password) return res.status(400).json({ error: 'Faltam campos obrigatórios' });
    if (!isStrongPassword(password)) {
      return res.status(400).json({
        error: 'Senha fraca. Use no mínimo 8 caracteres com maiúscula, minúscula, número e símbolo.'
      });
    }

    const uname = username || (email ? email.split('@')[0] : (name.split(' ')[0] + Date.now()));
    const exists = await prisma.user.findUnique({ where: { username: uname } });
    if (exists) return res.status(400).json({ error: 'Credenciais inválidas para cadastro' });

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
router.post('/login', authRateLimit, async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) return res.status(400).json({ error: 'Faltam campos' });

    // procura por email ou username
    const user = await prisma.user.findFirst({
      where: { OR: [{ email: identifier }, { username: identifier }] }
    });

    if (!user) return res.status(400).json({ error: 'Credenciais inválidas' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ error: 'Credenciais inválidas' });

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.TOKEN_EXPIRY || '7d' });

    const { password: _, ...userSafe } = user;
    res.json({ token, user: userSafe });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import atividadesRoutes from './routes/atividades.js';
import projetosRoutes from './routes/projetos.js';
import ordersRoutes from './routes/orders.js';
import dashboardRoutes from './routes/dashboard.js';
import relatoriosRoutes from './routes/relatorios.js';
import tonersRoutes from './routes/toners.js';
import equipamentosRoutes from './routes/equipamentos.js';

const app = express();

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET não configurado. Defina JWT_SECRET antes de iniciar o backend.');
}

const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    // Permite requests server-to-server (sem Origin) e ambientes locais controlados
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origem não permitida por CORS'));
  },
  credentials: true,
}));

app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// --- ALTERAÇÃO AQUI ---
// Aumentamos o limite para 50mb para aceitar imagens em Base64
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
// ----------------------

// rotas
app.use('/auth', authRoutes);
app.use('/users', usersRoutes);
app.use('/atividades', atividadesRoutes);
app.use('/projetos', projetosRoutes);
app.use('/orders', ordersRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/relatorios', relatoriosRoutes);
app.use('/toners', tonersRoutes);
app.use('/equipamentos', equipamentosRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend rodando na porta ${PORT}`));

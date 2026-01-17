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

const app = express();

app.use(cors());

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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend rodando na porta ${PORT}`));
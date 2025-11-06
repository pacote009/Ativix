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





const app = express();
app.use(cors());
app.use(express.json());

// rotas
app.use('/auth', authRoutes);
app.use('/users', usersRoutes);
app.use('/atividades', atividadesRoutes);
app.use('/projetos', projetosRoutes);
app.use('/orders', ordersRoutes);
app.use('/dashboard', dashboardRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend rodando na porta ${PORT}`));

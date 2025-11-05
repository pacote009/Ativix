import express from 'express';
import prisma from '../prismaClient.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = express.Router();

// Dashboard protegido - retorna contagens processadas + listas opcionais
router.get('/', authMiddleware, async (req, res) => {
  console.log("REQ.USER no dashboard:", req.user);
  try {
    const { role, id, username } = req.user; // id e username do user logado (de authMiddleware)

    // Filtros baseados em role
    const whereAtividades = role === 'ADMIN' ? {} : {};
    const whereProjetos = role === 'ADMIN' ? {} : {};


    // Busca paralela (eficiente)
    const [atividades, projetos, users] = await Promise.all([
      prisma.atividade.findMany({
        where: whereAtividades,
        include: { assignedTo: true }
      }),
      prisma.projeto.findMany({
        where: whereProjetos,
        include: { autor: true }
      }),
      role === 'ADMIN' ? prisma.user.findMany({
        select: { id: true, username: true, role: true }
      }) : []
    ]);

    // Contagens de atividades (case-insensitive para status)
    const concluidas = atividades.filter(a =>
      ["finalizada", "concluida", "concluído", "concluída"].includes(
        String(a.status).toLowerCase().trim()
      )
    ).length;
    const pendentes = atividades.filter(a =>
      String(a.status).toLowerCase().trim() === "pendente"
    ).length;

    // Projetos totais
    const totalProjetos = projetos.length;

    // Por usuário (só para admin, mas agora também para usuários comuns)
    const projetosPorUsuario = {};
    const atividadesPorUsuario = {};

    if (role === 'ADMIN') {
      projetos.forEach(p => {
        const autor = p.autor?.username || "Desconhecido";
        projetosPorUsuario[autor] = (projetosPorUsuario[autor] || 0) + 1;
      });
      atividades.forEach(a => {
        const user = a.assignedTo?.username || "Não atribuído";
        atividadesPorUsuario[user] = (atividadesPorUsuario[user] || 0) + 1;
      });
      // Preenche zeros para todos users
      users.forEach(u => {
        if (!projetosPorUsuario[u.username]) projetosPorUsuario[u.username] = 0;
        if (!atividadesPorUsuario[u.username]) atividadesPorUsuario[u.username] = 0;
      });
    } else {
      // Usuário comum: preencher com seus próprios dados
      projetosPorUsuario[username] = projetos.length;
      atividadesPorUsuario[username] = atividades.length;
    }

    // Mapeamento das listas (sem campos sensíveis)
    const mappedAtividades = atividades.map(a => ({
      id: a.id,
      title: a.title,
      description: a.description,
      status: a.status,
      createdAt: a.createdAt,
      completedAt: a.completedAt,
      comentarios: a.comentarios || [],
      assignedTo: a.assignedTo ? a.assignedTo.username : null,
      concluidoPor: a.concluidoPor || null
    }));

    const mappedProjetos = projetos.map(p => ({
      id: p.id,
      titulo: p.titulo,
      descricao: p.descricao,
      likes: p.likes || 0,
      comentarios: p.comentarios || [],
      likedBy: p.likedBy || [],
      autor: p.autor ? p.autor.username : null,
      createdAt: p.createdAt
    }));

    // Resposta compatível com frontend
    res.json({
      concluidas,
      pendentes,
      totalProjetos,
      projetosPorUsuario,
      atividadesPorUsuario,
      atividades: mappedAtividades,
      projetos: mappedProjetos,
      users
    });
  } catch (err) {
    console.error('Erro no dashboard:', err);
    res.status(500).json({ error: 'Erro no dashboard', details: err.message });
  }
});

export default router;

import express from 'express';
import prisma from '../prismaClient.js';

const router = express.Router();

// Listar projetos
router.get('/', async (req, res) => {
  try {
    const list = await prisma.projeto.findMany({
      include: { autor: true }
    });

    const mapped = list.map(p => ({
      id: p.id,
      titulo: p.titulo,
      descricao: p.descricao,
      likes: p.likes || 0,
      comentarios: p.comentarios || [],
      likedBy: p.likedBy || [],
      autor: p.autor ? p.autor.username : (p.autorId || null),
      createdAt: p.createdAt,
      ativo: true
    }));

    res.json(mapped);
  } catch (err) {
    console.error("Erro ao listar projetos:", err);
    res.status(500).json({ error: "Erro ao listar projetos" });
  }
});

// Criar projeto
router.post('/', async (req, res) => {
  try {
    const { titulo, descricao, autor, likes, comentarios } = req.body;

    let autorId = null;
    if (autor) {
      const user = await prisma.user.findUnique({ where: { username: autor } });
      if (user) autorId = user.id;
    }

    const created = await prisma.projeto.create({
      data: {
        titulo,
        descricao,
        likes: likes || 0,
        comentarios: comentarios || [],
        likedBy: [],
        autorId
      }
    });

    const full = await prisma.projeto.findUnique({
      where: { id: created.id },
      include: { autor: true }
    });

    res.status(201).json({
      ...full,
      autor: full.autor ? full.autor.username : null,
      ativo: true

    });
  } catch (err) {
    console.error("Erro ao criar projeto:", err);
    res.status(500).json({ error: "Erro ao criar projeto" });
  }
});

// Atualizar projeto (likes, comentários, etc)
router.patch('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const data = { ...req.body };

    const updated = await prisma.projeto.update({
      where: { id },
      data
    });

    const full = await prisma.projeto.findUnique({
      where: { id },
      include: { autor: true }
    });

    res.json({
      ...full,
      autor: full.autor ? full.autor.username : null,
      ativo: true
    });
  } catch (err) {
    console.error("Erro ao atualizar projeto:", err);
    res.status(500).json({ error: "Erro ao atualizar projeto" });
  }
});

// Deletar projeto
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.projeto.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    console.error("Erro ao deletar projeto:", err);
    res.status(500).json({ error: "Erro ao deletar projeto" });
  }
});

export default router;

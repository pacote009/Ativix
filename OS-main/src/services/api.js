// src/services/api.js
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const api = axios.create({
  baseURL: BASE_URL,
  // tempo de espera opcional (evita requests travados)
  timeout: 15000,
});

// pegar token do localStorage e enviar no header
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Dashboard (dinâmico com projetos e atividades por usuário)
 */
export const getDashboardData = async () => {
  try {
    const [atividadesRes, projetosRes, usersRes] = await Promise.all([
      api.get("/atividades"),
      api.get("/projetos"),
      api.get("/users"),
    ]);

    const atividades = Array.isArray(atividadesRes.data) ? atividadesRes.data : [];
    const projetos = Array.isArray(projetosRes.data) ? projetosRes.data : [];
    const users = Array.isArray(usersRes.data) ? usersRes.data : [];

    // Contagem de atividades por status
    const concluidas = atividades.filter(
  (a) => ["finalizada", "concluida", "concluído"].includes(String(a.status).toLowerCase())
).length;

const pendentes = atividades.filter(
  (a) => ["pendente"].includes(String(a.status).toLowerCase())
).length;


    // Contagem total de projetos
    const totalProjetos = projetos.length;

    // Projetos por usuário (com base no campo "autor")
    const projetosPorUsuario = {};
    projetos.forEach((p) => {
      const autor = p.autor || "Desconhecido";
      projetosPorUsuario[autor] = (projetosPorUsuario[autor] || 0) + 1;
    });

    // Atividades por usuário (com base no campo "assignedTo")
    const atividadesPorUsuario = {};
    atividades.forEach((a) => {
      const user = a.assignedTo || "Não atribuído";
      atividadesPorUsuario[user] = (atividadesPorUsuario[user] || 0) + 1;
    });

    // Garantir que todos os usuários apareçam no gráfico, mesmo com zero
    users.forEach((u) => {
      if (!(u.username in projetosPorUsuario)) {
        projetosPorUsuario[u.username] = 0;
      }
      if (!(u.username in atividadesPorUsuario)) {
        atividadesPorUsuario[u.username] = 0;
      }
    });

    return {
      concluidas,
      pendentes,
      projetos: totalProjetos,
      projetosPorUsuario,
      atividadesPorUsuario,
    };
  } catch (error) {
    console.error("Erro ao carregar dashboard:", error);
    return {
      concluidas: 0,
      pendentes: 0,
      projetos: 0,
      projetosPorUsuario: {},
      atividadesPorUsuario: {},
    };
  }
};


export const loginUser = async (username, password) => {
  const response = await api.get(`/users?username=${username}&password=${password}`);
  if (response.data.length > 0) {
    const user = response.data[0];

    // SALVAR TOKEN
    localStorage.setItem("token", user.token || "fake-token"); // se tiver token do backend, use ele
    localStorage.setItem("user", JSON.stringify(user));

    return user;
  } else {
    throw new Error("Usuário ou senha inválidos!");
  }
};

/**
 * Buscar atividades com paginação, ordenação, filtro e ocultar fixadas para outros usuários
 */
export const getAtividades = async (
  status,
  page = 1,
  limit = 5,
  order = "desc",
  search = "",
  currentUser  = null  // ✅ Removido espaço extra
) => {
  // ✅ Envia status, order e search para o backend (backend processa where.OR para search e orderBy para order)
  const params = { status, order, search };

  try {
    const res = await api.get("/atividades", { params }); // ✅ Envia TODOS os params (status, order, search)

    let list = Array.isArray(res.data) ? res.data : [];

    // ✅ LOG PARA DEBUG: Ver o que o backend retornou (antes do filtro local)
    console.log('Dados recebidos do backend (após search no banco):', { status, search, totalFromBackend: list.length, items: list.map(item => ({ title: item.title, description: item.description })) });

    // 🔒 Filtro por assignedTo (fixadas/visibilidade): mantém no frontend (depende de currentUser )
    if (currentUser  && currentUser .role !== "admin") {  // ✅ Removido espaço extra em .role
      const beforeFilter = list.length;  // Definido aqui, dentro do if
      list = list.filter((item) => !item.assignedTo || item.assignedTo === currentUser .username);  // ✅ Removido espaço extra em .username
      // ✅ LOG PARA DEBUG: Ver se o filtro assignedTo remove itens (só executa se if for true)
      console.log('Após filtro assignedTo (para usuário não-admin):', { before: beforeFilter, after: list.length });
    }

    // REMOVIDO: Filtro de search local (backend já faz com where.OR)
    // REMOVIDO: Ordenação local (backend já faz com orderBy por createdAt)

    // 📄 Paginação: ainda no frontend (backend não suporta ainda; implemente se quiser eficiência)
    const total = list.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const data = list.slice(start, end);

    // ✅ LOG PARA DEBUG: Ver após paginação
    console.log('Após paginação (page:', page, 'limit:', limit, '):', { total, dataLength: data.length });

    return { data, total };
  } catch (error) {
    console.error('Erro na getAtividades:', error);  // ✅ Try-catch para capturar erros (ex.: 500 do backend)
    return { data: [], total: 0 };  // Retorna vazio em caso de erro, para não quebrar o app
  }
};
/**
 * Adicionar nova atividade
 */
export const addAtividade = async (atividade) => {
  const payload = {
    createdAt: new Date().toISOString(),  // data de criação ISO
    completedAt: null,                    // só preenche ao finalizar
    ...atividade,
  };
  const res = await api.post("/atividades", payload);
  return res.data;
};

/**
 * Atualizar atividade
 */
export const updateAtividade = async (id, data) => {
  // se está sendo marcada como finalizada, salva a hora da conclusão
  if (data.status === "finalizada") {
    data.completedAt = new Date().toISOString();
  }

  const response = await api.patch(`/atividades/${id}`, data);
  return response.data;
};

/**
 * Adicionar comentário em atividade
 */
export const addComentarioAtividade = async (id, comentario) => {
  const atividade = await api.get(`/atividades/${id}`);
  const novosComentarios = [...atividade.data.comentarios, comentario];
  const response = await api.patch(`/atividades/${id}`, { comentarios: novosComentarios });
  return response.data;
};

/**
 * Atribuir atividade a um usuário (fixar)
 */
export const assignAtividade = async (id, username) => {
  const response = await api.patch(`/atividades/${id}`, { assignedTo: username });
  return response.data;
};

/**
 * Buscar todos os usuários
 */
export const getUsers = async () => {
  const response = await api.get("/users");
  return response.data;
};

/**
 * Excluir atividade
 */
export const deleteAtividade = async (id) => {
  const response = await api.delete(`/atividades/${id}`);
  return response.data;
};

/**
 * Excluir comentário em atividade
 */
export const deleteComentarioAtividade = async (id, index) => {
  const atividade = await api.get(`/atividades/${id}`);
  const comentarios = [...atividade.data.comentarios];
  comentarios.splice(index, 1);
  const response = await api.patch(`/atividades/${id}`, { comentarios });
  return response.data;
};

/**
 * Atualizar comentário em atividade
 */
export const updateComentarioAtividadeTexto = async (id, index, novoTexto) => {
  const atividade = await api.get(`/atividades/${id}`);
  const comentarios = [...atividade.data.comentarios];
  if (comentarios[index]) {
    comentarios[index].texto = novoTexto;
  }
  const response = await api.patch(`/atividades/${id}`, { comentarios });
  return response.data;
};

// Concluídas por usuário
export const getRelatorioConcluidasPorUsuario = async () => {
  const res = await api.get("/atividades");
  const atividades = res.data.filter((a) => a.status === "finalizada");
  const porUsuario = {};
  atividades.forEach((a) => {
    const user = a.assignedTo || a.concluidoPor || "Não atribuído";
    if (!porUsuario[user]) porUsuario[user] = [];
    porUsuario[user].push(a);
  });
  return porUsuario;
};


// Concluídas por dia
export const getRelatorioConcluidasPorDia = async () => {
  const res = await api.get("/atividades");
  const atividades = res.data.filter((a) => a.status === "finalizada");
  const porDia = {};
  atividades.forEach((a) => {
    const user = a.assignedTo || a.concluidoPor || "Não atribuído";
    const dia = new Date(a.createdAt).toLocaleDateString("pt-BR");
    if (!porDia[user]) porDia[user] = {};
    if (!porDia[user][dia]) porDia[user][dia] = [];
    porDia[user][dia].push(a);
  });
  return porDia;
};


// Concluídas por semana
// Todas por semana (sem filtrar antes)
export const getRelatorioConcluidasPorSemana = async () => {
  const res = await api.get("/atividades");
  const atividades = res.data; // ✅ pega todas

  const porSemana = {};
  atividades.forEach((a) => {
    const user = a.assignedTo || a.concluidoPor || "Não atribuído";
    const d = new Date(a.createdAt);

// 🔹 Encontrar a segunda-feira da semana
const primeiroDiaSemana = new Date(d);
primeiroDiaSemana.setDate(d.getDate() - d.getDay() + 1); // segunda-feira

// 🔹 Último dia da semana (domingo)
const ultimoDiaSemana = new Date(primeiroDiaSemana);
ultimoDiaSemana.setDate(primeiroDiaSemana.getDate() + 6);

// 🔹 Formatar intervalo (21/08 - 27/08)
const formatar = (data) =>
  data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

const semana = `${formatar(primeiroDiaSemana)} - ${formatar(ultimoDiaSemana)}`;

if (!porSemana[user]) porSemana[user] = {};
if (!porSemana[user][semana]) porSemana[user][semana] = [];
porSemana[user][semana].push(a);

  });

  return porSemana;
};


// Fixadas por usuário
export const getRelatorioFixadasPorUsuario = async () => {
  const res = await api.get("/atividades");
  const atividades = res.data.filter((a) => a.assignedTo);
  const fixadas = {};
  atividades.forEach((a) => {
    const user = a.assignedTo;
    if (!fixadas[user]) fixadas[user] = [];
    fixadas[user].push(a);
  });
  return fixadas;
};

/**
 * Buscar dados do dashboard do backend
 */
export const getDashboard = async () => {
  try {
    const response = await api.get("/dashboard");
    return response.data;
  } catch (error) {
    console.error("Erro ao buscar dashboard:", error);
    throw error;
  }
};


export default api;

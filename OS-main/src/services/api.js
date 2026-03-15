// src/services/api.js
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

// Inserir token automaticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  // log temporário
  //console.log('[API REQUEST]', config.method, config.url, config.data);
  return config;
});


/**
 * getAtividades: chama a API /atividades com params e retorna { data, total }
 * Compatível com backend que retorna array ou { data, total }.
 *
 * Params:
 *  - status: string
 *  - page, limit, order, search
 *  - currentUser: objeto user (opcional) para filtro de assignedTo no frontend (compat)
 *  - dateStart, dateEnd: strings 'YYYY-MM-DD' opcionais
 */
export const getAtividades = async (
  status,
  page = 1,
  limit = 5,
  order = "desc",
  search = "",
  currentUser = null,
  dateStart = null,
  dateEnd = null
) => {
  const params = { status, page, limit, order, search };
  if (dateStart) params.dateStart = dateStart;
  if (dateEnd) params.dateEnd = dateEnd;

  try {
    const res = await api.get("/atividades", { params });

    // Compatibilidade: backend novo retorna { data, total }, mas pode retornar array
    let list = [];
    let total = 0;
    if (res.data && Array.isArray(res.data)) {
      list = res.data;
      total = list.length;
    } else if (res.data && Array.isArray(res.data.data)) {
      list = res.data.data;
      total = typeof res.data.total === "number" ? res.data.total : list.length;
    } else {
      // fallback defensivo
      list = Array.isArray(res.data) ? res.data : [];
      total = list.length;
    }

    console.log("getAtividades - dados recebidos:", { params, totalReturned: list.length, total });

    // Filtro visibility: se currentUser não for admin, só mostra itens não-atribuídos ou atribuído ao próprio usuário
    if (currentUser && String(currentUser.role).toLowerCase() !== "admin") {
      const before = list.length;
      list = list.filter((item) => !item.assignedTo || item.assignedTo === currentUser.username);
      console.log("getAtividades - após filtro assignedTo:", { before, after: list.length });
    }

    // Se backend já paginou e retornou subset, não re-paginar.
    // Aqui assumimos que `list` já contém apenas os itens da página quando backend paginou.
    // Para compatibilidade com backend sem paginação, aplicamos paginação local apenas se o total === list.length.
    let data = list;
    if (total === list.length) {
      // backend retornou todos os itens (ou não retornou total). Faz paginação local
      const start = (page - 1) * limit;
      const end = start + limit;
      data = list.slice(start, end);
    }

    console.log("getAtividades - retorno final", { page, limit, dataLength: data.length, total });

    return { data, total };
  } catch (error) {
    console.error("Erro na getAtividades:", error);
    return { data: [], total: 0 };
  }
};

/**
 * addAtividade
 */
export const addAtividade = async (atividade) => {
  const payload = {
    createdAt: new Date().toISOString(),
    completedAt: null,
    ...atividade,
  };
  const res = await api.post("/atividades", payload);
  return res.data;
};

/**
 * updateAtividade
 */
export const updateAtividade = async (id, data) => {
  if (data.status === "finalizada") {
    data.completedAt = new Date().toISOString();
  }
  const response = await api.patch(`/atividades/${id}`, data);
  return response.data;
};

/**
 * Comentários / assign / delete / users
 */
export const addComentarioAtividade = async (id, comentario) => {
  const atividade = await api.get(`/atividades/${id}`);
  const novosComentarios = [...(atividade.data.comentarios || []), comentario];
  const response = await api.patch(`/atividades/${id}`, { comentarios: novosComentarios });
  return response.data;
};

export const assignAtividade = async (id, username) => {
  const response = await api.patch(`/atividades/${id}`, { assignedTo: username });
  return response.data;
};

export const getUsers = async () => {
  const response = await api.get("/users");
  return response.data;
};

export const deleteAtividade = async (id) => {
  const response = await api.delete(`/atividades/${id}`);
  return response.data;
};

export const deleteComentarioAtividade = async (id, index) => {
  const atividade = await api.get(`/atividades/${id}`);
  const comentarios = [...(atividade.data.comentarios || [])];
  comentarios.splice(index, 1);
  const response = await api.patch(`/atividades/${id}`, { comentarios });
  return response.data;
};

export const updateComentarioAtividadeTexto = async (id, index, novoTexto) => {
  const atividade = await api.get(`/atividades/${id}`);
  const comentarios = [...(atividade.data.comentarios || [])];
  if (comentarios[index]) comentarios[index].texto = novoTexto;
  const response = await api.patch(`/atividades/${id}`, { comentarios });
  return response.data;
};

/**
 * Relatórios:
 * - primeiro tenta endpoints específicos (/relatorios/...)
 * - se falhar (404, 500 ou não implementado), faz fallback pegando /atividades?status=finalizada
 *   e agrupa no frontend aplicando filtro por dateStart/dateEnd (usando completedAt).
 */

// HELPERS de filtro por data (inclusive fim do dia)
function inRangeCompletedAt(item, dateStart, dateEnd) {
  if (!dateStart && !dateEnd) return true;
  const dt = item.completedAt ? new Date(item.completedAt) : (item.createdAt ? new Date(item.createdAt) : null);
  if (!dt) return true;
  if (dateStart) {
    const s = new Date(dateStart);
    if (dt < s) return false;
  }
  if (dateEnd) {
    const e = new Date(dateEnd);
    e.setHours(23, 59, 59, 999);
    if (dt > e) return false;
  }
  return true;
}

// Concluídas por usuário (dateStart/dateEnd opcionais)
export const getRelatorioConcluidasPorUsuario = async (dateStart = null, dateEnd = null) => {
  try {
    const res = await api.get("/relatorios/concluidas-por-usuario", { params: { dateStart, dateEnd } });
    return res.data;
  } catch (err) {
    console.warn("Endpoint /relatorios/concluidas-por-usuario falhou — fallback para /atividades", err?.message);
    // fallback: pegar atividades finalizadas e agrupar por assignedTo/concluidoPor
    const resp = await api.get("/atividades", { params: { status: "finalizada", limit: 1000 } });
    const all = Array.isArray(resp.data) ? resp.data : (resp.data?.data || []);
    const filtered = all.filter((a) => inRangeCompletedAt(a, dateStart, dateEnd));
    const porUsuario = {};
    filtered.forEach((a) => {
      const user = a.assignedTo || a.concluidoPor || "Não atribuído";
      if (!porUsuario[user]) porUsuario[user] = [];
      porUsuario[user].push(a);
    });
    return porUsuario;
  }
};

// Concluídas por dia
export const getRelatorioConcluidasPorDia = async (dateStart = null, dateEnd = null) => {
  try {
    const res = await api.get("/relatorios/concluidas-por-dia", { params: { dateStart, dateEnd } });
    return res.data;
  } catch (err) {
    console.warn("Endpoint /relatorios/concluidas-por-dia falhou — fallback para /atividades", err?.message);
    const resp = await api.get("/atividades", { params: { status: "finalizada", limit: 1000 } });
    const all = Array.isArray(resp.data) ? resp.data : (resp.data?.data || []);
    const filtered = all.filter((a) => inRangeCompletedAt(a, dateStart, dateEnd));
    const porDia = {};
    filtered.forEach((a) => {
      const user = a.assignedTo || a.concluidoPor || "Não atribuído";
      const dia = new Date(a.completedAt || a.createdAt).toLocaleDateString("pt-BR");
      if (!porDia[user]) porDia[user] = {};
      if (!porDia[user][dia]) porDia[user][dia] = [];
      porDia[user][dia].push(a);
    });
    return porDia;
  }
};

// Concluídas por semana
export const getRelatorioConcluidasPorSemana = async (dateStart = null, dateEnd = null) => {
  try {
    const res = await api.get("/relatorios/concluidas-por-semana", { params: { dateStart, dateEnd } });
    return res.data;
  } catch (err) {
    console.warn("Endpoint /relatorios/concluidas-por-semana falhou — fallback para /atividades", err?.message);
    const resp = await api.get("/atividades", { params: { status: "finalizada", limit: 1000 } });
    const all = Array.isArray(resp.data) ? resp.data : (resp.data?.data || []);
    const filtered = all.filter((a) => inRangeCompletedAt(a, dateStart, dateEnd));
    const porSemana = {};
    filtered.forEach((a) => {
      const user = a.assignedTo || a.concluidoPor || "Não atribuído";
      const d = new Date(a.completedAt || a.createdAt);

      // Ajuste para obter segunda-feira da semana (considerando domingo como último)
      const primeiroDiaSemana = new Date(d);
      const day = primeiroDiaSemana.getDay();
      const diffToMonday = (day === 0) ? -6 : (1 - day); // se domingo (0) volta para segunda anterior
      primeiroDiaSemana.setDate(firstDaySafe(primeiroDiaSemana).getDate() + diffToMonday);

      const ultimoDiaSemana = new Date(primeiroDiaSemana);
      ultimoDiaSemana.setDate(primeiroDiaSemana.getDate() + 6);

      const formatar = (data) => data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      const semana = `${formatar(primeiroDiaSemana)} - ${formatar(ultimoDiaSemana)}`;

      if (!porSemana[user]) porSemana[user] = {};
      if (!porSemana[user][semana]) porSemana[user][semana] = [];
      porSemana[user][semana].push(a);
    });
    return porSemana;
  }
};

// Helper seguro para ajustar sem modificar objetos originais
function firstDaySafe(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// Fixadas por usuário
export const getRelatorioFixadasPorUsuario = async (dateStart = null, dateEnd = null) => {
  try {
    const res = await api.get("/relatorios/fixadas-por-usuario", { params: { dateStart, dateEnd } });
    return res.data;
  } catch (err) {
    console.warn("Endpoint /relatorios/fixadas-por-usuario falhou — fallback para /atividades", err?.message);
    const resp = await api.get("/atividades", { params: { limit: 1000 } });
    const all = Array.isArray(resp.data) ? resp.data : (resp.data?.data || []);
    const filtered = all.filter((a) => a.assignedTo && inRangeCompletedAt(a, dateStart, dateEnd));
    const fixadas = {};
    filtered.forEach((a) => {
      const user = a.assignedTo;
      if (!fixadas[user]) fixadas[user] = [];
      fixadas[user].push(a);
    });
    return fixadas;
  }
};

/**
 * getDashboard (mantive sua implementação de chamar /atividades etc)
 * você pode migrar para um endpoint no backend que já traga tudo agregadinho.
 */
export const getDashboardData = async () => {
  try {
    const [atividadesRes, projetosRes, usersRes] = await Promise.all([
      api.get("/atividades"),
      api.get("/projetos"),
      api.get("/users"),
    ]);

    const atividades = Array.isArray(atividadesRes.data) ? atividadesRes.data : (atividadesRes.data?.data || []);
    const projetos = Array.isArray(projetosRes.data) ? projetosRes.data : (projetosRes.data?.data || []);
    const users = Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data?.data || []);

    const concluidas = atividades.filter((a) => ["finalizada", "concluida", "concluído"].includes(String(a.status).toLowerCase())).length;
    const pendentes = atividades.filter((a) => ["pendente"].includes(String(a.status).toLowerCase())).length;
    const totalProjetos = projetos.length;

    const projetosPorUsuario = {};
    projetos.forEach((p) => {
      const autor = p.autor || "Desconhecido";
      projetosPorUsuario[autor] = (projetosPorUsuario[autor] || 0) + 1;
    });

    const atividadesPorUsuario = {};
    atividades.forEach((a) => {
      const u = a.assignedTo || "Não atribuído";
      atividadesPorUsuario[u] = (atividadesPorUsuario[u] || 0) + 1;
    });

    users.forEach((u) => {
      if (!(u.username in projetosPorUsuario)) projetosPorUsuario[u.username] = 0;
      if (!(u.username in atividadesPorUsuario)) atividadesPorUsuario[u.username] = 0;
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

// GET /toners
export const getToners = () => api.get('/toners').then(r => r.data);

// POST /toners -> aceita payload com initialStock OR stock (compatibilidade)
export const createToner = (payload) => {
  // Garantia: se frontend enviar "stock", mapeamos para initialStock (compat)
  const body = { ...payload };
  if (body.stock !== undefined && body.initialStock === undefined) {
    body.initialStock = Number(body.stock) || 0;
    delete body.stock;
  }
  // normaliza minStock
  if (body.minStock !== undefined) body.minStock = Number(body.minStock) || 0;
  return api.post('/toners', body).then(r => r.data);
};

// PATCH /toners/:id
export const updateToner = (id, payload) => api.patch(`/toners/${id}`, payload).then(r => r.data);

// POST movement -> normaliza payload para garantir origin/destination/quantity/printerId corretos
export const addTonerMovement = async (id, payload) => {
  // payload: { type, quantity, note, destination, origin, printerId }
  const body = {
    type: payload.type,
    quantity: Number(payload.quantity) || 0,
    note: payload.note ?? null,
    destination: payload.destination ?? null,
    origin: payload.origin ?? null,
    printerId: payload.printerId !== undefined && payload.printerId !== null ? Number(payload.printerId) : null,
  };

  const res = await api.post(`/toners/${id}/movements`, body);
  return res.data;
};

// GET movements
export const getTonerMovements = (id) => api.get(`/toners/${id}/movements`).then(r => r.data);

// DELETE /toners/:id
export const deleteToner = (id) => api.delete(`/toners/${id}`).then(r => r.data);

// GET /toners/report/usage
export const getTonerUsageReport = async (dateStart = null, dateEnd = null) => {
  const params = {};
  if (dateStart) params.dateStart = dateStart;
  if (dateEnd) params.dateEnd = dateEnd;
  const res = await api.get('/toners/report/usage', { params });
  return res.data;
};


// ===== Equipamentos =====
export const getEquipamentos = (params = {}) => api.get('/equipamentos', { params }).then(r => r.data);

export const createEquipamento = (payload) => api.post('/equipamentos', payload).then(r => r.data);

export const realocarEquipamento = (id, payload) => api.patch(`/equipamentos/${id}/realocar`, payload).then(r => r.data);

// ===== Equipamentos =====
export const getEquipamentos = (params = {}) => api.get('/equipamentos', { params }).then(r => r.data);

export const createEquipamento = (payload) => api.post('/equipamentos', payload).then(r => r.data);

export const realocarEquipamento = (id, payload) => api.patch(`/equipamentos/${id}/realocar`, payload).then(r => r.data);

export const updateEquipamento = (id, payload) => api.patch(`/equipamentos/${id}`, payload).then(r => r.data);

export const deleteEquipamento = (id) => api.delete(`/equipamentos/${id}`).then(r => r.data);

export const getRelatorioEquipamentos = (params = {}) => api.get('/equipamentos/relatorio', { params }).then(r => r.data);

export default api;
// src/pages/Atividades.jsx
import { useState, useEffect } from "react";
import AtividadeCard from "../components/Atividadecard";
import { addAtividade, getAtividades } from "../services/api";
import { FaPlus } from "react-icons/fa";
import { getCurrentUser } from "../auth";
import ModalFixar from "../components/ModalFixar";
import { motion } from "framer-motion";

const Atividades = () => {
  const [modalFixarAtividade, setModalFixarAtividade] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [novaAtividade, setNovaAtividade] = useState({ title: "", description: "" });
  const [reload, setReload] = useState(false);
  const user = getCurrentUser();

  const handleRegistrarAtividade = async (e) => {
    e.preventDefault();
    if (!user) {
      alert("Você precisa estar logado!");
      return;
    }

    if (!novaAtividade.title.trim() || !novaAtividade.description.trim()) {
      alert("Preencha título e descrição!");
      return;
    }

    const nova = {
      title: novaAtividade.title,
      description: novaAtividade.description,
      status: "pendente",
      comentarios: [],
      autor: user.username, // mantém autor
    };

    try {
      await addAtividade(nova);
      setNovaAtividade({ title: "", description: "" });
      setShowForm(false);
      setReload((prev) => !prev);
    } catch (error) {
      console.error("Erro ao registrar atividade:", error);
      alert("Erro ao registrar atividade!");
    }
  };

  return (
    <div className="bg-gray-100 dark:bg-gray-900 min-h-screen p-4 md:p-6 transition-colors">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-extrabold text-gray-800 dark:text-gray-200">Atividades</h1>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-yellow-400 hover:from-yellow-400 hover:to-orange-500 text-white font-semibold shadow-md transition-transform text-sm"
        >
          <FaPlus />
          Nova Atividade
        </motion.button>

        {/* Modal Fixar */}
        {modalFixarAtividade && (
          <ModalFixar
            atividade={modalFixarAtividade}
            onClose={() => setModalFixarAtividade(null)}
            onUpdate={() => setReload((prev) => !prev)}
          />
        )}
      </div>

      {/* Modal Nova Atividade */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <motion.form
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleRegistrarAtividade}
            className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-xl w-full max-w-md space-y-4"
          >
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-1">Registrar Nova Atividade</h2>
            <input
              type="text"
              placeholder="Título"
              value={novaAtividade.title}
              onChange={(e) => setNovaAtividade({ ...novaAtividade, title: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-gray-800 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm"
              required
            />
            <textarea
              placeholder="Descrição"
              value={novaAtividade.description}
              onChange={(e) => setNovaAtividade({ ...novaAtividade, description: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-gray-800 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm"
              required
            />
            <div className="flex justify-end gap-3 mt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-3 py-1.5 rounded bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 rounded bg-green-600 text-white hover:bg-green-700 text-sm"
              >
                Salvar
              </button>
            </div>
          </motion.form>
        </div>
      )}

      {/* Seções */}
      <Section
        key={`pendentes-${reload}`}
        title="Pendentes"
        status="pendente"
        reload={reload}
        setModalFixarAtividade={setModalFixarAtividade}
        onGlobalUpdate={() => setReload((prev) => !prev)}
      />
      <Section
        key={`finalizadas-${reload}`}
        title="Finalizadas"
        status="finalizada"
        reload={reload}
        setModalFixarAtividade={setModalFixarAtividade}
        onGlobalUpdate={() => setReload((prev) => !prev)}
      />
    </div>
  );
};

const Section = ({ title, status, reload, setModalFixarAtividade, onGlobalUpdate }) => {
  const user = getCurrentUser();
  const [page, setPage] = useState(1);
  const [order, setOrder] = useState("desc");
  const [search, setSearch] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const limit = 6;

  const fetchData = async () => {
    try {
      const res = await getAtividades(
        status,
        page,
        limit,
        order,
        search,
        user,
        dateStart || null,
        dateEnd || null
      );
      // suporte ao shape { data, total } do backend
      if (res && res.data) {
        setData(res.data);
        setTotal(res.total || 0);
      } else {
        // caso antigo que retornava array
        setData(Array.isArray(res) ? res : []);
        setTotal(Array.isArray(res) ? res.length : 0);
      }
    } catch (error) {
      console.error("Erro ao carregar atividades:", error);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, order, search, reload, status, dateStart, dateEnd]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const clearFilters = () => {
    setSearch("");
    setOrder("desc");
    setDateStart("");
    setDateEnd("");
    setPage(1);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32 }}
      className="mb-8 p-4 md:p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700"
    >
      <div className="flex items-start justify-between mb-4 gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-700 dark:text-gray-200">{title}</h2>
          <span className={`inline-block mt-2 px-2 py-0.5 text-xs font-semibold rounded-full ${status === "pendente" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>
            {status.toUpperCase()}
          </span>
        </div>
      </div>

      {/* --- FILTROS COMPACTOS E RESPONSIVE --- */}
<div className="mb-4">
  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
    {/* busca */}
    <div className="md:col-span-1">
      <input
        type="text"
        placeholder="Buscar por título ou descrição..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm"
      />
    </div>

    {/* select + datas + botões */}
    <div className="md:col-span-2 flex flex-col sm:flex-row sm:items-center gap-2 overflow-hidden">
      <select
        value={order}
        onChange={(e) => { setOrder(e.target.value); setPage(1); }}
        className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm w-full sm:w-auto"
      >
        <option value="desc">Mais recentes</option>
        <option value="asc">Mais antigos</option>
      </select>

      <div className="flex gap-2 ml-auto items-end flex-wrap">
        <div className="flex flex-col">
          <label className="sr-only">Início</label>
          <input
            type="date"
            value={dateStart}
            onChange={(e) => { setDateStart(e.target.value); setPage(1); }}
            className="border rounded px-2 py-1 max-w-[120px] bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
          />
        </div>

        <div className="flex flex-col">
          <label className="sr-only">Fim</label>
          <input
            type="date"
            value={dateEnd}
            onChange={(e) => { setDateEnd(e.target.value); setPage(1); }}
            className="border rounded px-2 py-1 max-w-[120px] bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
          />
        </div>

        <div className="flex gap-2">
          <button onClick={() => { setPage(1); fetchData(); }} className="px-3 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700 text-sm">
            Aplicar
          </button>
          <button onClick={() => clearFilters()} className="px-3 py-1.5 rounded bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-sm">
            Limpar
          </button>
        </div>
      </div>
    </div>
  </div>
</div>

      {/* Lista */}
      {data.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.map((atividade) => (
              <AtividadeCard
                key={atividade.id}
                atividade={atividade}
                onUpdate={fetchData}
                onFixar={() => setModalFixarAtividade(atividade)}
                onConcluded={(id) => {
                  setData((prev) => prev.filter((a) => a.id !== id));
                }}
                onGlobalUpdate={onGlobalUpdate}
              />
            ))}
          </div>

          {/* Paginação */}
          <div className="flex justify-center items-center gap-3 mt-6">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 transition disabled:opacity-50 text-sm"
            >
              Anterior
            </button>
            <span className="text-gray-700 dark:text-gray-200 text-sm">
              Página {page} de {totalPages || 1}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page === totalPages || totalPages === 0}
              className="px-3 py-1 rounded bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 transition disabled:opacity-50 text-sm"
            >
              Próxima
            </button>
          </div>
        </>
      ) : (
        <p className="text-gray-500 dark:text-gray-400">Nenhuma atividade {title.toLowerCase()}.</p>
      )}
    </motion.div>
  );
};

export default Atividades;

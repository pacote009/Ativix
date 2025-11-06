import { useEffect, useState } from "react";
import ProjetoCard from "../components/Projetocard";
import { FaLightbulb } from "react-icons/fa";
import api from "../services/api";
import { getCurrentUser } from "../auth";
import { motion } from "framer-motion";

const Projetos = () => {
  const [projetos, setProjetos] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");

  const fetchProjetos = async () => {
    try {
      const res = await api.get("/projetos");
      setProjetos(res.data);
    } catch (err) {
      console.error("Erro ao carregar projetos:", err);
    }
  };

  useEffect(() => {
    fetchProjetos();
  }, []);

  const handleNovaIdeia = async (e) => {
    e.preventDefault();
    const user = getCurrentUser();

    const novaIdeia = {
      titulo,
      descricao,
      autor: user.username,
      likes: 0,
      comentarios: [],
    };

    try {
      await api.post("/projetos", novaIdeia);
      setTitulo("");
      setDescricao("");
      setShowForm(false);
      fetchProjetos();
    } catch (err) {
      console.error("Erro ao salvar projeto:", err);
    }
  };

  return (
    <div className="p-6 min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-extrabold text-gray-800 dark:text-gray-100 tracking-tight">
          Projetos
        </h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-yellow-400 hover:from-yellow-400 hover:to-orange-500 text-white font-semibold shadow-lg shadow-orange-500/40 transition-transform transform hover:scale-105 active:scale-95"
        >
          <FaLightbulb />
          Nova Ideia
        </button>
      </div>

      {showForm && (
        <motion.form
          onSubmit={handleNovaIdeia}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md mb-6 space-y-4"
        >
          <input
            type="text"
            placeholder="Título do projeto"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            className="w-full border rounded-lg p-3 text-gray-800 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
            required
          />
          <textarea
            placeholder="Descrição da ideia"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            className="w-full border rounded-lg p-3 text-gray-800 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
            required
          />
          <button
            type="submit"
            className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            Salvar
          </button>
        </motion.form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projetos.map((proj) => (
          <ProjetoCard key={proj.id} projeto={proj} onUpdate={fetchProjetos} />
        ))}
      </div>
    </div>
  );
};

export default Projetos;

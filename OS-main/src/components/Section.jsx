// src/components/Section.jsx
import { useEffect, useState } from "react";
import AtividadeCard from "./AtividadeCard";
import { getAtividades } from "../services/api";

const Section = ({ title, status }) => {
  const [atividades, setAtividades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [order, setOrder] = useState("desc"); // mais novos primeiro

  const limit = 5;

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getAtividades(status, page, limit, order, search);
      setAtividades(res.data);
      setTotal(res.total);
    } catch (error) {
      console.error("Erro ao carregar atividades:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, search, order]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="mb-10 p-4 rounded-lg shadow bg-gray-100">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-700">{title}</h2>

        {/* Filtros */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Buscar por título ou descrição..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="px-2 py-1 border rounded bg-white text-gray-700 placeholder-gray-400"
          />
          <select
            value={order}
            onChange={(e) => setOrder(e.target.value)}
            className="px-2 py-1 border rounded bg-white text-gray-700"
          >
            <option value="desc">Mais novos</option>
            <option value="asc">Mais antigos</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">Carregando...</p>
      ) : atividades.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {atividades.map((atividade) => (
              <AtividadeCard
                key={atividade.id}
                id={atividade.id}
                title={atividade.title}
                description={atividade.description}
                status={atividade.status}
                comentarios={atividade.comentarios || []}
                autor={atividade.autor}
                concluidoPor={atividade.concluidoPor}
                onUpdate={fetchData}
              />
            ))}
          </div>

          {/* Paginação */}
          <div className="flex justify-center gap-3 mt-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded bg-gray-300 hover:bg-gray-400 disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="px-2 py-1 text-gray-700">
              Página {page} de {totalPages || 1}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || totalPages === 0}
              className="px-3 py-1 rounded bg-gray-300 hover:bg-gray-400 disabled:opacity-50"
            >
              Próxima
            </button>
          </div>
        </>
      ) : (
        <p className="text-gray-500">Nenhuma atividade encontrada.</p>
      )}
    </div>
  );
};

export default Section;

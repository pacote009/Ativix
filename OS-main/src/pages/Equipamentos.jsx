import { useEffect, useMemo, useState } from "react";
import {
  createEquipamento,
  getEquipamentos,
  getRelatorioEquipamentos,
  realocarEquipamento,
} from "../services/api";

const initialForm = {
  name: "",
  category: "",
  assetTag: "",
  serialNumber: "",
  purchaseDate: "",
  arrivalDate: "",
  allocatedTo: "",
  room: "",
  status: "em_estoque",
  notes: "",
};

export default function Equipamentos() {
  const [form, setForm] = useState(initialForm);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [relatorio, setRelatorio] = useState(null);
  const [filtroRelatorio, setFiltroRelatorio] = useState({ dateStart: "", dateEnd: "", status: "" });

  const loadEquipamentos = async () => {
    setLoading(true);
    try {
      const data = await getEquipamentos(search ? { search } : {});
      setItems(data);
    } catch (error) {
      console.error("Erro ao carregar equipamentos:", error);
      alert("Não foi possível carregar os equipamentos.");
    } finally {
      setLoading(false);
    }
  };

  const loadRelatorio = async (params = {}) => {
    try {
      const data = await getRelatorioEquipamentos(params);
      setRelatorio(data);
    } catch (error) {
      console.error("Erro no relatório:", error);
      alert("Não foi possível gerar o relatório.");
    }
  };

  useEffect(() => {
    loadEquipamentos();
    loadRelatorio();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createEquipamento(form);
      setForm(initialForm);
      await loadEquipamentos();
      await loadRelatorio();
      alert("Equipamento registrado com sucesso.");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert(error?.response?.data?.error || "Erro ao registrar equipamento.");
    }
  };

  const handleRealocar = async (item) => {
    const allocatedTo = window.prompt("Realocar para qual setor/local?", item.allocatedTo || "");
    if (allocatedTo === null) return;

    const room = window.prompt("Qual sala?", item.room || "");
    if (room === null) return;

    const note = window.prompt("Observação (opcional):", "Realocado manualmente na tela de equipamentos") || "";

    try {
      await realocarEquipamento(item.id, { allocatedTo, room, note, status: "realocado" });
      await loadEquipamentos();
      await loadRelatorio(filtroRelatorio);
      alert("Realocação registrada com sucesso.");
    } catch (error) {
      console.error("Erro na realocação:", error);
      alert(error?.response?.data?.error || "Erro ao realocar equipamento.");
    }
  };

  const resumoStatus = useMemo(() => {
    if (!relatorio?.resumoStatus) return [];
    return Object.entries(relatorio.resumoStatus);
  }, [relatorio]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Equipamentos</h1>
        <p className="text-sm text-gray-500 dark:text-gray-300">Registre chegada, compra e realocações com relatório consolidado.</p>
      </div>

      <section className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow space-y-4">
        <h2 className="font-semibold text-lg">Nova chegada de equipamento</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input className="border rounded px-3 py-2 text-black" placeholder="Nome *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className="border rounded px-3 py-2 text-black" placeholder="Categoria" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <input className="border rounded px-3 py-2 text-black" placeholder="Patrimônio" value={form.assetTag} onChange={(e) => setForm({ ...form, assetTag: e.target.value })} />
          <input className="border rounded px-3 py-2 text-black" placeholder="Serial" value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} />
          <input className="border rounded px-3 py-2 text-black" type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} />
          <input className="border rounded px-3 py-2 text-black" type="date" value={form.arrivalDate} onChange={(e) => setForm({ ...form, arrivalDate: e.target.value })} />
          <input className="border rounded px-3 py-2 text-black" placeholder="Realocado para" value={form.allocatedTo} onChange={(e) => setForm({ ...form, allocatedTo: e.target.value })} />
          <input className="border rounded px-3 py-2 text-black" placeholder="Sala" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} />
          <select className="border rounded px-3 py-2 text-black" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="em_estoque">Em estoque</option>
            <option value="em_uso">Em uso</option>
            <option value="realocado">Realocado</option>
            <option value="manutencao">Manutenção</option>
          </select>
          <textarea className="border rounded px-3 py-2 md:col-span-3 text-black" placeholder="Observações" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded md:col-span-3" type="submit">
            Registrar chegada
          </button>
        </form>
      </section>

      <section className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow space-y-4">
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <div className="flex-1">
            <label className="text-sm font-medium">Buscar</label>
            <input
              className="w-full border rounded px-3 py-2 text-black"
              placeholder="Nome, patrimônio, serial ou setor"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded" onClick={loadEquipamentos}>
            Filtrar
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2">Equipamento</th>
                <th>Comprado em</th>
                <th>Setor</th>
                <th>Sala</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-4">Carregando...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="py-4 text-gray-500">Nenhum equipamento encontrado.</td></tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="py-2">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-gray-500">Patrimônio: {item.assetTag || "-"}</p>
                    </td>
                    <td>{item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString("pt-BR") : "-"}</td>
                    <td>{item.allocatedTo || "-"}</td>
                    <td>{item.room || "-"}</td>
                    <td>{item.status}</td>
                    <td>
                      <button className="text-indigo-600 hover:underline" onClick={() => handleRealocar(item)}>
                        Realocar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow space-y-4">
        <h2 className="font-semibold text-lg">Relatório de equipamentos</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input type="date" className="border rounded px-3 py-2 text-black" value={filtroRelatorio.dateStart} onChange={(e) => setFiltroRelatorio({ ...filtroRelatorio, dateStart: e.target.value })} />
          <input type="date" className="border rounded px-3 py-2 text-black" value={filtroRelatorio.dateEnd} onChange={(e) => setFiltroRelatorio({ ...filtroRelatorio, dateEnd: e.target.value })} />
          <select className="border rounded px-3 py-2 text-black" value={filtroRelatorio.status} onChange={(e) => setFiltroRelatorio({ ...filtroRelatorio, status: e.target.value })}>
            <option value="">Todos status</option>
            <option value="em_estoque">Em estoque</option>
            <option value="em_uso">Em uso</option>
            <option value="realocado">Realocado</option>
            <option value="manutencao">Manutenção</option>
          </select>
          <button
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded"
            onClick={() => loadRelatorio(filtroRelatorio)}
          >
            Gerar relatório
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="bg-indigo-50 rounded p-3 text-indigo-800">
            <p className="text-sm">Total de equipamentos</p>
            <p className="text-2xl font-bold">{relatorio?.total ?? 0}</p>
          </div>
          {resumoStatus.map(([status, total]) => (
            <div key={status} className="bg-gray-50 rounded p-3">
              <p className="text-sm text-gray-500">{status}</p>
              <p className="text-2xl font-bold">{total}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

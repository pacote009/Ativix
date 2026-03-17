import { useEffect, useMemo, useState } from "react";
import saveAs from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getCurrentUser } from "../auth";
import {
  createEquipamento,
  deleteEquipamento,
  getEquipamentos,
  getRelatorioEquipamentos,
  realocarEquipamento,
  updateEquipamento,
} from "../services/api";

const TI_SETOR = "Setor de TI";

const initialForm = {
  name: "",
  category: "",
  assetTag: "",
  serialNumber: "",
  purchaseDate: "",
  room: "",
  status: "em_estoque",
  notes: "",
};

const inputClassName =
  "w-full rounded-lg border border-slate-500 bg-slate-700 px-3 py-2 text-slate-100 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400";

export default function Equipamentos() {
  const [form, setForm] = useState(initialForm);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [relatorio, setRelatorio] = useState(null);
  const [filtroRelatorio, setFiltroRelatorio] = useState({ dateStart: "", dateEnd: "", status: "" });
  const [feedback, setFeedback] = useState({ type: "", message: "", detail: "" });
  const user = getCurrentUser();
  const isAdmin = String(user?.role || "").toUpperCase() === "ADMIN";

  const normalizedRelatorioParams = useMemo(() => {
    const params = {};
    if (filtroRelatorio.dateStart) params.dateStart = filtroRelatorio.dateStart;
    if (filtroRelatorio.dateEnd) params.dateEnd = filtroRelatorio.dateEnd;
    if (filtroRelatorio.status) params.status = filtroRelatorio.status;
    return params;
  }, [filtroRelatorio]);

  const showFeedback = (type, message, detail = "") => {
    setFeedback({ type, message, detail });
  };

  const loadEquipamentos = async () => {
    setLoading(true);
    try {
      const data = await getEquipamentos(search ? { search } : {});
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao carregar equipamentos:", error);
      showFeedback("error", "Falha ao carregar equipamentos.", "Verifique sua conexão e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const loadRelatorio = async (params = {}) => {
    try {
      const data = await getRelatorioEquipamentos(params);
      setRelatorio(data || { total: 0, resumoStatus: {}, equipamentos: [] });
    } catch (error) {
      console.error("Erro no relatório:", error);
      showFeedback(
        "error",
        "Falha ao gerar relatório.",
        error?.response?.data?.error || "Valide os filtros e tente novamente."
      );
      setRelatorio({ total: 0, resumoStatus: {}, equipamentos: [] });
    }
  };

  useEffect(() => {
    loadEquipamentos();
  }, []);

  useEffect(() => {
    loadRelatorio(normalizedRelatorioParams);
  }, [normalizedRelatorioParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createEquipamento({
        ...form,
        allocatedTo: TI_SETOR,
      });
      setForm(initialForm);
      await loadEquipamentos();
      await loadRelatorio(normalizedRelatorioParams);
      showFeedback("success", "Equipamento registrado com sucesso.", "Entrada inicial realizada no Setor de TI.");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      showFeedback(
        "error",
        "Não foi possível registrar o equipamento.",
        error?.response?.data?.error || "Revise os dados informados."
      );
    }
  };

  const handleRealocar = async (item) => {
    const allocatedTo = window.prompt("Realocar para qual setor/local?", item.allocatedTo || "");
    if (allocatedTo === null) return;

    const room = window.prompt("Qual sala?", item.room || "");
    if (room === null) return;

    const note =
      window.prompt("Observação (opcional):", "Realocado manualmente na tela de equipamentos") || "";

    try {
      await realocarEquipamento(item.id, { allocatedTo, room, note, status: "realocado" });
      await loadEquipamentos();
      await loadRelatorio(normalizedRelatorioParams);
      showFeedback("success", "Realocação registrada com sucesso.");
    } catch (error) {
      console.error("Erro na realocação:", error);
      showFeedback(
        "error",
        "Não foi possível realocar o equipamento.",
        error?.response?.data?.error || "Valide setor/sala e tente novamente."
      );
    }
  };

  const handleEditar = async (item) => {
    if (!isAdmin) return;

    const name = window.prompt("Nome do equipamento:", item.name || "");
    if (name === null || !name.trim()) return;
    const category = window.prompt("Categoria:", item.category || "") ?? item.category;
    const assetTag = window.prompt("Patrimônio:", item.assetTag || "") ?? item.assetTag;
    const serialNumber = window.prompt("Serial:", item.serialNumber || "") ?? item.serialNumber;
    const purchaseDateInput = window.prompt(
      "Data de compra (YYYY-MM-DD):",
      item.purchaseDate ? new Date(item.purchaseDate).toISOString().slice(0, 10) : ""
    );
    if (purchaseDateInput === null) return;
    const room = window.prompt("Sala:", item.room || "") ?? item.room;
    const status = window.prompt("Status (em_estoque, em_uso, realocado, manutencao):", item.status || "em_estoque");
    if (status === null) return;
    const notes = window.prompt("Observações:", item.notes || "") ?? item.notes;

    try {
      await updateEquipamento(item.id, {
        name: name.trim(),
        category: category || null,
        assetTag: assetTag || null,
        serialNumber: serialNumber || null,
        purchaseDate: purchaseDateInput || null,
        room: room || null,
        status: status || item.status,
        notes: notes || null,
      });
      await loadEquipamentos();
      await loadRelatorio(normalizedRelatorioParams);
      showFeedback("success", "Equipamento atualizado com sucesso.");
    } catch (error) {
      console.error("Erro ao editar equipamento:", error);
      showFeedback(
        "error",
        "Não foi possível editar o equipamento.",
        error?.response?.data?.error || "Revise os dados e tente novamente."
      );
    }
  };

  const handleExcluir = async (item) => {
    if (!isAdmin) return;
    const ok = window.confirm(`Deseja excluir o equipamento \"${item.name}\"? Esta ação não pode ser desfeita.`);
    if (!ok) return;

    try {
      await deleteEquipamento(item.id);
      await loadEquipamentos();
      await loadRelatorio(normalizedRelatorioParams);
      showFeedback("success", "Equipamento excluído com sucesso.");
    } catch (error) {
      console.error("Erro ao excluir equipamento:", error);
      showFeedback(
        "error",
        "Não foi possível excluir o equipamento.",
        error?.response?.data?.error || "Tente novamente em alguns instantes."
      );
    }
  };

  const exportCSV = () => {
    const rows = relatorio?.equipamentos || [];
    if (!rows.length) {
      showFeedback("info", "Sem dados para exportar.", "Ajuste os filtros e gere o relatório novamente.");
      return;
    }

    let csv = "Equipamento,Patrimônio,Chegada,Setor atual,Sala,Status\n";
    rows.forEach((item) => {
      const chegada = item.arrivalDate ? new Date(item.arrivalDate).toLocaleDateString("pt-BR") : "-";
      csv += `"${(item.name || "").replace(/"/g, '""')}","${(item.assetTag || "-").replace(/"/g, '""')}","${chegada}","${(item.allocatedTo || "-").replace(/"/g, '""')}","${(item.room || "-").replace(/"/g, '""')}","${(item.status || "-").replace(/"/g, '""')}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "relatorio-equipamentos.csv");
  };

  const exportPDF = () => {
    const rows = relatorio?.equipamentos || [];
    if (!rows.length) {
      showFeedback("info", "Sem dados para exportar.", "Ajuste os filtros e gere o relatório novamente.");
      return;
    }

    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16);
    doc.text("Relatório de Equipamentos", 14, 18);

    if (filtroRelatorio.dateStart || filtroRelatorio.dateEnd || filtroRelatorio.status) {
      doc.setFontSize(10);
      doc.text(
        `Filtros: ${filtroRelatorio.dateStart || "-"} até ${filtroRelatorio.dateEnd || "-"} | Status: ${filtroRelatorio.status || "todos"}`,
        14,
        26
      );
    }

    const tableRows = rows.map((item) => [
      item.name || "-",
      item.assetTag || "-",
      item.arrivalDate ? new Date(item.arrivalDate).toLocaleDateString("pt-BR") : "-",
      item.allocatedTo || "-",
      item.room || "-",
      item.status || "-",
    ]);

    autoTable(doc, {
      startY: 32,
      head: [["Equipamento", "Patrimônio", "Chegada", "Setor atual", "Sala", "Status"]],
      body: tableRows,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [79, 70, 229] },
    });

    doc.save("relatorio-equipamentos.pdf");
  };

  const resumoStatus = useMemo(() => {
    if (!relatorio?.resumoStatus) return [];
    return Object.entries(relatorio.resumoStatus);
  }, [relatorio]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Equipamentos</h1>
        <p className="text-sm text-gray-500 dark:text-gray-300">
          Registre chegada, compra e realocações com relatório consolidado.
        </p>
      </div>

      {feedback?.message && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "border-green-500/50 bg-green-500/10 text-green-200"
              : feedback.type === "error"
              ? "border-red-500/50 bg-red-500/10 text-red-200"
              : "border-amber-500/50 bg-amber-500/10 text-amber-200"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold">{feedback.message}</p>
              {feedback.detail ? <p className="mt-1 opacity-90">{feedback.detail}</p> : null}
            </div>
            <button className="text-xs underline" onClick={() => setFeedback({ type: "", message: "", detail: "" })}>
              Fechar
            </button>
          </div>
        </div>
      )}

      <section className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow space-y-4">
        <h2 className="font-semibold text-lg">Nova chegada de equipamento</h2>
        <p className="text-xs text-gray-500 dark:text-gray-300">
          Todo novo equipamento entra inicialmente no <strong>{TI_SETOR}</strong>.
        </p>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            className={inputClassName}
            placeholder="Nome *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            className={inputClassName}
            placeholder="Categoria"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />
          <input
            className={inputClassName}
            placeholder="Patrimônio"
            value={form.assetTag}
            onChange={(e) => setForm({ ...form, assetTag: e.target.value })}
          />
          <input
            className={inputClassName}
            placeholder="Serial"
            value={form.serialNumber}
            onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
          />
          <input
            className={inputClassName}
            type="date"
            value={form.purchaseDate}
            onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
          />
          <input
            className={inputClassName}
            placeholder="Sala inicial (opcional)"
            value={form.room}
            onChange={(e) => setForm({ ...form, room: e.target.value })}
          />
          <input className={`${inputClassName} md:col-span-1`} value={TI_SETOR} readOnly />
          <select
            className={inputClassName}
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            <option value="em_estoque">Em estoque</option>
            <option value="em_uso">Em uso</option>
            <option value="realocado">Realocado</option>
            <option value="manutencao">Manutenção</option>
          </select>
          <div />
          <textarea
            className={`${inputClassName} md:col-span-3 min-h-24`}
            placeholder="Observações"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          <button
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded md:col-span-3"
            type="submit"
          >
            Registrar chegada
          </button>
        </form>
      </section>

      <section className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow space-y-4">
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <div className="flex-1">
            <label className="text-sm font-medium">Buscar</label>
            <input
              className={inputClassName}
              placeholder="Nome, patrimônio, serial ou setor"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded"
            onClick={loadEquipamentos}
          >
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
                <tr>
                  <td colSpan={6} className="py-4">
                    Carregando...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4 text-gray-500">
                    Nenhum equipamento encontrado.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="py-2">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-gray-500">Patrimônio: {item.assetTag || "-"}</p>
                    </td>
                    <td>
                      {item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString("pt-BR") : "-"}
                    </td>
                    <td>{item.allocatedTo || "-"}</td>
                    <td>{item.room || "-"}</td>
                    <td>{item.status}</td>
                    <td className="space-x-3">
                      <button className="text-indigo-600 hover:underline" onClick={() => handleRealocar(item)}>
                        Realocar
                      </button>
                      {isAdmin && (
                        <>
                          <button className="text-yellow-600 hover:underline" onClick={() => handleEditar(item)}>
                            Editar
                          </button>
                          <button className="text-red-600 hover:underline" onClick={() => handleExcluir(item)}>
                            Excluir
                          </button>
                        </>
                      )}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="date"
            className={inputClassName}
            value={filtroRelatorio.dateStart}
            onChange={(e) => setFiltroRelatorio({ ...filtroRelatorio, dateStart: e.target.value })}
          />
          <input
            type="date"
            className={inputClassName}
            value={filtroRelatorio.dateEnd}
            onChange={(e) => setFiltroRelatorio({ ...filtroRelatorio, dateEnd: e.target.value })}
          />
          <select
            className={inputClassName}
            value={filtroRelatorio.status}
            onChange={(e) => setFiltroRelatorio({ ...filtroRelatorio, status: e.target.value })}
          >
            <option value="">Todos status</option>
            <option value="em_estoque">Em estoque</option>
            <option value="em_uso">Em uso</option>
            <option value="realocado">Realocado</option>
            <option value="manutencao">Manutenção</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-3">
          <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded" onClick={exportCSV}>
            Exportar CSV
          </button>
          <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded" onClick={exportPDF}>
            Exportar PDF
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

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2">Equipamento</th>
                <th>Patrimônio</th>
                <th>Chegada</th>
                <th>Setor atual</th>
                <th>Sala</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(relatorio?.equipamentos || []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4 text-gray-500">
                    Sem dados para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                (relatorio?.equipamentos || []).map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="py-2">{item.name}</td>
                    <td>{item.assetTag || "-"}</td>
                    <td>{item.arrivalDate ? new Date(item.arrivalDate).toLocaleDateString("pt-BR") : "-"}</td>
                    <td>{item.allocatedTo || "-"}</td>
                    <td>{item.room || "-"}</td>
                    <td>{item.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

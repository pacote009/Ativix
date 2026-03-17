// src/pages/Relatorios.jsx
import React, { useEffect, useState, useRef } from "react";
import {
  getRelatorioConcluidasPorUsuario,
  getRelatorioConcluidasPorDia,
  getRelatorioConcluidasPorSemana,
  getRelatorioFixadasPorUsuario,
  getTonerUsageReport,
} from "../services/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import saveAs from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import InfoModal from "../components/InfoModal";

const Relatorios = () => {
  const [activeTab, setActiveTab] = useState("usuarios");
  const [data, setData] = useState(null);
  const [isDark, setIsDark] = useState(false);
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [tonerModalOpen, setTonerModalOpen] = useState(false);
  const [tonerReport, setTonerReport] = useState(null);
  const [selectedTonerId, setSelectedTonerId] = useState(""); // filtro para movimentações
  const [dialog, setDialog] = useState({ open: false, title: "", message: "" });
  const observerRef = useRef(null);

  const showDialog = (title, message) => setDialog({ open: true, title, message });

  useEffect(() => {
    loadData(activeTab, dateStart, dateEnd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, dateStart, dateEnd]);

  // detect theme to change chart colors
  useEffect(() => {
    const detect = () => {
      const hasDark = typeof document !== "undefined" && (document.documentElement.classList.contains("dark") || document.body.classList.contains("dark"));
      setIsDark(Boolean(hasDark));
    };
    detect();
    const target = document.documentElement;
    if (target) {
      const mo = new MutationObserver(() => detect());
      mo.observe(target, { attributes: true, attributeFilter: ["class"] });
      observerRef.current = mo;
    }
    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, []);

  const loadData = async (tab, dateStartParam = null, dateEndParam = null) => {
    // if tab 'toners' was selected, carregamos relatório de toners e não as atividades
    if (tab === "toners") {
      await loadTonerReport(dateStartParam, dateEndParam, true); // carrega e abre modal
      setData(null);
      return;
    }

    let result = {};
    if (tab === "usuarios") result = await getRelatorioConcluidasPorUsuario(dateStartParam || null, dateEndParam || null);
    if (tab === "dia") result = await getRelatorioConcluidasPorDia(dateStartParam || null, dateEndParam || null);
    if (tab === "semana") result = await getRelatorioConcluidasPorSemana(dateStartParam || null, dateEndParam || null);
    if (tab === "fixadas") result = await getRelatorioFixadasPorUsuario(dateStartParam || null, dateEndParam || null);
    setData(result);
  };

  const exportCSV = () => {
    if (!data) return;
    let csv = "Usuário,Chave,Atividade\n";
    Object.entries(data).forEach(([user, group]) => {
      if (Array.isArray(group)) {
        group.forEach((a) => {
          csv += `${user},-,"${(a.title || "").replace(/"/g, '""')}"\n`;
        });
      } else {
        Object.entries(group).forEach(([key, atividades]) => {
          atividades.forEach((a) => {
            csv += `${user},${key},"${(a.title || "").replace(/"/g, '""')}"\n`;
          });
        });
      }
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, `relatorio-${activeTab}.csv`);
  };

  const exportPDF = () => {
    if (!data) return;
    const doc = new jsPDF({ orientation: "landscape" });

    doc.setFontSize(16);
    doc.text(`Relatório: ${activeTab}`, 14, 20);

    let rows = [];
    Object.entries(data).forEach(([user, group]) => {
      if (Array.isArray(group)) {
        group.forEach((a) =>
          rows.push([
            user,
            "-",
            a.title || "(sem título)",
            a.status || "-",
            a.createdAt ? new Date(a.createdAt).toLocaleString() : "-",
            a.completedAt ? new Date(a.completedAt).toLocaleString() : "-"
          ])
        );
      } else {
        Object.entries(group).forEach(([key, atividades]) => {
          atividades.forEach((a) =>
            rows.push([
              user,
              key,
              a.title || "(sem título)",
              a.status || "-",
              a.createdAt ? new Date(a.createdAt).toLocaleString() : "-",
              a.completedAt ? new Date(a.completedAt).toLocaleString() : "-"
            ])
          );
        });
      }
    });

    autoTable(doc, {
      head: [["Usuário", "Chave", "Atividade", "Status", "Criada em", "Concluída em"]],
      body: rows,
      startY: 30,
      styles: { fontSize: 9, overflow: "linebreak" },
      headStyles: { fillColor: [99, 102, 241] },
      didDrawPage: (dataArg) => {
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.text(
          `Página ${dataArg.pageNumber} de ${pageCount}`,
          doc.internal.pageSize.width - 40,
          doc.internal.pageSize.height - 10
        );
      }
    });

    doc.save(`relatorio-${activeTab}.pdf`);
  };

  // Carrega o relatório de toners. openModal default true (quando chamado via botão/tab)
  const loadTonerReport = async (start = dateStart || null, end = dateEnd || null, openModal = true) => {
    try {
      const rep = await getTonerUsageReport(start, end);
      // garantir estrutura mínima para o frontend
      const normalized = {
        topDestinations: rep.topDestinations || [],
        entriesPerWeek: rep.entriesPerWeek || {},
        currentStockByToner: rep.currentStockByToner || {},
        perTonerStats: rep.perTonerStats || {},
        movementsByToner: rep.movementsByToner || {}, // espera-se que backend envie isso
      };
      setTonerReport(normalized);
      setSelectedTonerId(""); // reset seleção ao carregar
      if (openModal) setTonerModalOpen(true);
    } catch (err) {
      console.error("Erro ao carregar relatório de toners:", err);
      showDialog("Falha ao carregar relatório", "Erro ao carregar relatório de toners.");
    }
  };

  // Exportar PDF do relatório de toners (inclui movimentações detalhadas)
  const exportTonerPDF = async () => {
    try {
      const rep = tonerReport || (await getTonerUsageReport(dateStart || null, dateEnd || null));
      if (!rep) {
        showDialog("Sem dados", "Sem dados de toner para exportar.");
        return;
      }

      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(16);
      doc.text("Relatório de Uso de Toners", 14, 18);
      if (dateStart || dateEnd) {
        doc.setFontSize(10);
        doc.text(`Período: ${dateStart || "-"} até ${dateEnd || "-"}`, 14, 26);
      }

      // tabela principal: estoque/entradas/consumo/tempo médio
      const rows = [];
      const current = rep.currentStockByToner || {};
      const stats = rep.perTonerStats || {};

      Object.values(current).forEach((t) => {
        const s = stats[t.id] || {};
        rows.push([
          t.id,
          t.model || "-",
          t.sku || "-",
          t.stock ?? 0,
          s.entries ?? 0,
          s.consumption ?? 0,
          s.avgTimeDays ?? "-"
        ]);
      });

      autoTable(doc, {
        startY: 36,
        head: [["ID", "Modelo", "SKU", "Estoque", "Entradas", "Consumo", "Tempo médio (dias)"]],
        body: rows,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [60, 60, 60] }
      });

      // Top destinos (se houver)
      let nextY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 8 : 36;
      if (rep.topDestinations && rep.topDestinations.length) {
        doc.setFontSize(12);
        doc.text("Top Destinos", 14, nextY + 6);
        const dd = rep.topDestinations.map(d => [d.destination || "-", d.quantity || 0]);
        autoTable(doc, {
          startY: nextY + 10,
          head: [["Destino", "Quantidade"]],
          body: dd,
          styles: { fontSize: 9 },
        });
        nextY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 8 : nextY + 8;
      }

      // Movimentações completas (flatten)
      const movByToner = rep.movementsByToner || {}; // espera-se que backend retorne este map
      const movementsFlatten = [];
      Object.entries(movByToner).forEach(([tonerId, arr]) => {
        (arr || []).forEach((m) => {
          movementsFlatten.push({
            tonerId: Number(tonerId),
            tonerModel: (rep.currentStockByToner && rep.currentStockByToner[tonerId] && rep.currentStockByToner[tonerId].model) || "-",
            id: m.id,
            date: m.createdAt,
            type: m.type,
            quantity: m.quantity,
            origin: m.origin || "-",
            destination: m.destination || "-",
            user: m.user || "-",
            printer: (m.printerName || (m.printer && m.printer.name) || (m.printerId ? `#${m.printerId}` : "-")),
            note: m.note || "-"
          });
        });
      });

      if (movementsFlatten.length) {
        // compactar tabela de movimentos (pode ficar longa)
        doc.setFontSize(12);
        doc.text("Movimentações (detalhado)", 14, nextY + 6);
        const movRows = movementsFlatten.map(m => [
          m.tonerModel,
          m.tonerId,
          new Date(m.date).toLocaleString(),
          m.type,
          m.quantity,
          m.origin,
          m.destination,
          m.user,
          m.printer,
          m.note
        ]);

        autoTable(doc, {
          startY: nextY + 10,
          head: [["Toner", "TonerID", "Data", "Tipo", "Qtd", "Origem", "Destino", "Usuário", "Impressora", "Obs"]],
          body: movRows,
          styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak" },
          headStyles: { fillColor: [100, 100, 100] },
          theme: "striped",
          showHead: "everyPage"
        });
      }

      doc.save(`relatorio-toners-${(dateStart||'all')}-${(dateEnd||'all')}.pdf`);
    } catch (err) {
      console.error("Erro exportar PDF toners:", err);
      showDialog("Falha ao exportar PDF", "Erro ao exportar PDF do relatório de toners.");
    }
  };

  // Exportar CSV do relatório de toners (inclui movimentações detalhadas)
  const exportTonerCSV = async () => {
    try {
      const rep = tonerReport || (await getTonerUsageReport(dateStart || null, dateEnd || null));
      if (!rep) {
        showDialog("Sem dados", "Sem dados de toner para exportar.");
        return;
      }

      // CSV principal (estoque e stats)
      const lines = [["ID","Modelo","SKU","Estoque","Entradas","Consumo","Tempo_medio_dias"]];
      Object.values(rep.currentStockByToner || {}).forEach(t => {
        const s = (rep.perTonerStats && rep.perTonerStats[t.id]) || {};
        lines.push([t.id, t.model, t.sku||"", t.stock||0, s.entries||0, s.consumption||0, s.avgTimeDays||""]);
      });

      // Linha em branco + Top Destinos
      lines.push([]);
      lines.push(["Top Destinos", "Quantidade"]);
      (rep.topDestinations || []).forEach(d => lines.push([d.destination || "-", d.quantity || 0]));

      // Linha em branco + Movimentações detalhadas
      lines.push([]);
      lines.push(["Movimentações - Toner", "TonerID", "MovID", "Data", "Tipo", "Qtd", "Origem", "Destino", "Usuário", "Impressora", "Obs"]);

      const movByToner = rep.movementsByToner || {};
      Object.entries(movByToner).forEach(([tonerId, arr]) => {
        (arr || []).forEach(m => {
          const tonerModel = (rep.currentStockByToner && rep.currentStockByToner[tonerId] && rep.currentStockByToner[tonerId].model) || "-";
          const printerName = (m.printerName || (m.printer && m.printer.name) || (m.printerId ? `#${m.printerId}` : "-"));
          lines.push([
            tonerModel,
            tonerId,
            m.id,
            (m.createdAt ? new Date(m.createdAt).toLocaleString() : ""),
            m.type,
            m.quantity,
            m.origin || "",
            m.destination || "",
            m.user || "",
            printerName,
            (m.note || "")
          ]);
        });
      });

      const csv = lines.map(r => r.map(c => `"${(c||"").toString().replace(/"/g,'""')}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      saveAs(blob, `relatorio-toners.csv`);
    } catch (err) {
      console.error(err);
      showDialog("Falha ao exportar CSV", "Erro ao exportar CSV de toners.");
    }
  };

  const chartData = data
    ? Object.entries(data).map(([user, group]) => ({
        name: user,
        count: Array.isArray(group) ? group.length : Object.values(group).reduce((acc, v) => acc + v.length, 0),
      }))
    : [];

  // cores para Recharts de acordo com tema
  const axisStroke = isDark ? "#d1d5db" : "#374151";
  const gridStroke = isDark ? "#2d3748" : "#e5e7eb";
  const tooltipWrapperStyle = { backgroundColor: isDark ? "#111827" : "#fff", color: isDark ? "#f9fafb" : "#111827" };

  // helper para classes dos botões de tab:
  const tabClass = (tab) =>
    `px-4 py-2 rounded focus:outline-none transition inline-flex items-center gap-2 ${
      activeTab === tab
        ? "bg-indigo-600 text-white dark:bg-indigo-500"
        : "bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-100 ring-1 ring-gray-300 dark:ring-gray-700"
    }`;

  return (
    <div className="min-h-[200px]">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">Relatórios de Atividades</h1>

      {/* Tabs */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <button onClick={() => setActiveTab("usuarios")} className={tabClass("usuarios")}>Concluídas por Usuário</button>
        <button onClick={() => setActiveTab("dia")} className={tabClass("dia")}>Concluídas por Dia</button>
        <button onClick={() => setActiveTab("semana")} className={tabClass("semana")}>Concluídas por Semana</button>
        <button onClick={() => setActiveTab("fixadas")} className={tabClass("fixadas")}>Fixadas por Usuário</button>

        {/* nova aba TONERS — ao lado das outras tabs */}
        <button
          onClick={() => {
            setActiveTab("toners");
            loadTonerReport(dateStart || null, dateEnd || null, true);
          }}
          className={tabClass("toners")}
        >
          Relatório de Toners
        </button>
      </div>

      {/* Range de datas */}
      <div className="flex gap-3 mb-4 items-end flex-wrap">
        <div className="flex flex-col">
          <label className="text-sm text-gray-600 dark:text-gray-300">Data início</label>
          <input
            type="date"
            value={dateStart}
            onChange={(e) => setDateStart(e.target.value)}
            className="border rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm text-gray-600 dark:text-gray-300">Data fim</label>
          <input
            type="date"
            value={dateEnd}
            onChange={(e) => setDateEnd(e.target.value)}
            className="border rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>

        <div className="ml-auto flex gap-2">
          <button onClick={() => { setDateStart(""); setDateEnd(""); }} className="px-3 py-2 rounded bg-gray-300 dark:bg-gray-600">
            Limpar
          </button>
        </div>
      </div>

      {/* Botões de Exportar */}
      <div className="flex gap-3 mb-6">
        <button onClick={exportCSV} className="px-4 py-2 bg-green-600 text-white rounded dark:bg-green-500">Exportar CSV</button>
        <button onClick={exportPDF} className="px-4 py-2 bg-red-600 text-white rounded dark:bg-red-500">Exportar PDF</button>

        {/* Botões específicos para Toners (ao lado do Exportar PDF) */}
        <button onClick={exportTonerPDF} className="px-4 py-2 bg-indigo-600 text-white rounded dark:bg-indigo-500">Exportar PDF (Toners)</button>
        <button onClick={exportTonerCSV} className="px-4 py-2 bg-indigo-400 text-white rounded dark:bg-indigo-500">Exportar CSV (Toners)</button>
      </div>

      {/* Se a aba ativa não for 'toners' mostramos o gráfico e lista de atividades */}
      {activeTab !== "toners" && (
        <>
          <div className="bg-white dark:bg-gray-900 shadow rounded p-4 mb-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Visão Geral</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="name" stroke={axisStroke} tick={{ fill: axisStroke }} />
                <YAxis stroke={axisStroke} tick={{ fill: axisStroke }} />
                <Tooltip wrapperStyle={tooltipWrapperStyle} />
                <Legend wrapperStyle={{ color: isDark ? "#e5e7eb" : "#111827" }} />
                <Bar dataKey="count" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white dark:bg-gray-900 shadow rounded p-4">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Detalhes</h2>
            {data ? (
              <div className="space-y-4">
                {Object.entries(data).map(([user, group]) => (
                  <div key={user} className="text-gray-800 dark:text-gray-200">
                    <h3 className="font-bold">{user}</h3>
                    <ul className="list-disc pl-6">
                      {Array.isArray(group)
                        ? group.map((a) => <li key={a.id}>{a.title}</li>)
                        : Object.entries(group).map(([key, atividades]) => (
                            <li key={key}>
                              <strong className="text-gray-900 dark:text-gray-100">{key}:</strong>
                              <ul className="list-circle pl-6">
                                {atividades.map((a) => <li key={a.id}>{a.title}</li>)}
                              </ul>
                            </li>
                          ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-700 dark:text-gray-300">Carregando...</p>
            )}
          </div>
        </>
      )}

      {/* ---------------- Toner Report Modal ---------------- */}
      {tonerModalOpen && tonerReport && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 bg-black bg-opacity-40 p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-5xl rounded-2xl p-5 shadow-lg overflow-auto max-h-[85vh]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Relatório de Uso de Toners</h3>
              <div className="flex gap-2">
                <button onClick={() => { setTonerModalOpen(false); setTonerReport(null); setSelectedTonerId(""); }} className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700">Fechar</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-900 p-3 rounded shadow-sm">
                <h4 className="font-medium mb-2">Top Destinos</h4>
                {tonerReport.topDestinations && tonerReport.topDestinations.length ? (
                  <ol className="list-decimal pl-5">
                    {tonerReport.topDestinations.map((d, i) => (
                      <li key={i} className="flex justify-between">
                        <span>{d.destination}</span><strong>{d.quantity}</strong>
                      </li>
                    ))}
                  </ol>
                ) : <p className="text-sm text-gray-500">Nenhum destino registrado.</p>}
              </div>

              <div className="bg-white dark:bg-gray-900 p-3 rounded shadow-sm">
                <h4 className="font-medium mb-2">Entradas por semana</h4>
                {tonerReport.entriesPerWeek && Object.keys(tonerReport.entriesPerWeek).length ? (
                  <ul className="text-sm">
                    {Object.entries(tonerReport.entriesPerWeek).map(([k,v]) => <li key={k} className="flex justify-between"><span>{k}</span><strong>{v}</strong></li>)}
                  </ul>
                ) : <p className="text-sm text-gray-500">Sem dados de entrada.</p>}
              </div>
            </div>

            <div className="mt-4 bg-white dark:bg-gray-900 p-3 rounded shadow-sm">
              <h4 className="font-medium mb-2">Estoque atual por toner</h4>
              <div className="overflow-auto max-h-64">
                <table className="w-full text-sm">
                  <thead className="text-left">
                    <tr><th>Modelo</th><th>SKU</th><th>Estoque</th><th>Entradas</th><th>Consumo</th><th>Tempo médio (dias)</th></tr>
                  </thead>
                  <tbody>
                    {Object.values(tonerReport.currentStockByToner).map(t => {
                      const stat = (tonerReport.perTonerStats && tonerReport.perTonerStats[t.id]) || {};
                      return (
                        <tr key={t.id} className="border-t">
                          <td className="py-1">{t.model}</td>
                          <td>{t.sku || "-"}</td>
                          <td>{t.stock}</td>
                          <td>{stat.entries ?? 0}</td>
                          <td>{stat.consumption ?? 0}</td>
                          <td>{stat.avgTimeDays !== null && stat.avgTimeDays !== undefined ? stat.avgTimeDays : "-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ---------------- Movimentações (novo) ---------------- */}
            <div className="mt-4 bg-white dark:bg-gray-900 p-3 rounded shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Movimentações</h4>
                <div className="flex gap-2 items-center">
                  <label className="text-sm mr-2">Toner:</label>
                  <select
                    className="border rounded px-2 py-1 bg-white dark:bg-gray-800 text-sm"
                    value={selectedTonerId || ""}
                    onChange={(e) => setSelectedTonerId(e.target.value ? Number(e.target.value) : "")}
                  >
                    <option value="">— Todos —</option>
                    {Object.values(tonerReport.currentStockByToner).map(t => (
                      <option key={t.id} value={t.id}>{t.model} (#{t.id})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="overflow-auto max-h-64">
                <table className="w-full text-sm">
                  <thead className="text-left">
                    <tr>
                      <th className="pr-4">Data</th>
                      <th>Tipo</th>
                      <th>Qtd</th>
                      <th>Origem</th>
                      <th>Destino</th>
                      <th>Usuário</th>
                      <th>Impressora</th>
                      <th>Obs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const rows = [];
                      const movMap = tonerReport.movementsByToner || {};
                      const keys = selectedTonerId ? [String(selectedTonerId)] : Object.keys(movMap).sort();
                      keys.forEach(k => {
                        const arr = movMap[k] || [];
                        // mostrar em ordem decrescente (mais recente primeiro)
                        arr.slice().reverse().forEach(m => {
                          rows.push(
                            <tr key={m.id} className="border-t">
                              <td className="pr-4">{new Date(m.createdAt).toLocaleString()}</td>
                              <td className="capitalize">{m.type}</td>
                              <td>{m.quantity}</td>
                              <td>{m.origin || "-"}</td>
                              <td>{m.destination || "-"}</td>
                              <td>{m.user || "-"}</td>
                              <td>{m.printerName || (m.printerId ? `#${m.printerId}` : "-")}</td>
                              <td>{m.note || "-"}</td>
                            </tr>
                          );
                        });
                      });
                      if (rows.length === 0) {
                        return <tr><td colSpan={8} className="py-2 text-sm text-gray-500">Nenhuma movimentação encontrada.</td></tr>;
                      }
                      return rows;
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
            {/* ---------------------------------------------------- */}

          </div>
        </div>
      )}
      {/* --------------------------------------------------- */}

      <InfoModal
        open={dialog.open}
        title={dialog.title || "Aviso"}
        message={dialog.message}
        onClose={() => setDialog({ open: false, title: "", message: "" })}
      />

    </div>
  );
};

export default Relatorios;

// src/pages/Relatorios.jsx
import React, { useEffect, useState, useRef } from "react";
import {
  getRelatorioConcluidasPorUsuario,
  getRelatorioConcluidasPorDia,
  getRelatorioConcluidasPorSemana,
  getRelatorioFixadasPorUsuario,
} from "../services/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import saveAs from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const Relatorios = () => {
  const [activeTab, setActiveTab] = useState("usuarios");
  const [data, setData] = useState(null);
  const [isDark, setIsDark] = useState(false);
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const observerRef = useRef(null);

  useEffect(() => {
    loadData(activeTab, dateStart, dateEnd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, dateStart, dateEnd]);

  // detecta se existe a classe 'dark' no root e observa mudanças (para atualizar o gráfico)
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

  const chartData = data
    ? Object.entries(data).map(([user, group]) => ({
        name: user,
        count: Array.isArray(group)
          ? group.length
          : Object.values(group).reduce((acc, v) => acc + v.length, 0),
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
        <button onClick={() => setActiveTab("usuarios")} className={tabClass("usuarios")}>
          Concluídas por Usuário
        </button>

        <button onClick={() => setActiveTab("dia")} className={tabClass("dia")}>
          Concluídas por Dia
        </button>

        <button onClick={() => setActiveTab("semana")} className={tabClass("semana")}>
          Concluídas por Semana
        </button>

        <button onClick={() => setActiveTab("fixadas")} className={tabClass("fixadas")}>
          Fixadas por Usuário
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
        <button onClick={exportCSV} className="px-4 py-2 bg-green-600 text-white rounded dark:bg-green-500">
          Exportar CSV
        </button>
        <button onClick={exportPDF} className="px-4 py-2 bg-red-600 text-white rounded dark:bg-red-500">
          Exportar PDF
        </button>
      </div>

      {/* Gráfico */}
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

      {/* Lista detalhada */}
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
    </div>
  );
};

export default Relatorios;

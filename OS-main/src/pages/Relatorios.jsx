// src/pages/Relatorios.jsx
import React, { useEffect, useState } from "react";
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
import autoTable from "jspdf-autotable"; // <-- ajuste aqui

const Relatorios = () => {
  const [activeTab, setActiveTab] = useState("usuarios");
  const [data, setData] = useState(null);

  useEffect(() => {
    loadData(activeTab);
  }, [activeTab]);

  const loadData = async (tab) => {
    let result = {};
    if (tab === "usuarios") result = await getRelatorioConcluidasPorUsuario();
    if (tab === "dia") result = await getRelatorioConcluidasPorDia();
    if (tab === "semana") result = await getRelatorioConcluidasPorSemana();
    if (tab === "fixadas") result = await getRelatorioFixadasPorUsuario();
    setData(result);
  };

  const exportCSV = () => {
    if (!data) return;
    let csv = "Usuário,Chave,Atividade\n";
    Object.entries(data).forEach(([user, group]) => {
      if (Array.isArray(group)) {
        group.forEach((a) => {
          csv += `${user},-,"${a.title}"\n`;
        });
      } else {
        Object.entries(group).forEach(([key, atividades]) => {
          atividades.forEach((a) => {
            csv += `${user},${key},"${a.title}"\n`;
          });
        });
      }
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, `relatorio-${activeTab}.csv`);
  };

  const exportPDF = () => {
  if (!data) return;
  const doc = new jsPDF({ orientation: "landscape" }); // 👈 paisagem

  // Título
  doc.setFontSize(16);
  doc.text(`Relatório: ${activeTab}`, 14, 20);

  // Montar linhas
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

  // Criar tabela em modo paisagem
  autoTable(doc, {
    head: [["Usuário", "Chave", "Atividade", "Status", "Criada em", "Concluída em"]],
    body: rows,
    startY: 30,
    styles: { fontSize: 9, overflow: "linebreak" }, // deixa quebrar linha se precisar
    headStyles: { fillColor: [99, 102, 241] },
    didDrawPage: (data) => {
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.text(
        `Página ${data.pageNumber} de ${pageCount}`,
        doc.internal.pageSize.width - 40,
        doc.internal.pageSize.height - 10
      );
    }
  });

  doc.save(`relatorio-${activeTab}.pdf`);
};

  // Preparar dados para gráfico (contagem)
  const chartData = data
    ? Object.entries(data).map(([user, group]) => ({
        name: user,
        count: Array.isArray(group)
          ? group.length
          : Object.values(group).reduce((acc, v) => acc + v.length, 0),
      }))
    : [];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Relatórios de Atividades</h1>

      {/* Tabs */}
      <div className="flex gap-3 mb-6">
        <button onClick={() => setActiveTab("usuarios")} className={`px-4 py-2 rounded ${activeTab === "usuarios" ? "bg-indigo-600 text-white" : "bg-gray-200"}`}>
          Concluídas por Usuário
        </button>
        <button onClick={() => setActiveTab("dia")} className={`px-4 py-2 rounded ${activeTab === "dia" ? "bg-indigo-600 text-white" : "bg-gray-200"}`}>
          Concluídas por Dia
        </button>
        <button onClick={() => setActiveTab("semana")} className={`px-4 py-2 rounded ${activeTab === "semana" ? "bg-indigo-600 text-white" : "bg-gray-200"}`}>
          Concluídas por Semana
        </button>
        <button onClick={() => setActiveTab("fixadas")} className={`px-4 py-2 rounded ${activeTab === "fixadas" ? "bg-indigo-600 text-white" : "bg-gray-200"}`}>
          Fixadas por Usuário
        </button>
      </div>

      {/* Botões de Exportar */}
      <div className="flex gap-3 mb-6">
        <button onClick={exportCSV} className="px-4 py-2 bg-green-600 text-white rounded">Exportar CSV</button>
        <button onClick={exportPDF} className="px-4 py-2 bg-red-600 text-white rounded">Exportar PDF</button>
      </div>

      {/* Gráfico */}
      <div className="bg-white shadow rounded p-4 mb-6">
        <h2 className="text-lg font-semibold mb-4">Visão Geral</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#6366f1" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Lista detalhada */}
      <div className="bg-white shadow rounded p-4">
        <h2 className="text-lg font-semibold mb-4">Detalhes</h2>
        {data ? (
          <div className="space-y-4">
            {Object.entries(data).map(([user, group]) => (
              <div key={user}>
                <h3 className="font-bold">{user}</h3>
                <ul className="list-disc pl-6">
                  {Array.isArray(group)
                    ? group.map((a) => <li key={a.id}>{a.title}</li>)
                    : Object.entries(group).map(([key, atividades]) => (
                        <li key={key}>
                          <strong>{key}:</strong>
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
          <p>Carregando...</p>
        )}
      </div>
    </div>
  );
};

export default Relatorios;

import React, { useEffect, useState } from "react";
import { ClipboardDocumentListIcon, CheckCircleIcon, ClockIcon } from "@heroicons/react/24/outline";
import { useNavigate, useLocation } from "react-router-dom";
import { getDashboardData, getRelatorioConcluidasPorSemana, getDashboard } from "../services/api";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid
} from "recharts";
import { motion } from "framer-motion";

const UserDashboard = () => {
  // src/pages/Dashboard.jsx
  const [stats, setStats] = useState({ concluidas: 0, pendentes: 0, projetos: 0 });
  const [lineData, setLineData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();
  const location = useLocation(); // para reagir a mudanças de rota

  useEffect(() => {
    let isMounted = true;

    const fetchDashboard = async () => {
  setLoading(true);
  setErrorMsg("");
  try {
    let dashboardStats;

    // 1) Tenta puxar do backend (/dashboard)
    try {
      dashboardStats = await getDashboard();
    } catch (backendError) {
      console.warn("⚠️ Backend /dashboard falhou, usando cálculo local:", backendError);
      dashboardStats = await getDashboardData();
    }

    if (!isMounted) return;

    // defensivo: se o backend retornar algo inesperado, usamos 0 como fallback
    setStats({
      concluidas: Number(dashboardStats?.concluidas) || 0,
      pendentes: Number(dashboardStats?.pendentes) || 0,
      projetos: Number(dashboardStats?.totalProjetos) || 0,
    });

    // 2) Relatório por semana (gera dados para gráfico de linha)
    const result = await getRelatorioConcluidasPorSemana();

    if (!result || typeof result !== "object") {
      setLineData([]);
      return;
    }

    const parsed = {};
    Object.entries(result).forEach(([usuario, semanas]) => {
      if (!semanas || typeof semanas !== "object") return;
      Object.entries(semanas).forEach(([semana, atividades]) => {
        if (!Array.isArray(atividades)) return;
        if (!parsed[semana]) parsed[semana] = { semana, concluidas: 0, pendentes: 0 };

        atividades.forEach((a) => {
          if (!a) return;
          const status = String(a.status || "").toLowerCase();
          if (status.includes("finalizada") || status.includes("conclu")) {
            parsed[semana].concluidas += 1;
          } else if (status === "pendente") {
            parsed[semana].pendentes += 1;
          }
        });
      });
    });

    const sorted = Object.values(parsed).sort((a, b) => {
      const parseStart = (intervalStr) => {
        if (!intervalStr) return new Date(0);
        const [start] = String(intervalStr).split(" - ");
        const [d, m] = start.split("/").map(Number);
        const year = new Date().getFullYear();
        return new Date(year, (m || 1) - 1, d || 1);
      };
      return parseStart(a.semana) - parseStart(b.semana);
    });

    if (isMounted) setLineData(sorted);
  } catch (err) {
    console.error("Erro geral no Dashboard:", err);
    if (isMounted) setErrorMsg("Erro ao carregar dados. Verifique o servidor.");
  } finally {
    if (isMounted) setLoading(false);
  }
};


    fetchDashboard();

    // Atualiza automaticamente, e também ao mudar de rota (location)
    const interval = setInterval(fetchDashboard, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]); // reexecuta quando a rota muda (útil ao clicar no sidebar)

  if (loading) return <p className="text-gray-500 dark:text-gray-300">Carregando...</p>;
  if (errorMsg) return <p className="text-red-500">{errorMsg}</p>;

  const pieData = [
    { name: "Concluídas", value: stats.concluidas },
    { name: "Pendentes", value: stats.pendentes },
    { name: "Projetos", value: stats.projetos },
  ];
  const COLORS = ["#22c55e", "#eab308", "#6366f1"];

  return (
    <div className="space-y-8 p-6 bg-gray-100 dark:bg-gray-900 min-h-screen transition-colors">
      <motion.h1
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-3xl font-bold text-gray-800 dark:text-white"
      >
        Dashboard
      </motion.h1>
      <p className="text-gray-600 dark:text-gray-400">Resumo atualizado das suas atividades e projetos.</p>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MotionCard
          onClick={() => navigate("/user/projetos")}
          icon={<ClipboardDocumentListIcon className="h-8 w-8" />}
          color="indigo"
          title="Projetos Ativos"
          value={stats.projetos}
        />
        <MotionCard
          onClick={() => navigate("/user/atividades?status=concluidas")}
          icon={<CheckCircleIcon className="h-8 w-8" />}
          color="green"
          title="Atividades Concluídas"
          value={stats.concluidas}
        />
        <MotionCard
          onClick={() => navigate("/user/atividades?status=pendentes")}
          icon={<ClockIcon className="h-8 w-8" />}
          color="yellow"
          title="Pendentes"
          value={stats.pendentes}
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gráfico Pizza */}
        <motion.div
          className="bg-white dark:bg-gray-800 shadow-lg rounded-2xl p-6 border border-gray-200 dark:border-gray-700"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Distribuição</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={90}>
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Gráfico Linha */}
        <motion.div
          className="bg-white dark:bg-gray-800 shadow-lg rounded-2xl p-6 border border-gray-200 dark:border-gray-700"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Progresso Semanal</h2>

          {lineData.length === 0 ? (
            <p className="text-gray-500">Nenhum dado semanal disponível.</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                <XAxis dataKey="semana" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="concluidas" stroke="#22c55e" strokeWidth={2} />
                <Line type="monotone" dataKey="pendentes" stroke="#eab308" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>
    </div>
  );
};

const MotionCard = ({ icon, color, title, value, onClick }) => {
  const colors = {
    indigo: "bg-indigo-100 text-indigo-600",
    green: "bg-green-100 text-green-600",
    yellow: "bg-yellow-100 text-yellow-600",
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="bg-white dark:bg-gray-800 shadow-lg rounded-2xl p-6 flex items-center gap-4 border border-gray-200 dark:border-gray-700 transition-colors"
    >
      <div className={`${colors[color]} p-3 rounded-full`}>{icon}</div>
      <div className="text-left">
        <p className="text-gray-500 dark:text-gray-400">{title}</p>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{value}</h2>
      </div>
    </motion.button>
  );
};

export default UserDashboard;

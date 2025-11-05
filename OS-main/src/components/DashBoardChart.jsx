import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Registrar módulos necessários
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const Dashboardchart = () => {
  const data = {
    labels: ['Funcionário 1', 'Funcionário 2', 'Funcionário 3'],
    datasets: [
      {
        label: 'Atividades Registradas',
        data: [12, 19, 3],
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
      },
    ],
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h2 className="font-bold text-lg mb-4">Atividades por Funcionário</h2>
      <Bar data={data} />
    </div>
  );
};

export default Dashboardchart;
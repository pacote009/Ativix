import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";

const Admin = () => {
  const location = useLocation(); // pega a rota atual

  return (
    <div className="flex min-h-screen bg-gray-100 text-gray-900">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-7xl mx-auto">
          <Outlet key={location.pathname} /> {/* ⚡️ Força remount ao mudar de rota */}
        </div>
      </main>
    </div>
  );
};

export default Admin;

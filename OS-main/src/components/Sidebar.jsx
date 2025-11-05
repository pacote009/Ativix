import { Link, useNavigate } from "react-router-dom";
import { 
  HomeIcon, 
  ClipboardDocumentListIcon, 
  ChartBarIcon, 
  UserCircleIcon,
  ArrowLeftOnRectangleIcon
} from "@heroicons/react/24/outline";
import { getCurrentUser, logout } from "../auth";
import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "@heroicons/react/24/solid";

export default function Sidebar({ onClose }) {
  const user = getCurrentUser();
  const isAdmin = user?.role === "ADMIN"; // 🔹 padronizamos em maiúsculo
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const savedMode = localStorage.getItem("darkMode") === "true";
    setDarkMode(savedMode);
    if (savedMode) {
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem("darkMode", newMode);
    document.documentElement.classList.toggle("dark");
  };

  const handleLogout = () => {
    if (window.confirm("Tem certeza que deseja sair?")) {
      logout();
      navigate("/");
    }
  };

  return (
    <div className="flex flex-col justify-between min-h-full w-64 bg-gray-800 dark:bg-gray-900 text-white p-6 transition-colors">
      <div className="mb-10">
        <h2 className="text-2xl font-bold">Ativix</h2>
        <p className="text-gray-400 text-sm">Gestão de Chamados</p>
      </div>
      
      <nav className="space-y-2 flex-1">
        {/* Dashboard */}
        <Link 
          to={isAdmin ? "/admin/dashboard" : "/user/dashboard"} 
          onClick={() => onClose && onClose()} 
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700 transition-all"
        >
          <ChartBarIcon className="h-5 w-5" /> 
          <span>Dashboard</span>
        </Link>

        {/* Projetos */}
        <Link 
          to={isAdmin ? "/admin/projetos" : "/user/projetos"} 
          onClick={() => onClose && onClose()} 
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700 transition-all"
        >
          <ClipboardDocumentListIcon className="h-5 w-5" /> 
          <span>Projetos</span>
        </Link>

        {/* Atividades */}
        <Link 
          to={isAdmin ? "/admin/atividades" : "/user/atividades"} 
          onClick={() => onClose && onClose()} 
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700 transition-all"
        >
          <HomeIcon className="h-5 w-5" /> 
          <span>Atividades</span>
        </Link>

        {/* Apenas Admin */}
        {isAdmin && (
          <>
            <Link 
              to="/admin/cadastro-usuario" 
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700 transition-all"
            >
              <UserCircleIcon className="h-5 w-5" /> 
              <span>Cadastro Usuário</span>
            </Link>

            <Link 
              to="/admin/relatorios" 
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700 transition-all"
            >
              <UserCircleIcon className="h-5 w-5" /> 
              <span>Relatórios</span>
            </Link>
          </>
        )}
      </nav>
      
      <div className="mt-auto pt-6 border-t border-gray-700 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-gray-400">
            <UserCircleIcon className="h-5 w-5" />
            <span>{user?.username}</span>
          </div>
          <button
            onClick={toggleDarkMode}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
          >
            {darkMode ? (
              <SunIcon className="h-5 w-5 text-yellow-400" />
            ) : (
              <MoonIcon className="h-5 w-5 text-gray-300" />
            )}
          </button>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 p-3 w-full rounded-lg text-red-400 hover:text-red-300 hover:bg-gray-700 transition-all"
        >
          <ArrowLeftOnRectangleIcon className="h-5 w-5" />
          <span>Sair</span>
        </button>
      </div>
    </div>
  );
}

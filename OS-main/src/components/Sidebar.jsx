// src/components/Sidebar.jsx
import { Link, useNavigate } from "react-router-dom";
import {
  HomeIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  UserCircleIcon,
  ArrowLeftOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { getCurrentUser, logout } from "../auth";
import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "@heroicons/react/24/solid";

export default function Sidebar({ open = false, onClose = () => {} }) {
  const user = getCurrentUser();
  const isAdmin = user?.role?.toUpperCase?.() === "ADMIN";
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);

  // inicializa dark mode
  useEffect(() => {
    const savedMode = localStorage.getItem("darkMode") === "true";
    setDarkMode(savedMode);
    if (savedMode) document.documentElement.classList.add("dark");
  }, []);

  // bloqueia scroll no mobile quando aberto (evita depender do parent)
  useEffect(() => {
    if (open) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    // cleanup seguro
    return () => document.body.classList.remove("overflow-hidden");
  }, [open]);

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
    <>
      {/* Overlay (aparece apenas quando open === true) */}
      <div
        className={`fixed inset-0 z-30 md:hidden transition-opacity duration-200 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        style={{ backgroundColor: "rgba(0,0,0,0.35)" }}
        onClick={onClose}
        aria-hidden={!open}
      />

      {/* Sidebar off-canvas */}
      <aside
        role="dialog"
        aria-modal={open ? "true" : "false"}
        className={[
          "fixed z-40 top-0 left-0 inset-y-0 transform transition-transform duration-250 ease-in-out",
          // md:sidebar sempre visível em desktop, estático
          "md:static md:translate-x-0 md:inset-y-auto md:h-auto",
          // largura: no mobile ocupamos 4/5 da tela, não quase tudo
          open ? "translate-x-0" : "-translate-x-full",
          "w-4/5 sm:w-80 max-w-xs md:w-64",
        ].join(" ")}
      >
        <div className="flex flex-col justify-between h-full bg-gray-800 dark:bg-gray-900 text-white p-6 shadow-xl md:shadow-none md:rounded-none rounded-r-2xl overflow-auto min-h-screen md:min-h-0">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Ativix</h2>
                <p className="text-gray-400 text-sm">Gestão de Chamados</p>
              </div>

              {/* botão fechar visível somente em mobile */}
              <button
                onClick={onClose}
                className="md:hidden p-2 rounded hover:bg-gray-700"
                aria-label="Fechar menu"
              >
                ✕
              </button>
            </div>
          </div>

          <nav className="space-y-2 flex-1">
            <Link
              to={isAdmin ? "/admin/dashboard" : "/user/dashboard"}
              onClick={() => onClose()}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700 transition-all"
            >
              <ChartBarIcon className="h-5 w-5" />
              <span>Dashboard</span>
            </Link>

            <Link
              to={isAdmin ? "/admin/projetos" : "/user/projetos"}
              onClick={() => onClose()}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700 transition-all"
            >
              <ClipboardDocumentListIcon className="h-5 w-5" />
              <span>Projetos</span>
            </Link>

            <Link
              to={isAdmin ? "/admin/atividades" : "/user/atividades"}
              onClick={() => onClose()}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700 transition-all"
            >
              <HomeIcon className="h-5 w-5" />
              <span>Atividades</span>
            </Link>

            {isAdmin && (
              <>
                <Link
                  to="/admin/cadastro-usuario"
                  onClick={() => onClose()}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700 transition-all"
                >
                  <UserCircleIcon className="h-5 w-5" />
                  <span>Cadastro Usuário</span>
                </Link>

                <Link
                  to="/admin/relatorios"
                  onClick={() => onClose()}
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
              <div className="flex items-center gap-3 text-gray-300">
                <UserCircleIcon className="h-5 w-5" />
                <span className="truncate max-w-[120px]">{user?.username}</span>
              </div>
              <button
                onClick={toggleDarkMode}
                className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
                aria-label="Alternar tema"
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
      </aside>
    </>
  );
}

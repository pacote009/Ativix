// src/pages/UserLayout.jsx
import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { Outlet } from "react-router-dom";

export default function UserLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // opcional: fechar o sidebar ao redimensionar para desktop
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 768) setSidebarOpen(false);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-100 dark:bg-gray-900 transition-colors">
      {/* Sidebar (controla o lock de scroll dentro do componente) */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Topbar (mobile) */}
      <header className="w-full md:hidden flex items-center justify-between p-3 bg-white dark:bg-gray-800 shadow-sm z-50">
        <button
          onClick={() => setSidebarOpen(prev => !prev)}         // <-- toggle agora
          aria-expanded={sidebarOpen}
          aria-label={sidebarOpen ? "Fechar menu" : "Abrir menu"}
          className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-100 z-50"
        >
          {sidebarOpen ? (
            // ícone de fechar (X)
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            // ícone hamburger
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        <div className="font-semibold text-gray-900 dark:text-gray-100">Ativix</div>
        <div style={{ width: 36 }} /> {/* placeholder para alinhamento */}
      </header>

      {/* Main content area */}
      <main className="flex-1 p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}

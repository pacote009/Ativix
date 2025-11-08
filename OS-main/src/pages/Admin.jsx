// src/pages/Admin.jsx (VERSÃO FINAL CORRIGIDA)
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { useEffect, useState } from "react";

const Admin = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    function handleResize() {
      // Fecha o sidebar ao redimensionar para desktop (> 768px)
      if (window.innerWidth >= 768) setSidebarOpen(false); 
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    // 1. Container principal: é um flexbox horizontal (desktop) e controla o overflow
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-x-hidden">
      
      {/* 2. Sidebar: Fica no desktop (md:static) e flutua no mobile (fixed) */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* 3. Container do Conteúdo: Ocupa o restante (flex-1) e é flex vertical para posicionar header/main */}
      <div className="flex flex-col flex-1">
        
        {/* 4. Topbar mobile: Fixo, mas só visível no mobile */}
        {/* NOTA: Para funcionar corretamente, ele DEVE ser `fixed top-0 right-0 left-0` 
           ou ser reposicionado para a direita no desktop/mobile */}
        <header className="w-full md:hidden flex items-center justify-between p-3 bg-white dark:bg-gray-800 shadow-sm z-50 fixed top-0 left-0">
 <button
  onClick={() => setSidebarOpen(prev => !prev)}
 aria-expanded={sidebarOpen}
aria-label={sidebarOpen ? "Fechar menu" : "Abrir menu"}
 className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-100 z-50"
 >
 {/* 💡 CÓDIGO DO ÍCONE HAMBÚRGUER / FECHAR RESTAURADO AQUI! */}
 {sidebarOpen ? (
 <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
 <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" strokeLinejoin="round" />
 </svg>
 ) : (
 <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
 <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
 </svg>
 )}
 </button>
 <div className="font-semibold text-gray-900 dark:text-gray-100">Ativix - Admin</div>
 <div style={{ width: 36 }} />
 </header>

        {/* 5. Spacer (apenas mobile): Empurra o conteúdo para baixo do header fixo */}
        <div className="w-full md:hidden h-14" />
        
        {/* 6. Main: Adiciona a margem para o sidebar no DESKTOP (md:ml-64) e remove no mobile (ml-0) */}
        {/* *Isto é o que estava faltando ou estava errado no seu primeiro teste.* */}
        <main className="flex-1 p-4 md:p-8 overflow-auto **md:ml-64**"> 
          <div className="w-full md:max-w-7xl md:mx-auto">
            <Outlet key={location.pathname} />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Admin;
import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import { Bars3Icon } from "@heroicons/react/24/outline";

const LayoutBase = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Sidebar Desktop */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Sidebar Mobile como drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="w-64 bg-gray-800 dark:bg-gray-900">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
          {/* Fundo escuro clicável para fechar */}
          <div
            className="flex-1 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="hidden md:block fixed top-0 left-0 h-screen z-40">
        {/* Topbar Mobile */}
        <div className="md:hidden flex items-center justify-between mb-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-bold">Ativix</h1>
        </div>

        <div className="max-w-7xl mx-auto w-full">
          {children}
        </div>
      </div>
    </div>
  );
};

export default LayoutBase;

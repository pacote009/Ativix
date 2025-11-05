import { Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast"; 
import Login from "./pages/Login";
import Dashboard from "./pages/DashBoard";
import Projetos from "./pages/Projetos";
import Atividades from "./pages/Atividades";
import Admin from "./pages/Admin";
import CadastroUsuario from "./pages/CadastroUsuario";
import Relatorios from "./pages/Relatorios";
import ProtectedRoute from "./ProtectedRoute";
import UserDashboard from "./pages/UserDashboard";
import UserLayout from "./pages/UserLayout"; 

export default function App() {
  return (
    <div className="min-h-screen w-full">
      {/* Toaster global */}
      <Toaster position="top-right" reverseOrder={false} />

      <Routes>
  {/* Login */}
  <Route path="/" element={<Login />} />

  {/* Rotas globais (user/admin) */}
  <Route
    path="/projetos"
    element={
      <ProtectedRoute>
        <Projetos />
      </ProtectedRoute>
    }
  />
  <Route
    path="/atividades"
    element={
      <ProtectedRoute>
        <Atividades />
      </ProtectedRoute>
    }
  />

  {/* Rotas do USUÁRIO COMUM */}
  <Route
    path="/user"
    element={
      <ProtectedRoute>
        <UserLayout />
      </ProtectedRoute>
    }
  >
    <Route path="dashboard" element={<UserDashboard />} />
    <Route path="projetos" element={<Projetos />} />
    <Route path="atividades" element={<Atividades />} />
  </Route>

  {/* Rotas do ADMIN */}
  <Route
    path="/admin"
    element={
      <ProtectedRoute adminOnly>
        <Admin />
      </ProtectedRoute>
    }
  >
    <Route path="dashboard" element={<Dashboard />} />
    <Route path="projetos" element={<Projetos />} />
    <Route path="atividades" element={<Atividades />} />
    <Route path="cadastro-usuario" element={<CadastroUsuario />} />
    <Route path="relatorios" element={<Relatorios />} />
  </Route>
</Routes>
    </div>
  );
}

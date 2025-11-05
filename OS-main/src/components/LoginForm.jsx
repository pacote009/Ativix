import React, { useState } from "react";
import { UserIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import { login } from "../auth"; // Importe seu arquivo auth.js
import { useNavigate } from "react-router-dom";

const LoginForm = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      setError("Por favor, preencha todos os campos.");
      return;
    }

    if (login(username, password)) {
      navigate("/admin");
    } else {
      setError("Usuário ou senha inválidos");
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-tr from-indigo-900 via-gray-900 to-black px-4 sm:px-6">
      <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl w-full max-w-md p-8 sm:p-10 border border-white/20">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white text-center mb-6 tracking-wide">
          Acesso ao Sistema
        </h2>
        
        {error && (
          <div className="mb-6 p-3 bg-red-500/20 text-red-200 text-sm rounded-lg text-center">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Campo de Usuário */}
          <div>
            <label htmlFor="username" className="block text-white text-sm font-semibold mb-2 tracking-wide">
              Usuário
            </label>
            <div className="relative">
              <UserIcon className="h-5 w-5 text-white/70 absolute left-4 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Digite seu usuário"
                className="w-full pl-12 pr-5 py-3 rounded-xl bg-white/20 border border-white/30 placeholder-white/70 text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
              />
            </div>
          </div>

          {/* Campo de Senha */}
          <div>
            <label htmlFor="password" className="block text-white text-sm font-semibold mb-2 tracking-wide">
              Senha
            </label>
            <div className="relative">
              <LockClosedIcon className="h-5 w-5 text-white/70 absolute left-4 top-1/2 transform -translate-y-1/2" />
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                className="w-full pl-12 pr-5 py-3 rounded-xl bg-white/20 border border-white/30 placeholder-white/70 text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-lg tracking-wide transition duration-300 shadow-lg hover:shadow-indigo-500/30 active:scale-95"
          >
            Entrar
          </button>
        </form>
        
        <p className="text-center text-white/60 mt-8 text-sm">
          &copy; {new Date().getFullYear()} Sistema de Acesso. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
};

export default LoginForm;

import api from "../services/api";
import React, { useState } from "react";
import { UserIcon, LockClosedIcon, IdentificationIcon } from "@heroicons/react/24/outline";

const CadastroUsuario = () => {
  const [nome, setNome] = useState("");
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
  e.preventDefault();

  if (!nome.trim() || !login.trim() || !senha || !confirmarSenha) {
    setError("Por favor, preencha todos os campos.");
    return;
  }

  if (senha !== confirmarSenha) {
    setError("As senhas não coincidem.");
    return;
  }

  if (senha.length < 6) {
    setError("A senha deve ter pelo menos 6 caracteres.");
    return;
  }

  try {
    const response = await api.post("/users", {
      name: nome,
      username: login,
      password: senha,
      email: "" // ou pegar email de outro campo se quiser
    });

    if (response.status === 201) {
      setSuccess("Usuário cadastrado com sucesso!");
      setError("");
      setNome("");
      setLogin("");
      setSenha("");
      setConfirmarSenha("");
    }
  } catch (err) {
    console.error(err);
    setError(err.response?.data?.error || "Erro ao cadastrar usuário. Tente novamente.");
    setSuccess("");
  }
};


  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-tr from-indigo-900 via-gray-900 to-black px-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl w-full max-w-lg p-10 border border-white/20">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white text-center mb-6 tracking-wide">
          Cadastro de Usuário
        </h2>

        {error && (
          <div className="mb-6 p-3 bg-red-500/20 text-red-200 text-sm rounded-lg text-center">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-3 bg-green-500/20 text-green-200 text-sm rounded-lg text-center">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-white text-sm font-semibold mb-2">Nome Completo</label>
            <div className="relative">
              <IdentificationIcon className="h-5 w-5 text-white/70 absolute left-4 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Digite o nome completo"
                className="w-full pl-12 pr-5 py-3 rounded-xl bg-white/20 border border-white/30 placeholder-white/70 text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-white text-sm font-semibold mb-2">Nome de Usuário</label>
            <div className="relative">
              <UserIcon className="h-5 w-5 text-white/70 absolute left-4 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="Digite o nome de usuário"
                className="w-full pl-12 pr-5 py-3 rounded-xl bg-white/20 border border-white/30 placeholder-white/70 text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-white text-sm font-semibold mb-2">Senha</label>
            <div className="relative">
              <LockClosedIcon className="h-5 w-5 text-white/70 absolute left-4 top-1/2 transform -translate-y-1/2" />
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Digite a senha"
                className="w-full pl-12 pr-5 py-3 rounded-xl bg-white/20 border border-white/30 placeholder-white/70 text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-white text-sm font-semibold mb-2">Confirmar Senha</label>
            <div className="relative">
              <LockClosedIcon className="h-5 w-5 text-white/70 absolute left-4 top-1/2 transform -translate-y-1/2" />
              <input
                type="password"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                placeholder="Confirme a senha"
                className="w-full pl-12 pr-5 py-3 rounded-xl bg-white/20 border border-white/30 placeholder-white/70 text-white"
              />
            </div>
          </div>

          <button type="submit" className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold">
            Cadastrar
          </button>
        </form>
      </div>
    </div>
  );
};

export default CadastroUsuario;

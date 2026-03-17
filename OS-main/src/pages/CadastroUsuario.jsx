// src/pages/CadastroUsuario.jsx
import api from "../services/api";
import React, { useState, useEffect } from "react";
import { UserIcon, LockClosedIcon, IdentificationIcon } from "@heroicons/react/24/outline";

const CadastroUsuario = () => {
  const [nome, setNome] = useState("");
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  const [usuarios, setUsuarios] = useState([]);
  const [usuarioResetId, setUsuarioResetId] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState("");
  const [resetMsg, setResetMsg] = useState("");
  const [resetErr, setResetErr] = useState("");
  const [deleteMsg, setDeleteMsg] = useState("");
  const [deleteErr, setDeleteErr] = useState("");

  const isCurrentUserAdmin = currentUser?.role === "ADMIN";

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user"));
      setCurrentUser(u);
    } catch {
      setCurrentUser(null);
    }
  }, []);

  useEffect(() => {
    if (isCurrentUserAdmin) {
      loadUsuarios();
    }
  }, [isCurrentUserAdmin]);

  const loadUsuarios = async () => {
    try {
      const response = await api.get("/users");
      const list = Array.isArray(response.data) ? response.data : [];
      setUsuarios(list);
      if (!usuarioResetId && list.length) {
        setUsuarioResetId(String(list[0].id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

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
      // Se o usuário logado NÃO for admin, force role = USER (evita que frontend malicioso envie ADMIN)
      const roleToSend = isCurrentUserAdmin && isAdmin ? "ADMIN" : "USER";

      const response = await api.post("/users", {
        name: nome,
        username: login,
        password: senha,
        role: roleToSend,
      });

      if (response.status === 201) {
        setSuccess("Usuário cadastrado com sucesso!");
        setNome("");
        setLogin("");
        setSenha("");
        setConfirmarSenha("");
        setIsAdmin(false);
        if (isCurrentUserAdmin) {
          await loadUsuarios();
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Erro ao cadastrar usuário. Tente novamente.");
      setSuccess("");
    }
  };

  const handleResetSenha = async (e) => {
    e.preventDefault();
    setResetErr("");
    setResetMsg("");

    if (!isCurrentUserAdmin) {
      setResetErr("Somente administradores podem resetar senhas.");
      return;
    }
    if (!usuarioResetId) {
      setResetErr("Selecione um usuário.");
      return;
    }
    if (!novaSenha || novaSenha.length < 6) {
      setResetErr("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (novaSenha !== confirmarNovaSenha) {
      setResetErr("As senhas não coincidem.");
      return;
    }

    try {
      await api.patch(`/users/${usuarioResetId}/reset-password`, { newPassword: novaSenha });
      const selectedUser = usuarios.find((u) => String(u.id) === String(usuarioResetId));
      setResetMsg(`Senha redefinida com sucesso para ${selectedUser?.username || "usuário"}.`);
      setNovaSenha("");
      setConfirmarNovaSenha("");
    } catch (err) {
      console.error(err);
      setResetErr(err.response?.data?.error || "Erro ao resetar senha.");
    }
  };

  const handleExcluirUsuario = async () => {
    setDeleteErr("");
    setDeleteMsg("");

    if (!isCurrentUserAdmin) {
      setDeleteErr("Somente administradores podem excluir usuários.");
      return;
    }

    if (!usuarioResetId) {
      setDeleteErr("Selecione um usuário para excluir.");
      return;
    }

    const selectedUser = usuarios.find((u) => String(u.id) === String(usuarioResetId));
    if (!selectedUser) {
      setDeleteErr("Usuário inválido.");
      return;
    }

    if (String(selectedUser.id) === String(currentUser?.id)) {
      setDeleteErr("Você não pode excluir seu próprio usuário.");
      return;
    }

    const confirmed = window.confirm(
      `Tem certeza que deseja excluir o usuário "${selectedUser.username}"? Esta ação não pode ser desfeita.`
    );
    if (!confirmed) return;

    try {
      await api.delete(`/users/${selectedUser.id}`);
      setDeleteMsg(`Usuário ${selectedUser.username} excluído com sucesso.`);
      await loadUsuarios();
    } catch (err) {
      console.error(err);
      setDeleteErr(err.response?.data?.error || "Erro ao excluir usuário.");
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-tr from-indigo-900 via-gray-900 to-black px-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl w-full max-w-3xl p-10 border border-white/20 space-y-10">
        <section>
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

            {/* Mostrar checkbox apenas se o usuário logado for ADMIN */}
            {isCurrentUserAdmin && (
              <div className="flex items-center gap-3">
                <input
                  id="isAdmin"
                  type="checkbox"
                  checked={isAdmin}
                  onChange={() => setIsAdmin((s) => !s)}
                  className="h-4 w-4"
                />
                <label htmlFor="isAdmin" className="text-white text-sm">Criar como administrador</label>
              </div>
            )}

            <button type="submit" className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold">
              Cadastrar
            </button>
          </form>
        </section>

        {isCurrentUserAdmin && (
          <section className="border-t border-white/20 pt-8">
            <h3 className="text-2xl font-bold text-white mb-4">Resetar senha (Administrador)</h3>
            <p className="text-white/70 text-sm mb-4">
              Você pode redefinir sua senha ou a senha de qualquer usuário.
            </p>

            {resetErr && <div className="mb-4 p-3 bg-red-500/20 text-red-200 text-sm rounded-lg">{resetErr}</div>}
            {resetMsg && <div className="mb-4 p-3 bg-green-500/20 text-green-200 text-sm rounded-lg">{resetMsg}</div>}
            {deleteErr && <div className="mb-4 p-3 bg-red-500/20 text-red-200 text-sm rounded-lg">{deleteErr}</div>}
            {deleteMsg && <div className="mb-4 p-3 bg-green-500/20 text-green-200 text-sm rounded-lg">{deleteMsg}</div>}

            <form onSubmit={handleResetSenha} className="space-y-4">
              <div>
                <label className="block text-white text-sm font-semibold mb-2">Selecionar usuário</label>
                <select
                  value={usuarioResetId}
                  onChange={(e) => setUsuarioResetId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/20 border border-white/30 text-white"
                >
                  {usuarios.map((u) => (
                    <option key={u.id} value={u.id} className="text-black">
                      {u.username} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-white text-sm font-semibold mb-2">Nova senha</label>
                <input
                  type="password"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Digite a nova senha"
                  className="w-full px-4 py-3 rounded-xl bg-white/20 border border-white/30 placeholder-white/70 text-white"
                />
              </div>

              <div>
                <label className="block text-white text-sm font-semibold mb-2">Confirmar nova senha</label>
                <input
                  type="password"
                  value={confirmarNovaSenha}
                  onChange={(e) => setConfirmarNovaSenha(e.target.value)}
                  placeholder="Confirme a nova senha"
                  className="w-full px-4 py-3 rounded-xl bg-white/20 border border-white/30 placeholder-white/70 text-white"
                />
              </div>

              <button type="submit" className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold">
                Resetar senha
              </button>

              <button
                type="button"
                onClick={handleExcluirUsuario}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 text-white font-bold"
              >
                Excluir usuário selecionado
              </button>
            </form>
          </section>
        )}
      </div>
    </div>
  );
};

export default CadastroUsuario;

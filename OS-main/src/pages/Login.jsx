import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/authService";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
  e.preventDefault();
  setError("");

  if (!username || !password) {
    setError("Preencha todos os campos!");
    return;
  }

  try {
    const data = await login(username, password);
    const user = data.user;

    if (user.role?.toLowerCase() === "admin") {
      navigate("/admin/dashboard");
    } else {
      navigate("/user/dashboard");
    }

  } catch (err) {
    setError(err.message || "Usuário ou senha inválidos!");
  }
};


  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-10 border border-white/20 w-96">
        <h2 className="text-3xl font-bold text-white text-center mb-6">
          Login
        </h2>

        {error && (
          <div className="bg-red-500/20 text-red-200 p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-white mb-2">Usuário</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-white/20 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Digite seu usuário"
            />
          </div>

          <div>
            <label className="block text-white mb-2">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-white/20 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Digite sua senha"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-lg shadow-lg transition"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;

// src/auth.js
export async function login(email, password) {
  if (!email || !password) {
    return { success: false, error: "Email e senha são obrigatórios" };
  }

  try {
    const response = await fetch("http://localhost:5000/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ identifier: email, password }),
    });

    const data = await response.json();

    if (response.ok) {
      // Armazena token e usuário no localStorage
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      return { success: true, user: data.user };
    } else {
      return { success: false, error: data.error || "Erro no login" };
    }
  } catch (error) {
    console.error("Erro de rede ou servidor:", error);
    return { success: false, error: "Erro de conexão" };
  }
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export const getCurrentUser = () => {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
};

export const getToken = () => localStorage.getItem("token");

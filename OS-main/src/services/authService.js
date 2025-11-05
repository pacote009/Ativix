

// src/services/authService.js

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Registrar usuário
export async function register(name, email, password) {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao registrar usuário");
  }

  return response.json();
}

// Login
export async function login(username, password) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: username, password }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao logar");
  }

  const data = await response.json();

  // Salvar token e dados do usuário
  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));

  return data; // { token, user }
}

// Pegar token do localStorage
export function getToken() {
  return localStorage.getItem("token");
}

// Logout
export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

// Pegar dados do usuário logado
export function getUser() {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
}

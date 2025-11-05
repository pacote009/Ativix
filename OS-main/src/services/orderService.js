// src/services/orderService.js
import { getToken } from "./authService";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export async function getOrders() {
  const response = await fetch(`${API_URL}/orders`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });

  if (!response.ok) throw new Error("Erro ao buscar OS");
  return response.json();
}

export async function createOrder(title, description) {
  const response = await fetch(`${API_URL}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ title, description }),
  });

  if (!response.ok) throw new Error("Erro ao criar OS");
  return response.json();
}

export async function updateOrder(id, updates) {
  const response = await fetch(`${API_URL}/orders/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) throw new Error("Erro ao atualizar OS");
  return response.json();
}

export async function deleteOrder(id) {
  const response = await fetch(`${API_URL}/orders/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${getToken()}` },
  });

  if (!response.ok) throw new Error("Erro ao deletar OS");
  return response.json();
}

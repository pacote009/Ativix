// src/components/TonerFormModal.jsx
import React, { useState, useEffect } from "react";
import { createToner } from "../services/api";

export default function TonerFormModal({ open = false, onClose = () => {}, onSaved = () => {}, initialData = null }) {
  const [form, setForm] = useState({
    model: "",
    color: "",
    sku: "",
    stock: 0,
    minStock: 0,
    location: ""
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialData) {
      setForm({
        model: initialData.model || "",
        color: initialData.color || "",
        sku: initialData.sku || "",
        stock: initialData.stock ?? 0,
        minStock: initialData.minStock ?? 0,
        location: initialData.location || ""
      });
    } else {
      setForm({ model: "", color: "", sku: "", stock: 0, minStock: 0, location: "" });
    }
  }, [initialData, open]);

  // fechar com ESC
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleOverlayClick = (e) => {
    if (e.target.getAttribute("data-overlay") === "true") onClose();
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!form.model.trim() || !form.color.trim()) {
      alert("Modelo e cor são obrigatórios.");
      return;
    }

    setSaving(true);
    try {
      if (initialData && initialData.id) {
        // edição: não mexe no estoque aqui (estoque via movimentos)
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/toners/${initialData.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`
          },
          body: JSON.stringify({
            model: form.model,
            color: form.color,
            sku: form.sku || null,
            minStock: Number(form.minStock) || 0,
            location: form.location || null
          })
        });

        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || "Erro ao atualizar toner");
        }
      } else {
        // criar toner: enviar initialStock. O backend criará o movimento inicial automaticamente.
        const payload = {
          model: form.model,
          color: form.color,
          sku: form.sku || null,
          capacity: null,
          initialStock: Number(form.stock) || 0,
          minStock: Number(form.minStock) || 0,
          location: null, // backend definirá o destino inicial como "ESTOQUE"
          supplierId: null
        };

        await createToner(payload);
      }

      onSaved();
    } catch (err) {
      console.error("Erro ao salvar toner:", err);
      const msg = err?.message || "Erro desconhecido";
      alert(`Erro ao salvar toner: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div data-overlay="true" onClick={handleOverlayClick} className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <form onSubmit={handleSave} className="relative bg-white dark:bg-gray-800 w-full max-w-md p-6 rounded-2xl shadow-lg">
        {/* botão X */}
        <button type="button" onClick={onClose} aria-label="Fechar" className="absolute right-3 top-3 text-gray-500 hover:text-gray-800">
          ✕
        </button>

        <h3 className="text-lg font-semibold mb-3">{initialData ? "Editar Toner" : "Novo Toner"}</h3>

        <div className="grid gap-3">
          <input type="text" placeholder="Modelo (ex: HP 508)" value={form.model} onChange={(e)=>setForm({...form, model:e.target.value})}
            className="border rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />

          <input type="text" placeholder="Cor (preto/ciano/magenta/amarelo)" value={form.color} onChange={(e)=>setForm({...form, color:e.target.value})}
            className="border rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />

          <input type="text" placeholder="SKU (opcional)" value={form.sku} onChange={(e)=>setForm({...form, sku:e.target.value})}
            className="border rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />

          <div className="flex gap-2">
            <input
              type="number"
              min={0}
              placeholder="Estoque inicial"
              value={form.stock}
              onChange={(e)=>setForm({...form, stock: Number(e.target.value)})}
              className="border rounded px-3 py-2 w-1/2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              disabled={!!initialData} // desabilita edição direta de estoque
              title={initialData ? "Edite o estoque via movimentos / histórico" : "Defina a quantidade inicial (será registrada como entrada em ESTOQUE)"}
            />
            <input type="number" min={0} placeholder="Estoque mínimo" value={form.minStock} onChange={(e)=>setForm({...form, minStock: Number(e.target.value)})}
              className="border rounded px-3 py-2 w-1/2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
          </div>

          <input
            type="text"
            placeholder={initialData ? "Local / Impressora (opcional)" : "Será definido como ESTOQUE ao criar"}
            value={form.location}
            onChange={(e)=>setForm({...form, location:e.target.value})}
            className="border rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            disabled={!initialData} // só editar location quando estiver editando o toner
          />
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-1.5 rounded bg-gray-200 dark:bg-gray-700">Cancelar</button>
          <button type="submit" disabled={saving} className="px-3 py-1.5 rounded bg-green-600 text-white">{saving ? "Salvando..." : "Salvar"}</button>
        </div>
      </form>
    </div>
  );
}

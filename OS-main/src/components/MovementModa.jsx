// src/components/MovementModal.jsx
import React, { useState, useEffect } from "react";
import { addTonerMovement } from "../services/api";
import InfoModal from "./InfoModal";

export default function MovementModal({ open, onClose, toner, defaultType = "consumo", onSuccess }) {
  const [type, setType] = useState(defaultType);
  const [quantity, setQuantity] = useState(1);
  const [destination, setDestination] = useState("");
  const [origin, setOrigin] = useState("");
  const [note, setNote] = useState("");
  const [printerId, setPrinterId] = useState("");
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState({ open: false, title: "", message: "" });

  const showDialog = (title, message) => setDialog({ open: true, title, message });

  useEffect(() => {
    if (open) {
      setType(defaultType);
      setQuantity(1);
      setDestination("");
      setOrigin("");
      setNote("");
      setPrinterId("");
      setLoading(false);
    }
  }, [open, defaultType]);

  if (!open) return null;

  const isExitType = (t) => ["consumo", "instalacao", "troca"].includes(t);

  const submit = async () => {
    // validações obrigatórias para saída (saída = consumo/instalacao/troca)
    if (isExitType(type)) {
      if (!destination || String(destination).trim() === "") {
        showDialog("Campo obrigatório", "Destino é obrigatório para registrar saída.");
        return;
      }
      if (!note || String(note).trim() === "") {
        showDialog("Campo obrigatório", "Observação é obrigatória para registrar saída.");
        return;
      }
    }

    // evitar quantidade inválida
    if (!quantity || Number(quantity) <= 0) {
      showDialog("Quantidade inválida", "Quantidade deve ser um número maior que zero.");
      return;
    }

    try {
      setLoading(true);
      await addTonerMovement(toner.id, {
        type,
        quantity: Number(quantity),
        origin: origin || null,
        destination: destination || null,
        note: note || null,
        printerId: printerId || null,
      });
      setLoading(false);
      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      setLoading(false);
      console.error("Erro cadastrar movimento:", err);
      const msg = err?.response?.data?.error || err?.message || "Erro ao registrar movimentação";
      showDialog("Falha ao registrar movimentação", msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Movimentação — {toner.model}</h3>
          <button onClick={onClose} className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">Fechar</button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300">Tipo</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="w-full border rounded px-2 py-1 bg-white dark:bg-gray-700">
              <option value="consumo">Saída (consumo)</option>
              <option value="instalacao">Instalação</option>
              <option value="troca">Troca</option>
              <option value="ajuste">Ajuste (definir estoque)</option>
              <option value="entrada">Entrada</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">* Entrada só pode ser registrada por ADMIN (backend valida).</p>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm text-gray-700 dark:text-gray-300">Quantidade</label>
              <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full border rounded px-2 py-1 bg-white dark:bg-gray-700" />
            </div>

            <div className="flex-1">
              <label className="block text-sm text-gray-700 dark:text-gray-300">Impressora (opcional)</label>
              <input value={printerId} onChange={(e) => setPrinterId(e.target.value)} className="w-full border rounded px-2 py-1 bg-white dark:bg-gray-700" placeholder="ID da impressora" />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300">Destino <span className="text-xs text-gray-400">(obrigatório para saídas)</span></label>
            <input value={destination} onChange={(e) => setDestination(e.target.value)} className="w-full border rounded px-2 py-1 bg-white dark:bg-gray-700" />
          </div>

          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300">Origem (opcional)</label>
            <input value={origin} onChange={(e) => setOrigin(e.target.value)} className="w-full border rounded px-2 py-1 bg-white dark:bg-gray-700" />
          </div>

          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300">Observação (note) <span className="text-xs text-gray-400">(obrigatório para saídas)</span></label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} className="w-full border rounded px-2 py-1 bg-white dark:bg-gray-700" rows={3} />
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">Cancelar</button>
            <button onClick={submit} disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded">
              {loading ? "Enviando..." : "Registrar"}
            </button>
          </div>
        </div>
      </div>

      <InfoModal
        open={dialog.open}
        title={dialog.title || "Aviso"}
        message={dialog.message}
        onClose={() => setDialog({ open: false, title: "", message: "" })}
      />
    </div>
  );
}

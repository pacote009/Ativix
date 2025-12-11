// src/components/TonerHistoryModal.jsx
import React, { useEffect, useState } from "react";
import { FaPlus, FaMinus } from "react-icons/fa";
import { getTonerMovements, addTonerMovement } from "../services/api";

/**
 * FriendlyDialog - modal simples para mensagens amigáveis
 */
function FriendlyDialog({ message = "", open = false, onClose = () => {} }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black bg-opacity-40 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg max-w-md w-full p-5">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Atenção</h4>
        <div className="text-sm text-gray-700 dark:text-gray-200 mb-4 whitespace-pre-line">
          {message}
        </div>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * TonerHistoryModal
 * - substitui alert() por um FriendlyDialog integrado
 * - validações locais (evita enviar saída se estoque insuficiente)
 * - mantém comportamento de carregamento/histórico existente
 */
export default function TonerHistoryModal({ open = false, onClose = () => {}, toner = null, onSaved = () => {} }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [destination, setDestination] = useState("");
  const [busy, setBusy] = useState(false);

  // friendly message state
  const [friendlyMsg, setFriendlyMsg] = useState("");

  useEffect(() => {
    if (open && toner) load();
    else setHistory([]);
    // eslint-disable-next-line
  }, [open, toner]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getTonerMovements(toner.id);
      setHistory(res || []);
    } catch (err) {
      console.error("Erro ao carregar histórico:", err);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  if (!open || !toner) return null;

  const showFriendlyStockError = (currentStock) => {
    const base =
      currentStock <= 0
        ? "Não há unidades disponíveis deste toner no estoque."
        : `Quantidade solicitada maior que o estoque atual (${currentStock} unidade${currentStock > 1 ? "s" : ""}).`;
    setFriendlyMsg(`${base}\n\nSugestão: verifique o estoque ou solicite reposição ao administrador.`);
  };

  const showFriendlyMessage = (msg) => {
    setFriendlyMsg(String(msg || "Ocorreu um erro. Tente novamente mais tarde."));
  };

  const doMovement = async (type) => {
    if (busy) return;

    // valida quantidade
    if (!qty || qty <= 0) {
      return showFriendlyMessage("Informe uma quantidade válida (maior que 0).");
    }

    const currentStock = Number(toner.stock ?? 0);

    // Validação local: se tentativa de saída com estoque insuficiente
    if (type === "consumo" || type === "instalacao") {
      if (currentStock <= 0) {
        return showFriendlyStockError(currentStock);
      }
      if (Number(qty) > currentStock) {
        return showFriendlyStockError(currentStock);
      }
      if (!destination || !destination.trim()) {
        return showFriendlyMessage("Por favor informe o destino/local (ex: Sala 03, Impressora X) para registrar a saída.");
      }
    }

    setBusy(true);
    try {
      const payload = {
        type,
        quantity: Number(qty),
        note: note || (type === "entrada" ? "Entrada manual" : "Saída manual"),
        origin: type === "consumo" ? "ESTOQUE" : null,
        destination: type === "entrada" ? (destination?.trim() || "ESTOQUE") : destination?.trim() || null
      };

      await addTonerMovement(toner.id, payload);

      setQty(1);
      setNote("");
      setDestination("");
      await load();
      onSaved();
    } catch (err) {
      console.error("Erro ao registrar movimento:", err);

      // tenta extrair mensagem amigável do backend (axios-like / fetch)
      let msg = "Erro ao registrar movimento. Tente novamente mais tarde.";
      try {
        if (err?.response?.data?.error) msg = err.response.data.error;
        else if (err?.message) msg = err.message;
        else if (typeof err === "string") msg = err;
      } catch (e) {}

      // se for problema de estoque, convertemos para mensagem amigável
      if (/estoque insuficiente/i.test(String(msg)) || /quantidade.*estoque/i.test(String(msg).toLowerCase())) {
        showFriendlyStockError(Number(toner.stock ?? 0));
      } else {
        showFriendlyMessage(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 bg-black bg-opacity-40 p-4">
        <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-2xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="p-5 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{toner.model} — {toner.color}</h3>
                <p className="text-sm text-gray-500">SKU: {toner.sku || "-"}</p>
                <div className="text-sm text-gray-600 mt-1">Estoque atual: <strong>{toner.stock}</strong></div>
              </div>
              <div>
                <button
                  onClick={onClose}
                  className="px-3 py-1 rounded bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
                >
                  Fechar
                </button>
              </div>
            </div>

            {/* ACTIONS: usar flex wrap para evitar sobreposição */}
            <div className="mt-2 flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-0">
                <input
                  type="number"
                  min="1"
                  value={qty}
                  onChange={(e)=>setQty(Number(e.target.value))}
                  className="border rounded px-3 py-2 w-full min-w-0 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Quantidade"
                />
              </div>

              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  placeholder="Observação (opcional)"
                  value={note}
                  onChange={(e)=>setNote(e.target.value)}
                  className="border rounded px-3 py-2 w-full min-w-0 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  placeholder="Destino / Local (ex: Sala 03, Impressora X)"
                  value={destination}
                  onChange={(e)=>setDestination(e.target.value)}
                  className="border rounded px-3 py-2 w-full min-w-0 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              {/* botões: desabilita Saída quando estoque zerado */}
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={()=>doMovement("entrada")}
                  disabled={busy}
                  className="px-3 py-1.5 rounded bg-green-600 text-white flex items-center gap-2 whitespace-nowrap"
                >
                  <FaPlus /> Entrada
                </button>

                <button
                  onClick={()=>doMovement("consumo")}
                  disabled={busy || Number(toner.stock ?? 0) <= 0}
                  className={`px-3 py-1.5 rounded flex items-center gap-2 whitespace-nowrap ${Number(toner.stock ?? 0) <= 0 ? "bg-yellow-300 text-gray-800 cursor-not-allowed" : "bg-yellow-500 text-white"}`}
                  title={Number(toner.stock ?? 0) <= 0 ? "Estoque zerado — verifique antes de registrar saída" : "Saída"}
                >
                  <FaMinus /> Saída
                </button>
              </div>
            </div>
          </div>

          {/* Histórico (scroll separado) */}
          <div className="p-5 max-h-[52vh] overflow-auto bg-gray-50 dark:bg-gray-800">
            <h4 className="font-medium mb-2 text-gray-800 dark:text-gray-100">Histórico</h4>

            {loading ? (
              <p>Carregando...</p>
            ) : history.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum movimento registrado.</p>
            ) : (
              <ul className="space-y-2">
                {history.map((m) => (
                  <li key={m.id || `${m.type}-${m.createdAt}`} className="p-2 rounded bg-white dark:bg-gray-700 flex justify-between items-start">
                    <div className="text-sm w-full">
                      <div className="flex justify-between items-center">
                        <div className="min-w-0">
                          <strong className="text-gray-800 dark:text-gray-100">{m.type === "entrada" ? "+" : "-"}{Math.abs(m.quantity)}</strong>
                          <span className="ml-2 text-gray-700 dark:text-gray-200">{m.note || "-"}</span>
                        </div>
                        <div className="text-xs text-gray-400 whitespace-nowrap">{new Date(m.createdAt || m.date || m.timestamp).toLocaleString()}</div>
                      </div>

                      <div className="text-xs text-gray-500 mt-1">
                        {m.origin ? `De: ${m.origin}` : ""}
                        {m.destination ? `${m.origin ? " → " : ""} Para: ${m.destination}` : ""}
                        {m.user ? ` • ${m.user}` : ""}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Friendly Dialog (substitui alert) */}
      <FriendlyDialog
        open={Boolean(friendlyMsg)}
        message={friendlyMsg}
        onClose={() => setFriendlyMsg("")}
      />
    </>
  );
}

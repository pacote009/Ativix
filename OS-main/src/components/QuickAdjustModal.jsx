// src/components/QuickAdjustModal.jsx
import React, { useEffect, useState } from "react";
import InfoModal from "./InfoModal";

/**
 * QuickAdjustModal
 *
 * Props:
 * - open (bool)
 * - onClose (func)
 * - defaultQty (number)
 * - defaultNote (string)
 * - title (string)
 * - showDestination (bool) -> mostra input de destino
 * - mode ('entrada'|'consumo') -> controla quais botões aparecem
 * - onConfirm(meta) -> meta: { type, quantity, destination, note, origin, printerId }
 *
 * Observações:
 * - Quando mode === 'consumo' mostrará apenas o botão Saída.
 * - Quando mode === 'entrada' mostrará apenas o botão Entrada.
 */
export default function QuickAdjustModal({
  open = false,
  onClose = () => {},
  defaultQty = 1,
  defaultNote = "",
  title = "Ajuste rápido",
  showDestination = false,
  mode = "consumo",
  onConfirm = () => {},
}) {
  const [qty, setQty] = useState(defaultQty || 1);
  const [note, setNote] = useState(defaultNote || "");
  const [destination, setDestination] = useState("");
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState({ open: false, title: "", message: "" });

  const showDialog = (title, message) => setDialog({ open: true, title, message });

  useEffect(() => {
    if (open) {
      setQty(defaultQty || 1);
      setNote(defaultNote || "");
      setDestination("");
    }
  }, [open, defaultQty, defaultNote]);

  if (!open) return null;

  const handleSubmit = async (type) => {
    if (busy) return;
    const q = Number(qty) || 0;
    if (q <= 0) {
      showDialog("Quantidade inválida", "Informe uma quantidade válida (maior que zero).");
      return;
    }
    if ((type === "consumo" || type === "instalacao") && showDestination && (!destination || !destination.trim())) {
      showDialog("Campo obrigatório", "Informe o destino / local para registrar a saída.");
      return;
    }

    setBusy(true);
    try {
      await onConfirm({
        type,
        quantity: q,
        destination: destination?.trim() || null,
        note: note?.trim() || null,
        origin: type === "consumo" ? "ESTOQUE" : null,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 bg-black bg-opacity-40 p-4">
      <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl shadow-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          <button onClick={onClose} className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700">Fechar</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <input
            type="number"
            min="1"
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            className="border rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            placeholder="Quantidade"
          />
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="border rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            placeholder="Observação (opcional)"
          />
          {showDestination ? (
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="border rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Destino / Local (ex: Sala 03)"
            />
          ) : (
            <div /> // placeholder para manter grid alinhado
          )}
        </div>

        <div className="flex gap-3 justify-end">
          {/* mostra apenas o botão apropriado conforme 'mode' */}
          {mode === "entrada" && (
            <button onClick={() => handleSubmit("entrada")} disabled={busy} className="px-4 py-2 rounded bg-green-600 text-white">
              {busy ? "..." : "+ Entrada"}
            </button>
          )}

          {mode === "consumo" && (
            <button onClick={() => handleSubmit("consumo")} disabled={busy} className="px-4 py-2 rounded bg-yellow-500 text-white">
              {busy ? "..." : "- Saída"}
            </button>
          )}
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

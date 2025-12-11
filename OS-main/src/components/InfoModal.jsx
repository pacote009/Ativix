// src/components/InfoModal.jsx
import React from "react";

/**
 * InfoModal - modal simples para mensagens informativas
 *
 * Props:
 * - open (bool)
 * - title (string) optional
 * - message (string)
 * - onClose (func)
 * - okLabel (string) optional
 */
export default function InfoModal({ open = false, title = "Aviso", message = "", onClose = () => {}, okLabel = "OK" }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
      <div className="absolute inset-0 bg-black opacity-40" onClick={onClose} />
      <div className="relative max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5 z-10">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:text-gray-300">✕</button>
        </div>

        <div className="text-sm text-gray-700 dark:text-gray-200 mb-4 whitespace-pre-wrap">
          {message}
        </div>

        <div className="flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700">
            {okLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

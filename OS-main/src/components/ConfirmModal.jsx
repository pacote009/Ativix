// src/components/ConfirmModal.jsx
import React from "react";

export default function ConfirmModal({ open = false, title = "Confirmar", message = "", onCancel = () => {}, onConfirm = () => {} }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl p-5 shadow-lg">
        <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">{title}</h4>
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">{message}</p>

        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 dark:text-gray-100">Cancelar</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded bg-red-600 text-white">OK</button>
        </div>
      </div>
    </div>
  );
}

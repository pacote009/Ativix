// src/components/TonerCard.jsx
import React, { useState } from "react";
import { FaHistory, FaPlus, FaMinus, FaTrash, FaEdit } from "react-icons/fa";
import { getCurrentUser } from "../auth";
import QuickAdjustModal from "./QuickAdjustModal";
import ConfirmModal from "./ConfirmModal";
import InfoModal from "./InfoModal";

/**
 * TonerCard com InfoModal no lugar do alert()
 */
export default function TonerCard({
  toner,
  onOpenHistory = () => {},
  onQuickAdjust = () => {},
  onEdit = () => {},
  onDelete = () => {},
}) {
  const user = getCurrentUser() || { role: "USER" };
  const isAdmin = String(user.role).toUpperCase() === "ADMIN";
  const low = toner.stock <= (toner.minStock ?? 0);

  const [loadingPlus, setLoadingPlus] = useState(false);
  const [loadingMinus, setLoadingMinus] = useState(false);
  const [loadingDel, setLoadingDel] = useState(false);

  const [openQuickModal, setOpenQuickModal] = useState(false);
  const [quickMode, setQuickMode] = useState("entrada"); // 'entrada' | 'consumo'

  const [openConfirm, setOpenConfirm] = useState(false);

  // Info modal state (substitui alert)
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoTitle, setInfoTitle] = useState("Aviso");
  const [infoMessage, setInfoMessage] = useState("");

  const showInfo = (title, message) => {
    setInfoTitle(title || "Aviso");
    setInfoMessage(message || "");
    setInfoOpen(true);
  };

  // Entrada: visualmente disponível para todos, mas só admin pode executar.
  const handlePlus = () => {
    if (!isAdmin) {
      return showInfo(
        "Entrada restrita",
        "Apenas administradores podem registrar entradas (adicionar estoque).\nPeça ao administrador para registrar ou solicite permissão."
      );
    }
    setQuickMode("entrada");
    setOpenQuickModal(true);
  };

  // Saída: disponível para todos, mas bloqueamos se estoque == 0
  const handleMinus = () => {
    if ((toner.stock ?? 0) <= 0) {
      return showInfo(
        "Estoque vazio",
        "Não há unidades em estoque para realizar a saída. Verifique o estoque ou solicite reposição ao administrador."
      );
    }
    setQuickMode("consumo");
    setOpenQuickModal(true);
  };

  // Editar: visível para todos; apenas admin pode efetivar
  const handleEditClick = () => {
    if (!isAdmin) {
      return showInfo("Permissão necessária", "Edição restrita a administradores.");
    }
    onEdit(toner);
  };

  // Excluir: visível para todos; apenas admin pode efetivar
  const handleDelete = async () => {
    if (!isAdmin) {
      return showInfo("Permissão necessária", "Exclusão restrita a administradores.");
    }
    setOpenConfirm(true);
  };

  const confirmDelete = async () => {
    setOpenConfirm(false);
    setLoadingDel(true);
    try {
      await onDelete(toner.id);
    } finally {
      setLoadingDel(false);
    }
  };

  // Ao confirmar no modal de ajuste (entrada/saída)
  const onQuickConfirm = async (meta) => {
    const qty = Number(meta.quantity) || 0;
    if (qty <= 0) {
      return showInfo("Quantidade inválida", "Informe uma quantidade válida (maior que zero).");
    }

    if (meta.type === "consumo") {
      const available = Number(toner.stock) || 0;
      if (qty > available) {
        return showInfo(
          "Estoque insuficiente",
          `Você solicitou ${qty} unidades, mas há apenas ${available} em estoque. Reduza a quantidade ou solicite reposição ao administrador.`
        );
      }
    }

    if (meta.type === "entrada" && !isAdmin) {
      return showInfo("Entrada restrita", "Apenas administradores podem registrar entradas. Solicite ao administrador.");
    }

    try {
      if (meta.type === "entrada") setLoadingPlus(true);
      else setLoadingMinus(true);

      await onQuickAdjust(toner.id, meta.type, qty, {
        note: meta.note,
        destination: meta.destination,
        origin: meta.origin,
        printerId: meta.printerId,
      });
    } catch (err) {
      let msg = "Não foi possível registrar o movimento. Tente novamente ou contate o administrador.";
      try {
        msg = err?.message || err?.details || JSON.stringify(err);
      } catch (e) {}
      showInfo("Erro", msg);
    } finally {
      setLoadingPlus(false);
      setLoadingMinus(false);
      setOpenQuickModal(false);
    }
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              {toner.model} <span className="text-sm text-gray-500">({toner.color})</span>
            </h3>
            <p className="text-sm text-gray-500">SKU: {toner.sku || "—"}</p>
            {toner.location && <p className="text-sm text-gray-400 mt-1">Local: {toner.location}</p>}
          </div>

          <div className="text-right">
            <div
              className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                low ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
              }`}
            >
              {toner.stock} un
            </div>
            <div className="text-xs text-gray-400 mt-1">Min: {toner.minStock ?? 0}</div>
          </div>
        </div>

        <div className="mt-3 flex gap-2 flex-wrap">
          {/* Histórico */}
          <button
            onClick={() => onOpenHistory(toner)}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-indigo-600 text-white text-sm hover:bg-indigo-700"
            title="Histórico"
          >
            <FaHistory /> Histórico
          </button>

          {/* Entrada */}
          <button
            onClick={handlePlus}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-green-600 text-white text-sm hover:bg-green-700"
            title="+1 entrada"
            disabled={loadingPlus}
          >
            {loadingPlus ? "..." : <><FaPlus /> +1</>}
          </button>

          {/* Saída */}
          <button
            onClick={handleMinus}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-yellow-500 text-white text-sm hover:bg-yellow-600"
            title="-1 saída"
            disabled={loadingMinus}
          >
            {loadingMinus ? "..." : <><FaMinus /> -1</>}
          </button>

          {/* Editar */}
          <button
            onClick={handleEditClick}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-gray-200 text-gray-800 text-sm hover:bg-gray-300"
            title="Editar"
          >
            <FaEdit /> Editar
          </button>

          {/* Excluir */}
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-red-600 text-white text-sm hover:bg-red-700"
            disabled={loadingDel}
            title="Excluir"
          >
            {loadingDel ? "..." : <><FaTrash /> Excluir</>}
          </button>
        </div>
      </div>

      <QuickAdjustModal
        open={openQuickModal}
        onClose={() => setOpenQuickModal(false)}
        defaultQty={1}
        defaultNote={"Ajuste rápido"}
        title={quickMode === "entrada" ? "Entrada rápida" : "Saída rápida"}
        showDestination={quickMode !== "entrada"}
        mode={quickMode}
        onConfirm={onQuickConfirm}
      />

      <ConfirmModal
        open={openConfirm}
        title="Excluir toner"
        message={`Remover toner ${toner.model} ${toner.color}? Esta ação é irreversível.`}
        onCancel={() => setOpenConfirm(false)}
        onConfirm={confirmDelete}
      />

      <InfoModal
        open={infoOpen}
        title={infoTitle}
        message={infoMessage}
        onClose={() => setInfoOpen(false)}
        okLabel="Fechar"
      />
    </>
  );
}

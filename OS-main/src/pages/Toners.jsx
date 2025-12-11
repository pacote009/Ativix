// src/pages/Toners.jsx
import { useEffect, useState } from "react";
import TonerCard from "../components/TonerCard";
import TonerFormModal from "../components/TonerFormModal";
import TonerHistoryModal from "../components/TonerHistoryModal";
import {
  getToners,
  createToner,
  getTonerMovements,
  addTonerMovement,
  deleteToner,
  updateToner,
} from "../services/api";
import { FaPlus } from "react-icons/fa";
import { motion } from "framer-motion";

export default function TonersPage() {
  const [toners, setToners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [openHistoryModal, setOpenHistoryModal] = useState(false);
  const [historyToner, setHistoryToner] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getToners();
      setToners(Array.isArray(res) ? res : res?.data ?? []);
    } catch (err) {
      console.error("Erro ao carregar toners:", err);
      setToners([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleOpenHistory = async (toner) => {
    setHistoryToner(toner);
    setOpenHistoryModal(true);
    // opcional: checar endpoint
    try { await getTonerMovements(toner.id); } catch (e) { /* ignore */ }
  };

  // dentro de src/pages/Toners.jsx - substitua a função handleQuickAdjust
const handleQuickAdjust = async (tonerId, type, quantity, meta = {}) => {
  // meta pode ter { destination, note, printerId }
  try {
    await addTonerMovement(tonerId, {
      type,
      quantity,
      note: meta.note || "Ajuste rápido",
      destination: meta.destination || null,
      printerId: meta.printerId || null,
      origin: meta.origin || null,
    });
    // recarrega lista após sucesso
    await load();
  } catch (err) {
    console.error("Erro ao ajustar toner:", err);
    // tenta extrair mensagem amigável do backend
    let msg = "Não foi possível registrar o movimento. Verifique os dados e tente novamente.";
    try {
      // se err é um Response com JSON
      if (err?.status === 400) {
        msg = "Operação inválida: verifique os campos e o estoque.";
      } else if (err?.message) {
        msg = err.message;
      } else if (err?.details) {
        msg = err.details;
      }
    } catch (e) {}
    alert(msg);
  }
};



  const handleDelete = async (id) => {
    if (!window.confirm("Confirma exclusão do toner?")) return;
    await deleteToner(id);
    await load();
  };

  const handleEdit = (toner) => {
    setEditing(toner);
    setOpenForm(true);
  };

  return (
    <div className="bg-gray-100 dark:bg-gray-900 min-h-screen p-6 transition-colors">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-extrabold text-gray-800 dark:text-gray-200">Controle de Toners</h1>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { setEditing(null); setOpenForm(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-yellow-400 text-white font-semibold shadow-md"
        >
          <FaPlus /> Novo
        </motion.button>
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-300">Lista de toners cadastrados. Use o botão Novo para adicionar.</p>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-600 dark:text-gray-300">Carregando...</p>
        ) : toners.length === 0 ? (
          <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700">
            <p className="text-gray-600 dark:text-gray-300">Nenhum toner cadastrado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {toners.map((t) => (
              <TonerCard
  key={t.id}
  toner={t}
  onOpenHistory={() => handleOpenHistory(t)}
  onQuickAdjust={async (id, type, qty, meta) => { await handleQuickAdjust(id, type, qty, meta); }}
  onEdit={(td) => handleEdit(td)}
  onDelete={(id) => handleDelete(id)}
/>

            ))}
          </div>
        )}
      </motion.div>

      <TonerFormModal
  open={openForm}
  initialData={editing}
  onClose={() => { setOpenForm(false); setEditing(null); }}
  onSaved={async () => {            // <-- agora só notifica
    setOpenForm(false);
    setEditing(null);
    await load();
  }}
/>



      <TonerHistoryModal
        open={openHistoryModal}
        toner={historyToner}
        onClose={() => setOpenHistoryModal(false)}
        onSaved={() => { setOpenHistoryModal(false); load(); }}
      />
    </div>
  );
}

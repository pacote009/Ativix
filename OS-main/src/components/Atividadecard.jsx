// src/components/Atividadecard.jsx
import { useState } from "react";
import {
  updateAtividade,
  deleteAtividade,
  deleteComentarioAtividade,
  updateComentarioAtividadeTexto,
} from "../services/api";
import { getCurrentUser } from "../auth";
import ModalAlterarUsuario from "./ModalAlterarUsuario";
import { FaTrash, FaEdit, FaCheck, FaUserEdit, FaThumbtack } from "react-icons/fa";
import { motion } from "framer-motion";

const AtividadeCard = ({ atividade, onUpdate, onFixar, onConcluded, onGlobalUpdate }) => {
  const user = getCurrentUser() || { username: "Desconhecido", role: "user" };
  const [showAlterarModal, setShowAlterarModal] = useState(false);
  const [comentario, setComentario] = useState("");
  const [editIndex, setEditIndex] = useState(null);
  const [editText, setEditText] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // === NOVA LÓGICA DE PERMISSÃO ===
  // Pode deletar se: É Admin OU (É o autor E a atividade está pendente)
  const isOwner = user?.username === atividade.autor;
  const isAdmin = user?.role && String(user.role).toLowerCase() === "admin";
  const canDelete = isAdmin || (isOwner && atividade.status === "pendente");
  // ================================

  const safeOnUpdate = async () => {
    if (typeof onUpdate === "function") {
      try { await onUpdate(); } catch (err) { console.error("Erro no onUpdate():", err); }
    }
  };

  const handleConcluir = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await updateAtividade(atividade.id, {
        status: "finalizada",
        concluidoPor: user.username,
      });
      if (typeof onConcluded === "function") onConcluded(atividade.id);
      await safeOnUpdate();
      if (typeof onGlobalUpdate === "function") onGlobalUpdate();
    } catch (err) {
      console.error("Erro ao concluir atividade:", err);
      alert("Erro ao concluir a atividade.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (deleting) return;
    if (!window.confirm("Tem certeza que deseja excluir esta atividade?")) return;
    setDeleting(true);
    try {
      await deleteAtividade(atividade.id);
      await safeOnUpdate();
    } catch (err) {
      console.error("Erro ao deletar:", err);
      const code = err?.response?.status;
      if (code === 403) {
        alert("Você não tem permissão para excluir esta atividade.");
      } else {
        alert("Erro ao deletar atividade.");
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleAddComentario = async () => {
    if (comentario.trim() === "") return;
    const novosComentarios = [ ...(atividade.comentarios || []), { autor: user.username, texto: comentario } ];
    try {
      await updateAtividade(atividade.id, { comentarios: novosComentarios });
      setComentario("");
      await safeOnUpdate();
    } catch (err) {
      console.error("Erro ao adicionar comentário:", err);
      alert("Erro ao adicionar comentário.");
    }
  };

  const handleDeleteComentario = async (index) => {
    try {
      await deleteComentarioAtividade(atividade.id, index);
      await safeOnUpdate();
    } catch (err) {
      console.error("Erro deletar comentário:", err);
    }
  };

  const handleUpdateComentario = async (index) => {
    if (editText.trim() === "") return;
    try {
      await updateComentarioAtividadeTexto(atividade.id, index, editText);
      setEditIndex(null);
      setEditText("");
      await safeOnUpdate();
    } catch (err) {
      console.error("Erro atualizar comentário:", err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32 }}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-6 flex flex-col justify-between hover:shadow-2xl transition-all"
    >
      {/* Cabeçalho */}
      <div className="mb-3">
        <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-200 break-words">{atividade.title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 whitespace-pre-wrap break-words">{atividade.description}</p>

        {/* --- EXIBIÇÃO DA IMAGEM --- */}
        {atividade.imagem && (
          <div className="mt-3 mb-2">
            <img 
              src={atividade.imagem} 
              alt="Anexo" 
              className="max-h-48 w-full object-contain rounded-lg border bg-gray-50 dark:bg-gray-700 cursor-pointer hover:opacity-90 transition"
              onClick={() => {
                // Abre a imagem em nova aba (data:image...)
                const w = window.open("");
                if(w) {
                    w.document.write(`<img src="${atividade.imagem}" style="max-width:100%"/>`);
                }
              }}
            />
          </div>
        )}
        {/* --------------------------- */}

        {atividade.assignedTo && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            📌 Fixado para: <strong>{atividade.assignedTo}</strong>
          </p>
        )}

        {atividade.status === "finalizada" && atividade.concluidoPor && (
          <p className="text-sm text-green-600 dark:text-green-400 mt-2">
            ✅ Concluído por: <strong>{atividade.concluidoPor}</strong>
          </p>
        )}
      </div>

      {/* Botões */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:flex-wrap gap-2 mb-3">
        {/* Concluir */}
        {atividade.status === "pendente" && (
          <button
            onClick={handleConcluir}
            disabled={loading}
            className={`w-full sm:w-auto flex-0 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition ${
              loading ? "bg-gray-400 text-white" : "bg-green-600 hover:bg-green-700 text-white"
            }`}
          >
            {loading ? "..." : <><FaCheck /> Concluir</>}
          </button>
        )}

        {/* Fixar (apenas admin) */}
        {isAdmin && atividade.status === "pendente" && (
          <button
            onClick={() => onFixar && onFixar(atividade)}
            className="w-full sm:w-auto flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            <FaThumbtack /> Fixar
          </button>
        )}

        {/* Alterar usuário (admin) */}
        {isAdmin && atividade.assignedTo && (
          <button
            onClick={() => setShowAlterarModal(true)}
            className="w-full sm:w-auto flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg"
          >
            <FaUserEdit /> Alterar
          </button>
        )}

        {/* Botão Excluir (Admin OU Autor se pendente) */}
        {canDelete && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="w-full sm:w-auto flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg ml-auto"
          >
            {deleting ? "..." : <><FaTrash /> Excluir</>}
          </button>
        )}
      </div>

      {showAlterarModal && (
        <ModalAlterarUsuario atividade={atividade} onClose={() => setShowAlterarModal(false)} onUpdate={onUpdate} />
      )}

      {/* Comentários */}
      <div className="mt-2 border-t pt-2 border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-semibold mb-2 text-gray-800 dark:text-gray-200">Comentários:</h4>
        <div className="space-y-3 mb-3 max-h-40 overflow-y-auto">
          {(atividade.comentarios && atividade.comentarios.length > 0) ? (
            atividade.comentarios.map((coment, index) => (
              <div
                key={index}
                className="bg-gray-100 dark:bg-gray-700 rounded-lg p-2 flex flex-col sm:flex-row justify-between items-start sm:items-center text-sm"
              >
                {editIndex === index ? (
                  <div className="flex w-full gap-2">
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="border rounded px-2 py-1 flex-1 bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100"
                    />
                    <button onClick={() => handleUpdateComentario(index)} className="text-green-600">Salvar</button>
                  </div>
                ) : (
                  <>
                    <div className="mb-1 sm:mb-0">
                      <span className="text-gray-800 dark:text-gray-200">
                        <strong>{coment.autor}:</strong> {coment.texto}
                      </span>
                    </div>
                    <div className="flex gap-2 text-xs">
                      {coment.autor === user.username && (
                        <button onClick={() => { setEditIndex(index); setEditText(coment.texto); }} className="text-blue-500"><FaEdit /></button>
                      )}
                      {(coment.autor === user.username || isAdmin) && (
                        <button onClick={() => handleDeleteComentario(index)} className="text-red-500"><FaTrash /></button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400">Nenhum comentário.</p>
          )}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Escreva..."
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            className="w-full border rounded-lg px-3 py-1 text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700"
          />
          <button onClick={handleAddComentario} className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm">Enviar</button>
        </div>
      </div>
    </motion.div>
  );
};

export default AtividadeCard;
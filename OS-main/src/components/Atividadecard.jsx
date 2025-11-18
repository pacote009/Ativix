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

// logo no topo do arquivo, abaixo dos imports
console.log("AtividadeCard: componente carregado", new Date().toISOString());


const AtividadeCard = ({ atividade, onUpdate, onFixar, onConcluded, onGlobalUpdate }) => {
  const user = getCurrentUser() || { username: "Desconhecido", role: "user" };
  const [showAlterarModal, setShowAlterarModal] = useState(false);
  const [comentario, setComentario] = useState("");
  const [editIndex, setEditIndex] = useState(null);
  const [editText, setEditText] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const safeOnUpdate = async () => {
    if (typeof onUpdate === "function") {
      try {
        await onUpdate();
      } catch (err) {
        console.error("Erro no onUpdate():", err);
      }
    }
  };

  const handleConcluir = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const resp = await updateAtividade(atividade.id, {
        status: "finalizada",
        concluidoPor: user.username,
      });
      console.log("updateAtividade resp:", resp);

      if (typeof onConcluded === "function") {
        try {
          onConcluded(atividade.id);
        } catch (err) {
          console.error("Erro ao chamar onConcluded:", err);
        }
      }

      await safeOnUpdate();

      if (typeof onGlobalUpdate === "function") {
        try {
          onGlobalUpdate();
        } catch (err) {
          console.error("Erro ao chamar onGlobalUpdate:", err);
        }
      }
    } catch (err) {
      console.error("Erro ao concluir atividade:", err);
      alert("Erro ao concluir a atividade. Veja o console para detalhes.");
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
    if (code === 401) {
      alert("Você precisa estar logado para excluir atividades.");
    } else if (code === 403) {
      alert("Apenas administradores podem excluir atividades.");
    } else {
      alert("Erro ao deletar atividade. Veja o console para detalhes.");
    }
  } finally {
    setDeleting(false);
  }
};


  const handleAddComentario = async () => {
    if (comentario.trim() === "") return;
    const novosComentarios = [
      ...(atividade.comentarios || []),
      { autor: user.username, texto: comentario },
    ];
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
      console.error("Erro ao deletar comentário:", err);
      alert("Erro ao deletar comentário.");
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
      console.error("Erro ao atualizar comentário:", err);
      alert("Erro ao atualizar comentário.");
    }
  };

  // controle de permissão para excluir: somente admin
const canDelete = user.role && String(user.role).toLowerCase() === "admin";


  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32 }}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-6 flex flex-col justify-between hover:shadow-2xl transition-all"
    >
      {/* Cabeçalho */}
      <div className="mb-3">
        <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-200">{atividade.title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{atividade.description}</p>

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

      {/* Botões: responsivo (empilha no mobile) */}
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
            {loading ? "Concluindo..." : <><FaCheck /> Concluir</>}
          </button>
        )}

        {/* Fixar (apenas admin) */}
        {user.role?.toLowerCase() === "admin" && atividade.status === "pendente" && (
          <button
            onClick={() => onFixar && onFixar(atividade)}
            className="w-full sm:w-auto flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            <FaThumbtack /> Fixar
          </button>
        )}

        {/* Alterar usuário (admin) */}
        {user.role === "admin" && atividade.assignedTo && (
          <button
            onClick={() => setShowAlterarModal(true)}
            className="w-full sm:w-auto flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg"
          >
            <FaUserEdit /> Alterar Usuário
          </button>
        )}

        {/* Novo: botão Excluir para atividades pendentes (admin ou autor) */}
        {atividade.status === "pendente" && canDelete && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="w-full sm:w-auto flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
          >
            {deleting ? "..." : <><FaTrash /> Excluir</>}
          </button>
        )}

        {/* Caso seja admin e não encaixe nos outros, admin ainda tem opção excluir no fim */}
        {user.role === "admin" && atividade.status !== "pendente" && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="w-full sm:w-auto flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
          >
            {deleting ? "..." : <><FaTrash /> Excluir</>}
          </button>
        )}
      </div>

      {/* Modal Alterar Usuário */}
      {showAlterarModal && (
        <ModalAlterarUsuario atividade={atividade} onClose={() => setShowAlterarModal(false)} onUpdate={onUpdate} />
      )}

      {/* Comentários */}
      <div className="mt-2">
        <h4 className="text-base font-semibold mb-2 text-gray-800 dark:text-gray-200">Comentários:</h4>
        <div className="space-y-3">
          {(atividade.comentarios && atividade.comentarios.length > 0) ? (
            atividade.comentarios.map((coment, index) => (
              <div
                key={index}
                className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center shadow-sm"
              >
                {editIndex === index ? (
                  <div className="flex w-full gap-2">
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="border rounded-lg px-3 py-2 flex-1 focus:outline-none bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100"
                    />
                    <button
                      onClick={() => handleUpdateComentario(index)}
                      className="bg-green-500 text-white px-3 py-2 rounded-lg hover:bg-green-600"
                    >
                      Salvar
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="mb-2 sm:mb-0">
                      <span className="text-gray-800 dark:text-gray-200">
                        <strong>{coment.autor}:</strong> {coment.texto}
                      </span>
                    </div>
                    <div className="flex gap-3">
                      {coment.autor === user.username && (
                        <button
                          onClick={() => {
                            setEditIndex(index);
                            setEditText(coment.texto);
                          }}
                          className="text-blue-500 hover:underline"
                        >
                          <FaEdit />
                        </button>
                      )}
                      {(coment.autor === user.username || user.role === "admin") && (
                        <button
                          onClick={() => handleDeleteComentario(index)}
                          className="text-red-500 hover:underline"
                        >
                          <FaTrash />
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))
          ) : (
            <p className="text-gray-500 dark:text-gray-400">Nenhum comentário ainda.</p>
          )}
        </div>

        <div className="flex gap-3 mt-3">
          <input
            type="text"
            placeholder="Adicionar comentário..."
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            className="w-full border rounded-lg p-2 text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 placeholder-gray-400"
          />
          <button
            onClick={handleAddComentario}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Adicionar
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default AtividadeCard;

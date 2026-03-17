import { useEffect, useState } from "react";
import { getUsers, assignAtividade } from "../services/api";
import InfoModal from "./InfoModal";

const ModalAlterarUsuario = ({ atividade, onClose, onUpdate }) => {
  const [usuarios, setUsuarios] = useState([]);
  const [selectedUser, setSelectedUser] = useState(atividade.assignedTo || "");
  const [dialog, setDialog] = useState({ open: false, title: "", message: "" });

  useEffect(() => {
    const fetchUsers = async () => {
      const users = await getUsers();
      setUsuarios(users);
    };
    fetchUsers();
  }, []);

  const handleAlterar = async () => {
    if (!selectedUser) {
      setDialog({ open: true, title: "Campo obrigatório", message: "Selecione um usuário." });
      return;
    }
    await assignAtividade(atividade.id, selectedUser);
    onUpdate();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white rounded-xl shadow-lg p-6 w-96">
        <h2 className="text-lg font-semibold mb-4">Alterar Usuário Fixado</h2>
        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          className="border rounded px-3 py-2 w-full mb-4"
        >
          <option value="">Selecione um usuário</option>
          {usuarios.map((u) => (
            <option key={u.id} value={u.username}>
              {u.username}
            </option>
          ))}
        </select>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
          >
            Cancelar
          </button>
          <button
            onClick={handleAlterar}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Alterar
          </button>
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
};

export default ModalAlterarUsuario;

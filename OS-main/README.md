# 📋 Sistema de Ordens de Serviço (OS)

Aplicativo web para gerenciamento de Ordens de Serviço (OS).  
Permite cadastro de usuários, registro de serviços, acompanhamento de status e relatórios.

---

## 🚀 Tecnologias
- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [TailwindCSS](https://tailwindcss.com/)
- [ESLint](https://eslint.org/)
- [JSON Server](https://github.com/typicode/json-server) (simulação de backend)

---

## 📂 Estrutura de Pastas
OS/

├── public/ # Arquivos estáticos

├── src/ # Código fonte principal

│ ├── assets/ # Imagens, ícones, fontes

│ ├── components/ # Componentes reutilizáveis

│ ├── pages/ # Páginas (rotas principais)

│ ├── services/ # Comunicação com APIs / backend

│ ├── hooks/ # Hooks customizados

│ ├── utils/ # Funções auxiliares

│ └── App.jsx # Componente raiz

├── db.json # Banco de dados fake (JSON Server)

├── package.json

└── vite.config.js



---

## 🔧 Como rodar localmente

```bash
# Clone o repositório
git clone https://github.com/pacote009/OS.git

# Entre na pasta
cd OS

# Instale as dependências
npm install

# Rode o frontend
npm run dev

# Em outro terminal, rode o backend fake
npx json-server --watch db.json --port 3001

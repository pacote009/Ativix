import bcrypt from 'bcryptjs';
import prisma from '../src/prismaClient.js';

async function main() {
  const password = await bcrypt.hash('Senha123!', 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      name: 'Administrador',
      username: 'admin',
      email: 'admin@example.com',
      password,
      role: 'ADMIN'
    }
  });
  console.log('Admin criado: admin / Senha123!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect() });

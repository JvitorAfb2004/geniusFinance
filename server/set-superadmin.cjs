// Script para setar um usuário como superadmin
// Uso: node server/set-superadmin.cjs contato.geniusdev@gmail.com
const admin = require('firebase-admin');

const email = process.argv[2];
if (!email) {
  console.error('Uso: node server/set-superadmin.cjs <email>');
  process.exit(1);
}

async function main() {
  // Inicializa com a service account
  try {
    const serviceAccount = require('./service-account.json');
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  } catch (e) {
    console.error('Erro: service-account.json não encontrado em server/.');
    console.error('Baixe o arquivo no Firebase Console > Project Settings > Service Accounts.');
    process.exit(1);
  }

  try {
    // Busca o usuário pelo email
    const user = await admin.auth().getUserByEmail(email);

    // Seta a custom claim
    await admin.auth().setCustomUserClaims(user.uid, { role: 'superadmin' });

    console.log(`✅ Superadmin ativado para: ${email} (uid: ${user.uid})`);
    console.log('O usuário precisa fazer logout e login novamente para a claim ter efeito.');
  } catch (e) {
    if (e.code === 'auth/user-not-found') {
      console.error(`❌ Usuário com email "${email}" não encontrado.`);
      console.error('O usuário precisa ter feito login pelo menos uma vez.');
    } else {
      console.error('❌ Erro:', e.message);
    }
  }
}

main();

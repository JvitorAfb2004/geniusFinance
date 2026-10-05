import "dotenv/config";

import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminFirestore } from "../app/services/firebase-admin.server";
import { DEFAULT_CATEGORIES } from "../app/lib/categories";
import { ALL_DEFAULT_LEAD_OPTIONS } from "../app/lib/leadDefaults";
import { DEFAULT_PROJECT_KANBAN_COLUMNS } from "../app/lib/projectKanbanColumns";

function formatYmd(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function shiftDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function atDayOfMonth(base: Date, day: number) {
  const d = new Date(base.getFullYear(), base.getMonth(), Math.min(day, 28));
  return d;
}

async function main() {
  const positional = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
  const email = (positional[0] || "demo.prints@geniushub.app").trim().toLowerCase();
  const password = (process.env.PRINTS_PASSWORD || "").trim();
  if (!password) throw new Error("Defina PRINTS_PASSWORD com a senha da conta demo.");
  const force = process.argv.includes("--force");

  const adminAuth = getAdminAuth();
  const adminDb = getAdminFirestore();

  let uid: string;
  try {
    const existing = await adminAuth.getUserByEmail(email);
    uid = existing.uid;
    await adminAuth.updateUser(uid, { password, disabled: false });
    console.log(`Usuário demo já existia (${email}). Senha atualizada.`);
  } catch {
    const created = await adminAuth.createUser({
      email,
      password,
      displayName: "Conta Demonstração",
      emailVerified: true,
    });
    uid = created.uid;
    console.log(`Usuário demo criado (${email}).`);
  }

  const seedRef = adminDb.doc(`users/${uid}/demo-seed/prints`);
  const seedSnap = await seedRef.get();
  if (seedSnap.exists && !force) {
    console.log("Seed de prints já aplicado. Use --force para recriar.");
    return;
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const deadline = formatYmd(shiftDays(now, 180));

  // Categorias padrão
  const categoriesSnap = await adminDb.collection(`users/${uid}/categories`).get();
  if (categoriesSnap.empty) {
    const batch = adminDb.batch();
    for (const cat of DEFAULT_CATEGORIES) {
      const ref = adminDb.collection(`users/${uid}/categories`).doc();
      batch.set(ref, { userId: uid, name: cat.name, section: cat.section, order: cat.order, isDefault: true });
    }
    await batch.commit();
  }
  const categories = (await adminDb.collection(`users/${uid}/categories`).get()).docs.map((d) => ({
    id: d.id,
    ...(d.data() as any),
  }));
  const catId = (name: string) => categories.find((c) => c.name === name)?.id || "";

  // Transações do mês (contexto pessoal)
  const txs = [
    { title: "Salário mensal", amount: 8500, date: formatYmd(atDayOfMonth(now, 5)), type: "INCOME", status: "PAID", category: "Salario" },
    { title: "Freelance site institucional", amount: 2400, date: formatYmd(atDayOfMonth(now, 12)), type: "INCOME", status: "PAID", category: "Renda extra" },
    { title: "Fatura cliente em aberto", amount: 1800, date: formatYmd(now), type: "INCOME", status: "PENDING", category: "Outros (Entrada)" },
    { title: "Aluguel", amount: 1900, date: formatYmd(atDayOfMonth(now, 3)), type: "EXPENSE", status: "PAID", category: "Outros (Saida)", isFixed: true },
    { title: "Supermercado", amount: 640.5, date: formatYmd(atDayOfMonth(now, 8)), type: "EXPENSE", status: "PAID", category: "Feira" },
    { title: "Internet fibra", amount: 119.9, date: formatYmd(atDayOfMonth(now, 10)), type: "EXPENSE", status: "PAID", category: "Internet / Recarga", isFixed: true },
    { title: "Conta de luz", amount: 210.35, date: formatYmd(shiftDays(now, -2)), type: "EXPENSE", status: "PENDING", category: "Energia" },
    { title: "Fatura do cartão", amount: 980, date: formatYmd(shiftDays(now, 4)), type: "EXPENSE", status: "PENDING", category: "Outros (Saida)" },
    { title: "Academia", amount: 99, date: formatYmd(shiftDays(now, 6)), type: "EXPENSE", status: "PENDING", category: "Academia" },
    { title: "Farmácia", amount: 85.2, date: formatYmd(atDayOfMonth(now, 14)), type: "EXPENSE", status: "PAID", category: "Farmacia" },
    { title: "Corte de cabelo", amount: 60, date: formatYmd(now), type: "EXPENSE", status: "PENDING", category: "Corte de cabelo" },
    { title: "Combustível", amount: 300, date: formatYmd(shiftDays(now, -5)), type: "EXPENSE", status: "PAID", category: "Transporte" },
  ];
  const txBatch = adminDb.batch();
  for (const tx of txs) {
    const ref = adminDb.collection(`users/${uid}/transactions`).doc();
    txBatch.set(ref, {
      userId: uid,
      context: "PERSONAL",
      title: tx.title,
      amount: tx.amount,
      date: tx.date,
      type: tx.type,
      status: tx.status,
      categoryId: catId(tx.category),
      tagIds: [],
      ...(tx.isFixed ? { isFixed: true } : {}),
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  }
  await txBatch.commit();

  // Metas e limite de gastos
  const miscBatch = adminDb.batch();
  const goal1 = adminDb.collection(`users/${uid}/goals`).doc();
  miscBatch.set(goal1, {
    userId: uid, name: "Reserva de emergência", targetAmount: 20000, currentAmount: 12500,
    deadline, category: "SAVINGS", color: "#10b981", createdAt: nowIso, updatedAt: nowIso,
  });
  const goal2 = adminDb.collection(`users/${uid}/goals`).doc();
  miscBatch.set(goal2, {
    userId: uid, name: "Viagem de férias", targetAmount: 8000, currentAmount: 3200,
    deadline, category: "PURCHASE", color: "#1a1d21", createdAt: nowIso, updatedAt: nowIso,
  });
  const limit = adminDb.collection(`users/${uid}/spending-limits`).doc();
  miscBatch.set(limit, {
    userId: uid, context: "PERSONAL", name: "Alimentação do mês", limitAmount: 1500,
    categoryIds: [catId("Feira"), catId("Lanche")].filter(Boolean),
    month: now.getMonth() + 1, year: now.getFullYear(), createdAt: nowIso, updatedAt: nowIso,
  });
  await miscBatch.commit();

  // CRM: opções + leads
  const leadOptionsSnap = await adminDb.collection(`users/${uid}/lead-options`).get();
  if (leadOptionsSnap.empty) {
    const optionsBatch = adminDb.batch();
    for (const opt of ALL_DEFAULT_LEAD_OPTIONS) {
      const ref = adminDb.collection(`users/${uid}/lead-options`).doc();
      optionsBatch.set(ref, { userId: uid, ...opt });
    }
    await optionsBatch.commit();
  }
  const leads = [
    { clientName: "Padaria Pão Dourado", responsible: "Ana", email: "contato@paodourado.com", phone: "(11) 99999-1111", service: "Desenvolvimento Web", status: "Novo", description: "Site institucional + cardápio online", source: "Instagram", proposalDate: formatYmd(shiftDays(now, -3)) },
    { clientName: "Clínica Vitta", responsible: "Bruno", email: "contato@clinicavitta.com", phone: "(11) 99999-2222", service: "Tráfego Pago", status: "Em negociação", description: "Gestão de anúncios mensais", source: "Indicação", proposalDate: formatYmd(shiftDays(now, -8)) },
    { clientName: "Loja Esporte Total", responsible: "Carla", email: "contato@esportetotal.com", phone: "(11) 99999-3333", service: "Desenvolvimento Mobile", status: "Proposta enviada", description: "App de catálogo e pedidos", source: "Site", proposalDate: formatYmd(shiftDays(now, -1)) },
  ];
  const leadsBatch = adminDb.batch();
  for (const lead of leads) {
    const ref = adminDb.collection(`users/${uid}/leads`).doc();
    leadsBatch.set(ref, { userId: uid, ...lead, link: "", additionalField: "", createdAt: nowIso, updatedAt: nowIso });
  }
  await leadsBatch.commit();

  // Projetos
  const serviceTypesSnap = await adminDb.collection(`users/${uid}/service-types`).get();
  let serviceTypeId = serviceTypesSnap.docs[0]?.id || "";
  if (!serviceTypeId) {
    const ref = adminDb.collection(`users/${uid}/service-types`).doc();
    await ref.set({
      userId: uid, name: "Site institucional",
      steps: [
        { order: 0, title: "Briefing" },
        { order: 1, title: "Layout" },
        { order: 2, title: "Desenvolvimento" },
        { order: 3, title: "Entrega" },
      ],
      customFieldDefs: [], createdAt: nowIso, updatedAt: nowIso,
    });
    serviceTypeId = ref.id;
  }
  await adminDb.doc(`users/${uid}/project-kanban-settings/default`).set({
    userId: uid,
    columns: DEFAULT_PROJECT_KANBAN_COLUMNS,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  const projectsBatch = adminDb.batch();
  const project1 = adminDb.collection(`users/${uid}/projects`).doc();
  projectsBatch.set(project1, {
    userId: uid, title: "Site Padaria Pão Dourado", serviceTypeId, clientName: "Padaria Pão Dourado",
    description: "Site institucional com cardápio online", status: "IN_PROGRESS",
    stepStatuses: [{ stepIndex: 0, done: true }, { stepIndex: 1, done: true }, { stepIndex: 2, done: false }, { stepIndex: 3, done: false }],
    customFieldValues: [], dueDate: formatYmd(shiftDays(now, 20)), price: 4500, createdAt: nowIso, updatedAt: nowIso,
  });
  const project2 = adminDb.collection(`users/${uid}/projects`).doc();
  projectsBatch.set(project2, {
    userId: uid, title: "App Loja Esporte Total", serviceTypeId, clientName: "Loja Esporte Total",
    description: "App de catálogo e pedidos", status: "BACKLOG",
    stepStatuses: [], customFieldValues: [], dueDate: formatYmd(shiftDays(now, 45)), price: 12000,
    createdAt: nowIso, updatedAt: nowIso,
  });
  await projectsBatch.commit();

  await seedRef.set({ appliedAt: nowIso });
  console.log(`Seed de prints aplicado para ${email}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

import "dotenv/config";

import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminFirestore } from "../app/services/firebase-admin.server";
import { DEFAULT_CATEGORIES } from "../app/lib/categories";
import { ALL_DEFAULT_LEAD_OPTIONS } from "../app/lib/leadDefaults";

type ContextType = "BUSINESS";
type TransactionType = "INCOME" | "EXPENSE";
type TransactionStatus = "PENDING" | "PAID";

function formatYmd(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function addMonths(base: Date, months: number) {
  const d = new Date(base);
  d.setMonth(d.getMonth() + months);
  return d;
}

function must(value: string, label: string) {
  const v = value.trim();
  if (!v) throw new Error(`Missing required value: ${label}`);
  return v;
}

async function main() {
  const email = (process.argv[2] || "jvitorafb@gmail.com").trim().toLowerCase();
  const accountName = (process.argv[3] || "Demo").trim();
  const force = process.argv.includes("--force");
  const append = process.argv.includes("--append");
  const monthlyArg = process.argv.find((arg) => arg.startsWith("--monthly="));
  const targetMonthlyRevenue = monthlyArg ? Number(monthlyArg.split("=", 2)[1]) : 100_000;

  const adminAuth = getAdminAuth();
  const adminDb = getAdminFirestore();

  const user = await adminAuth.getUserByEmail(email);
  const uid = must(user.uid, "uid");

  const membershipsSnap = await adminDb.collection(`user-accounts/${uid}/memberships`).get();
  const memberships = membershipsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  const membership = memberships.find((m) => String(m.accountName || "").trim() === accountName);
  if (!membership) {
    const names = memberships.map((m) => String(m.accountName || m.id)).filter(Boolean).join(", ");
    throw new Error(`Conta "${accountName}" não encontrada para o usuário. Contas visíveis: ${names || "(nenhuma)"}`);
  }

  const accountId = must(String(membership.accountId || membership.id), "accountId");

  const seedMetaRef = adminDb.doc(`accounts/${accountId}/demo-seed/info`);
  const seedMetaSnap = await seedMetaRef.get();
  const seedMeta = seedMetaSnap.exists ? (seedMetaSnap.data() as any) : null;
  if (seedMetaSnap.exists && !force && !append) {
    console.log(`Seed já aplicado em accounts/${accountId}. Use --append para adicionar mais dados ou --force para recriar.`);
    return;
  }

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = addMonths(thisMonthStart, -1);
  const twoMonthsAgoStart = addMonths(thisMonthStart, -2);
  const monthsKey = `${formatYmd(twoMonthsAgoStart)}_${formatYmd(thisMonthStart)}`;
  const appendRunKey = `append-v3:monthly=${targetMonthlyRevenue}:months=${monthsKey}`;

  if (append && !force) {
    const appliedRuns: string[] = Array.isArray(seedMeta?.appliedRuns) ? seedMeta.appliedRuns : [];
    if (appliedRuns.includes(appendRunKey)) {
      console.log(`Append já aplicado (${appendRunKey}). Nada a fazer.`);
      return;
    }
  }

  // ---------- Categories (create only if empty, but always build name->id map) ----------
  const categoriesCol = adminDb.collection(`accounts/${accountId}/categories`);
  const categoryIdByName = new Map<string, string>();
  const existingCategoriesSnap = await categoriesCol.get();
  if (existingCategoriesSnap.empty || force) {
    const categoryBatch = adminDb.batch();
    for (const cat of DEFAULT_CATEGORIES) {
      const ref = categoriesCol.doc();
      categoryIdByName.set(cat.name, ref.id);
      categoryBatch.set(ref, {
        userId: uid,
        name: cat.name,
        section: cat.section,
        order: cat.order,
        isDefault: true,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    await categoryBatch.commit();
  } else {
    for (const d of existingCategoriesSnap.docs) {
      const data = d.data() as any;
      if (data?.name) categoryIdByName.set(String(data.name), d.id);
    }
  }

  // ---------- Lead options (create only if empty) ----------
  const leadOptionsCol = adminDb.collection(`accounts/${accountId}/lead-options`);
  const leadOptSnap = await leadOptionsCol.get();
  if (leadOptSnap.empty || force) {
    const leadOptBatch = adminDb.batch();
    for (const opt of ALL_DEFAULT_LEAD_OPTIONS) {
      const ref = leadOptionsCol.doc();
      leadOptBatch.set(ref, {
        userId: uid,
        ...opt,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    await leadOptBatch.commit();
  }

  // ---------- Tags (create only if empty, but always build name->id map) ----------
  const tagsCol = adminDb.collection(`accounts/${accountId}/tags`);
  const tags = [
    { name: "IA", color: "#3b82f6" },
    { name: "Recorrente", color: "#10b981" },
    { name: "Urgente", color: "#ef4444" },
    { name: "Marketing", color: "#f59e0b" },
  ];
  const tagIdByName = new Map<string, string>();
  const existingTagsSnap = await tagsCol.get();
  if (existingTagsSnap.empty || force) {
    const tagBatch = adminDb.batch();
    for (const tag of tags) {
      const ref = tagsCol.doc();
      tagIdByName.set(tag.name, ref.id);
      tagBatch.set(ref, {
        userId: uid,
        ...tag,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    await tagBatch.commit();
  } else {
    for (const d of existingTagsSnap.docs) {
      const data = d.data() as any;
      if (data?.name) tagIdByName.set(String(data.name), d.id);
    }
  }

  // ---------- Transactions ----------
  const txCol = adminDb.collection(`accounts/${accountId}/transactions`);
  const txBatch = adminDb.batch();

  const mkTx = (data: {
    context: ContextType;
    type: TransactionType;
    title: string;
    amount: number;
    date: string;
    status: TransactionStatus;
    isFixed?: boolean;
    groupId?: string;
    installmentInfo?: string;
    endDate?: string;
    categoryId?: string;
    tagIds?: string[];
  }) => {
    const ref = txCol.doc();
    txBatch.set(ref, {
      userId: uid,
      ...data,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  };

  const cat = (name: string) => categoryIdByName.get(name);
  const tag = (name: string) => tagIdByName.get(name);

  // Helper: generates deterministic "random-ish" values without external deps
  const pseudo = (n: number) => {
    const x = Math.sin(n * 999) * 10000;
    return x - Math.floor(x);
  };

  const monthDays = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const genRevenueForMonth = (monthStart: Date, monthLabel: string, target: number) => {
    const days = monthDays(monthStart);
    const clients = 38; // good density for demo
    const baseAmounts = Array.from({ length: clients }, (_, i) => {
      const r = pseudo((monthStart.getMonth() + 1) * 100 + i + 1);
      const tier = r < 0.2 ? 1200 : r < 0.6 ? 1900 : r < 0.85 ? 2900 : 4500;
      const noise = Math.round((r * 0.2 - 0.1) * tier);
      return Math.max(900, tier + noise);
    });
    const sum = baseAmounts.reduce((a, b) => a + b, 0);
    const scale = target / sum;
    const scaled = baseAmounts.map((v) => Math.round(v * scale));
    // Fix rounding drift on last item
    const scaledSum = scaled.reduce((a, b) => a + b, 0);
    scaled[scaled.length - 1] += target - scaledSum;

    for (let i = 0; i < scaled.length; i++) {
      const day = 1 + Math.floor(pseudo(i + monthStart.getMonth() * 50) * Math.min(days, 25));
      mkTx({
        context: "BUSINESS",
        type: "INCOME",
        title: `Mensalidade ${monthLabel} - Cliente ${String(i + 1).padStart(2, "0")}`,
        amount: scaled[i],
        date: formatYmd(addDays(monthStart, day - 1)),
        status: monthStart.getTime() === thisMonthStart.getTime() && day > 20 ? "PENDING" : "PAID",
        categoryId: cat("Renda extra"),
        tagIds: [tag("Recorrente")].filter(Boolean) as string[],
      });
    }

    // a few bigger one-off projects to make it look "richer"
    const projects = [
      { title: `Projeto ${monthLabel} - Implementação (parcial)`, amount: Math.round(target * 0.18) },
      { title: `Setup ${monthLabel} - Onboarding empresas`, amount: Math.round(target * 0.07) },
    ];
    for (let i = 0; i < projects.length; i++) {
      const day = 3 + i * 9;
      mkTx({
        context: "BUSINESS",
        type: "INCOME",
        title: projects[i].title,
        amount: projects[i].amount,
        date: formatYmd(addDays(monthStart, day)),
        status: monthStart.getTime() === thisMonthStart.getTime() ? "PAID" : "PAID",
        categoryId: cat("Outros (Entrada)"),
        tagIds: [tag("Marketing")].filter(Boolean) as string[],
      });
    }
  };

  // Ensure some business-like categories exist for costs (non-default)
  const ensureCategory = async (name: string, section: "RECEITA" | "CUSTOS" | "DESPESAS") => {
    if (categoryIdByName.has(name) && !force) return categoryIdByName.get(name)!;
    // Try to find existing by name
    const snap = await categoriesCol.where("name", "==", name).limit(1).get();
    if (!snap.empty) {
      const id = snap.docs[0].id;
      categoryIdByName.set(name, id);
      return id;
    }
    const ref = categoriesCol.doc();
    categoryIdByName.set(name, ref.id);
    await ref.set({
      userId: uid,
      name,
      section,
      order: 999,
      isDefault: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return ref.id;
  };

  const impostosCategoryId = await ensureCategory("Impostos", "DESPESAS");
  const folhaCategoryId = await ensureCategory("Folha / Pró-labore", "DESPESAS");
  const marketingCategoryId = await ensureCategory("Marketing / Anúncios", "CUSTOS");
  const saasCategoryId = await ensureCategory("SaaS / Ferramentas", "DESPESAS");
  const operacionalCategoryId = await ensureCategory("Operação / Fornecedores", "CUSTOS");

  genRevenueForMonth(thisMonthStart, "Mês atual", targetMonthlyRevenue);
  genRevenueForMonth(lastMonthStart, "Mês anterior", targetMonthlyRevenue);
  genRevenueForMonth(twoMonthsAgoStart, "2 meses atrás", targetMonthlyRevenue);

  const genCostsForMonth = (monthStart: Date, monthLabel: string, targetRevenue: number) => {
    const days = monthDays(monthStart);
    // Tax ~8% revenue
    mkTx({
      context: "BUSINESS",
      type: "EXPENSE",
      title: `Impostos (${monthLabel})`,
      amount: Math.round(targetRevenue * 0.08),
      date: formatYmd(addDays(monthStart, 19)),
      status: monthStart.getTime() === thisMonthStart.getTime() ? "PENDING" : "PAID",
      categoryId: impostosCategoryId,
      tagIds: [tag("Urgente")].filter(Boolean) as string[],
    });
    // Payroll / pro-labore
    mkTx({
      context: "BUSINESS",
      type: "EXPENSE",
      title: `Folha / Pró-labore (${monthLabel})`,
      amount: Math.round(targetRevenue * 0.18),
      date: formatYmd(addDays(monthStart, 4)),
      status: "PAID",
      categoryId: folhaCategoryId,
    });
    // Ads / marketing
    mkTx({
      context: "BUSINESS",
      type: "EXPENSE",
      title: `Tráfego pago (${monthLabel})`,
      amount: Math.round(targetRevenue * 0.06),
      date: formatYmd(addDays(monthStart, 9)),
      status: monthStart.getTime() === thisMonthStart.getTime() ? "PENDING" : "PAID",
      categoryId: marketingCategoryId,
      tagIds: [tag("Marketing")].filter(Boolean) as string[],
    });
    // SaaS tools
    mkTx({
      context: "BUSINESS",
      type: "EXPENSE",
      title: `SaaS / Ferramentas (${monthLabel})`,
      amount: 1490,
      date: formatYmd(addDays(monthStart, 1)),
      status: "PAID",
      categoryId: saasCategoryId,
    });
    // Contractor / suppliers
    const suppliers = 8;
    for (let i = 0; i < suppliers; i++) {
      const r = pseudo((monthStart.getMonth() + 1) * 200 + i + 3);
      const amount = Math.round((1800 + r * 4200) / 10) * 10;
      const day = 2 + Math.floor(r * Math.min(days, 22));
      mkTx({
        context: "BUSINESS",
        type: "EXPENSE",
        title: `Fornecedor ${monthLabel} - Serviço ${String(i + 1).padStart(2, "0")}`,
        amount,
        date: formatYmd(addDays(monthStart, day)),
        status: monthStart.getTime() === thisMonthStart.getTime() && day > 20 ? "PENDING" : "PAID",
        categoryId: operacionalCategoryId,
      });
    }
    // Office fixed bills (to give some variety)
    mkTx({
      context: "BUSINESS",
      type: "EXPENSE",
      title: `Aluguel escritório (${monthLabel})`,
      amount: 4200,
      date: formatYmd(addDays(monthStart, 0)),
      status: "PAID",
      categoryId: cat("Manutencao Casa") || operacionalCategoryId,
      isFixed: true,
      endDate: formatYmd(addMonths(monthStart, 5)),
    });
    mkTx({
      context: "BUSINESS",
      type: "EXPENSE",
      title: `Contabilidade (${monthLabel})`,
      amount: 980,
      date: formatYmd(addDays(monthStart, 6)),
      status: "PAID",
      categoryId: saasCategoryId,
      isFixed: true,
      endDate: formatYmd(addMonths(monthStart, 5)),
    });
  };

  genCostsForMonth(thisMonthStart, "Mês atual", targetMonthlyRevenue);
  genCostsForMonth(lastMonthStart, "Mês anterior", targetMonthlyRevenue);
  genCostsForMonth(twoMonthsAgoStart, "2 meses atrás", targetMonthlyRevenue);

  // Fixed monthly expenses
  mkTx({
    context: "BUSINESS",
    type: "EXPENSE",
    title: "Internet do escritório",
    amount: 139.9,
    date: formatYmd(addDays(thisMonthStart, 5)),
    status: "PAID",
    isFixed: true,
    endDate: formatYmd(addMonths(thisMonthStart, 5)),
    categoryId: cat("Internet / Recarga"),
    tagIds: [tag("Recorrente")].filter(Boolean) as string[],
  });
  mkTx({
    context: "BUSINESS",
    type: "EXPENSE",
    title: "Energia (estimativa)",
    amount: 220,
    date: formatYmd(addDays(thisMonthStart, 7)),
    status: "PENDING",
    categoryId: cat("Energia"),
  });

  // One-off expenses
  mkTx({
    context: "BUSINESS",
    type: "EXPENSE",
    title: "Domínio e hospedagem",
    amount: 189,
    date: formatYmd(addDays(lastMonthStart, 12)),
    status: "PAID",
    categoryId: cat("Estudos"),
    tagIds: [tag("Urgente")].filter(Boolean) as string[],
  });
  mkTx({
    context: "BUSINESS",
    type: "EXPENSE",
    title: "Software (SaaS) - ferramentas",
    amount: 129,
    date: formatYmd(addDays(twoMonthsAgoStart, 18)),
    status: "PAID",
    categoryId: cat("Outros (Saida)"),
  });

  // Credit card purchases (installments)
  const groupId = `demo-installments-${Date.now()}`;
  for (let i = 1; i <= 6; i++) {
    mkTx({
      context: "BUSINESS",
      type: "EXPENSE",
      title: "Notebook (parcelado)",
      amount: 650,
      date: formatYmd(addMonths(thisMonthStart, -(6 - i))),
      status: i <= 4 ? "PAID" : "PENDING",
      groupId,
      installmentInfo: `${i}/6`,
      categoryId: cat("Outros (Saida)"),
      tagIds: [tag("IA")].filter(Boolean) as string[],
    });
  }

  await txBatch.commit();

  // ---------- Budgets ----------
  const budgetsCol = adminDb.collection(`accounts/${accountId}/budgets`);
  const budgetsSnap = await budgetsCol.get();
  if (budgetsSnap.empty || force) {
    const budgetBatch = adminDb.batch();
    const budgetTargets = [
      { categoryId: impostosCategoryId, plannedAmount: Math.round(targetMonthlyRevenue * 0.08) },
      { categoryId: folhaCategoryId, plannedAmount: Math.round(targetMonthlyRevenue * 0.18) },
      { categoryId: marketingCategoryId, plannedAmount: Math.round(targetMonthlyRevenue * 0.06) },
      { categoryId: saasCategoryId, plannedAmount: 1600 },
      { categoryId: operacionalCategoryId, plannedAmount: Math.round(targetMonthlyRevenue * 0.12) },
    ];
    for (const b of budgetTargets) {
      const ref = budgetsCol.doc();
      budgetBatch.set(ref, {
        userId: uid,
        context: "BUSINESS",
        year: thisMonthStart.getFullYear(),
        month: thisMonthStart.getMonth() + 1,
        categoryId: b.categoryId,
        plannedAmount: b.plannedAmount,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    await budgetBatch.commit();
  }

  // ---------- Spending limits ----------
  const limitsCol = adminDb.collection(`accounts/${accountId}/spending-limits`);
  const limitsSnap = await limitsCol.get();
  if (limitsSnap.empty || force) {
    const limitsBatch = adminDb.batch();
    const limitRef = limitsCol.doc();
    limitsBatch.set(limitRef, {
      userId: uid,
      context: "BUSINESS",
      name: "Operação (mensal)",
      limitAmount: Math.round(targetMonthlyRevenue * 0.35),
      categoryIds: [
        impostosCategoryId,
        folhaCategoryId,
        marketingCategoryId,
        saasCategoryId,
        operacionalCategoryId,
      ],
      month: thisMonthStart.getMonth() + 1,
      year: thisMonthStart.getFullYear(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    await limitsBatch.commit();
  }

  // ---------- Sales targets ----------
  const targetsCol = adminDb.collection(`accounts/${accountId}/sales-targets`);
  const targetsSnap = await targetsCol.get();
  if (targetsSnap.empty || force) {
    const targetsBatch = adminDb.batch();
    const targetRef = targetsCol.doc();
    targetsBatch.set(targetRef, {
      userId: uid,
      context: "BUSINESS",
      year: thisMonthStart.getFullYear(),
      month: thisMonthStart.getMonth() + 1,
      channel: "Inbound",
      seller: "João Vitor",
      targetAmount: Math.round(targetMonthlyRevenue * 1.2),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    await targetsBatch.commit();
  }

  // ---------- Goals ----------
  const goalsCol = adminDb.collection(`accounts/${accountId}/goals`);
  const goalsSnap = await goalsCol.get();
  if (goalsSnap.empty || force) {
    const goalsBatch = adminDb.batch();
    goalsBatch.set(goalsCol.doc(), {
      userId: uid,
      name: "Reserva de caixa",
      targetAmount: 200000,
      currentAmount: 58000,
      deadline: formatYmd(addMonths(thisMonthStart, 6)),
      category: "SAVINGS",
      color: "#3b82f6",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    goalsBatch.set(goalsCol.doc(), {
      userId: uid,
      name: "Expansão comercial",
      targetAmount: 120000,
      currentAmount: 18000,
      deadline: formatYmd(addMonths(thisMonthStart, 4)),
      category: "INVESTMENT",
      color: "#10b981",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    await goalsBatch.commit();
  }

  // ---------- Leads ----------
  const leadsCol = adminDb.collection(`accounts/${accountId}/leads`);
  const leadsSnap = await leadsCol.get();
  let lead1Ref: FirebaseFirestore.DocumentReference;
  let lead2Ref: FirebaseFirestore.DocumentReference;
  if (leadsSnap.empty || force) {
    const leadsBatch = adminDb.batch();
    lead1Ref = leadsCol.doc();
    lead2Ref = leadsCol.doc();
    const lead3Ref = leadsCol.doc();

    const leadNow = formatYmd(now);
    leadsBatch.set(lead1Ref, {
      userId: uid,
      proposalDate: leadNow,
      clientName: "Cliente Alpha LTDA",
      responsible: "João Vitor",
      email: "contato@alpha.com",
      phone: "+55 71 99999-1111",
      service: "Desenvolvimento Web",
      status: "Em negociação",
      description: "Site institucional + blog, com integração de leads.",
      source: "Indicação",
      link: "https://alpha.com",
      additionalField: "Prioridade alta",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    leadsBatch.set(lead2Ref, {
      userId: uid,
      proposalDate: formatYmd(addDays(now, -7)),
      clientName: "Beta SaaS",
      responsible: "João Vitor",
      email: "admin@betasaas.com",
      phone: "+55 11 98888-2222",
      service: "Consultoria",
      status: "Proposta enviada",
      description: "Diagnóstico financeiro e plano de ação com IA.",
      source: "LinkedIn",
      link: "https://betasaas.com",
      additionalField: "Follow-up em 3 dias",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    leadsBatch.set(lead3Ref, {
      userId: uid,
      proposalDate: formatYmd(addDays(now, -15)),
      clientName: "Gamma Studio",
      responsible: "João Vitor",
      email: "hello@gammastudio.com",
      phone: "+55 21 97777-3333",
      service: "Design",
      status: "Novo",
      description: "Identidade visual e kit social.",
      source: "Instagram",
      link: "https://instagram.com/gammastudio",
      additionalField: "",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    await leadsBatch.commit();
  } else {
    // reuse two first leads for project links
    const docs = leadsSnap.docs;
    lead1Ref = docs[0].ref;
    lead2Ref = docs.length > 1 ? docs[1].ref : docs[0].ref;
  }

  // ---------- Service types ----------
  const serviceTypesCol = adminDb.collection(`accounts/${accountId}/service-types`);
  const serviceTypesSnap = await serviceTypesCol.get();
  let stWebRef: FirebaseFirestore.DocumentReference;
  let stConsultRef: FirebaseFirestore.DocumentReference;
  if (serviceTypesSnap.empty || force) {
    const stBatch = adminDb.batch();
    stWebRef = serviceTypesCol.doc();
    stConsultRef = serviceTypesCol.doc();

    stBatch.set(stWebRef, {
      userId: uid,
      name: "Website",
      steps: [
        { order: 0, title: "Briefing" },
        { order: 1, title: "Wireframe" },
        { order: 2, title: "Implementação" },
        { order: 3, title: "Deploy" },
      ],
      customFieldDefs: [
        { key: "dominio", label: "Domínio" },
        { key: "prazo", label: "Prazo" },
      ],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    stBatch.set(stConsultRef, {
      userId: uid,
      name: "Consultoria Financeira",
      steps: [
        { order: 0, title: "Coleta de dados" },
        { order: 1, title: "Análise" },
        { order: 2, title: "Plano de ação" },
        { order: 3, title: "Acompanhamento" },
      ],
      customFieldDefs: [
        { key: "canal", label: "Canal" },
      ],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    await stBatch.commit();
  } else {
    stWebRef = serviceTypesSnap.docs[0].ref;
    stConsultRef = serviceTypesSnap.docs.length > 1 ? serviceTypesSnap.docs[1].ref : serviceTypesSnap.docs[0].ref;
  }

  // ---------- Projects + tasks ----------
  const projectsCol = adminDb.collection(`accounts/${accountId}/projects`);
  const projectsSnap = await projectsCol.get();
  if (projectsSnap.empty || force) {
    const projectBatch = adminDb.batch();

    const p1Ref = projectsCol.doc();
    projectBatch.set(p1Ref, {
      userId: uid,
      title: "Site - Cliente Alpha",
      serviceTypeId: stWebRef.id,
      leadId: lead1Ref.id,
      clientName: "Cliente Alpha LTDA",
      description: "Landing + blog + captura de leads.",
      status: "IN_PROGRESS",
      stepStatuses: [
        { stepIndex: 0, done: true, notes: "Briefing alinhado." },
        { stepIndex: 1, done: true, notes: "Wireframe aprovado." },
        { stepIndex: 2, done: false },
        { stepIndex: 3, done: false },
      ],
      customFieldValues: [
        { key: "dominio", value: "alpha.com" },
        { key: "prazo", value: formatYmd(addMonths(thisMonthStart, 1)) },
      ],
      dueDate: formatYmd(addMonths(thisMonthStart, 1)),
      price: 9000,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const p2Ref = projectsCol.doc();
    projectBatch.set(p2Ref, {
      userId: uid,
      title: "Consultoria - Beta SaaS",
      serviceTypeId: stConsultRef.id,
      leadId: lead2Ref.id,
      clientName: "Beta SaaS",
      description: "Diagnóstico e plano de ação com IA.",
      status: "REVIEW",
      stepStatuses: [
        { stepIndex: 0, done: true },
        { stepIndex: 1, done: true },
        { stepIndex: 2, done: true },
        { stepIndex: 3, done: false },
      ],
      customFieldValues: [
        { key: "canal", value: "Inbound" },
      ],
      dueDate: formatYmd(addDays(now, 10)),
      price: 3500,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    await projectBatch.commit();

    const tasksBatch = adminDb.batch();
    const mkTask = (projectId: string, data: any) => {
      const ref = adminDb.collection(`accounts/${accountId}/projects/${projectId}/tasks`).doc();
      tasksBatch.set(ref, {
        projectId,
        ...data,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    };

    mkTask(p1Ref.id, {
      title: "Implementar página inicial",
      done: false,
      dueDate: formatYmd(addDays(now, 5)),
      priority: "HIGH",
      assignee: "João Vitor",
      description: "Hero + seção de prints + features.",
      subtasks: [
        { id: "st1", title: "Hero", done: true },
        { id: "st2", title: "Prints", done: false },
        { id: "st3", title: "Features", done: false },
      ],
      order: 0,
    });
    mkTask(p1Ref.id, {
      title: "Configurar SEO básico",
      done: false,
      dueDate: formatYmd(addDays(now, 7)),
      priority: "MEDIUM",
      assignee: "João Vitor",
      description: "Meta title/description e OG.",
      subtasks: [],
      order: 1,
    });
    mkTask(p2Ref.id, {
      title: "Revisar relatório executivo",
      done: true,
      dueDate: formatYmd(addDays(now, -1)),
      priority: "MEDIUM",
      assignee: "João Vitor",
      description: "Checklist de recomendações e próximos passos.",
      subtasks: [],
      order: 0,
    });

    await tasksBatch.commit();
  }

  // ---------- Seed meta ----------
  const nextAppliedRuns = (() => {
    const appliedRuns: string[] = Array.isArray(seedMeta?.appliedRuns) ? seedMeta.appliedRuns : [];
    if (append) return Array.from(new Set([...appliedRuns, appendRunKey]));
    return appliedRuns;
  })();

  await seedMetaRef.set({
    accountId,
    accountName,
    seededForEmail: email,
    seededForUid: uid,
    version: append ? (Number(seedMeta?.version || 1) + 1) : 3,
    appliedRuns: nextAppliedRuns,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  console.log(`Seed aplicado com sucesso em accounts/${accountId} (conta: ${accountName}).`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

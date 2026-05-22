import { useMemo, useState, useEffect, useRef } from "react";
import { Link } from "react-router";
import { useFinance } from "~/hooks/useFinance";

interface PrintItem {
  label: string;
  src: string;
  description: string;
}

export default function Index() {
  const { user } = useFinance();
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);
  const [activeFaqIndex, setActiveFaqIndex] = useState<number | null>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  const topCta = useMemo(() => {
    if (user) return { label: "Abrir painel", to: "/dashboard" };
    return { label: "Entrar no sistema", to: "/login" };
  }, [user]);

  const prints = useMemo<PrintItem[]>(() => ([
    { 
      label: "Dashboard Inteligente", 
      src: "/prints/dashboard.png", 
      description: "Acompanhe saldos, projeções de fluxo de caixa, despesas recentes e faturamentos acumulados com clareza visual impecável." 
    },
    { 
      label: "Fluxo de Caixa", 
      src: "/prints/entradaesaida.png", 
      description: "Controle todas as suas transações de entrada e saída. Lançamentos rápidos categorizados por centro de custo e contas." 
    },
    { 
      label: "DRE Automático", 
      src: "/prints/DRE.png", 
      description: "Demonstrativo do Resultado do Exercício gerado em tempo real. Veja sua margem bruta, custos operacionais e lucro líquido sem planilhas manuais." 
    },
    { 
      label: "Projetos e Kanban", 
      src: "/prints/projetos.png", 
      description: "Planeje e gerencie a execução de contratos e serviços de forma visual. Mova cards pelo pipeline e garanta entregas no prazo." 
    },
    { 
      label: "Custos Recorrentes (Mensais)", 
      src: "/prints/fixosmensais.png", 
      description: "Monitore despesas fixas, assinaturas de softwares e contratos recorrentes para prever saídas futuras com exatidão." 
    },
    { 
      label: "Limites de Gastos", 
      src: "/prints/limites.png", 
      description: "Defina tetos orçamentários inteligentes para categorias e departamentos, evitando surpresas de estourar o caixa do mês." 
    },
    { 
      label: "Metas Financeiras", 
      src: "/prints/metas.png", 
      description: "Trace metas claras de receita, faturamento ou economia, e acompanhe o progresso do seu time através de barras gráficas interativas." 
    },
    { 
      label: "CRM de Vendas (Oportunidades)", 
      src: "/prints/vendas.png", 
      description: "Organize seu funil comercial do primeiro contato até o fechamento. Conecte contratos ganhos diretamente com lançamentos do financeiro." 
    },
    { 
      label: "Relatórios Gerenciais", 
      src: "/prints/relatorio.png", 
      description: "Visualize gráficos ricos de receitas e despesas por categorias e departamentos, facilitando o planejamento estratégico." 
    }
  ]), []);

  const openLightbox = (index: number) => {
    setActiveImageIndex(index);
    document.body.style.overflow = "hidden";
  };

  const closeLightbox = () => {
    setActiveImageIndex(null);
    document.body.style.overflow = "";
  };

  const nextImage = () => {
    if (activeImageIndex === null) return;
    setActiveImageIndex((prev) => (prev !== null && prev < prints.length - 1 ? prev + 1 : 0));
  };

  const prevImage = () => {
    if (activeImageIndex === null) return;
    setActiveImageIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prints.length - 1));
  };

  // Keyboard shortcut listener
  useEffect(() => {
    if (activeImageIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") nextImage();
      if (e.key === "ArrowLeft") prevImage();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeImageIndex]);

  // GSAP entrance animation for the Hero section
  useEffect(() => {
    if (!heroRef.current) return;

    let ctx: gsap.Context | undefined;
    let isMounted = true;

    void import("gsap").then(({ default: gsap }) => {
      if (!isMounted || !heroRef.current) return;

      ctx = gsap.context(() => {
        gsap.from(".gsap-hero-badge", {
          y: -30,
          opacity: 0,
          duration: 0.8,
          ease: "back.out(1.5)"
        });

        gsap.from(".gsap-hero-title", {
          y: 40,
          opacity: 0,
          duration: 1,
          delay: 0.15,
          ease: "power4.out"
        });

        gsap.from(".gsap-hero-desc", {
          y: 30,
          opacity: 0,
          duration: 1,
          delay: 0.35,
          ease: "power3.out"
        });

        gsap.from(".gsap-hero-ctas", {
          y: 20,
          opacity: 0,
          duration: 0.8,
          delay: 0.55,
          ease: "power3.out"
        });

        gsap.from(".gsap-hero-image", {
          scale: 0.92,
          opacity: 0,
          duration: 1.2,
          delay: 0.25,
          ease: "power2.out"
        });
      }, heroRef);
    });

    return () => {
      isMounted = false;
      ctx?.revert();
    };
  }, []);

  const toggleFaq = (index: number) => {
    setActiveFaqIndex((prev) => (prev === index ? null : index));
  };

  return (
    <div className="min-h-[100dvh] bg-bg text-text-primary overflow-x-hidden selection:bg-primary/20 selection:text-primary">
      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur-md bg-bg/80 border-b border-border transition-all duration-300">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/icon.svg" alt="Genius Finance" className="w-10 h-10 hover:rotate-12 transition-transform duration-300" />
            <div className="min-w-0">
              <div className="font-extrabold tracking-tight text-lg leading-none">
                Genius <span className="text-primary bg-gradient-to-r from-primary to-success bg-clip-text text-transparent">Finance</span>
              </div>
              <div className="text-[0.7rem] sm:text-[0.75rem] text-text-muted leading-none mt-1.5 font-medium">Gestão unificada de finanças e projetos</div>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-text-secondary">
            <a className="hover:text-primary transition-colors relative after:absolute after:bottom-[-22px] after:left-0 after:w-0 hover:after:w-full after:h-0.5 after:bg-primary after:transition-all after:duration-300" href="#features">Recursos</a>
            <a className="hover:text-primary transition-colors relative after:absolute after:bottom-[-22px] after:left-0 after:w-0 hover:after:w-full after:h-0.5 after:bg-primary Image after:transition-all after:duration-300" href="#prints">Telas do Sistema</a>
            <a className="hover:text-primary transition-colors relative after:absolute after:bottom-[-22px] after:left-0 after:w-0 hover:after:w-full after:h-0.5 after:bg-primary after:transition-all after:duration-300" href="#faq">Dúvidas Comuns</a>
          </nav>

          <Link
            to={topCta.to}
            className="inline-flex items-center justify-center rounded-xl bg-primary hover:bg-primary-hover text-white font-bold px-5 py-2.5 transition-all duration-300 shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-95 text-sm"
          >
            {topCta.label}
          </Link>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section ref={heroRef} className="relative overflow-hidden pt-8 pb-16 sm:py-24">
          <div className="absolute -top-40 -right-40 w-[550px] h-[550px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-40 -left-40 w-[550px] h-[550px] bg-success/8 rounded-full blur-3xl pointer-events-none" />

          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="gsap-hero-badge inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-xs font-semibold text-primary">
                  <span className="w-2 h-2 rounded-full bg-success" />
                  Plataforma Integrada de Finanças e Projetos
                </div>
                <h1 className="gsap-hero-title mt-5 text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight">
                  Tome o controle do seu negócio.
                  <span className="block mt-2 bg-gradient-to-r from-primary via-blue-500 to-success bg-clip-text text-transparent">Gestão simples e profissional.</span>
                </h1>
                <p className="gsap-hero-desc mt-6 text-base sm:text-lg text-text-secondary leading-relaxed max-w-xl">
                  O Genius Finance integra controle financeiro, CRM de vendas e projetos Kanban de forma simples. Acompanhe seus números e tome decisões com máxima clareza.
                </p>

                <div className="gsap-hero-ctas mt-8">
                  <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                    <Link
                      to="/login"
                      className="inline-flex items-center justify-center rounded-xl bg-primary hover:bg-primary-hover text-white font-bold px-6 py-3.5 transition-all duration-300 shadow-md hover:shadow-xl hover:scale-[1.02] active:scale-95 text-center text-sm"
                    >
                      Começar grátis agora
                    </Link>
                    <a
                      href="#prints"
                      className="inline-flex items-center justify-center rounded-xl border border-border bg-surface hover:bg-primary/5 text-text-primary font-bold px-6 py-3.5 transition-all duration-300 hover:border-primary/30 text-center text-sm"
                    >
                      Ver demonstrações reais
                    </a>
                  </div>
                  <p className="mt-3.5 text-xs text-text-muted flex items-center gap-1.5 justify-start font-medium">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 text-success">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                    </svg>
                    Teste grátis por 7 dias — sem cartão de crédito.
                  </p>
                </div>
              </div>

              {/* Print em Destaque (Hero) clicável */}
              <div className="gsap-hero-image lg:pl-4 group">
                <div 
                  onClick={() => openLightbox(0)}
                  className="cursor-pointer relative overflow-hidden rounded-2xl border border-border bg-surface shadow-lg hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-500"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-success/10 z-0 pointer-events-none" />
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <img
                      src={prints[0].src}
                      alt={prints[0].label}
                      className="w-full h-full object-cover block transition-transform duration-700 group-hover:scale-[1.03]"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300 z-10">
                      <div className="bg-white/95 text-text-primary px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 backdrop-blur-sm transform translate-y-3 group-hover:translate-y-0 transition-transform duration-300">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 text-primary">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
                        </svg>
                        Ampliar Dashboard Inteligente
                      </div>
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-center text-xs text-text-muted flex items-center justify-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
                  Clique no painel para ver o sistema em tela cheia e explorar outras telas
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Value Proposition & Stats */}
        <section className="bg-surface border-y border-border py-12 relative">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-border">
              <div className="pt-6 md:pt-0 md:px-4">
                <div className="text-3xl font-black text-primary">100% Unificado</div>
                <h4 className="mt-2 font-bold text-text-primary">Chega de sistemas fragmentados</h4>
                <p className="mt-1 text-sm text-text-secondary leading-relaxed max-w-xs mx-auto">
                  A venda no CRM gera o projeto no Kanban e pré-lança a receita no financeiro automaticamente.
                </p>
              </div>
              <div className="pt-6 md:pt-0 md:px-6">
                <div className="text-3xl font-black text-success">+40% Produtividade</div>
                <h4 className="mt-2 font-bold text-text-primary">Menos tempo em planilhas</h4>
                <p className="mt-1 text-sm text-text-secondary leading-relaxed max-w-xs mx-auto">
                  Automatize relatórios complexos de caixa e DRE para focar em fazer sua empresa crescer.
                </p>
              </div>
              <div className="pt-6 md:pt-0 md:px-6">
                <div className="text-3xl font-black text-primary-dark">7 Dias Grátis</div>
                <h4 className="mt-2 font-bold text-text-primary">Sem cartão de crédito</h4>
                <p className="mt-1 text-sm text-text-secondary leading-relaxed max-w-xs mx-auto">
                  Cadastre-se em menos de um minuto e teste o sistema com acesso completo, sem compromissos.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-16 sm:py-20 relative">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto">
              <div className="text-xs font-bold tracking-widest text-primary uppercase">Recursos do Sistema</div>
              <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight">Tudo que o seu negócio precisa em um só lugar</h2>
              <p className="mt-3 text-text-secondary text-sm sm:text-base leading-relaxed">
                Gestão comercial avançada, controle de entregas operacionais e inteligência financeira unificados e de fácil controle.
              </p>
            </div>

            <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  title: "Multi-Empresas e Contextos",
                  desc: "Gerencie mais de um negócio ou separe totalmente suas finanças pessoais das contas da sua empresa em um único painel ágil.",
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.33l-7.5-5-7.5 5V21m16.5 0H3.75" />
                    </svg>
                  )
                },
                {
                  title: "DRE e Demonstrativos",
                  desc: "Visualize a real saúde do seu negócio através de DREs automáticos, gráficos de lucros acumulados e relatórios prontos para decisões rápidas.",
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
                    </svg>
                  )
                },
                {
                  title: "Fluxo de Caixa Dinâmico",
                  desc: "Projeções financeiras inteligentes, controle de entradas/saídas por categorias, conciliação ágil e monitoramento de saldo em tempo real.",
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
                    </svg>
                  )
                },
                {
                  title: "Assinaturas e Custos Fixos",
                  desc: "Controle absoluto sobre mensalidades recorrentes, faturas de cartões de crédito e provisões de custos mensais. Antecipe despesas futuras.",
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                  )
                },
                {
                  title: "CRM Comercial (Leads)",
                  desc: "Gerencie suas oportunidades de vendas e leads em funis integrados. Acompanhe taxas de conversão e veja o impacto das vendas no fluxo de caixa.",
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                    </svg>
                  )
                },
                {
                  title: "Projetos (Kanban)",
                  desc: "Planeje e execute entregas para clientes de maneira 100% visual. Cada contrato assinado gera um Kanban para garantir a execução com pontualidade.",
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.03 0 1.9.693 2.166 1.638m-7.377 12.408l-1.62 1.62A2.25 2.25 0 015.02 16.29l1.62-1.62m-1.62 1.62a2.25 2.25 0 01-3.18-3.18l1.62-1.62" />
                    </svg>
                  )
                }
              ].map((feature) => (
                <div 
                  key={feature.title} 
                  className="group rounded-2xl border border-border bg-surface p-6 hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center relative z-10 transition-colors group-hover:bg-primary text-primary group-hover:text-white">
                    <span className="transition-colors">{feature.icon}</span>
                  </div>
                  <h3 className="mt-4 font-extrabold tracking-tight text-text-primary text-base relative z-10 group-hover:text-primary transition-colors">{feature.title}</h3>
                  <p className="mt-2.5 text-xs sm:text-sm text-text-secondary leading-relaxed relative z-10">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Gallery / Interactive Screens Section */}
        <section id="prints" className="bg-surface border-y border-border py-16 sm:py-20 relative">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto">
              <div className="text-xs font-bold tracking-widest text-success uppercase">Por dentro do sistema</div>
              <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight">Telas Reais do Genius Finance</h2>
              <p className="mt-3 text-text-secondary text-sm sm:text-base leading-relaxed">
                Navegue pelas interfaces do sistema. Clique em qualquer imagem para abrir a galeria interativa em carrossel e tela cheia.
              </p>
            </div>

            <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {prints.map((p, index) => (
                <div 
                  key={p.src} 
                  onClick={() => openLightbox(index)}
                  className="group cursor-pointer relative overflow-hidden rounded-2xl border border-border bg-bg shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-success/5 z-0 pointer-events-none" />
                  
                  {/* Print Image */}
                  <div className="relative aspect-[16/10] overflow-hidden rounded-t-2xl border-b border-border/40">
                    <img
                      src={p.src}
                      alt={p.label}
                      className="w-full h-full object-cover block transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    {/* View Overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300 z-10">
                      <div className="bg-white/95 text-text-primary px-4 py-2.5 rounded-xl text-xs font-bold shadow-md flex items-center gap-2 backdrop-blur-sm transform translate-y-3 group-hover:translate-y-0 transition-all duration-300">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5 text-primary">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
                        </svg>
                        Ampliar Tela
                      </div>
                    </div>
                  </div>

                  {/* Card Info */}
                  <div className="p-5 relative z-10 bg-surface flex-grow flex flex-col justify-between">
                    <div>
                      <h3 className="font-extrabold text-text-primary group-hover:text-primary transition-colors text-sm sm:text-base">{p.label}</h3>
                      <p className="mt-1.5 text-xs text-text-secondary leading-relaxed line-clamp-2">{p.description}</p>
                    </div>
                    <div className="mt-3.5 pt-3.5 border-t border-border/40 flex items-center justify-between text-[0.7rem] font-bold text-primary">
                      <span>VER DETALHES</span>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3 transform group-hover:translate-x-1 transition-transform">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Accordion FAQ Section */}
        <section id="faq" className="py-16 sm:py-20 relative max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <div className="text-xs font-bold tracking-widest text-primary uppercase">FAQ</div>
            <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight">Dúvidas Frequentes</h2>
            <p className="mt-3 text-text-secondary text-sm sm:text-base leading-relaxed">
              Tudo o que você precisa saber para começar a gerenciar sua empresa com inteligência.
            </p>
          </div>

          <div className="mt-12 max-w-3xl mx-auto space-y-4">
            {[
              { 
                q: "O Genius Finance é difícil de usar?", 
                a: "Absolutamente não. Desenvolvemos o sistema para ser focado no dono do negócio e não na burocracia contábil tradicional. As telas são extremamente limpas, intuitivas e fáceis de operar." 
              },
              { 
                q: "Como funciona a integração do Financeiro, CRM e Projetos?", 
                a: "Esta é a grande magia do Genius Finance. Quando você fecha uma oportunidade de venda no CRM (Pipeline), o sistema pode gerar automaticamente um projeto no Kanban e pré-lançar a receita prevista no seu fluxo de caixa de forma 100% integrada e sem retrabalhos." 
              },
              { 
                q: "Meus dados financeiros estão realmente seguros?", 
                a: "Sim, segurança é nossa prioridade absoluta. Toda a infraestrutura do Genius Finance roda sobre o Google Firebase, utilizando criptografia avançada de ponta a ponta, autenticação segura de nível bancário e backups automáticos diários." 
              },
              { 
                q: "Como funciona o teste grátis de 7 dias?", 
                a: "O teste é 100% gratuito e sem compromissos. Você cria sua conta em menos de 1 minuto e tem acesso total a todas as ferramentas do Genius Finance. Não é necessário inserir dados de cartão de crédito para experimentar." 
              },
              { 
                q: "Posso gerenciar mais de uma empresa ou contas pessoais?", 
                a: "Com certeza. O sistema possui suporte nativo a multi-contextos completos. Você pode alternar instantaneamente entre a gestão financeira de diferentes empresas ou até suas finanças pessoais sem misturar um único centavo." 
              },
              { 
                q: "Existe fidelidade contratual ou custos extras?", 
                a: "Nenhum. Acreditamos tanto no valor e simplicidade do Genius Finance que você pode assinar no modelo mensal e cancelar a qualquer momento diretamente pelo painel, sem multas, carências ou burocracias de contrato." 
              }
            ].map((item, index) => {
              const isExpanded = activeFaqIndex === index;
              return (
                <div 
                  key={item.q} 
                  className="rounded-2xl border border-border bg-surface shadow-sm overflow-hidden transition-all duration-300"
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full px-5 py-4 sm:py-5 flex items-center justify-between text-left font-extrabold text-sm sm:text-base text-text-primary hover:text-primary transition-colors cursor-pointer select-none"
                  >
                    <span className="pr-4">{item.q}</span>
                    <span className={`ml-4 flex-shrink-0 transition-transform duration-300 text-text-secondary ${isExpanded ? "rotate-180 text-primary" : ""}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </span>
                  </button>
                  <div 
                    className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? "max-h-52 border-t border-border/40" : "max-h-0"}`}
                  >
                    <div className="p-5 text-xs sm:text-sm text-text-secondary leading-relaxed bg-bg/20">
                      {item.a}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="bg-primary text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/5 rounded-full blur-3xl pointer-events-none" />
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20">
            <div className="flex flex-col md:flex-row md:items-center gap-8 justify-between relative z-10">
              <div className="max-w-xl">
                <div className="text-white/70 text-xs font-bold tracking-widest uppercase">Comece Agora</div>
                <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight">
                  Organize seus números hoje e veja seu lucro crescer.
                </h2>
                <p className="mt-3 text-white/80 text-sm sm:text-base leading-relaxed">
                  Leva menos de 1 minuto para criar sua conta. Experimente e sinta a clareza financeira de gerenciar sua empresa de forma profissional.
                </p>
              </div>
              
              <div className="flex flex-col items-center sm:items-end gap-2.5">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-xl bg-white text-primary font-black px-8 py-4 shadow-lg hover:bg-white/95 hover:scale-[1.03] active:scale-95 transition-all duration-300 text-center text-sm sm:text-base"
                >
                  Criar minha conta grátis
                </Link>
                <div className="text-xs text-white/80 font-semibold tracking-wide flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5 text-white/90">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                  </svg>
                  7 dias grátis — sem cartão de crédito.
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-bg relative">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/icon.svg" alt="Genius Finance" className="w-8 h-8 opacity-80" />
            <div className="text-sm font-extrabold tracking-tight text-text-primary">
              Genius <span className="text-primary">Finance</span>
            </div>
            <div className="text-xs text-text-muted">
              © {new Date().getFullYear()} Genius Finance. Todos os direitos reservados.
            </div>
          </div>
          <div className="text-xs font-bold text-text-secondary hover:text-primary transition-colors">
            <a href="https://geniusweb.online" target="_blank" rel="noopener noreferrer" className="hover:underline">geniusweb.online</a>
          </div>
        </div>
      </footer>

      {/* Lightbox Modal */}
      {activeImageIndex !== null && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md transition-opacity duration-300 select-none animate-fade-in">
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer z-50 border border-white/10 active:scale-95"
            aria-label="Fechar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Nav Area */}
          <div className="relative flex items-center justify-between w-full max-w-6xl px-4 md:px-12 h-[70vh]">
            {/* Prev Button */}
            <button
              onClick={prevImage}
              className="p-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer z-40 border border-white/10 active:scale-95"
              aria-label="Anterior"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>

            {/* Amplified Image Container */}
            <div className="relative flex items-center justify-center max-h-full max-w-full md:px-6">
              <img
                src={prints[activeImageIndex].src}
                alt={prints[activeImageIndex].label}
                className="max-h-[65vh] max-w-[85vw] sm:max-w-full rounded-xl border border-white/10 object-contain shadow-2xl transition-all duration-300 animate-scale-up"
              />
            </div>

            {/* Next Button */}
            <button
              onClick={nextImage}
              className="p-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer z-40 border border-white/10 active:scale-95"
              aria-label="Próximo"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>

          {/* Bottom Info Bar */}
          <div className="mt-6 text-center px-6 max-w-3xl relative z-40 animate-fade-in-up">
            <h4 className="text-white text-lg font-extrabold tracking-tight">
              {prints[activeImageIndex].label}
            </h4>
            <p className="mt-2 text-white/70 text-xs sm:text-sm leading-relaxed max-w-2xl mx-auto font-medium">
              {prints[activeImageIndex].description}
            </p>
            <div className="mt-4 text-white/40 text-xs font-bold tracking-widest uppercase">
              {activeImageIndex + 1} DE {prints.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

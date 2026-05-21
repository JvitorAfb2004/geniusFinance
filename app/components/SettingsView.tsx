import React, { useState, useMemo, useEffect } from 'react';
import { useFinance } from '../hooks/useFinance';
import { LogOut, User, Shield, DownloadCloud, Pencil, Trash2, Plus, X, Check, Users, BellRing, Building2, Mail, UserPlus } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import type { Category, DRESection, LeadOption, AccountRole, AccountMember, MemberPermissions } from '../types';
import { PermissionsModal } from './PermissionsModal';
import { auth } from '../lib/firebase';
import { SECTION_LABELS } from '../lib/categories';

type SettingsTab = 'geral' | 'conta' | 'comercial' | 'categorias' | 'tags';

const STATUS_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];
const TAG_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];
const DASHBOARD_ALERTS_KEY = 'dashboard_alerts_enabled';

export function SettingsView() {
  const {
    user, transactions, categories, tags, leadOptions, activeContext, activeScope,
    accounts, accountMembers, accountInvites, pendingInvites,
    signOut, addCategory, updateCategory, deleteCategory,
    addTag, deleteTag,
    addLeadOption, updateLeadOption, deleteLeadOption,
    createAccount, deleteAccount, migrateToAccount, inviteMember, acceptInvite, cancelInvite, updateAccountSettings,
  } = useFinance();

  const [activeTab, setActiveTab] = useState<SettingsTab>('geral');

  // Category state
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatSection, setEditCatSection] = useState<DRESection>('DESPESAS');
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatSection, setNewCatSection] = useState<DRESection>('DESPESAS');
  const [confirmDeleteCat, setConfirmDeleteCat] = useState<Category | null>(null);

  // Tag state
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3b82f6');
  const [showNewTag, setShowNewTag] = useState(false);

  // Lead option state
  const [showNewOption, setShowNewOption] = useState<LeadOption['field'] | null>(null);
  const [newOptionValue, setNewOptionValue] = useState('');
  const [newOptionColor, setNewOptionColor] = useState('#3b82f6');
  const [showDashboardAlerts, setShowDashboardAlerts] = useState(true);

  // Account state
  const [showNewAccount, setShowNewAccount] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<{ collection: string; migrated: number; skipped: number; errors: number }[] | null>(null);
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState<{ id: string; name: string } | null>(null);

  // Invite state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Exclude<AccountRole, 'owner'>>('member');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteDone, setInviteDone] = useState(false);
  const [cancelingInviteId, setCancelingInviteId] = useState<string | null>(null);
  const [savingAccountSetting, setSavingAccountSetting] = useState(false);
  const [accountSettingSaved, setAccountSettingSaved] = useState(false);
  const [permissionTarget, setPermissionTarget] = useState<AccountMember | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DASHBOARD_ALERTS_KEY);
      setShowDashboardAlerts(raw ? JSON.parse(raw) !== false : true);
    } catch {
      setShowDashboardAlerts(true);
    }
  }, []);

  const handleToggleDashboardAlerts = () => {
    const next = !showDashboardAlerts;
    setShowDashboardAlerts(next);
    localStorage.setItem(DASHBOARD_ALERTS_KEY, JSON.stringify(next));
  };

  const statusOptions = useMemo(() => leadOptions.filter((o) => o.field === 'status').sort((a, b) => a.order - b.order), [leadOptions]);
  const sourceOptions = useMemo(() => leadOptions.filter((o) => o.field === 'source').sort((a, b) => a.order - b.order), [leadOptions]);
  const serviceOptions = useMemo(() => leadOptions.filter((o) => o.field === 'service').sort((a, b) => a.order - b.order), [leadOptions]);

  const handleExportCSV = () => {
    const contextTxs = transactions.filter((t) => t.context === activeContext);
    if (contextTxs.length === 0) return alert('Nenhuma transação para exportar neste contexto.');

    const headers = ['Data', 'Tipo', 'Descrição', 'Valor', 'Status', 'Recorrência'];
    const csvContent = contextTxs.map((t) => {
      const typeStr = t.type === 'INCOME' ? 'Entrada' : t.type === 'EXPENSE' ? 'Despesa' : 'Cartão';
      const statusStr = t.status === 'PAID' ? 'Pago' : 'Pendente';
      const recStr = t.isFixed ? 'Fixa' : t.installmentInfo ? `Parcela ${t.installmentInfo}` : 'Única';
      return `"${t.date}","${typeStr}","${t.title}","${t.amount}","${statusStr}","${recStr}"`;
    });

    const csvData = [headers.join(','), ...csvContent].join('\n');
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `financas_${activeContext.toLowerCase()}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddOption = async () => {
    if (!showNewOption || !newOptionValue.trim()) return;
    await addLeadOption(showNewOption, newOptionValue.trim(), showNewOption === 'status' ? newOptionColor : undefined);
    setNewOptionValue('');
    setShowNewOption(null);
  };

  const renderLeadOptionSection = (label: string, options: LeadOption[], field: LeadOption['field']) => (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <div className="px-3 py-2 bg-gray-50 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase">{label}</span>
        <button
          onClick={() => { setShowNewOption(showNewOption === field ? null : field); setNewOptionValue(''); setNewOptionColor('#3b82f6'); }}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> Adicionar
        </button>
      </div>
      {showNewOption === field && (
        <div className="px-3 py-2 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
          <input
            type="text"
            placeholder={`Nova opção`}
            value={newOptionValue}
            onChange={(e) => setNewOptionValue(e.target.value)}
            className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm outline-none"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddOption(); if (e.key === 'Escape') setShowNewOption(null); }}
          />
          {field === 'status' && (
            <div className="flex gap-0.5">
              {STATUS_COLORS.slice(0, 6).map((c) => (
                <button key={c} type="button" onClick={() => setNewOptionColor(c)}
                  className={`w-5 h-5 rounded-full border-2 cursor-pointer ${newOptionColor === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          )}
          <button onClick={handleAddOption} disabled={!newOptionValue.trim()}
            className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50 cursor-pointer">
            <Check className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {options.map((opt) => (
        <div key={opt.id} className="px-3 py-2 flex items-center justify-between border-t border-gray-50 hover:bg-gray-50/50">
          <div className="flex items-center gap-2">
            {opt.field === 'status' && opt.color && (
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: opt.color }} />
            )}
            <span className="text-sm text-gray-700">{opt.value}</span>
          </div>
          <button
            onClick={() => deleteLeadOption(opt.id)}
            className="text-gray-400 hover:text-red-500 cursor-pointer"
            title="Excluir"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      {options.length === 0 && (
        <div className="px-3 py-3 text-sm text-gray-400 text-center">Nenhuma opção cadastrada</div>
      )}
    </div>
  );

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'geral', label: 'Geral' },
    { id: 'conta', label: 'Conta' },
    { id: 'comercial', label: 'Comercial' },
    { id: 'categorias', label: 'Categorias' },
    { id: 'tags', label: 'Tags' },
  ];

  return (
    <div className="flex flex-col max-w-3xl gap-6">
      {/* Profile Header */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
        <div className="p-6 flex items-center gap-4 bg-gray-50/50">
          <div className="w-16 h-16 rounded-full bg-[#e2e8f0] flex items-center justify-center overflow-hidden shrink-0 border-2 border-white shadow-sm">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <User className="w-8 h-8 text-gray-400" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{user?.displayName || 'Usuário'}</h2>
            <p className="text-gray-500 text-sm">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Tabs + Content */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-[#e2e8f0] bg-gray-50/50">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-sm font-medium transition-colors cursor-pointer border-b-2 ${
                activeTab === tab.id
                  ? 'border-[#3b82f6] text-[#3b82f6] bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'geral' && (
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Conta e Dados</h3>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 gap-4">
                <div className="flex items-center gap-3">
                  <DownloadCloud className="text-[#3b82f6] w-5 h-5 shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-700">Exportar Banco de Dados (CSV)</p>
                    <p className="text-xs text-gray-500">Baixe o histórico do contexto atual ({activeContext === 'PERSONAL' ? 'Pessoal' : 'Empresa'}).</p>
                  </div>
                </div>
                <button onClick={handleExportCSV}
                  className="text-xs font-bold bg-white border border-[#e2e8f0] text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer shrink-0 shadow-sm">
                  Baixar .CSV
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex items-center gap-3">
                  <Shield className="text-gray-400 w-5 h-5 shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-700">Segurança da Conta</p>
                    <p className="text-xs text-gray-500">Autenticado via Google Cloud.</p>
                  </div>
                </div>
                <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded">Seguro</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex items-center gap-3">
                  <BellRing className="text-amber-500 w-5 h-5 shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-700">Alertas do dashboard inicial</p>
                    <p className="text-xs text-gray-500">Mostra avisos de pagamentos próximos e recebimentos do dia.</p>
                  </div>
                </div>
                <button
                  onClick={handleToggleDashboardAlerts}
                  className={`text-xs font-bold px-3 py-1 rounded cursor-pointer border ${
                    showDashboardAlerts
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                      : 'bg-gray-100 text-gray-500 border-gray-200'
                  }`}
                >
                  {showDashboardAlerts ? 'Ativado' : 'Desativado'}
                </button>
              </div>

              <button onClick={signOut}
                className="mt-2 flex items-center justify-center gap-2 text-red-600 hover:bg-red-50 p-3 rounded-lg w-full sm:w-fit transition-colors font-medium border border-red-100 bg-transparent cursor-pointer">
                <LogOut className="w-5 h-5" />
                Sair do Aplicativo
              </button>
            </div>
          )}

          {activeTab === 'conta' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-4 h-4 text-[#3b82f6]" />
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Gestão de Conta Empresarial</h3>
              </div>

              {/* Current scope info */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-sm font-medium text-blue-800">
                  Contexto atual: <strong>{activeScope.type === 'PERSONAL' ? 'Pessoal' : activeScope.accountName}</strong>
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  {activeScope.type === 'PERSONAL'
                    ? 'Você está visualizando seus dados pessoais. Crie ou selecione uma conta empresarial para começar a compartilhar.'
                    : `Papel: ${activeScope.role === 'owner' ? 'Dono' : activeScope.role === 'admin' ? 'Administrador' : 'Membro'}`}
                </p>
              </div>

              {/* Account Settings (Global) */}
              {activeScope.type === 'ACCOUNT' && (activeScope.role === 'owner' || activeScope.role === 'admin') && (
                <div className="border border-gray-100 rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-gray-50 flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 uppercase">Configurações de Visibilidade</span>
                  </div>
                  <div className="p-4 flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-700">Alertas de Pagamento (Dashboard)</p>
                        <p className="text-xs text-gray-500">Define quem pode ver o alerta de "Despesas/Custos próximos do pagamento" no dashboard.</p>
                      </div>
                      <select
                        value={accounts.find(a => a.id === activeScope.accountId)?.settings?.dashboardAlertsVisibility || 'EVERYONE'}
                        onChange={async (e) => {
                          const val = e.target.value as 'EVERYONE' | 'ADMIN';
                          setSavingAccountSetting(true);
                          setAccountSettingSaved(false);
                          try {
                            await updateAccountSettings(activeScope.accountId, { dashboardAlertsVisibility: val });
                            setAccountSettingSaved(true);
                          } finally {
                            setSavingAccountSetting(false);
                          }
                        }}
                        disabled={savingAccountSetting}
                        className="px-3 py-1.5 border border-gray-200 rounded text-xs outline-none cursor-pointer bg-white disabled:opacity-60"
                      >
                        <option value="EVERYONE">Todos (Dono, Admin, Membro)</option>
                        <option value="ADMIN">Apenas Administradores (Dono, Admin)</option>
                      </select>
                    </div>
                    {(savingAccountSetting || accountSettingSaved) && (
                      <p className={`text-xs font-medium ${savingAccountSetting ? 'text-blue-600' : 'text-emerald-600'}`}>
                        {savingAccountSetting ? 'Salvando alteração...' : 'Alteração salva.'}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* My Accounts */}
              <div className="border border-gray-100 rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-gray-50 flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Minhas Empresas</span>
                  <button
                    onClick={() => { setShowNewAccount(!showNewAccount); setNewAccountName(''); }}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Nova Empresa
                  </button>
                </div>

                {showNewAccount && (
                  <div className="px-3 py-2 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Nome da empresa"
                      value={newAccountName}
                      onChange={(e) => setNewAccountName(e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm outline-none"
                      autoFocus
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter' && newAccountName.trim()) {
                          setCreatingAccount(true);
                          await createAccount(newAccountName.trim());
                          setNewAccountName('');
                          setShowNewAccount(false);
                          setCreatingAccount(false);
                        }
                        if (e.key === 'Escape') { setShowNewAccount(false); setNewAccountName(''); }
                      }}
                    />
                    <button
                      onClick={async () => {
                        if (!newAccountName.trim()) return;
                        setCreatingAccount(true);
                        await createAccount(newAccountName.trim());
                        setNewAccountName('');
                        setShowNewAccount(false);
                        setCreatingAccount(false);
                      }}
                      disabled={!newAccountName.trim() || creatingAccount}
                      className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                    >
                      {creatingAccount ? '...' : <Check className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}

                {accounts.length === 0 ? (
                  <div className="px-3 py-4 text-sm text-gray-400 text-center">
                    Nenhuma conta empresarial. Crie uma para começar a compartilhar dados com sua equipe.
                  </div>
                ) : (
                  accounts.map((acc) => (
                    <div key={acc.id} className="px-3 py-2.5 flex items-center justify-between border-t border-gray-50 hover:bg-gray-50/50">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700 font-medium">{acc.name}</span>
                        {acc.ownerId === user?.uid && (
                          <span className="text-[0.6rem] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-semibold uppercase">Dono</span>
                        )}
                      </div>
                      <span className={`text-[0.65rem] font-semibold uppercase px-2 py-0.5 rounded ${
                        acc.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {acc.status === 'ACTIVE' ? 'Ativo' : 'Arquivado'}
                      </span>
                      {acc.ownerId === user?.uid && (
                        <button
                          onClick={() => setConfirmDeleteAccount({ id: acc.id, name: acc.name })}
                          className="ml-2 text-gray-400 hover:text-red-500 cursor-pointer"
                          title="Apagar empresa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Migration — only for owned accounts */}
              {activeScope.type === 'ACCOUNT' && activeScope.role === 'owner' && (
                <div className="border border-amber-200 rounded-lg overflow-hidden bg-amber-50">
                  <div className="px-3 py-2 bg-amber-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-800 uppercase">Migração de Dados</span>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-xs text-amber-700 mb-3">
                      Migre seus registros marcados como "Empresa" do seu espaço pessoal para esta conta empresarial.
                      A migração é segura e não remove os dados originais.
                    </p>
                    {migrationResult ? (
                      <div className="space-y-1 mb-3">
                        {migrationResult.map((r) => (
                          <div key={r.collection} className="flex items-center justify-between text-xs">
                            <span className="text-gray-700 font-medium">{r.collection}</span>
                            <span className="text-gray-500">
                              {r.migrated > 0 && <span className="text-emerald-600 mr-2">{r.migrated} migrados</span>}
                              {r.skipped > 0 && <span className="text-gray-400 mr-2">{r.skipped} pulados</span>}
                              {r.errors > 0 && <span className="text-red-500">{r.errors} erros</span>}
                              {r.migrated === 0 && r.skipped === 0 && r.errors === 0 && <span className="text-gray-400">vazio</span>}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <button
                      onClick={async () => {
                        if (!activeScope || activeScope.type !== 'ACCOUNT') return;
                        setMigrating(true);
                        setMigrationResult(null);
                        const result = await migrateToAccount(activeScope.accountId);
                        setMigrationResult(result);
                        setMigrating(false);
                      }}
                      disabled={migrating}
                      className="text-xs font-bold bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 disabled:opacity-50 cursor-pointer transition-colors"
                    >
                      {migrating ? 'Migrando...' : migrationResult ? 'Re-executar Migração' : 'Migrar Dados Empresariais'}
                    </button>
                  </div>
                </div>
              )}

              {/* Members (only when an account scope is active) */}
              {activeScope.type === 'ACCOUNT' && (
                <div className="border border-gray-100 rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-gray-50 flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 uppercase">
                      Membros ({accountMembers.length})
                    </span>
                  </div>
                  {accountMembers.length === 0 ? (
                    <div className="px-3 py-4 text-sm text-gray-400 text-center">
                      Nenhum membro encontrado.
                    </div>
                  ) : (
                    accountMembers.map((m) => (
                      <div key={m.uid} className="px-3 py-2.5 flex items-center justify-between border-t border-gray-50 hover:bg-gray-50/50">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="w-3.5 h-3.5 text-gray-500" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-700">{m.email}</p>
                            <p className="text-[0.6rem] text-gray-400 uppercase">ID: {m.uid.slice(0, 8)}...</p>
                          </div>
                        </div>
                        <span className={`text-[0.65rem] font-semibold uppercase px-2 py-0.5 rounded ${
                          m.role === 'owner' ? 'bg-blue-100 text-blue-700' :
                          m.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {m.role === 'owner' ? 'Dono' : m.role === 'admin' ? 'Admin' : 'Membro'}
                        </span>
                        {(activeScope.role === 'owner' || activeScope.role === 'admin') && m.role !== 'owner' && (
                          <button
                            onClick={() => setPermissionTarget(m)}
                            className="text-xs font-medium text-[#3b82f6] hover:text-[#2563eb] cursor-pointer ml-2 shrink-0"
                          >
                            Permissões
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Invite member form (only for owner/admin viewing their account) */}
              {activeScope.type === 'ACCOUNT' && (activeScope.role === 'owner' || activeScope.role === 'admin') && (
                <div className="border border-gray-100 rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-gray-50">
                    <span className="text-xs font-semibold text-gray-500 uppercase">Convidar Membro</span>
                  </div>
                  <div className="px-3 py-3 flex flex-col sm:flex-row gap-2">
                    <input
                      type="email"
                      placeholder="Email do usuário"
                      value={inviteEmail}
                      onChange={(e) => { setInviteEmail(e.target.value); setInviteDone(false); }}
                      className="flex-1 px-3 py-1.5 border border-gray-200 rounded text-sm outline-none"
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter' && inviteEmail.trim()) {
                          setSendingInvite(true);
                          await inviteMember(inviteEmail.trim(), inviteRole);
                          setSendingInvite(false);
                          setInviteDone(true);
                          setInviteEmail('');
                        }
                      }}
                    />
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as Exclude<AccountRole, 'owner'>)}
                      className="px-2 py-1.5 border border-gray-200 rounded text-xs outline-none cursor-pointer"
                    >
                      <option value="admin">Admin</option>
                      <option value="member">Membro</option>
                    </select>
                    <button
                      onClick={async () => {
                        if (!inviteEmail.trim()) return;
                        setSendingInvite(true);
                        await inviteMember(inviteEmail.trim(), inviteRole);
                        setSendingInvite(false);
                        setInviteDone(true);
                        setInviteEmail('');
                      }}
                      disabled={!inviteEmail.trim() || sendingInvite}
                      className="px-4 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50 cursor-pointer whitespace-nowrap inline-flex items-center gap-1"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      {sendingInvite ? '...' : 'Convidar'}
                    </button>
                  </div>
                  {inviteDone && (
                    <div className="px-3 pb-2 text-xs text-emerald-600 font-medium">Convite enviado com sucesso.</div>
                  )}
                </div>
              )}

              {/* Pending invites for this account */}
              {activeScope.type === 'ACCOUNT' && accountInvites.length > 0 && (
                <div className="border border-gray-100 rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-gray-50">
                    <span className="text-xs font-semibold text-gray-500 uppercase">Convites Pendentes ({accountInvites.length})</span>
                  </div>
                  {accountInvites.map((inv) => (
                    <div key={inv.id} className="px-3 py-2.5 flex items-center justify-between gap-3 border-t border-gray-50">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-700">{inv.email}</p>
                          <p className="text-[0.6rem] text-gray-400">
                            {inv.role === 'admin' ? 'Admin' : 'Membro'} &middot; expira {new Date(inv.expiresAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[0.6rem] font-semibold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-700">
                          Pendente
                        </span>
                        {(activeScope.role === 'owner' || activeScope.role === 'admin') && (
                          <button
                            onClick={async () => {
                              setCancelingInviteId(inv.id);
                              try {
                                await cancelInvite(inv.id);
                              } finally {
                                setCancelingInviteId(null);
                              }
                            }}
                            disabled={cancelingInviteId === inv.id}
                            className="text-xs font-semibold text-red-600 hover:text-red-700 border border-red-100 px-2 py-1 rounded-md disabled:opacity-50 cursor-pointer"
                          >
                            {cancelingInviteId === inv.id ? 'Cancelando...' : 'Cancelar'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Pending invites received by current user (any tab) */}
          {pendingInvites.length > 0 && (
            <div className="border border-green-200 rounded-lg overflow-hidden bg-green-50">
              <div className="px-3 py-2 bg-green-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-green-800 uppercase">
                  Convites Recebidos ({pendingInvites.length})
                </span>
              </div>
              {pendingInvites.map((inv) => (
                <div key={inv.id} className="px-4 py-3 flex items-center justify-between border-t border-green-100">
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      Convite para entrar em uma empresa
                    </p>
                    <p className="text-xs text-gray-500">
                      Como <strong>{inv.role === 'admin' ? 'Administrador' : 'Membro'}</strong> &middot; {inv.email}
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      await acceptInvite(inv.id, inv.accountId);
                    }}
                    className="px-4 py-1.5 bg-emerald-600 text-white rounded text-xs font-bold hover:bg-emerald-700 cursor-pointer"
                  >
                    Aceitar
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'comercial' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-[#3b82f6]" />
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Configurações do Comercial</h3>
              </div>
              <p className="text-xs text-gray-400 -mt-3">Gerencie as opções dos campos de seleção usados no módulo de Leads.</p>

              {renderLeadOptionSection('Status', statusOptions, 'status')}
              {renderLeadOptionSection('Origem', sourceOptions, 'source')}
              {renderLeadOptionSection('Serviços', serviceOptions, 'service')}
            </div>
          )}

          {activeTab === 'categorias' && (
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Categorias (DRE)</h3>

              {showNewCat ? (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 space-y-2">
                  <div className="flex gap-2">
                    <input type="text" placeholder="Nome da categoria" value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm outline-none" autoFocus />
                    <select value={newCatSection} onChange={(e) => setNewCatSection(e.target.value as DRESection)}
                      className="px-2 py-1.5 border border-gray-300 rounded text-xs outline-none cursor-pointer">
                      <option value="RECEITA">Receita</option>
                      <option value="CUSTOS">Custos</option>
                      <option value="DESPESAS">Despesas</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={async () => { if (!newCatName.trim()) return; await addCategory(newCatName.trim(), newCatSection); setNewCatName(''); setShowNewCat(false); }}
                      disabled={!newCatName.trim()}
                      className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 cursor-pointer">Adicionar</button>
                    <button onClick={() => setShowNewCat(false)} className="text-xs px-3 py-1 text-gray-500 hover:text-gray-700 cursor-pointer">Cancelar</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowNewCat(true)}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium cursor-pointer p-2">
                  <Plus className="w-4 h-4" /> Nova categoria
                </button>
              )}

              <div className="space-y-1">
                {(['RECEITA', 'CUSTOS', 'DESPESAS'] as DRESection[]).map((section) => {
                  const sectionCats = categories.filter((c) => c.section === section).sort((a, b) => a.order - b.order);
                  if (sectionCats.length === 0) return null;
                  return (
                    <div key={section} className="border border-gray-100 rounded-lg overflow-hidden">
                      <div className="px-3 py-1.5 bg-gray-50 text-xs font-semibold text-gray-500 uppercase">{SECTION_LABELS[section]}</div>
                      {sectionCats.map((cat) => (
                        <div key={cat.id} className="px-3 py-2 flex items-center justify-between border-t border-gray-50 hover:bg-gray-50/50">
                          {editingCatId === cat.id ? (
                            <div className="flex items-center gap-2 flex-1">
                              <input type="text" value={editCatName} onChange={(e) => setEditCatName(e.target.value)}
                                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm outline-none" autoFocus />
                              <select value={editCatSection} onChange={(e) => setEditCatSection(e.target.value as DRESection)}
                                className="px-2 py-1 border border-gray-300 rounded text-xs outline-none cursor-pointer">
                                <option value="RECEITA">Receita</option>
                                <option value="CUSTOS">Custos</option>
                                <option value="DESPESAS">Despesas</option>
                              </select>
                              <button onClick={async () => { if (editCatName.trim()) { await updateCategory(cat.id, { name: editCatName.trim(), section: editCatSection }); } setEditingCatId(null); }}
                                className="text-emerald-600 hover:text-emerald-700 cursor-pointer"><Check className="w-4 h-4" /></button>
                              <button onClick={() => setEditingCatId(null)} className="text-red-500 hover:text-red-600 cursor-pointer"><X className="w-4 h-4" /></button>
                            </div>
                          ) : (
                            <>
                              <span className="text-sm text-gray-700">{cat.name}{!cat.isDefault && <span className="text-xs text-gray-400 ml-1">*</span>}</span>
                              <div className="flex items-center gap-2">
                                <button onClick={() => { setEditingCatId(cat.id); setEditCatName(cat.name); setEditCatSection(cat.section); }}
                                  className="text-gray-400 hover:text-blue-600 cursor-pointer"><Pencil className="w-3.5 h-3.5" /></button>
                                {!cat.isDefault && (
                                  <button onClick={() => setConfirmDeleteCat(cat)} className="text-gray-400 hover:text-red-500 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'tags' && (
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Tags</h3>

              {showNewTag ? (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 space-y-2">
                  <input type="text" placeholder="Nome da tag" value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm outline-none" autoFocus />
                  <div className="flex gap-1.5 flex-wrap">
                    {TAG_COLORS.map((c) => (
                      <button key={c} type="button" onClick={() => setNewTagColor(c)}
                        className={`w-6 h-6 rounded-full border-2 transition-colors cursor-pointer ${newTagColor === c ? 'border-slate-800 scale-125' : 'border-transparent'}`}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={async () => { if (!newTagName.trim()) return; await addTag(newTagName.trim(), newTagColor); setNewTagName(''); setShowNewTag(false); }}
                      disabled={!newTagName.trim()}
                      className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 cursor-pointer">Adicionar</button>
                    <button onClick={() => setShowNewTag(false)} className="text-xs px-3 py-1 text-gray-500 hover:text-gray-700 cursor-pointer">Cancelar</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowNewTag(true)} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium cursor-pointer p-2">
                  <Plus className="w-4 h-4" /> Nova tag
                </button>
              )}

              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span key={tag.id} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-white cursor-pointer group"
                    style={{ backgroundColor: tag.color }} onClick={() => deleteTag(tag.id)} title="Clique para excluir">
                    {tag.name}
                    <X className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </span>
                ))}
                {tags.length === 0 && <span className="text-sm text-gray-400">Nenhuma tag criada.</span>}
              </div>
            </div>
          )}
        </div>
      </div>

      {permissionTarget && (
        <PermissionsModal
          memberEmail={permissionTarget.email}
          currentPermissions={(permissionTarget.permissions || {}) as MemberPermissions}
          onSave={async (newPerms) => {
            const token = await auth.currentUser?.getIdToken();
            await fetch(`/api/admin/members/${permissionTarget.uid}/permissions`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ accountId: activeScope.type === 'ACCOUNT' ? activeScope.accountId : '', permissions: newPerms }),
            });
            setPermissionTarget(null);
          }}
          onClose={() => setPermissionTarget(null)}
        />
      )}

      {confirmDeleteCat && (
        <ConfirmModal
          title="Excluir categoria"
          message={`Deseja excluir a categoria "${confirmDeleteCat.name}"? Transações vinculadas não serão afetadas.`}
          confirmLabel="Excluir"
          variant="danger"
          onConfirm={() => { deleteCategory(confirmDeleteCat.id); setConfirmDeleteCat(null); }}
          onCancel={() => setConfirmDeleteCat(null)}
        />
      )}

      {confirmDeleteAccount && (
        <ConfirmModal
          title="Apagar empresa"
          message={`Deseja apagar a empresa "${confirmDeleteAccount.name}"? Esta ação remove o acesso da lista de empresas ativas.`}
          confirmLabel="Apagar empresa"
          variant="danger"
          onConfirm={async () => {
            await deleteAccount(confirmDeleteAccount.id);
            setConfirmDeleteAccount(null);
          }}
          onCancel={() => setConfirmDeleteAccount(null)}
        />
      )}
    </div>
  );
}

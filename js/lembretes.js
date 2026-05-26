// ============================================================
// LEMBRETES.JS — Central de Lembretes (UI)
// Tela principal, formulários, templates e logs
// ============================================================

const Lembretes = {
  currentTab: 'regras',     // 'regras' | 'templates' | 'logs'
  filterEvento: '',
  filterCanal: '',
  filterStatus: '',

  // ─── Constantes de domínio ───────────────────────────────────────────
  EVENTOS: [
    { id: 'meta_sem_resultado', label: 'Meta Pendente de Preenchimento', icone: '📝' },
    { id: 'prazo_vencendo',     label: 'Prazo Próximo do Vencimento',     icone: '⏰' },
    { id: 'resultado_abaixo',   label: 'Resultado Abaixo da Expectativa', icone: '📉' },
    { id: 'sem_atualizacao',    label: 'Meta Sem Atualização',            icone: '🔇' },
    { id: 'plano_vencido',      label: 'Plano de Ação Vencido',           icone: '📋' },
    { id: 'fechamento_ciclo',   label: 'Fechamento de Ciclo Mensal',      icone: '🔒' },
    { id: 'abertura_ciclo',     label: 'Abertura de Ciclo Mensal',        icone: '🔓' },
    { id: 'atraso_evidencia',   label: 'Atraso de Evidência',             icone: '📎' }
  ],

  FREQUENCIAS: [
    { id: 'imediato', label: 'Imediato (1 vez)' },
    { id: 'diario',   label: 'Diário' },
    { id: 'semanal',  label: 'Semanal' },
    { id: 'mensal',   label: 'Mensal' }
  ],

  PUBLICO: [
    { id: 'responsavel',      label: 'Responsável pela Meta' },
    { id: 'gestor',           label: 'Gestor Imediato' },
    { id: 'diretoria',        label: 'Diretoria' },
    { id: 'corporativo',      label: 'Corporativo' },
    { id: 'areas_especificas',label: 'Áreas Específicas' }
  ],

  VARIAVEIS: [
    { key: 'nome_usuario',  desc: 'Nome do destinatário' },
    { key: 'nome_meta',     desc: 'Título da meta (ou lista compacta)' },
    { key: 'codigo_meta',   desc: 'Código da meta' },
    { key: 'competencia',   desc: 'Mês/Ano de competência' },
    { key: 'prazo',         desc: 'Prazo da meta' },
    { key: 'gestor',        desc: 'Nome do gestor' },
    { key: 'area',          desc: 'Área do responsável' },
    { key: 'link_sistema',  desc: 'Link de acesso ao sistema' },
    { key: 'lista_metas',   desc: 'Lista formatada de metas pendentes' }
  ],

  // ─── Render principal ─────────────────────────────────────────────────
  render() {
    const regras = DataStore.getLembreteRegras();
    const templates = DataStore.getLembreteTemplates();
    const logs = DataStore.getLembreteLogs();

    const ativas = regras.filter(r => r.ativo).length;
    const disparos30d = logs.filter(l => {
      const d = new Date(l.dataHora);
      return (Date.now() - d.getTime()) < 30 * 24 * 3600 * 1000;
    }).length;
    const erros30d = logs.filter(l => {
      const d = new Date(l.dataHora);
      return l.status === 'erro' && (Date.now() - d.getTime()) < 30 * 24 * 3600 * 1000;
    }).length;

    return `
      <div class="page-content fade-in" style="padding-top:10px;">

        <!-- KPI Bar -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px;">
          ${this._kpi('🔔', 'Regras Cadastradas', regras.length, 'Total configurado')}
          ${this._kpi('✅', 'Regras Ativas', ativas, 'Rodando agora')}
          ${this._kpi('📨', 'Disparos (30d)', disparos30d, 'Últimos 30 dias', 'primary')}
          ${this._kpi('❌', 'Erros (30d)', erros30d, 'Falhas de envio', erros30d > 0 ? 'danger' : 'success')}
        </div>

        <!-- Tabs -->
        <div style="display:flex;gap:4px;background:var(--bg-2);padding:6px;border-radius:var(--radius);margin-bottom:16px;width:fit-content;border:1px solid rgba(0,0,0,0.06);">
          ${this._tab('regras',    '📋 Regras de Notificação', regras.length)}
          ${this._tab('templates', '✏️ Templates de Mensagem',  templates.length)}
          ${this._tab('logs',      '📊 Logs e Auditoria',       logs.length)}
        </div>

        <!-- Content by tab -->
        ${this.currentTab === 'regras'    ? this._renderRegras(regras)       : ''}
        ${this.currentTab === 'templates' ? this._renderTemplates(templates)  : ''}
        ${this.currentTab === 'logs'      ? this._renderLogs(logs)            : ''}
      </div>`;
  },

  _kpi(icone, titulo, valor, sub, color = 'neutral') {
    const colors = {
      primary: { bg: 'rgba(245,136,58,0.12)', border: 'var(--primary)', txt: 'var(--primary)' },
      success: { bg: 'rgba(46,134,77,0.1)',   border: 'var(--success)', txt: 'var(--success)' },
      danger:  { bg: 'rgba(255,81,68,0.1)',   border: 'var(--danger)',  txt: 'var(--danger)' },
      neutral: { bg: 'var(--bg-2)',           border: 'rgba(0,0,0,0.06)', txt: 'var(--text)' }
    };
    const c = colors[color] || colors.neutral;
    return `
      <div style="background:${c.bg};border:1px solid ${c.border};border-radius:var(--radius);padding:16px;display:flex;align-items:center;gap:12px;">
        <span style="font-size:1.8rem;">${icone}</span>
        <div>
          <div style="font-size:1.5rem;font-weight:800;color:${c.txt};">${valor}</div>
          <div style="font-size:0.78rem;font-weight:600;color:var(--text);">${titulo}</div>
          <div style="font-size:0.72rem;color:var(--text-3);">${sub}</div>
        </div>
      </div>`;
  },

  _tab(id, label, count) {
    const active = this.currentTab === id;
    return `
      <button onclick="Lembretes.setTab('${id}')" style="
        padding:8px 16px;border-radius:var(--radius-sm);border:none;cursor:pointer;font-size:0.82rem;font-weight:600;transition:all .2s;
        background:${active ? 'var(--primary)' : 'transparent'};
        color:${active ? '#fff' : 'var(--text-3)'};
      ">${label} <span style="background:rgba(255,255,255,0.2);padding:1px 6px;border-radius:10px;font-size:0.72rem;">${count}</span></button>`;
  },

  setTab(tab) {
    this.currentTab = tab;
    App.refreshPage();
  },

  // ─── Aba Regras ───────────────────────────────────────────────────────
  _renderRegras(regras) {
    // Filtros
    const eventoOpts = this.EVENTOS.map(e =>
      `<option value="${e.id}" ${this.filterEvento === e.id ? 'selected' : ''}>${e.label}</option>`
    ).join('');

    // Aplicar filtros
    let lista = regras;
    if (this.filterEvento)  lista = lista.filter(r => r.evento === this.filterEvento);
    if (this.filterCanal)   lista = lista.filter(r => r.canais && r.canais.includes(this.filterCanal));
    if (this.filterStatus)  lista = lista.filter(r => this.filterStatus === 'ativo' ? r.ativo : !r.ativo);

    return `
      <div class="card">
        <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
          <h3 class="card-title">Regras de Notificação</h3>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <select class="form-input" style="height:34px;font-size:0.8rem;padding:4px 8px;min-width:160px;" onchange="Lembretes.filterEvento=this.value;App.refreshPage();">
              <option value="">Todos os Eventos</option>${eventoOpts}
            </select>
            <select class="form-input" style="height:34px;font-size:0.8rem;padding:4px 8px;" onchange="Lembretes.filterCanal=this.value;App.refreshPage();">
              <option value="">Todos os Canais</option>
              <option value="email" ${this.filterCanal==='email'?'selected':''}>📧 E-mail</option>
              <option value="teams" ${this.filterCanal==='teams'?'selected':''}>🟦 Teams</option>
            </select>
            <select class="form-input" style="height:34px;font-size:0.8rem;padding:4px 8px;" onchange="Lembretes.filterStatus=this.value;App.refreshPage();">
              <option value="">Todos os Status</option>
              <option value="ativo"   ${this.filterStatus==='ativo'?'selected':''}>● Ativo</option>
              <option value="inativo" ${this.filterStatus==='inativo'?'selected':''}>○ Inativo</option>
            </select>
            <button class="btn btn-primary" onclick="Lembretes.openRegraForm()" style="height:34px;white-space:nowrap;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Nova Regra
            </button>
          </div>
        </div>
        <div class="table-responsive">
          <table class="data-table" style="min-width:900px;">
            <thead>
              <tr>
                <th style="width:24%">Nome da Regra</th>
                <th style="width:20%;text-align:center;">Evento</th>
                <th style="width:10%;text-align:center;">Canal</th>
                <th style="width:10%;text-align:center;">Frequência</th>
                <th style="width:8%;text-align:center;">Status</th>
                <th style="width:14%;text-align:center;">Última Exec.</th>
                <th style="width:14%;text-align:center;">Próxima Exec.</th>
                <th style="width:8%;text-align:center;">Ações</th>
              </tr>
            </thead>
            <tbody>
              ${lista.length === 0
                ? `<tr><td colspan="8">${Components.emptyState('Nenhuma regra cadastrada. Clique em "Nova Regra" para começar.')}</td></tr>`
                : lista.map(r => this._renderRegraRow(r)).join('')
              }
            </tbody>
          </table>
        </div>
      </div>`;
  },

  _renderRegraRow(r) {
    const evento = this.EVENTOS.find(e => e.id === r.evento);
    const freq = this.FREQUENCIAS.find(f => f.id === r.frequencia);
    const canaisHtml = (r.canais || []).map(c =>
      c === 'email' ? '<span title="E-mail" style="font-size:1rem;">📧</span>'
                    : '<span title="Teams"  style="font-size:1rem;">🟦</span>'
    ).join(' ');

    const fmtDate = (iso) => iso
      ? new Date(iso).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })
      : '—';

    return `
      <tr style="cursor:pointer;" onclick="Lembretes.openRegraForm('${r.id}')">
        <td style="font-weight:600;font-size:0.85rem;">
          ${r.nome}
          ${r.descricao ? `<div style="font-size:0.75rem;color:var(--text-3);font-weight:400;margin-top:2px;">${r.descricao.slice(0,60)}${r.descricao.length>60?'…':''}</div>` : ''}
        </td>
        <td style="text-align:center;font-size:0.82rem;">${evento ? `${evento.icone} ${evento.label}` : r.evento || '—'}</td>
        <td style="text-align:center;">${canaisHtml || '—'}</td>
        <td style="text-align:center;font-size:0.82rem;">${freq ? freq.label : r.frequencia || '—'}</td>
        <td style="text-align:center;" onclick="event.stopPropagation()">
          <label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;">
            <input type="checkbox" ${r.ativo ? 'checked' : ''} onchange="Lembretes.toggleAtivo('${r.id}', this.checked)"
              style="width:16px;height:16px;accent-color:var(--primary);">
            <span style="font-size:0.78rem;color:${r.ativo ? 'var(--success)' : 'var(--text-3)'};">${r.ativo ? '● Ativo' : '○ Inativo'}</span>
          </label>
        </td>
        <td style="text-align:center;font-size:0.78rem;color:var(--text-3);">${fmtDate(r.ultimaExecucao)}</td>
        <td style="text-align:center;font-size:0.78rem;color:var(--text-2);">${fmtDate(r.proximaExecucao)}</td>
        <td style="text-align:center;" onclick="event.stopPropagation()">
          <div style="display:flex;gap:4px;justify-content:center;">
            <button class="btn btn-ghost btn-sm" title="Testar Disparo" onclick="Lembretes.testDispatch('${r.id}')" style="padding:4px 8px;font-size:0.75rem;">▶ Testar</button>
          </div>
        </td>
      </tr>`;
  },

  toggleAtivo(id, val) {
    DataStore.updateLembreteRegra(id, { ativo: val, proximaExecucao: val ? DataStore.calcProximaExecucao(DataStore.getLembreteRegraById(id)) : null });
    App.refreshPage();
  },

  async testDispatch(id) {
    const regra = DataStore.getLembreteRegraById(id);
    if (!regra) return;
    Components.toast(`⏳ Disparando "${regra.nome}"...`, 'info', 3000);
    try {
      await LembretesEngine.executeRegra(regra, true, true);
      Components.toast(`✅ Lembrete "${regra.nome}" disparado com sucesso!`, 'success');
      App.refreshPage();
    } catch (e) {
      Components.toast(`❌ Erro ao disparar: ${e.message}`, 'error', 6000);
    }
  },

  // ─── Formulário de Regra ──────────────────────────────────────────────
  openRegraForm(editId = null) {
    Components.closeModal();
    const regra = editId ? DataStore.getLembreteRegraById(editId) : null;
    const templates = DataStore.getLembreteTemplates();
    const areas = DataStore.getAreas();
    const isEdit = !!regra;

    const eventoOpts = this.EVENTOS.map(e =>
      `<option value="${e.id}" ${regra?.evento === e.id ? 'selected' : ''}>${e.icone} ${e.label}</option>`
    ).join('');
    const freqOpts = this.FREQUENCIAS.map(f =>
      `<option value="${f.id}" ${regra?.frequencia === f.id ? 'selected' : ''}>${f.label}</option>`
    ).join('');
    const tplOpts = templates.map(t =>
      `<option value="${t.id}" ${regra?.templateId === t.id ? 'selected' : ''}>${t.nome}</option>`
    ).join('');
    const publicoHtml = this.PUBLICO.map(p => `
      <label style="display:flex;align-items:center;gap:8px;font-size:0.85rem;cursor:pointer;margin-bottom:4px;">
        <input type="checkbox" name="publico" value="${p.id}" ${regra?.publicoAlvo?.includes(p.id) ? 'checked' : ''}>
        ${p.label}
      </label>`).join('');
    const areasHtml = areas.map(a => `
      <label style="display:flex;align-items:center;gap:8px;font-size:0.82rem;cursor:pointer;margin-bottom:4px;">
        <input type="checkbox" name="areaId" value="${a.id}" ${regra?.areasIds?.includes(a.id) ? 'checked' : ''}>
        ${a.codigo} - ${a.nome}
      </label>`).join('');

    const content = `
      <form id="regraForm" onsubmit="Lembretes.saveRegra(event, '${editId || ''}')">
        <div class="form-grid">
          <div class="form-group form-full">
            <label class="form-label">Nome da Regra *</label>
            <input class="form-input" name="nome" required value="${regra?.nome || ''}" placeholder="Ex: Cobrança Semanal de Preenchimento">
          </div>
          <div class="form-group form-full">
            <label class="form-label">Descrição</label>
            <textarea class="form-input" name="descricao" rows="2" placeholder="Descreva o objetivo desta regra...">${regra?.descricao || ''}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Evento Gatilho *</label>
            <select class="form-input" name="evento" required>${eventoOpts}</select>
          </div>
          <div class="form-group">
            <label class="form-label">Frequência *</label>
            <select class="form-input" name="frequencia" required>${freqOpts}</select>
          </div>
          <div class="form-group">
            <label class="form-label">Horário do Disparo</label>
            <input class="form-input" type="time" name="horario" value="${regra?.horario || '08:00'}">
          </div>
          <div class="form-group">
            <label class="form-label">Template de Mensagem</label>
            <select class="form-input" name="templateId">
              <option value="">Nenhum (mensagem padrão)</option>
              ${tplOpts}
            </select>
          </div>
          <div class="form-group form-full">
            <label class="form-label">Canais de Envio *</label>
            <div style="display:flex;gap:16px;">
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                <input type="checkbox" name="canal" value="email" ${regra?.canais?.includes('email') ? 'checked' : 'checked'}> 📧 E-mail (Microsoft 365)
              </label>
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                <input type="checkbox" name="canal" value="teams" ${regra?.canais?.includes('teams') ? 'checked' : ''}> 🟦 Microsoft Teams (DM)
              </label>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Público-Alvo *</label>
            <div style="background:var(--bg-2);padding:12px;border-radius:var(--radius-sm);border:1px solid rgba(0,0,0,0.06);">
              ${publicoHtml}
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Áreas (deixe em branco para todas)</label>
            <div style="background:var(--bg-2);padding:12px;border-radius:var(--radius-sm);border:1px solid rgba(0,0,0,0.06);max-height:180px;overflow-y:auto;">
              ${areasHtml}
            </div>
          </div>
        </div>
      </form>`;

    const footer = `
      <button class="btn btn-ghost" onclick="Components.closeModal()">Cancelar</button>
      ${isEdit ? `<button class="btn btn-danger" onclick="Lembretes.deleteRegra('${editId}')">Excluir</button>` : ''}
      <button class="btn btn-primary" onclick="document.getElementById('regraForm').requestSubmit()">${isEdit ? 'Salvar Alterações' : 'Criar Regra'}</button>`;

    Components.openModal(isEdit ? 'Editar Regra' : 'Nova Regra de Notificação', content, footer);
    const mc = document.querySelector('.modal-container');
    if (mc) mc.style.maxWidth = '860px';
  },

  saveRegra(e, editId) {
    e.preventDefault();
    const form = document.getElementById('regraForm');
    const fd = new FormData(form);

    const canais = Array.from(form.querySelectorAll('input[name="canal"]:checked')).map(i => i.value);
    const publicoAlvo = Array.from(form.querySelectorAll('input[name="publico"]:checked')).map(i => i.value);
    const areasIds = Array.from(form.querySelectorAll('input[name="areaId"]:checked')).map(i => i.value);

    if (canais.length === 0) { Components.toast('Selecione ao menos um canal de envio.', 'error'); return; }
    if (publicoAlvo.length === 0) { Components.toast('Selecione ao menos um público-alvo.', 'error'); return; }

    const payload = {
      nome: fd.get('nome'),
      descricao: fd.get('descricao'),
      evento: fd.get('evento'),
      frequencia: fd.get('frequencia'),
      horario: fd.get('horario') || '08:00',
      templateId: fd.get('templateId') || null,
      canais,
      publicoAlvo,
      areasIds,
      ativo: true
    };

    if (editId) {
      DataStore.updateLembreteRegra(editId, payload);
      Components.toast('Regra atualizada!', 'success');
    } else {
      const nova = DataStore.addLembreteRegra(payload);
      DataStore.updateLembreteRegra(nova.id, { proximaExecucao: DataStore.calcProximaExecucao(nova) });
      Components.toast('Regra criada com sucesso!', 'success');
    }
    Components.closeModal();
    App.refreshPage();
  },

  deleteRegra(id) {
    Components.confirm('Deseja excluir esta regra de notificação? Esta ação não pode ser desfeita.', () => {
      DataStore.removeLembreteRegra(id);
      Components.toast('Regra excluída.', 'success');
      App.refreshPage();
    });
  },

  // ─── Aba Templates ───────────────────────────────────────────────────
  _renderTemplates(templates) {
    return `
      <div class="card">
        <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;">
          <h3 class="card-title">Templates de Mensagem</h3>
          <button class="btn btn-primary" onclick="Lembretes.openTemplateForm()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Novo Template
          </button>
        </div>
        <div class="card-body">
          ${templates.length === 0
            ? Components.emptyState('Nenhum template criado. Clique em "Novo Template" para criar seu primeiro modelo de mensagem.')
            : `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px;">
                ${templates.map(t => this._renderTemplateCard(t)).join('')}
              </div>`
          }

          <!-- Variáveis disponíveis -->
          <div style="margin-top:20px;padding:14px 16px;background:var(--bg-2);border-radius:var(--radius-sm);border:1px solid rgba(0,0,0,0.06);">
            <div style="font-size:0.78rem;font-weight:700;color:var(--text-3);text-transform:uppercase;margin-bottom:10px;">Variáveis Dinâmicas Disponíveis</div>
            <div style="display:flex;flex-wrap:wrap;gap:8px;">
              ${this.VARIAVEIS.map(v => `
                <div style="background:var(--bg-3);padding:4px 10px;border-radius:20px;font-size:0.75rem;display:flex;align-items:center;gap:6px;">
                  <code style="color:var(--primary);font-size:0.72rem;">{{${v.key}}}</code>
                  <span style="color:var(--text-3);">${v.desc}</span>
                </div>`).join('')}
            </div>
          </div>
        </div>
      </div>`;
  },

  _renderTemplateCard(t) {
    return `
      <div style="background:var(--bg-2);border:1px solid rgba(0,0,0,0.06);border-radius:var(--radius-sm);padding:16px;cursor:pointer;" onclick="Lembretes.openTemplateForm('${t.id}')">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <strong style="font-size:0.88rem;">${t.nome}</strong>
          <span style="font-size:0.72rem;padding:2px 8px;background:var(--bg-3);border-radius:10px;color:var(--text-3);">${t.canal === 'email' ? '📧 E-mail' : '🟦 Teams'}</span>
        </div>
        <div style="font-size:0.78rem;font-weight:600;color:var(--text-2);margin-bottom:6px;">${t.assunto || '(sem assunto)'}</div>
        <div style="font-size:0.75rem;color:var(--text-3);line-height:1.4;white-space:pre-wrap;">${(t.corpo || '').slice(0, 100)}${(t.corpo || '').length > 100 ? '…' : ''}</div>
      </div>`;
  },

  openTemplateForm(editId = null) {
    Components.closeModal();
    const tpl = editId ? DataStore.getLembreteTemplateById(editId) : null;
    const isEdit = !!tpl;

    const content = `
      <form id="tplForm" onsubmit="Lembretes.saveTemplate(event, '${editId || ''}')">
        <div class="form-grid">
          <div class="form-group form-full">
            <label class="form-label">Nome do Template *</label>
            <input class="form-input" name="nome" required value="${tpl?.nome || ''}" placeholder="Ex: Aviso de Meta Pendente">
          </div>
          <div class="form-group">
            <label class="form-label">Canal *</label>
            <select class="form-input" name="canal" required>
              <option value="email" ${tpl?.canal === 'email' ? 'selected' : ''}>📧 E-mail</option>
              <option value="teams" ${tpl?.canal === 'teams' ? 'selected' : ''}>🟦 Microsoft Teams</option>
            </select>
          </div>
          <div class="form-group form-full">
            <label class="form-label">Assunto (para e-mail)</label>
            <input class="form-input" name="assunto" value="${tpl?.assunto || ''}" placeholder="Ex: ⚠️ Meta pendente: {{nome_meta}} — {{competencia}}">
          </div>
          <div class="form-group form-full">
            <label class="form-label">Corpo da Mensagem *</label>
            <textarea class="form-input" name="corpo" rows="8" required placeholder="Olá {{nome_usuario}},

Você possui as seguintes metas pendentes referentes a {{competencia}}:

{{lista_metas}}

Acesse o sistema: {{link_sistema}}">${tpl?.corpo || ''}</textarea>
            <small style="color:var(--text-3);display:block;margin-top:4px;">Use {{variavel}} para inserir dados dinâmicos. Veja a lista de variáveis disponíveis na tela de Templates.</small>
          </div>

          <!-- Preview -->
          <div class="form-group form-full">
            <label class="form-label">Preview (com dados de exemplo)</label>
            <div id="tplPreview" style="background:var(--bg-2);border:1px solid rgba(0,0,0,0.08);padding:14px;border-radius:var(--radius-sm);font-size:0.83rem;white-space:pre-wrap;min-height:80px;color:var(--text-2);line-height:1.6;">${tpl ? this._previewTemplate(tpl.corpo) : 'Digite o corpo acima para ver o preview...'}</div>
            <button type="button" class="btn btn-ghost btn-sm" style="margin-top:8px;" onclick="Lembretes._updatePreview()">↻ Atualizar Preview</button>
          </div>
        </div>
      </form>`;

    const footer = `
      <button class="btn btn-ghost" onclick="Components.closeModal()">Cancelar</button>
      ${isEdit ? `<button class="btn btn-danger" onclick="Lembretes.deleteTemplate('${editId}')">Excluir</button>` : ''}
      <button class="btn btn-primary" onclick="document.getElementById('tplForm').requestSubmit()">${isEdit ? 'Salvar' : 'Criar Template'}</button>`;

    Components.openModal(isEdit ? 'Editar Template' : 'Novo Template de Mensagem', content, footer);
    const mc = document.querySelector('.modal-container');
    if (mc) mc.style.maxWidth = '760px';
  },

  _previewTemplate(corpo) {
    const vars = {
      nome_usuario: 'João Silva',
      nome_meta: 'Garantir Contratação VGV',
      codigo_meta: 'MET0067',
      competencia: 'maio de 2026',
      prazo: 'Mês 12',
      gestor: 'Maria Fernanda',
      area: '1.4.1 - Gerência de Novos Negócios',
      link_sistema: window.location.origin + window.location.pathname,
      lista_metas: '• [MET0067] Garantir Contratação VGV (Prazo: Mês 12)\n• [MET0068] Desenvolvimento de Líderes (Prazo: Mês 12)'
    };
    return DataStore.resolveTemplate(corpo, vars);
  },

  _updatePreview() {
    const corpo = document.querySelector('#tplForm textarea[name="corpo"]')?.value || '';
    const preview = document.getElementById('tplPreview');
    if (preview) preview.textContent = this._previewTemplate(corpo);
  },

  saveTemplate(e, editId) {
    e.preventDefault();
    const fd = new FormData(document.getElementById('tplForm'));
    const payload = {
      nome: fd.get('nome'),
      canal: fd.get('canal'),
      assunto: fd.get('assunto'),
      corpo: fd.get('corpo')
    };

    if (editId) {
      DataStore.updateLembreteTemplate(editId, payload);
      Components.toast('Template atualizado!', 'success');
    } else {
      DataStore.addLembreteTemplate(payload);
      Components.toast('Template criado!', 'success');
    }
    Components.closeModal();
    App.refreshPage();
  },

  deleteTemplate(id) {
    Components.confirm('Deseja excluir este template?', () => {
      DataStore.removeLembreteTemplate(id);
      Components.toast('Template excluído.', 'success');
      App.refreshPage();
    });
  },

  // ─── Aba Logs ────────────────────────────────────────────────────────
  _renderLogs(logs) {
    const sorted = [...logs].sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora)).slice(0, 200);
    const fmtDate = (iso) => iso
      ? new Date(iso).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
      : '—';

    return `
      <div class="card">
        <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;">
          <h3 class="card-title">Logs de Auditoria</h3>
          <div style="display:flex;gap:8px;align-items:center;">
            <span style="font-size:0.78rem;color:var(--text-3);">Exibindo ${sorted.length} de ${logs.length} registros</span>
            ${Auth.getSession()?.id === 'admin' ? `<button class="btn btn-ghost btn-sm" onclick="Lembretes.clearLogs()">🗑 Limpar Logs</button>` : ''}
          </div>
        </div>
        <div class="table-responsive">
          <table class="data-table" style="min-width:800px;">
            <thead>
              <tr>
                <th>Data/Hora</th>
                <th>Regra</th>
                <th style="text-align:center;">Canal</th>
                <th>Destinatário</th>
                <th>Meta</th>
                <th style="text-align:center;">Status</th>
                <th>Detalhe</th>
              </tr>
            </thead>
            <tbody>
              ${sorted.length === 0
                ? `<tr><td colspan="7">${Components.emptyState('Nenhum log registrado ainda.')}</td></tr>`
                : sorted.map(l => `
                  <tr>
                    <td style="font-size:0.78rem;color:var(--text-3);white-space:nowrap;">${fmtDate(l.dataHora)}</td>
                    <td style="font-size:0.82rem;font-weight:600;">${l.regraNome || l.regraId || '—'}</td>
                    <td style="text-align:center;font-size:1rem;">${l.canal === 'email' ? '📧' : l.canal === 'teams' ? '🟦' : '—'}</td>
                    <td style="font-size:0.82rem;">
                      <div style="font-weight:500;">${l.destinatarioNome || '—'}</div>
                      <div style="font-size:0.72rem;color:var(--text-3);">${l.destinatarioEmail || ''}</div>
                    </td>
                    <td style="font-size:0.78rem;color:var(--text-2);">${l.metaTitulo || l.metaId || '—'}</td>
                    <td style="text-align:center;">
                      <span class="badge ${l.status === 'enviado' ? 'badge-success' : 'badge-danger'}" style="font-size:0.72rem;">
                        ${l.status === 'enviado' ? '✅ Enviado' : '❌ Erro'}
                      </span>
                    </td>
                    <td style="font-size:0.72rem;color:${l.status === 'erro' ? 'var(--danger)' : 'var(--text-3)'};">${l.erro || '—'}</td>
                  </tr>`).join('')
              }
            </tbody>
          </table>
        </div>
      </div>`;
  },

  clearLogs() {
    Components.confirm('Deseja limpar todo o histórico de logs? Esta ação não pode ser desfeita.', () => {
      DataStore.set(DataStore.KEYS.LEMBRETE_LOGS, []);
      Components.toast('Logs limpos.', 'success');
      App.refreshPage();
    });
  }
};

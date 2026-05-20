// ============================================
// CONFIGURACOES.JS — Cadastro, Áreas e Histórico
// ============================================

const Configuracoes = {
  currentTab: 'usuarios',

  render() {
    return `
      <div class="page-content fade-in">
        <div class="page-actions">
          <div class="filter-tabs">
            ${[{id:'usuarios',l:'Cadastro de Usuários'},{id:'areas',l:'Estrutura de Áreas'},{id:'historico',l:'Histórico de Áreas'}].map(t => `
              <button class="filter-tab ${this.currentTab === t.id ? 'active' : ''}" onclick="Configuracoes.setTab('${t.id}')">${t.l}</button>
            `).join('')}
          </div>
        </div>
        <div id="configContent">${this.renderTab()}</div>
      </div>`;
  },

  setTab(tab) { this.currentTab = tab; App.refreshPage(); },

  renderTab() {
    switch(this.currentTab) {
      case 'usuarios': return this.renderUsuarios();
      case 'areas': return this.renderAreas();
      case 'historico': return this.renderHistorico();
      default: return this.renderUsuarios();
    }
  },

  // ========== CADASTRO DE USUÁRIOS ==========
  renderUsuarios() {
    let users = DataStore.getUsers();
    const rootId = Auth.getUserRootAreaId();
    if (rootId !== 'all') {
      const visibleIds = DataStore.getVisibleAreaIds(rootId);
      users = users.filter(u => {
        const area = DataStore.getAreaAtual(u.id);
        return area && visibleIds.includes(area.id);
      });
    }

    users.sort((a, b) => a.nome.localeCompare(b.nome));

    return `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Colaboradores Cadastrados</h3>
          <button class="btn btn-primary" onclick="Configuracoes.openUserForm()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Novo Colaborador
          </button>
        </div>
        <div class="card-body">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Colaborador</th>
                  <th>E-mail</th>
                  <th>Cargo</th>
                  <th>Nível</th>
                  <th>Área Atual</th>
                  <th>Salário</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                ${users.map(u => {
                  const areaAtual = DataStore.getAreaAtual(u.id);
                  return `
                    <tr>
                      <td>
                        <div class="table-user">
                          <div class="avatar avatar-xs">${u.avatar}</div>
                          <span>${u.nome}</span>
                        </div>
                      </td>
                      <td class="text-secondary">${u.email}</td>
                      <td>${u.cargo}</td>
                      <td><span class="badge badge-neutral">${u.nivel}</span></td>
                      <td>${areaAtual ? `<span class="area-tag"><span class="area-code">${areaAtual.codigo}</span> ${areaAtual.nome}</span>` : '<span class="text-muted">—</span>'}</td>
                      <td>${Components.formatCurrency(u.salario)}</td>
                      <td>${u.ativo ? Components.badge('Ativo', 'concluida') : Components.badge('Inativo', 'atrasada')}</td>
                      <td>
                        <div class="table-actions">
                          <button class="btn-icon" title="Editar" onclick="Configuracoes.openUserForm('${u.id}')">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button class="btn-icon" title="Enviar convite" onclick="Configuracoes.sendInvite('${u.id}')">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                          </button>
                          <button class="btn-icon" title="Excluir" onclick="Configuracoes.deleteUser('${u.id}')">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>`;
  },

  openUserForm(editId = null) {
    const user = editId ? DataStore.getUserById(editId) : null;
    const areas = DataStore.getAuthorizedAreas();
    const areaAtual = editId ? DataStore.getAreaAtual(editId) : null;
    const isEdit = !!user;

    const content = `
      <form id="userForm" onsubmit="Configuracoes.saveUser(event, '${editId || ''}')">
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Nome Completo *</label>
            <input class="form-input" name="nome" required value="${user ? user.nome : ''}" placeholder="Nome completo">
          </div>
          <div class="form-group">
            <label class="form-label">E-mail *</label>
            <input class="form-input" type="email" name="email" required value="${user ? user.email : ''}" placeholder="email@empresa.com">
          </div>
          <div class="form-group">
            <label class="form-label">Cargo *</label>
            <input class="form-input" name="cargo" required value="${user ? user.cargo : ''}" placeholder="Ex: Analista Financeiro">
          </div>
          <div class="form-group">
            <label class="form-label">Nível Hierárquico *</label>
            <select class="form-input" name="nivel" required>
              <option value="">Selecione...</option>
              ${['Diretoria','Gerência','Coordenação','Supervisão','Analista'].map(n =>
                `<option value="${n}" ${user && user.nivel === n ? 'selected' : ''}>${n}</option>`
              ).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Área</label>
            <select class="form-input" name="areaId">
              <option value="">Selecione a área...</option>
              ${areas.map(a =>
                `<option value="${a.id}" ${areaAtual && areaAtual.id === a.id ? 'selected' : ''}>${a.codigo} — ${a.nome}</option>`
              ).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Salário Base (R$)</label>
            <input class="form-input" type="number" step="0.01" name="salario" value="${user ? user.salario : ''}" placeholder="0.00">
          </div>
          <div class="form-group form-full">
            <label class="form-label">${isEdit ? 'Senha de Acesso (Redefinir)' : 'Senha Inicial'}</label>
            <input class="form-input" type="text" name="senha" value="${isEdit ? (user.senha || '') : '123456'}" placeholder="Senha do colaborador">
            <small class="form-hint">${isEdit ? 'Se você alterar este campo, a senha do usuário será mudada imediatamente.' : 'O colaborador receberá um convite com este acesso.'}</small>
          </div>
          <div class="form-group">
            <label class="form-label">Status</label>
            <select class="form-input" name="ativo">
              <option value="true" ${!user || user.ativo ? 'selected' : ''}>Ativo</option>
              <option value="false" ${user && !user.ativo ? 'selected' : ''}>Inativo</option>
            </select>
          </div>
        </div>
      </form>`;

    const footer = `
      <button class="btn btn-ghost" onclick="Components.closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="document.getElementById('userForm').requestSubmit()">${isEdit ? 'Salvar Alterações' : 'Cadastrar Colaborador'}</button>`;

    Components.openModal(isEdit ? 'Editar Colaborador' : 'Novo Colaborador', content, footer);
  },

  saveUser(e, editId) {
    e.preventDefault();
    const form = e.target;
    const data = Object.fromEntries(new FormData(form));
    data.salario = parseFloat(data.salario) || 0;
    data.ativo = data.ativo === 'true';
    const areaId = data.areaId;
    delete data.areaId;

    if (editId) {
      DataStore.update(DataStore.KEYS.USERS, editId, data);
      // Update area if changed
      if (areaId) {
        const areaAtual = DataStore.getAreaAtual(editId);
        if (!areaAtual || areaAtual.id !== areaId) {
          // Close current area history
          const hist = DataStore.getHistoricoByUser(editId);
          const current = hist.find(h => !h.dataFim);
          if (current) {
            DataStore.update(DataStore.KEYS.HISTORICO_AREAS, current.id, { dataFim: new Date().toISOString().split('T')[0] });
          }
          // Open new area history
          DataStore.add(DataStore.KEYS.HISTORICO_AREAS, { userId: editId, areaId, dataInicio: new Date().toISOString().split('T')[0], dataFim: null });
        }
      }
      Components.toast('Colaborador atualizado!', 'success');
      Components.closeModal();
      App.refreshPage();
    } else {
      // Generate avatar from initials
      const parts = data.nome.trim().split(' ');
      data.avatar = (parts[0][0] + (parts.length > 1 ? parts[parts.length-1][0] : '')).toUpperCase();
      if (!data.senha) data.senha = '123456';
      const newUser = DataStore.add(DataStore.KEYS.USERS, data);
      // Create initial area history
      if (areaId) {
        DataStore.add(DataStore.KEYS.HISTORICO_AREAS, { userId: newUser.id, areaId, dataInicio: new Date().toISOString().split('T')[0], dataFim: null });
      }
      Components.closeModal();
      App.refreshPage();
      
      // Convite será enviado apenas manualmente pelo botão
      // setTimeout(() => { Configuracoes.sendInvite(newUser.id); }, 100);
    }
  },

  sendInvite(userId) {
    const user = DataStore.getUserById(userId);
    if (!user) return;
    
    // Mostra notificação de envio em andamento
    Components.toast(`Enviando convite para ${user.email}...`, 'info', 5000);
    
    const inviteLink = `https://rh-ml.github.io/metas-2026/`;
    
    /* 
      ===============================================================
      CONFIGURAÇÃO DO EMAILJS
      ===============================================================
      1. Crie uma conta em https://www.emailjs.com/
      2. Conecte seu serviço de e-mail (ex: Gmail ou Outlook)
      3. Crie um Template com as variáveis: {{to_name}}, {{to_email}}, {{invite_link}}
      4. Substitua os IDs abaixo pelas chaves da sua conta:
    */
    const PUBLIC_KEY = "7RiNgQ7xICoE4BzPR"; 
    const SERVICE_ID = "service_vdb23mz"; 
    const TEMPLATE_ID = "template_a6ecu9p"; 
    
    // Inicializa o SDK
    if(window.emailjs) {
      emailjs.init(PUBLIC_KEY);
      
      const templateParams = {
        to_name: user.nome,
        to_email: user.email,
        invite_link: inviteLink,
        reply_to: "nao-responda@mouraleite.com.br"
      };
      
      emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams)
        .then(function(response) {
           console.log('SUCCESS!', response.status, response.text);
           Components.toast('E-mail enviado com sucesso!', 'success');
        }, function(error) {
           console.log('FAILED...', error);
           Components.toast('Erro na API do EmailJS: ' + (error.text || error.message || 'Verifique o Console'), 'error');
        });
    } else {
      Components.toast('EmailJS não carregado. Verifique sua conexão ou adblock.', 'error');
    }
  },

  deleteUser(userId) {
    Components.confirm('Tem certeza que deseja excluir este colaborador?', () => {
      DataStore.remove(DataStore.KEYS.USERS, userId);
      // Remove area history
      const hist = DataStore.getHistoricoByUser(userId);
      hist.forEach(h => DataStore.remove(DataStore.KEYS.HISTORICO_AREAS, h.id));
      Components.toast('Colaborador excluído.', 'info');
      App.refreshPage();
    });
  },

  // ========== ESTRUTURA DE ÁREAS ==========
  renderAreas() {
    const tree = DataStore.getAuthorizedAreaTree();
    return `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Estrutura Organizacional</h3>
          <button class="btn btn-primary" onclick="Configuracoes.openAreaForm()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nova Área
          </button>
        </div>
        <div class="card-body">
          <p class="card-desc">A Diretoria visualiza todas as áreas abaixo dela. Gerências visualizam apenas a própria área.</p>
          <div class="area-tree">
            ${tree.length === 0 ? Components.emptyState('Nenhuma área cadastrada.') : tree.map(node => this.renderAreaNode(node, 0)).join('')}
          </div>
        </div>
      </div>`;
  },

  renderAreaNode(node, depth) {
    const users = DataStore.getHistoricoAreas().filter(h => h.areaId === node.id && !h.dataFim);
    const userNames = users.map(h => {
      const u = DataStore.getUserById(h.userId);
      return u ? u.nome : '';
    }).filter(Boolean);
    const childCount = DataStore.getVisibleAreaIds(node.id).length - 1;

    return `
      <div class="area-node depth-${Math.min(depth, 3)}" style="margin-left:${depth * 28}px">
        <div class="area-node-content">
          <div class="area-node-left">
            <span class="area-code-badge">${node.codigo}</span>
            <div class="area-node-info">
              <span class="area-node-name">${node.nome}</span>
              <span class="area-node-meta">
                ${userNames.length > 0 ? `<span class="area-users-count">${userNames.length} colaborador${userNames.length > 1 ? 'es' : ''}</span>` : '<span class="text-muted">Sem colaboradores</span>'}
                ${childCount > 0 ? ` · <span class="area-child-count">${childCount} sub-área${childCount > 1 ? 's' : ''}</span>` : ''}
              </span>
            </div>
          </div>
          <div class="area-node-actions">
            <button class="btn btn-ghost btn-sm" onclick="Configuracoes.openAreaForm(null, '${node.id}')" title="Adicionar sub-área">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Sub-área
            </button>
            <button class="btn-icon" title="Editar" onclick="Configuracoes.openAreaForm('${node.id}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn-icon" title="Excluir" onclick="Configuracoes.deleteArea('${node.id}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
        ${userNames.length > 0 ? `
          <div class="area-node-users">
            ${userNames.map(n => `<span class="area-user-pill">${n}</span>`).join('')}
          </div>` : ''}
      </div>
      ${(node.children || []).map(c => this.renderAreaNode(c, depth + 1)).join('')}`;
  },

  openAreaForm(editId = null, parentId = null) {
    const area = editId ? DataStore.getAreaById(editId) : null;
    const areas = DataStore.getAuthorizedAreas();
    const isEdit = !!area;
    const effectiveParent = isEdit ? area.parentId : parentId;

    const content = `
      <form id="areaForm" onsubmit="Configuracoes.saveArea(event, '${editId || ''}')">
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Código *</label>
            <input class="form-input" name="codigo" required value="${area ? area.codigo : ''}" placeholder="Ex: 1.0, 2.1">
          </div>
          <div class="form-group">
            <label class="form-label">Nome da Área *</label>
            <input class="form-input" name="nome" required value="${area ? area.nome : ''}" placeholder="Ex: Diretoria Financeira">
          </div>
          <div class="form-group form-full">
            <label class="form-label">Área Superior (Pai)</label>
            <select class="form-input" name="parentId">
              <option value="">Nenhuma (raiz)</option>
              ${areas.filter(a => a.id !== editId).map(a =>
                `<option value="${a.id}" ${effectiveParent === a.id ? 'selected' : ''}>${a.codigo} — ${a.nome}</option>`
              ).join('')}
            </select>
            <small class="form-hint">A Diretoria vê todas sub-áreas. Gerências veem apenas a própria área.</small>
          </div>
        </div>
      </form>`;

    const footer = `
      <button class="btn btn-ghost" onclick="Components.closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="document.getElementById('areaForm').requestSubmit()">${isEdit ? 'Salvar' : 'Criar Área'}</button>`;

    Components.openModal(isEdit ? 'Editar Área' : 'Nova Área', content, footer);
  },

  saveArea(e, editId) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    data.parentId = data.parentId || null;

    if (editId) {
      DataStore.update(DataStore.KEYS.AREAS, editId, data);
      Components.toast('Área atualizada!', 'success');
    } else {
      DataStore.add(DataStore.KEYS.AREAS, data);
      Components.toast('Área criada!', 'success');
    }
    Components.closeModal();
    App.refreshPage();
  },

  deleteArea(id) {
    const children = DataStore.getChildAreas(id);
    if (children.length > 0) {
      Components.toast('Remova as sub-áreas antes de excluir esta área.', 'error');
      return;
    }
    Components.confirm('Tem certeza que deseja excluir esta área?', () => {
      DataStore.remove(DataStore.KEYS.AREAS, id);
      Components.toast('Área excluída.', 'info');
      App.refreshPage();
    });
  },

  // ========== HISTÓRICO DE ÁREAS ==========
  renderHistorico() {
    let users = DataStore.getUsers();
    const rootId = Auth.getUserRootAreaId();
    if (rootId !== 'all') {
      const visibleIds = DataStore.getVisibleAreaIds(rootId);
      users = users.filter(u => {
        const area = DataStore.getAreaAtual(u.id);
        return area && visibleIds.includes(area.id);
      });
    }

    users.sort((a, b) => a.nome.localeCompare(b.nome));

    return `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Histórico de Movimentações entre Áreas</h3>
        </div>
        <div class="card-body">
          <p class="card-desc">Registre transferências de área. A remuneração variável será calculada proporcionalmente ao tempo em cada área.</p>
          <div class="hist-users-list">
            ${users.map(u => {
              const hist = DataStore.getHistoricoByUser(u.id);
              const areaAtual = DataStore.getAreaAtual(u.id);
              return `
                <div class="hist-user-card card-inner">
                  <div class="hist-user-header">
                    <div class="table-user">
                      <div class="avatar avatar-sm">${u.avatar}</div>
                      <div>
                        <span class="hist-user-name">${u.nome}</span>
                        <span class="hist-user-cargo">${u.cargo}</span>
                      </div>
                    </div>
                    <div class="hist-user-right">
                      ${areaAtual ? `<span class="area-tag"><span class="area-code">${areaAtual.codigo}</span> ${areaAtual.nome}</span>` : '<span class="text-muted">Sem área</span>'}
                      <button class="btn btn-ghost btn-sm" onclick="Configuracoes.openHistoricoForm('${u.id}')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Nova Movimentação
                      </button>
                    </div>
                  </div>
                  ${hist.length > 0 ? `
                    <div class="hist-timeline">
                      ${hist.map(h => {
                        const area = DataStore.getAreaById(h.areaId);
                        return `
                          <div class="timeline-item ${!h.dataFim ? 'timeline-current' : ''}">
                            <div class="timeline-dot"></div>
                            <div class="timeline-content">
                              <div class="timeline-area">
                                ${area ? `<span class="area-code">${area.codigo}</span> ${area.nome}` : 'Área removida'}
                              </div>
                              <div class="timeline-dates">
                                ${new Date(h.dataInicio).toLocaleDateString('pt-BR')}
                                ${h.dataFim ? ` → ${new Date(h.dataFim).toLocaleDateString('pt-BR')}` : ' → <span class="badge badge-success">Atual</span>'}
                              </div>
                            </div>
                            ${h.dataFim ? `
                              <button class="btn-icon" title="Remover" onclick="Configuracoes.deleteHistorico('${h.id}')">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                              </button>` : ''}
                          </div>`;
                      }).join('')}
                    </div>` : '<p class="text-muted" style="margin-top:8px;font-size:.82rem">Sem histórico de movimentações.</p>'}
                </div>`;
            }).join('')}
          </div>
        </div>
      </div>`;
  },

  openHistoricoForm(userId) {
    const user = DataStore.getUserById(userId);
    const areas = DataStore.getAuthorizedAreas();
    const areaAtual = DataStore.getAreaAtual(userId);

    const content = `
      <form id="histForm" onsubmit="Configuracoes.saveHistorico(event, '${userId}')">
        <div class="form-info-box">
          <div class="table-user">
            <div class="avatar avatar-sm">${user.avatar}</div>
            <div>
              <strong>${user.nome}</strong><br>
              <span class="text-muted text-sm">${user.cargo}</span>
            </div>
          </div>
          ${areaAtual ? `<p class="text-secondary" style="margin-top:8px">Área atual: <strong>${areaAtual.codigo} — ${areaAtual.nome}</strong></p>` : ''}
        </div>
        <div class="form-grid" style="margin-top:16px">
          <div class="form-group form-full">
            <label class="form-label">Nova Área *</label>
            <select class="form-input" name="areaId" required>
              <option value="">Selecione a nova área...</option>
              ${areas.map(a =>
                `<option value="${a.id}" ${areaAtual && areaAtual.id === a.id ? 'disabled' : ''}>${a.codigo} — ${a.nome}${areaAtual && areaAtual.id === a.id ? ' (atual)' : ''}</option>`
              ).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Data da Transferência *</label>
            <input class="form-input" type="date" name="dataTransferencia" required value="${new Date().toISOString().split('T')[0]}">
          </div>
        </div>
        <div class="form-info-note">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          <span>A área anterior será encerrada nesta data. A remuneração variável será calculada proporcionalmente ao tempo em cada área.</span>
        </div>
      </form>`;

    const footer = `
      <button class="btn btn-ghost" onclick="Components.closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="document.getElementById('histForm').requestSubmit()">Registrar Transferência</button>`;

    Components.openModal('Nova Movimentação de Área', content, footer);
  },

  saveHistorico(e, userId) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));

    // Close current area
    const hist = DataStore.getHistoricoByUser(userId);
    const current = hist.find(h => !h.dataFim);
    if (current) {
      DataStore.update(DataStore.KEYS.HISTORICO_AREAS, current.id, { dataFim: data.dataTransferencia });
    }

    // Open new area
    DataStore.add(DataStore.KEYS.HISTORICO_AREAS, {
      userId,
      areaId: data.areaId,
      dataInicio: data.dataTransferencia,
      dataFim: null
    });

    Components.toast('Transferência registrada com sucesso!', 'success');
    Components.closeModal();
    App.refreshPage();
  },

  deleteHistorico(id) {
    Components.confirm('Excluir este registro de histórico?', () => {
      DataStore.remove(DataStore.KEYS.HISTORICO_AREAS, id);
      Components.toast('Registro removido.', 'info');
      App.refreshPage();
    });
  }
};

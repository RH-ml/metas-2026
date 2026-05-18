// ============================================
// REMUNERACAO.JS — Módulo de Remuneração Variável
// ============================================

const Remuneracao = {
  currentTab: 'painel',

  render() {
    return `
      <div class="page-content fade-in">
        <div class="page-actions">
          <div class="filter-tabs">
            ${[{id:'painel',l:'Painel de Bônus'},{id:'simulador',l:'Simulador'},{id:'regras',l:'Regras'},{id:'historico',l:'Histórico'}].map(t => `
              <button class="filter-tab ${this.currentTab === t.id ? 'active' : ''}" onclick="Remuneracao.setTab('${t.id}')">${t.l}</button>
            `).join('')}
          </div>
        </div>
        <div id="remContent">${this.renderTab()}</div>
      </div>`;
  },

  setTab(tab) { this.currentTab = tab; App.refreshPage(); },

  renderTab() {
    switch(this.currentTab) {
      case 'painel': return this.renderPainel();
      case 'simulador': return this.renderSimulador();
      case 'regras': return this.renderRegras();
      case 'historico': return this.renderHistorico();
      default: return this.renderPainel();
    }
  },

  renderPainel() {
    let users = DataStore.getUsers();
    const rootId = Auth.getUserRootAreaId();
    if (rootId !== 'all') {
      users = users.filter(u => {
        const area = DataStore.getAreaAtual(u.id);
        return area && area.id === rootId;
      });
    }
    const calculos = users.map(u => DataStore.calcBonusColaborador(u.id)).filter(Boolean);
    const totalBonus = calculos.reduce((s, c) => s + c.bonus, 0);
    const elegCount = calculos.filter(c => c.elegivel).length;
    const perfMedia = calculos.length > 0 ? calculos.reduce((s, c) => s + c.perfPonderada, 0) / calculos.length : 0;
    const regras = DataStore.getRegras();
    const gatilho = regras.find(r => r.tipo === 'gatilho');

    const icDollar = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>';
    const icUsers = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';
    const icPerf = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>';
    const icGate = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';

    return `
      <div class="kpi-grid">
        ${Components.kpiCard('Bônus Projetado Total', Components.formatCurrency(totalBonus), 'Período atual', icDollar, 'primary')}
        ${Components.kpiCard('Colaboradores Elegíveis', `${elegCount}/${users.length}`, `Gatilho: ${gatilho ? gatilho.valor : 80}% perf.`, icUsers, 'success')}
        ${Components.kpiCard('Performance Média', Components.formatNumber(perfMedia) + '%', 'Média ponderada geral', icPerf, 'warning')}
        ${Components.kpiCard('Gatilho Mínimo', (gatilho ? gatilho.valor : 80) + '%', 'Performance mínima exigida', icGate, 'neutral')}
      </div>

      <div class="card" style="margin-top:24px">
        <div class="card-header">
          <h3 class="card-title">Detalhamento por Colaborador</h3>
        </div>
        <div class="card-body">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Colaborador</th>
                  <th>Cargo</th>
                  <th>Salário Base</th>
                  <th>Performance</th>
                  <th>Multiplicador</th>
                  <th>Bônus Calculado</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${calculos.sort((a, b) => b.bonus - a.bonus).map(c => `
                  <tr class="${!c.elegivel ? 'row-disabled' : ''}">
                    <td>
                      <div class="table-user">
                        <div class="avatar avatar-xs">${c.user.avatar}</div>
                        <span>${c.user.nome}</span>
                      </div>
                    </td>
                    <td>${c.user.cargo}</td>
                    <td>${Components.formatCurrency(c.user.salario)}</td>
                    <td>
                      <div class="table-perf">
                        ${Components.progressBar(c.perfPonderada, 'auto', 6, true)}
                      </div>
                    </td>
                    <td><span class="badge badge-neutral">${c.multiplicador}x</span></td>
                    <td class="text-bold ${c.elegivel ? 'text-success' : 'text-danger'}">${c.elegivel ? Components.formatCurrency(c.bonus) : '-'}</td>
                    <td>${c.elegivel ? Components.badge('Elegível', 'concluida') : Components.badge('Não Elegível', 'atrasada')}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr class="table-total">
                  <td colspan="5"><strong>Total de Bônus</strong></td>
                  <td class="text-bold text-success">${Components.formatCurrency(totalBonus)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>`;
  },

  renderSimulador() {
    let users = DataStore.getUsers();
    const rootId = Auth.getUserRootAreaId();
    if (rootId !== 'all') {
      users = users.filter(u => {
        const area = DataStore.getAreaAtual(u.id);
        return area && area.id === rootId;
      });
    }
    return `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Simulador de Bônus</h3>
          <p class="card-subtitle">Simule diferentes cenários de performance para projetar o bônus de cada colaborador.</p>
        </div>
        <div class="card-body">
          <div class="sim-controls">
            <div class="form-group" style="max-width:250px">
              <label class="form-label">Colaborador</label>
              <select class="form-input" id="simUser" onchange="Remuneracao.simular()">
                <option value="">Todos</option>
                ${users.map(u => `<option value="${u.id}">${u.nome}</option>`).join('')}
              </select>
            </div>
            <div class="form-group" style="max-width:200px">
              <label class="form-label">Performance Simulada (%)</label>
              <input type="range" id="simPerf" class="form-range" min="0" max="150" value="90" oninput="document.getElementById('simPerfVal').textContent=this.value+'%'; Remuneracao.simular()">
              <span id="simPerfVal" class="sim-perf-value">90%</span>
            </div>
          </div>
          <div id="simResult">${this.runSimulation('', 90)}</div>
        </div>
      </div>`;
  },

  simular() {
    const userId = document.getElementById('simUser')?.value || '';
    const perf = parseInt(document.getElementById('simPerf')?.value || '90');
    const el = document.getElementById('simResult');
    if (el) el.innerHTML = this.runSimulation(userId, perf);
  },

  runSimulation(userId, perf) {
    const regras = DataStore.getRegras();
    const gatilho = regras.find(r => r.tipo === 'gatilho');
    const teto = regras.find(r => r.tipo === 'teto');
    const minPerf = gatilho ? gatilho.valor : 80;
    const elegivel = perf >= minPerf;

    let users = DataStore.getUsers();
    if (userId) users = users.filter(u => u.id === userId);

    const results = users.map(u => {
      const mult = regras.find(r => r.tipo === 'multiplicador' && r.nivel === u.nivel);
      const multiplicador = mult ? mult.valor : 1;
      let bonus = elegivel ? u.salario * multiplicador * (perf / 100) : 0;
      const tetoVal = teto ? (u.salario * teto.valor / 100) : u.salario * 2;
      bonus = Math.min(bonus, tetoVal);
      return { user: u, multiplicador, bonus: Math.round(bonus * 100) / 100, elegivel };
    });

    const totalSim = results.reduce((s, r) => s + r.bonus, 0);

    return `
      <div class="sim-summary" style="margin:16px 0">
        <div class="sim-badge ${elegivel ? 'sim-badge-ok' : 'sim-badge-no'}">
          ${elegivel ? '✓ Elegível ao bônus' : '✗ Abaixo do gatilho mínimo (' + minPerf + '%)'}
        </div>
        <div class="sim-total">Total projetado: <strong>${Components.formatCurrency(totalSim)}</strong></div>
      </div>
      <div class="table-responsive">
        <table class="data-table">
          <thead><tr><th>Colaborador</th><th>Salário</th><th>Multiplicador</th><th>Bônus Simulado</th></tr></thead>
          <tbody>
            ${results.map(r => `
              <tr class="${!r.elegivel ? 'row-disabled' : ''}">
                <td><div class="table-user"><div class="avatar avatar-xs">${r.user.avatar}</div><span>${r.user.nome}</span></div></td>
                <td>${Components.formatCurrency(r.user.salario)}</td>
                <td>${r.multiplicador}x</td>
                <td class="text-bold ${r.elegivel ? 'text-success' : ''}">${r.elegivel ? Components.formatCurrency(r.bonus) : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;
  },

  renderRegras() {
    const regras = DataStore.getRegras();
    const tipoLabels = { gatilho: 'Gatilho', multiplicador: 'Multiplicador', teto: 'Teto', superacao: 'Superação' };
    return `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Regras de Remuneração Variável</h3>
          <button class="btn btn-primary btn-sm" onclick="Remuneracao.openRegraForm()">+ Nova Regra</button>
        </div>
        <div class="card-body">
          <div class="regras-grid">
            ${regras.map(r => `
              <div class="regra-card card-inner">
                <div class="regra-header">
                  <span class="badge badge-${r.tipo === 'gatilho' ? 'danger' : r.tipo === 'multiplicador' ? 'warning' : r.tipo === 'teto' ? 'neutral' : 'success'}">${tipoLabels[r.tipo] || r.tipo}</span>
                  <div class="regra-toggle">
                    <label class="switch"><input type="checkbox" ${r.ativo ? 'checked' : ''} onchange="Remuneracao.toggleRegra('${r.id}', this.checked)"><span class="switch-slider"></span></label>
                  </div>
                </div>
                <h4 class="regra-nome">${r.nome}</h4>
                <p class="regra-desc">${r.descricao}</p>
                <div class="regra-valor">
                  <span class="regra-valor-num">${r.valor}${r.tipo === 'multiplicador' ? 'x' : '%'}</span>
                  ${r.nivel ? `<span class="regra-nivel">${r.nivel}</span>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>`;
  },

  toggleRegra(id, ativo) {
    DataStore.update(DataStore.KEYS.REGRAS, id, { ativo });
    Components.toast(ativo ? 'Regra ativada' : 'Regra desativada', 'info');
  },

  openRegraForm() {
    const content = `
      <form id="regraForm" onsubmit="Remuneracao.saveRegra(event)">
        <div class="form-grid">
          <div class="form-group form-full"><label class="form-label">Nome *</label><input class="form-input" name="nome" required></div>
          <div class="form-group form-full"><label class="form-label">Descrição</label><textarea class="form-input form-textarea" name="descricao" rows="2"></textarea></div>
          <div class="form-group"><label class="form-label">Tipo *</label>
            <select class="form-input" name="tipo" required><option value="gatilho">Gatilho</option><option value="multiplicador">Multiplicador</option><option value="teto">Teto</option><option value="superacao">Superação</option></select>
          </div>
          <div class="form-group"><label class="form-label">Valor *</label><input class="form-input" type="number" step="any" name="valor" required></div>
          <div class="form-group"><label class="form-label">Nível (se multiplicador)</label>
            <select class="form-input" name="nivel"><option value="">N/A</option><option value="Diretoria">Diretoria</option><option value="Gerência">Gerência</option><option value="Coordenação">Coordenação</option><option value="Supervisão">Supervisão</option><option value="Analista">Analista</option></select>
          </div>
        </div>
      </form>`;
    const footer = `<button class="btn btn-ghost" onclick="Components.closeModal()">Cancelar</button><button class="btn btn-primary" onclick="document.getElementById('regraForm').requestSubmit()">Criar Regra</button>`;
    Components.openModal('Nova Regra', content, footer);
  },

  saveRegra(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    data.valor = parseFloat(data.valor) || 0;
    data.ativo = true;
    DataStore.add(DataStore.KEYS.REGRAS, data);
    Components.toast('Regra criada com sucesso!', 'success');
    Components.closeModal();
    App.refreshPage();
  },

  renderHistorico() {
    let bonus = DataStore.get(DataStore.KEYS.BONUS);
    const rootId = Auth.getUserRootAreaId();
    
    if (rootId !== 'all') {
      const authorizedUserIds = DataStore.getUsers().filter(u => {
        const area = DataStore.getAreaAtual(u.id);
        return area && area.id === rootId;
      }).map(u => u.id);
      bonus = bonus.filter(b => authorizedUserIds.includes(b.userId));
    }

    const periodos = [...new Set(bonus.map(b => b.periodo))];
    return `
      <div class="card">
        <div class="card-header"><h3 class="card-title">Histórico de Pagamentos</h3></div>
        <div class="card-body">
          ${periodos.map(p => {
            const pb = bonus.filter(b => b.periodo === p);
            const totalPago = pb.filter(b => b.status === 'pago').reduce((s, b) => s + b.bonusCalculado, 0);
            return `
              <div class="hist-periodo">
                <div class="hist-header">
                  <h4>${p}</h4>
                  <span class="hist-total">Total pago: ${Components.formatCurrency(totalPago)}</span>
                </div>
                <div class="table-responsive">
                  <table class="data-table">
                    <thead><tr><th>Colaborador</th><th>Salário Base</th><th>Performance</th><th>Bônus</th><th>Status</th><th>Data Pgto</th></tr></thead>
                    <tbody>
                      ${pb.map(b => {
                        const u = DataStore.getUserById(b.userId);
                        return `<tr>
                          <td><div class="table-user"><div class="avatar avatar-xs">${u ? u.avatar : '?'}</div><span>${u ? u.nome : '-'}</span></div></td>
                          <td>${Components.formatCurrency(b.salarioBase)}</td>
                          <td>${Components.progressBar(b.performance, 'auto', 6, true)}</td>
                          <td class="text-bold">${b.bonusCalculado > 0 ? Components.formatCurrency(b.bonusCalculado) : '-'}</td>
                          <td>${Components.badge(b.status, b.status)}</td>
                          <td>${b.dataPagamento ? new Date(b.dataPagamento).toLocaleDateString('pt-BR') : '-'}</td>
                        </tr>`;
                      }).join('')}
                    </tbody>
                  </table>
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>`;
  }
};

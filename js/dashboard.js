// ============================================
// DASHBOARD.JS — Página principal do dashboard
// ============================================

const Dashboard = {
  currentArea: localStorage.getItem('dash_filter_area') || '',

  setArea(a) {
    this.currentArea = a;
    localStorage.setItem('dash_filter_area', a);
    App.refreshPage();
  },

  // ─── Configuração dos Gatilhos ────────────────────────────────────────
  getGatilhosConfig() {
    try {
      return JSON.parse(localStorage.getItem('dash_gatilhos_config') || '{}');
    } catch { return {}; }
  },

  saveGatilhosConfig(cfg) {
    localStorage.setItem('dash_gatilhos_config', JSON.stringify(cfg));
  },

  // Retorna valor acumulado de dezembro da meta (último mês com dado)
  getValorAcumuladoDez(meta) {
    if (!meta.mesesData || meta.mesesData.length === 0) return null;
    // Pega o mês de dezembro (índice 11) ou o último mês com acumulado
    const dezIdx = meta.mesesData.length - 1; // Dez é o último (índice 11)
    const dezMes = meta.mesesData[dezIdx];
    if (dezMes && dezMes.acumulado && dezMes.acumulado.p !== null) {
      return { p: dezMes.acumulado.p, r: dezMes.acumulado.r };
    }
    return null;
  },

  // Performance baseada no acumulado de dezembro
  getPerfAcumDez(meta) {
    const acum = this.getValorAcumuladoDez(meta);
    if (!acum || acum.p === null || acum.p === 0) return 0;
    if (acum.r === null || acum.r === undefined) return 0;
    // Usar calcPerformance do DataStore com valorAlvo=acum.p e valorAtual=acum.r
    const metaMock = { ...meta, valorAlvo: acum.p, valorAtual: acum.r };
    return DataStore.calcPerformance(metaMock, true) || 0;
  },

  // Retorna a área corporativa (primeiro nível raiz, ou código '1.0', ou a que tem mais metas corporativas)
  getAreaCorporativa() {
    const areas = DataStore.getAreas();
    // Prioridade: área salva em config > código '1.0' > primeiro nó raiz sem parentId
    const cfg = this.getGatilhosConfig();
    if (cfg.areaCorpId) {
      const saved = areas.find(a => a.id === cfg.areaCorpId);
      if (saved) return saved;
    }
    const byCode = areas.find(a => a.codigo === '1.0');
    if (byCode) return byCode;
    return areas.find(a => !a.parentId) || null;
  },

  openEditGatilhos() {
    // Busca metas da área corporativa selecionada (ou todas as áreas raiz se não configurada)
    const todasMetas = DataStore.getMetas().filter(m => m.tipo !== 'compartilhada');
    const areas = DataStore.getAreas();
    const cfg = this.getGatilhosConfig();
    const areaCorp = this.getAreaCorporativa();

    // Coleta IDs da área corporativa e todas as sub-áreas dela
    const getAreaIds = (rootId) => {
      const ids = [rootId];
      const queue = [rootId];
      while (queue.length > 0) {
        const cur = queue.shift();
        areas.filter(a => a.parentId === cur).forEach(child => {
          ids.push(child.id);
          queue.push(child.id);
        });
      }
      return ids;
    };

    const corpAreaIds = areaCorp ? getAreaIds(areaCorp.id) : [];

    // Metas da área corporativa: pela areaId da meta OU pelo areaId do responsável
    const corpMetas = todasMetas.filter(m => {
      if (corpAreaIds.length === 0) return m.tipo === 'corporativa';
      if (corpAreaIds.includes(m.areaId)) return true;
      if (m.responsavelId) {
        const respArea = DataStore.getAreaAtual(m.responsavelId);
        if (respArea && corpAreaIds.includes(respArea.id)) return true;
      }
      return false;
    });

    const selectedIds = cfg.selectedIds || corpMetas.filter(m => m.isGatilho).map(m => m.id);
    const targetMin = cfg.targetMin !== undefined ? cfg.targetMin : 80;

    // Lista de áreas raiz para o usuário poder trocar a área corporativa de referência
    const rootAreas = areas.filter(a => !a.parentId);

    const metasHtml = corpMetas.map(m => {
      const isChecked = selectedIds.includes(m.id);
      const perf = DataStore.calcPerformance(m) || 0;
      return `
        <label class="gatilho-check-item" style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:var(--bg-3);border-radius:var(--radius-sm);border:1px solid ${isChecked ? 'var(--primary)' : 'rgba(0,0,0,0.06)'};cursor:pointer;transition:all .2s;">
          <input type="checkbox" name="gatilhoMeta" value="${m.id}" ${isChecked ? 'checked' : ''}
            style="width:18px;height:18px;accent-color:var(--primary);cursor:pointer;"
            onchange="Dashboard._onGatilhoCheckChange(this)">
          <div style="flex:1">
            <div style="font-weight:600;font-size:.88rem;color:var(--text);">${m.titulo}</div>
            <div style="font-size:.78rem;color:var(--text-3);margin-top:2px;">Meta: ${Components.formatNumber(m.valorAlvo)} ${m.unidade} &nbsp;·&nbsp; Atual: ${perf.toFixed(1)}%</div>
          </div>
        </label>`;
    }).join('');

    const emptyMsg = corpMetas.length === 0
      ? `<p style="color:var(--text-3);font-size:.85rem;padding:12px 0;">Nenhuma meta encontrada para a área <strong>${areaCorp ? areaCorp.codigo + ' – ' + areaCorp.nome : 'Corporativo'}</strong>.</p>`
      : '';

    const content = `
      <div style="display:flex;flex-direction:column;gap:16px;">
        <div style="background:var(--bg-3);border-radius:var(--radius-sm);padding:12px 16px;border:1px solid rgba(0,0,0,0.06);">
          <label style="display:block;font-size:.8rem;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;">Área de Referência (Corporativo)</label>
          <select id="gatilhoAreaCorp" class="form-input" style="width:100%;" onchange="Dashboard._onAreaCorpChange(this.value)">
            ${rootAreas.map(a => `<option value="${a.id}" ${areaCorp && areaCorp.id === a.id ? 'selected' : ''}>${a.codigo} – ${a.nome}</option>`).join('')}
          </select>
          <small style="color:var(--text-3);font-size:.77rem;margin-top:6px;display:block;">Metas pertencentes a esta área estarão disponíveis como gatilhos.</small>
        </div>
        <div>
          <label style="display:block;font-size:.8rem;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px;">Metas — Selecione os Gatilhos</label>
          <div style="display:flex;flex-direction:column;gap:8px;" id="gatilhosCheckList">
            ${metasHtml}${emptyMsg}
          </div>
        </div>
        <div style="background:var(--bg-3);border-radius:var(--radius-sm);padding:14px 16px;border:1px solid rgba(0,0,0,0.06);">
          <label style="display:block;font-size:.8rem;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;">Atingimento Mínimo para Acionamento do Programa (%)</label>
          <div style="display:flex;align-items:center;gap:12px;">
            <input type="range" id="gatilhoTargetRange" min="0" max="120" step="1" value="${targetMin}"
              style="flex:1;accent-color:var(--primary);"
              oninput="document.getElementById('gatilhoTargetVal').textContent=this.value+'%'">
            <span id="gatilhoTargetVal" style="font-size:1.2rem;font-weight:700;color:var(--primary);min-width:52px;text-align:right;">${targetMin}%</span>
          </div>
          <small style="color:var(--text-3);font-size:.77rem;margin-top:6px;display:block;">Se cada meta gatilho atingir pelo menos este percentual, o programa de RV é acionado.</small>
        </div>
      </div>`;

    const footer = `
      <button class="btn btn-ghost" onclick="Components.closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="Dashboard.saveGatilhos()">Salvar Configuração</button>`;

    Components.openModal('Configurar Gatilhos do Programa', content, footer);
  },

  _onAreaCorpChange(areaId) {
    // Salva a nova área corporativa e reabre o modal atualizado
    const cfg = this.getGatilhosConfig();
    cfg.areaCorpId = areaId;
    this.saveGatilhosConfig(cfg);
    Components.closeModal();
    setTimeout(() => this.openEditGatilhos(), 50);
  },

  _onGatilhoCheckChange(el) {
    const label = el.closest('label');
    if (el.checked) {
      label.style.border = '1px solid var(--primary)';
    } else {
      label.style.border = '1px solid rgba(0,0,0,0.06)';
    }
  },

  saveGatilhos() {
    const checkboxes = document.querySelectorAll('input[name="gatilhoMeta"]');
    const selectedIds = Array.from(checkboxes).filter(c => c.checked).map(c => c.value);
    const targetMin = parseInt(document.getElementById('gatilhoTargetRange')?.value || '80', 10);
    const areaCorpId = document.getElementById('gatilhoAreaCorp')?.value || null;

    // Atualiza isGatilho nas metas.
    // IMPORTANTE: atualiza atualizadoEm nas metas que mudaram, garantindo que
    // o merge Firebase/local preserve a alteração mesmo após recarregar a página.
    const now = new Date().toISOString();
    const metas = DataStore.get(DataStore.KEYS.METAS);
    metas.forEach(m => {
      const novoIsGatilho = selectedIds.includes(m.id);
      if (!!m.isGatilho !== novoIsGatilho) {
        // Só toca no timestamp se o valor realmente mudou
        m.isGatilho = novoIsGatilho;
        m.atualizadoEm = now;
      } else {
        m.isGatilho = novoIsGatilho;
      }
    });
    DataStore.set(DataStore.KEYS.METAS, metas);

    const cfg = this.getGatilhosConfig();
    this.saveGatilhosConfig({ ...cfg, selectedIds, targetMin, areaCorpId: areaCorpId || cfg.areaCorpId });
    Components.closeModal();
    Components.toast('Gatilhos atualizados com sucesso!', 'success');
    App.refreshPage();
  },



  render() {
    const session = Auth.getSession() || {};
    const isAdmin = session.id === 'admin' || session.nivel === 'Admin';

    // Security check: if currentArea is set but user is not authorized to see it, clear it
    if (this.currentArea) {
      if (this.currentArea === 'todas' || this.currentArea === 'all') {
        if (!isAdmin) {
          this.currentArea = '';
          localStorage.removeItem('dash_filter_area');
        }
      } else {
        const authorizedIds = DataStore.getAuthorizedAreas().map(a => a.id);
        if (!isAdmin && !authorizedIds.includes(this.currentArea)) {
          this.currentArea = '';
          localStorage.removeItem('dash_filter_area');
        }
      }
    }

    let metas = DataStore.getMetas().filter(m => m.tipo !== 'compartilhada');
    
    // Corporate section
    const corpMetas = metas.filter(m => m.tipo === 'corporativa');
    const gatilhos = metas.filter(m => m.isGatilho === true);
    const corpPesoTotal = corpMetas.reduce((s, m) => s + (parseFloat(m.peso) || 0), 0);
    const corpPerf = corpPesoTotal > 0 ? corpMetas.reduce((s, m) => s + ((DataStore.calcPerformance(m) || 0) * (parseFloat(m.peso) || 0)), 0) / corpPesoTotal : 0;

    // Area section
    let areaMetas = [];
    if (this.currentArea && this.currentArea !== 'todas' && this.currentArea !== 'all') {
      areaMetas = metas.filter(m => m.areaId === this.currentArea);
    } else {
      // If no specific area selected, show all metas
      areaMetas = metas;
    }

    const areaPesoTotal = areaMetas.reduce((s, m) => s + (parseFloat(m.peso) || 0), 0);
    const areaPerf = areaPesoTotal > 0 ? areaMetas.reduce((s, m) => s + ((DataStore.calcPerformance(m) || 0) * (parseFloat(m.peso) || 0)), 0) / areaPesoTotal : 0;
    
    const totalArea = areaMetas.length;
    let verdes = 0, laranjas = 0, vermelhas = 0;
    areaMetas.forEach(m => {
      const p = DataStore.calcPerformance(m);
      if (p !== null) {
        if (p >= 80) verdes++;
        else if (p >= 60) laranjas++;
        else vermelhas++;
      }
    });

    const icMetas = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>';
    const icCheck = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
    const icAlert = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
    const icCorporate = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18"/><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/><path d="M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4"/></svg>';

    return `
      <div class="page-content fade-in">
        <div class="page-actions" style="margin-bottom: 20px; background: var(--bg-2); padding: 16px; border-radius: var(--radius); border: 1px solid rgba(0,0,0,0.06);">
          <div style="display: flex; gap: 16px; align-items: flex-start;">
            <div class="form-group" style="margin: 0; min-width: 280px; width: max-content;">
              <label style="display: block; font-size: 0.75rem; color: var(--text-3); margin-bottom: 4px; font-weight: 600;">Filtrar Dashboard por Área</label>
              ${Components.treeSelector(this.currentArea, 'Dashboard.setArea')}
            </div>
          </div>
        </div>

        <div class="dashboard-split-layout">
          <!-- LADO ESQUERDO: CORPORATIVO -->
          <div class="dashboard-col corporate-section">
            <h2 class="split-title" style="display:flex;align-items:center;gap:8px;margin-bottom:16px;font-size:1.1rem;color:var(--text);">${icCorporate} Visão Corporativa</h2>
            
            <div class="card card-performance" style="margin-bottom:16px">
              <div class="card-header"><h3 class="card-title">Atingimento Global</h3></div>
              <div class="card-body center-content">
                ${Components.donutChart(corpPerf, 160, 16, 'auto')}
                <p class="perf-label">Média ponderada das metas corporativas</p>
              </div>
            </div>

            <div class="card">
              <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;">
                <h3 class="card-title">Gatilhos do Programa</h3>
                ${isAdmin ? `<button class="btn-icon" title="Editar Gatilhos" onclick="Dashboard.openEditGatilhos()" style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:var(--radius-sm);background:var(--bg-3);border:1px solid rgba(0,0,0,0.08);transition:all .2s;" onmouseover="this.style.background='var(--primary-light,rgba(245,136,58,0.12))'" onmouseout="this.style.background='var(--bg-3)'">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>` : ""}
              </div>
              <div class="card-body">
                ${(() => {
                  const cfg = Dashboard.getGatilhosConfig();
                  const targetMin = cfg.targetMin !== undefined ? cfg.targetMin : 80;
                  const gatilhosAtivos = gatilhos.filter(g => g.isGatilho !== false);
                  return `
                    <div class="gatilhos-list" style="display:flex;flex-direction:column;gap:16px;">
                      ${gatilhosAtivos.map(g => {
                        const tMin = targetMin;
                        const acumDez = Dashboard.getValorAcumuladoDez(g);
                        const pDez = acumDez ? acumDez.p : (g.valorAlvo || 0);
                        const rDez = acumDez ? acumDez.r : g.valorAtual;
                        const perf = Dashboard.getPerfAcumDez(g) || DataStore.calcPerformance(g) || 0;
                        const atingido = perf >= tMin;
                        return `
                          <div class="gatilho-item" style="padding:12px;background:var(--bg-3);border-radius:var(--radius-sm);border:1px solid ${atingido ? 'rgba(46,134,77,0.25)' : 'rgba(0,0,0,0.05)'};">
                            <div class="gatilho-info" style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:0.85rem;">
                              <strong style="color:var(--text);">${g.titulo}</strong>
                              <span style="color:var(--text-3);">${rDez !== null && rDez !== undefined ? Components.formatNumber(rDez) : '0'} / ${Components.formatNumber(pDez)} ${g.unidade}</span>
                            </div>
                            <div class="gatilho-chart">
                              ${Components.progressBarWithMin(perf, tMin, 'auto', 8, true)}
                            </div>
                          </div>
                        `;
                      }).join('')}
                      ${gatilhosAtivos.length === 0 ? '<p class="text-muted">Nenhum gatilho configurado. Clique no lápis para configurar.</p>' : ''}
                    </div>`;
                })()}
              </div>
            </div>
          </div>

          <!-- LADO DIREITO: PAINEL DA ÁREA -->
          <div class="dashboard-col area-section">
            <h2 class="split-title" style="display:flex;align-items:center;gap:8px;margin-bottom:16px;font-size:1.1rem;color:var(--text);">${icMetas} Painel Próprio</h2>
            ${(!this.currentArea || this.currentArea === 'todas' || this.currentArea === 'all') ? `` : `
            <div class="kpi-grid area-kpi-grid" style="grid-template-columns: 1fr 1fr; margin-bottom:16px;">
              ${Components.kpiCard('Total de Metas', totalArea, 'Metas da área', icMetas, 'primary')}
              
              <div class="kpi-card" style="border-left: 4px solid var(--success); padding:16px;">
                <div class="kpi-icon-wrap" style="background: rgba(46, 134, 77, 0.1); color: var(--success)">${icCheck}</div>
                <div class="kpi-content">
                  <span class="kpi-title">Metas no Verde</span>
                  <strong class="kpi-value">${verdes}</strong>
                  <span class="kpi-subtitle">>= 80%</span>
                </div>
              </div>
              
              <div class="kpi-card" style="border-left: 4px solid var(--primary); padding:16px;">
                 <div class="kpi-icon-wrap" style="background: rgba(245, 136, 58, 0.1); color: var(--primary)">${icAlert}</div>
                 <div class="kpi-content">
                   <span class="kpi-title">Metas no Laranja</span>
                   <strong class="kpi-value">${laranjas}</strong>
                   <span class="kpi-subtitle">60% a 79%</span>
                 </div>
              </div>
              
              <div class="kpi-card" style="border-left: 4px solid var(--danger); padding:16px;">
                 <div class="kpi-icon-wrap" style="background: rgba(255, 81, 68, 0.1); color: var(--danger)">${icAlert}</div>
                 <div class="kpi-content">
                   <span class="kpi-title">Metas no Vermelho</span>
                   <strong class="kpi-value">${vermelhas}</strong>
                   <span class="kpi-subtitle">< 60%</span>
                 </div>
              </div>
            </div>
            `}

            <div class="card card-performance">
              <div class="card-header"><h3 class="card-title">Nota Final da Área</h3></div>
              <div class="card-body center-content">
                ${Components.donutChart(areaPerf, 160, 16, 'auto')}
                <p class="perf-label">Média ponderada do painel próprio</p>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }
};

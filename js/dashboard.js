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
    const gatilhos = corpMetas.filter(m => m.isGatilho);
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
              <div class="card-header"><h3 class="card-title">Gatilhos do Programa (Corporate)</h3></div>
              <div class="card-body">
                <div class="gatilhos-list" style="display:flex;flex-direction:column;gap:16px;">
                  ${gatilhos.map(g => {
                    const perf = DataStore.calcPerformance(g) || 0;
                    return `
                      <div class="gatilho-item" style="padding:12px;background:var(--bg-3);border-radius:var(--radius-sm);border:1px solid rgba(0,0,0,0.05);">
                        <div class="gatilho-info" style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:0.85rem;">
                          <strong style="color:var(--text);">${g.titulo}</strong>
                          <span style="color:var(--text-3);">${Components.formatNumber(g.valorAtual)} / ${Components.formatNumber(g.valorAlvo)} ${g.unidade}</span>
                        </div>
                        <div class="gatilho-chart">
                          ${Components.progressBar(perf, 'auto', 8, true)}
                        </div>
                      </div>
                    `;
                  }).join('')}
                  ${gatilhos.length === 0 ? '<p class="text-muted">Nenhum gatilho corporativo configurado.</p>' : ''}
                </div>
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
            `}
          </div>
        </div>
      </div>`;
  }
};

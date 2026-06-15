// ============================================
// METAS.JS — Módulo de Gestão de Metas
// ============================================

const Metas = {
  currentArea: localStorage.getItem('metas_filter_area') || '',
  currentFilter: localStorage.getItem('metas_filter_status') || 'todas',
  currentSearch: '',
  currentCompetencia: (() => {
    const stored = localStorage.getItem('metas_filter_competencia');
    if (stored !== null) return parseInt(stored, 10);
    const d = new Date();
    return (d.getMonth() === 0) ? 11 : d.getMonth() - 1;
  })(),

  setCompetencia(value) {
    this.currentCompetencia = parseInt(value, 10);
    localStorage.setItem('metas_filter_competencia', this.currentCompetencia);
    App.refreshPage();
  },

  render() {
    const metas = this.getFilteredMetas();
    const allMetas = DataStore.getMetas();
    const areas = DataStore.getAreas();
    
    // Meses para o filtro
    const mesesFiltro = ['JAN/26','FEV/26','MAR/26','ABR/26','MAI/26','JUN/26','JUL/26','AGO/26','SET/26','OUT/26','NOV/26','DEZ/26'];
    
    // Calcula notas globais baseadas nas metas filtradas e competência atual
    const validMetas = metas.filter(m => {
      const p = DataStore.calcPerformance(m, false, this.currentCompetencia);
      return p !== null;
    });

    // Identificar metas que são filhas de metas compostas para ignorar seu peso individual
    const childIds = new Set();
    validMetas.forEach(m => {
      if (m.tipo === 'composta' && Array.isArray(m.composicao)) {
        m.composicao.forEach(c => childIds.add(c.metaId));
      }
    });

    const pesoTotal = validMetas.reduce((s, m) => {
      // Se a meta for filha de outra meta na lista, ou for compartilhada, o peso dela é ignorado (0)
      const pesoEfetivo = childIds.has(m.id) || m.tipo === 'compartilhada' ? 0 : (m.peso || 0);
      return s + pesoEfetivo;
    }, 0);

    const notaGlobal = pesoTotal > 0 ? validMetas.reduce((s, m) => {
      const p = DataStore.calcPerformance(m, false, this.currentCompetencia);
      const pesoEfetivo = childIds.has(m.id) || m.tipo === 'compartilhada' ? 0 : (m.peso || 0);
      return s + (p * pesoEfetivo);
    }, 0) / pesoTotal : 0;

    return `
      <div class="page-content fade-in" style="padding-top: 10px;">
        <div class="page-actions" style="margin-bottom: 15px; background: var(--bg-2); padding: 16px; border-radius: var(--radius); border: 1px solid rgba(255,255,255,0.06);">
          <div style="display: flex; gap: 16px; align-items: flex-start;">
            <div class="form-group" style="margin: 0; min-width: 280px; width: max-content;">
              <label style="display: block; font-size: 0.75rem; color: var(--text-3); margin-bottom: 4px; font-weight: 600;">Filtrar por Área</label>
              ${Components.treeSelector(this.currentArea, 'Metas.setArea')}
            </div>
            <div class="form-group" style="margin: 0; min-width: 150px;">
              <label style="display: block; font-size: 0.75rem; color: var(--text-3); margin-bottom: 4px; font-weight: 600;">Competência</label>
              <select class="tree-dropdown-trigger" style="appearance: none; outline: none; background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2218%22%20height%3D%2218%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%234b5563%22%20stroke-width%3D%222%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22/%3E%3C/svg%3E'); background-repeat: no-repeat; background-position: right 14px center; padding-right: 40px;" onchange="Metas.setCompetencia(this.value)">
                ${mesesFiltro.map((m, idx) => `<option value="${idx}" ${this.currentCompetencia === idx ? 'selected' : ''}>${m}</option>`).join('')}
              </select>
            </div>
          </div>
          <div style="display: flex; gap: 16px; align-items: center;">
            <div style="display: flex; flex-direction: column; align-items: center; background: rgba(245,136,58,0.15); padding: 6px 16px; border-radius: var(--radius-sm);">
              <span style="font-size: 0.75rem; color: var(--primary-light);">Nota Global</span>
              <span style="font-size: 1.2rem; font-weight: 800; color: var(--primary);">${Components.formatNumber(notaGlobal)}</span>
            </div>
            ${Auth.getSession()?.id === 'admin' ? `
            <button class="btn btn-primary" onclick="Metas.openForm()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Nova Meta
            </button>
            ` : ''}
          </div>
        </div>

        <div class="card">
          <div class="table-responsive">
            <table class="data-table matrix-table" style="min-width: 900px;">
              <thead>
                <tr>
                  <th style="width: 35%">Meta</th>
                  <th style="text-align: center; width: 8%;">Peso</th>
                  <th style="text-align: center; width: 10%;">Nota Ponderada</th>
                  <th style="text-align: center; width: 15%;">Pontual</th>
                  <th style="text-align: center; width: 15%;">Acumulado</th>
                  <th style="text-align: center; width: 8%;">Nota</th>
                  <th style="text-align: center; width: 9%;">Referência</th>
                </tr>
              </thead>
              <tbody>
                ${metas.length === 0 ? `<tr><td colspan="7">${Components.emptyState(!this.currentArea ? 'Por favor, selecione uma área no filtro acima para visualizar as metas.' : 'Nenhuma meta encontrada para esta área/filtro.')}</td></tr>` : metas.map(m => this.renderMetaRow(m, this.currentCompetencia)).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>`;
  },

  renderMetaRow(meta, targetMonthIndex) {
    const perf = DataStore.calcPerformance(meta, false, targetMonthIndex);
    const notaPond = (perf * (meta.peso || 0)) / 100;
    
    // Obter dados exatamente do mês da competência selecionada
    const monthData = meta.mesesData && targetMonthIndex >= 0 && targetMonthIndex < meta.mesesData.length 
      ? meta.mesesData[targetMonthIndex] 
      : null;
      
    const pontualP = monthData && monthData.pontual ? monthData.pontual.p : meta.valorAlvo;
    const pontualR = monthData && monthData.pontual ? monthData.pontual.r : null;
    const acumP = monthData && monthData.acumulado ? monthData.acumulado.p : meta.valorAlvo;
    const acumR = monthData && monthData.acumulado ? monthData.acumulado.r : null;
    
    // Verificar se dado do mês é N/A
    const lastIsNa = monthData && monthData.pontual && monthData.pontual.na;
    
    const format = val => meta.unidade === 'R$' ? Components.formatCurrency(val) : Components.formatNumber(val);
    const formatResult = (val, isNa) => {
      if (isNa) return 'N/A';
      return val === null || val === undefined ? '—' : format(val);
    };
    
    // Determinar cor da nota
    const getColorClass = (val) => {
      if (val === null || val === undefined) return '';
      return val >= 100 ? 'matrix-bg-green' : val >= 80 ? 'matrix-bg-yellow' : 'matrix-bg-red';
    };
    
    return `
      <tr class="matrix-row ${meta.isSubMeta ? 'matrix-row-sub' : ''}" onclick="Metas.openDetail('${meta.id}')" style="cursor: pointer; transition: var(--transition); ${meta.isSubMeta ? 'background: rgba(255,255,255,0.02);' : ''}">
        <td style="font-weight: 600; font-size: 0.85rem; padding-right: 16px; ${meta.isSubMeta ? 'padding-left: 32px; border-left: 2px solid rgba(255,255,255,0.1);' : ''}">
          ${meta.isSubMeta ? '<span style="color: var(--text-3); margin-right: 6px;">↳</span>' : ''}${meta.titulo}
        </td>
        <td style="text-align: center; color: var(--text-3);">${meta.peso}%</td>
        <td style="text-align: center; font-weight: 600;">${Components.formatNumber(notaPond)}</td>
        <td style="padding: 4px;">
          <div class="matrix-cell ${getColorClass(monthData && monthData.pontual ? monthData.pontual.nota : null)}">
            <div style="font-size: 0.75rem;">P: ${format(pontualP)}</div>
            <div style="font-size: 0.75rem;">R: ${formatResult(pontualR, lastIsNa)}</div>
          </div>
        </td>
        <td style="padding: 4px;">
          <div class="matrix-cell ${getColorClass(monthData && monthData.acumulado ? monthData.acumulado.nota : null)}">
            <div style="font-size: 0.75rem;">P: ${format(acumP)}</div>
            <div style="font-size: 0.75rem;">R: ${formatResult(acumR, lastIsNa)}</div>
          </div>
        </td>
        <td style="padding: 4px;">
          <div class="matrix-cell ${perf === null ? 'matrix-bg-na' : getColorClass(perf)}" style="display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.95rem;">
            ${perf !== null ? Components.formatNumber(perf) : 'N/A'}
          </div>
        </td>
        <td style="text-align: center; font-size: 0.75rem; color: var(--text-3);">
          <div style="background: rgba(255,255,255,0.05); padding: 4px 8px; border-radius: 4px;">
            ${monthData ? monthData.mes.toUpperCase() : 'DEZ/26'}
          </div>
        </td>
      </tr>`;
  },

  getFilteredMetas() {
    const session = Auth.getSession() || {};
    const isAdmin = session.id === 'admin' || session.nivel === 'Admin';
    const isDiretoria = session.nivel === 'Diretoria';
    
    // Se não há área selecionada, não define nada (força seleção do usuário).
    // Removido o fallback para área do usuário e admin (que marcava 'todas').

    // Security check: if currentArea is set but user is not authorized to see it, clear it
    if (this.currentArea === 'todas' || this.currentArea === 'all') {
      if (!isAdmin && !isDiretoria) {
        this.currentArea = '';
        localStorage.removeItem('metas_filter_area');
      }
    } else if (this.currentArea) {
      const authorizedIds = DataStore.getAuthorizedAreas().map(a => a.id);
      if (!isAdmin && !isDiretoria && !authorizedIds.includes(this.currentArea)) {
        this.currentArea = '';
        localStorage.removeItem('metas_filter_area');
      }
    }

    let metas = DataStore.getMetas();
    let areaMetas = metas;
    const isSearching = this.currentSearch && this.currentSearch.trim() !== '';

    // 1. Filtro de Autorização (se não for admin/diretoria)
    if (!isAdmin && !isDiretoria) {
      const authorizedIds = DataStore.getAuthorizedAreas().map(a => a.id);
      areaMetas = areaMetas.filter(m => {
        if (m.tipo === 'compartilhada' && Array.isArray(m.coresponsavelIds)) {
          return m.coresponsavelIds.some(uid => {
            const uArea = DataStore.getAreaAtual(uid);
            return uArea && authorizedIds.includes(uArea.id);
          });
        }
        if (m.responsavelId) {
          const respArea = DataStore.getAreaAtual(m.responsavelId);
          if (respArea) return authorizedIds.includes(respArea.id);
          return authorizedIds.includes(m.areaId);
        }
        return authorizedIds.includes(m.areaId);
      });
    }

    // 2. Filtro de Área Selecionada (this.currentArea)
    if (this.currentArea && this.currentArea !== 'todas' && this.currentArea !== 'all') {
      areaMetas = areaMetas.filter(m => {
        // Para metas compartilhadas COM corresponsáveis: verificar se algum corresponsável pertence a esta área
        if (m.tipo === 'compartilhada' && Array.isArray(m.coresponsavelIds) && m.coresponsavelIds.length > 0) {
          const corespMatch = m.coresponsavelIds.some(uid => {
            const uArea = DataStore.getAreaAtual(uid);
            return uArea && uArea.id === this.currentArea;
          });
          if (corespMatch) return true;
          // Continua para verificar areaId e responsavelId abaixo
        }

        // Para todos os tipos: verificar areaId salvo na meta
        if (m.areaId === this.currentArea) {
          return true;
        }

        // Verificar área atual do responsável
        if (m.responsavelId) {
          const respArea = DataStore.getAreaAtual(m.responsavelId);
          if (respArea && respArea.id === this.currentArea) {
            return true;
          }
        }

        return false;
      });
    }

    // 3. Filtro de Busca e Regra de Ouro (compartilhadas)
    let filtered = areaMetas.filter(m => {
      // Regra de Ouro: Metas compartilhadas (espelhos) só aparecem no painel individual do responsável.
      if (m.tipo === 'compartilhada' && (this.currentArea === 'todas' || this.currentArea === 'all')) {
        return false;
      }
      
      if (isSearching) {
        const s = this.currentSearch.toLowerCase();
        const responsavel = m.responsavelId ? DataStore.getUserById(m.responsavelId) : null;
        const respNome = responsavel ? responsavel.nome.toLowerCase() : '';
        const matchSearch = (m.titulo || '').toLowerCase().includes(s) || 
                            (m.codigo || '').toLowerCase().includes(s) ||
                            respNome.includes(s);
        return matchSearch;
      }
      return true;
    });
    metas = filtered;
    
    // --- Ordenação por Peso (maior primeiro) ---
    metas.sort((a, b) => (b.peso || 0) - (a.peso || 0));

    // --- Agrupamento respeitando a ordem de peso ---
    // Percorre a lista já ordenada por peso. Quando encontra uma composta,
    // insere suas filhas logo abaixo — sem forçar compostas para o topo.
    const orderedMetas = [];
    const addedIds = new Set();

    metas.forEach(m => {
      if (addedIds.has(m.id)) return; // filha já inserida abaixo da sua composta

      if (m.tipo === 'composta') {
        m.isSubMeta = false;
        orderedMetas.push(m);
        addedIds.add(m.id);

        // Insere as filhas imediatamente abaixo da composta
        if (Array.isArray(m.composicao)) {
          m.composicao.forEach(comp => {
            let filha = metas.find(x => String(x.id) === String(comp.metaId));
            if (!filha) {
              filha = metas.find(x => x.tipo === 'compartilhada' && String(x.refMetaId) === String(comp.metaId));
            }
            if (filha && !addedIds.has(filha.id)) {
              filha.isSubMeta = true;
              orderedMetas.push(filha);
              addedIds.add(filha.id);
            }
          });
        }
      } else {
        m.isSubMeta = false;
        orderedMetas.push(m);
        addedIds.add(m.id);
      }
    });

    return orderedMetas;
  },


  setArea(a) {
    this.currentArea = a;
    localStorage.setItem('metas_filter_area', a);
    App.refreshPage();
  },

  setFilter(f) {
    this.currentFilter = f;
    localStorage.setItem('metas_filter_status', f);
    App.refreshPage();
  },

  openDetail(id) {
    const meta = DataStore.getMetaById(id);
    if (!meta) return;
    const acoes = DataStore.getAcoesByMeta(meta.id);
    const format = val => (val === null || val === undefined) ? 'N/A' : (meta.unidade === 'R$' ? Components.formatCurrency(val) : Components.formatNumber(val));
    const formatPerc = val => (val === null || val === undefined) ? 'N/A' : Components.formatNumber(val) + '%';
    const getColorClass = val => (val === null || val === undefined) ? '' : (val >= 100 ? 'matrix-bg-green' : val >= 80 ? 'matrix-bg-yellow' : 'matrix-bg-red');

    const meses = meta.mesesData || [];
    const session = Auth.getSession() || {};
    const isAdmin = session.id === 'admin' || session.nivel === 'Admin';
    const isOwner = session.id === meta.responsavelId || (Array.isArray(meta.coresponsavelIds) && meta.coresponsavelIds.includes(session.id));

    const getMatrixFieldValue = (m, dataKey, field) => {
      const monthData = m[dataKey] || {};
      const pVal = monthData.p;
      const rVal = monthData.r;
      if (field === 'd') {
        return monthData.d;
      }
      if (field === 'nota') {
        return monthData.nota;
      }
      return monthData[field];
    };

    const formatNota = (val) => (val === null || val === undefined) ? '—' : Components.formatNumber(val);
    const renderMatrixRow = (label, dataKey, field, isPerc = false, hideClass = false) => `
      <tr class="matrix-detail-row">
        <td class="matrix-detail-label">${label}</td>
        ${meses.map(m => {
          const isNa = m.pontual && m.pontual.na;
          const val = getMatrixFieldValue(m, dataKey, field);
          const notaValue = getMatrixFieldValue(m, dataKey, 'nota');
          const colorClass = hideClass ? '' : getColorClass(notaValue);
          const cellId = `cell_${meta.id}_${dataKey}_${field}_${m.mes.replace(/\//g,'_')}`;
          
          let content = isPerc ? formatPerc(val) : (field === 'nota' ? formatNota(val) : format(val));
          const isProvider = meta.acumulacao === 'provider';
          const isEditablePrevisto = label === 'P:' && (dataKey === 'pontual' || (dataKey === 'acumulado' && isProvider)) && isAdmin;
          const isEditableResult = label === 'R:' && (dataKey === 'pontual' || (dataKey === 'acumulado' && isProvider)) && meta.tipo !== 'composta' && (isAdmin || isOwner);
          const isEditable = isEditablePrevisto || isEditableResult;

          if (isEditable) {
            const displayValue = isNa ? '<span style="color: var(--text-3); font-weight: 600;">N/A</span>' : ((val === null || val === undefined || val === '') ? '<span style="color: var(--text-3);">-</span>' : content);
            content = `
              <div class="matrix-inline-edit" title="Editar Valor" onclick="Metas.enableInlineEdit('${meta.id}', '${m.mes}', '${cellId}', '${dataKey}', '${field}')" style="display:flex; align-items:center; justify-content:center; gap:6px;">
                <span>${displayValue}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </div>`;
          } else {
            if (label === 'R:' && dataKey === 'pontual') {
               content = isNa ? '<span style="color: var(--text-3); font-weight: 600;">N/A</span>' : '-';
            }
          }
          
          // Se for N/A, aplicar estilos específicos
          const naClass = isNa && (label === 'R:' || label === 'D:' || label === 'Nota:') ? 'matrix-cell-na' : '';
          let cellContent = isNa && (label === 'D:' || label === 'Nota:') ? '<span style="color: var(--text-3); font-style: italic;">—</span>' : content;
          
          return `<td class="matrix-detail-cell ${colorClass} ${naClass}" id="${cellId}" data-na="${isNa}" ${isEditableResult ? `data-value="${val !== null && val !== undefined ? val : ''}"` : ''}>${cellContent}</td>`;
        }).join('')}
      </tr>`;

    const content = `
      <div class="meta-detail-matrix" style="width: 100%; overflow-x: auto; padding-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
          <h3 style="font-size: 1.1rem; color: var(--text);">${meta.codigo} - ${meta.titulo}</h3>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-ghost btn-sm" onclick="Metas.openMetaInfo('${meta.id}')" style="border: 1px solid rgba(255,255,255,0.12);">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px;vertical-align:middle;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              Detalhes
            </button>
            ${isAdmin ? `<button class="btn btn-ghost btn-sm" onclick="Metas.openForm('${meta.id}')">Editar</button>` : ''}
            ${isAdmin || isOwner ? `<button class="btn btn-primary btn-sm" onclick="Metas.openAcaoForm('${meta.id}')">+ Plano de Ação</button>` : ''}
          </div>
        </div>

        <table class="matrix-detail-table">
          <thead>
            <tr>
              <th style="width: 90px;">Pontual</th>
              ${meses.map(m => `<th>${m.mes}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${renderMatrixRow('P:', 'pontual', 'p', false, true)}
            ${renderMatrixRow('R:', 'pontual', 'r', false, true)}
            ${renderMatrixRow('D:', 'pontual', 'd', true, false)}
            ${renderMatrixRow('Nota:', 'pontual', 'nota', false, false)}
          </tbody>
          <thead>
            <tr>
              <th style="padding-top: 24px;">Acumulado</th>
              ${meses.map(m => `<th style="padding-top: 24px;">${m.mes}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${renderMatrixRow('P:', 'acumulado', 'p', false, true)}
            ${renderMatrixRow('R:', 'acumulado', 'r', false, true)}
            ${renderMatrixRow('D:', 'acumulado', 'd', true, false)}
            ${renderMatrixRow('Nota:', 'acumulado', 'nota', false, false)}
            <tr class="matrix-detail-row">
              <td class="matrix-detail-label">Anexo:</td>
              ${meses.map((m, idx) => {
                const canUploadAnexo = isAdmin || isOwner;
                return `
                <td class="matrix-detail-cell text-primary">
                  <div class="matrix-inline-edit" title="${canUploadAnexo ? 'Anexar Evidência' : 'Visualizar Evidências'}" style="cursor:pointer;" ${canUploadAnexo ? `onclick="Metas.openAnexoForm('${meta.id}', '${m.mes}')"` : `onclick="Metas.viewAnexosOnly('${meta.id}', '${m.mes}')"`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 2px;"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                    (${m.anexos ? m.anexos.length : 0})
                  </div>
                </td>`;
              }).join('')}
            </tr>
          </tbody>
        </table>

        ${acoes.length > 0 ? `
        <div style="margin-top: 24px; padding: 16px; background: var(--bg-3); border-radius: var(--radius-sm); border: 1px solid rgba(255,255,255,0.06);">
          <h4 style="font-size: 0.9rem; margin-bottom: 12px; color: var(--text-2);">Planos de Ação (${acoes.length})</h4>
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
                  <th style="padding: 8px 12px; text-align: left; font-size: 0.8rem; font-weight: 600; color: var(--text-2);">Causa</th>
                  <th style="padding: 8px 12px; text-align: left; font-size: 0.8rem; font-weight: 600; color: var(--text-2);">Plano de Ação</th>
                  <th style="padding: 8px 12px; text-align: center; font-size: 0.8rem; font-weight: 600; color: var(--text-2);">Status</th>
                  <th style="padding: 8px 12px; text-align: center; font-size: 0.8rem; font-weight: 600; color: var(--text-2); width: 80px;">Progresso</th>
                </tr>
              </thead>
              <tbody>
                ${acoes.map(a => {
                  const progresso = a.progresso || 0;
                  const prazo = a.prazo ? new Date(a.prazo) : null;
                  const hoje = new Date();
                  let statusAuto = 'nao_iniciada';
                  if (progresso === 100) statusAuto = 'concluida';
                  else if (progresso > 0) statusAuto = 'em_andamento';
                  else if (prazo && hoje > prazo) statusAuto = 'atrasada';
                  
                  return `
                  <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); cursor: pointer;" onclick="Metas.openAcaoForm('${meta.id}', '${a.id}')">
                    <td style="padding: 12px; font-size: 0.85rem; font-weight: 600; color: var(--text-1); vertical-align: middle;">${a.titulo}</td>
                    <td style="padding: 12px; font-size: 0.8rem; color: var(--text-2); vertical-align: middle;">
                      ${a.descricao || 'Sem descrição'}
                      ${a.anexo && a.anexo.nome ? `
                        <br>
                        <div style="margin-top: 4px;">
                          ${a.anexo.url ? `<a href="${a.anexo.url}" target="_blank" onclick="event.stopPropagation()" style="font-size: 0.7rem; color: var(--success); text-decoration: underline; display: inline-flex; align-items: center; gap: 3px;">📎 ${a.anexo.nome}</a>` : `<span style="font-size: 0.7rem; color: var(--success);">📎 ${a.anexo.nome}</span>`}
                          ${a.anexo.usuarioNome ? `<span style="font-size: 0.65rem; color: var(--text-3); margin-left: 6px;">por ${a.anexo.usuarioNome} em ${new Date(a.anexo.dataHora || a.anexo.data).toLocaleString('pt-BR', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'})}</span>` : ''}
                        </div>
                      ` : ''}
                    </td>
                    <td style="padding: 12px; text-align: center; vertical-align: middle;"><span id="acao-status-${a.id}">${Components.badge(statusAuto, statusAuto)}</span></td>
                    <td style="padding: 12px; text-align: center; vertical-align: middle;" onclick="event.stopPropagation()">
                      <div style="display: flex; flex-direction: row; align-items: center; justify-content: center; gap: 8px; height: 100%;">
                        <input id="acao-range-${a.id}" type="range" min="0" max="100" value="${progresso}" style="width: 60px; height: 4px; accent-color: var(--primary); cursor: pointer;" onchange="Metas.updateAcaoProgress('${a.id}', '${meta.id}', this.value)">
                        <span id="acao-percent-${a.id}" style="font-size: 0.75rem; font-weight: 600; color: var(--text-2); min-width: 28px; text-align: right;">${progresso}%</span>
                      </div>
                    </td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>` : ''}
      </div>`;

    // Make modal larger for the matrix
    Components.openModal('Visão Detalhada da Meta', content);
    const modalContainer = document.querySelector('.modal-container');
    if (modalContainer) {
      modalContainer.style.maxWidth = '1100px';
    }
  },

  openMetaInfo(id) {
    Components.closeModal();
    const meta = DataStore.getMetaById(id);
    if (!meta) return;

    const users = DataStore.getUsers();
    const responsavel = users.find(u => u.id === meta.responsavelId);
    const area = DataStore.getAreas().find(a => a.id === meta.areaId);
    const perf = DataStore.calcPerformance(meta);

    const tipoLabels = { individual: 'Individual', composta: 'Composta', compartilhada: 'Compartilhada' };
    const acumLabels = { soma: 'Soma Simples', media: 'Média Simples', provider: 'Data Provider', repetir: 'Repetir Valores' };
    const polLabels = { maior_melhor: 'Maior Melhor (↑)', menor_melhor: 'Menor Melhor (↓)' };
    const unidLabels = { un: 'Número', 'R$': 'Moeda (R$)', horas: 'Horas', '%': 'Percentual (%)' };
    const curvaLabels = { '0-80-100-120': '0 - 80 - 100 - 120', '80-100-120': '80 - 100 - 120', '80-100': '80 - 100', '100-120': '100 - 120', '100': '100 (Atingiu ou não)', '120': '120 (Superou ou não)' };

    let composicaoHtml = '';
    if (meta.tipo === 'composta' && Array.isArray(meta.composicao) && meta.composicao.length > 0) {
      composicaoHtml = `
        <div style="grid-column: 1 / -1; margin-top: 8px;">
          <div style="font-size: 0.75rem; color: var(--text-3); font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">Composição</div>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            ${meta.composicao.map(c => {
              const cm = DataStore.getMetaById(c.metaId);
              return '<div style="display:flex;justify-content:space-between;align-items:center;background:var(--bg-3);padding:10px 14px;border-radius:var(--radius-xs);border:1px solid rgba(255,255,255,0.05);"><span style="font-size:0.85rem;font-weight:500;">' + (cm ? cm.codigo + ' - ' + cm.titulo : 'N/A') + '</span><span class="badge badge-neutral" style="font-size:0.75rem;">' + c.peso + '%</span></div>';
            }).join('')}
          </div>
        </div>`;
    }

    let compartilhadaHtml = '';
    if (meta.tipo === 'compartilhada' && meta.refMetaId) {
      const src = DataStore.getMetaById(meta.refMetaId);
      compartilhadaHtml = '<div style="grid-column:1/-1;margin-top:8px;"><div style="font-size:0.75rem;color:var(--text-3);font-weight:600;text-transform:uppercase;margin-bottom:8px;">Meta de Origem</div><div style="background:var(--bg-3);padding:10px 14px;border-radius:var(--radius-xs);border:1px solid rgba(255,255,255,0.05);font-size:0.85rem;">' + (src ? src.codigo + ' - ' + src.titulo : 'N/A') + '</div></div>';
    }

    let curvaHtml = '';
    if (meta.tipoCurva && meta.valoresCurva) {
      const points = meta.tipoCurva.split('-');
      const entries = points.map(p => {
        let label = 'Nota ' + p;
        if (p === '100') label = 'Meta (100)';
        if (p === '120') label = 'Superou (120)';
        return [label, meta.valoresCurva[p] !== undefined ? meta.valoresCurva[p] : '—'];
      });
      if (entries.length > 0) {
        curvaHtml = '<div style="grid-column: 1 / -1; margin-top: 8px;"><div style="font-size: 0.75rem; color: var(--text-3); font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">Valores da Curva</div><div style="display: flex; gap: 8px; flex-wrap: wrap;">' +
          entries.map(e => '<div style="flex: 1; min-width: 80px; background: var(--bg-3); padding: 8px 12px; border-radius: var(--radius-xs); border: 1px solid rgba(255,255,255,0.05); text-align: center;"><div style="font-size: 0.65rem; color: var(--text-4); margin-bottom: 3px;">' + e[0] + '</div><div style="font-size: 0.95rem; font-weight: 700; color: var(--primary);">' + (e[1] !== '—' ? Components.formatNumber(e[1]) : e[1]) + '</div></div>').join('') +
          '</div></div>';
      }
    }

    const infoItem = (label, value) => '<div style="background:var(--bg-3);padding:8px 12px;border-radius:var(--radius-xs);border:1px solid rgba(255,255,255,0.05);"><div style="font-size:0.65rem;color:var(--text-4);font-weight:600;text-transform:uppercase;margin-bottom:3px;">' + label + '</div><div style="font-size:0.85rem;font-weight:600;color:var(--text);">' + value + '</div></div>';

    const content = `
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;">
        <div style="grid-column: 1 / -1;">
          ${infoItem('Meta', meta.titulo || '—')}
        </div>
        ${infoItem('Código', meta.codigo || '—')}
        ${infoItem('Peso', (meta.peso || 0) + '%')}
        ${infoItem('Base Metas', meta.anexoRegra && meta.anexoRegra.downloadUrl ? `<a href="${meta.anexoRegra.downloadUrl}" target="_blank" style="color:var(--primary); text-decoration:none;">📎 Baixar</a>` : '—')}
        ${infoItem('Responsável', responsavel ? responsavel.nome : '—')}
        ${infoItem('Área', area ? area.nome : '—')}
        ${infoItem('Tipo', tipoLabels[meta.tipo] || meta.tipo)}
        ${infoItem('Formato', unidLabels[meta.unidade] || meta.unidade)}
        ${infoItem('Acumulação', acumLabels[meta.acumulacao] || meta.acumulacao)}
        ${infoItem('Polaridade', polLabels[meta.polaridade] || meta.polaridade)}
        <div style="grid-column: 1 / -1;">
          ${infoItem('Tipo de Curva', curvaLabels[meta.tipoCurva] || meta.tipoCurva || '0 - 80 - 100 - 120')}
        </div>
        ${curvaHtml}
        ${meta.observacoes ? `<div style="grid-column: 1 / -1; margin-top: 8px;"><div style="font-size: 0.75rem; color: var(--text-3); font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">Observações</div><div style="background: var(--bg-3); padding: 12px; border-radius: var(--radius-xs); border: 1px solid rgba(255,255,255,0.05); font-size: 0.85rem; color: var(--text); white-space: pre-wrap;">${meta.observacoes}</div></div>` : ''}
        ${composicaoHtml}
        ${compartilhadaHtml}
      </div>`;

    const footer = '<button class="btn btn-primary" onclick="Metas.openDetail(\'' + id + '\')">Voltar</button>';
    setTimeout(() => Components.openModal('Detalhes da Meta', content, footer), 350);
  },

  openForm(editId = null) {
    Components.closeModal();
    const meta = editId ? DataStore.getMetaById(editId) : null;
    const users = DataStore.getUsers();
    const isEdit = !!meta;
    
    // Suggest code for new meta
    let sugCode = '';
    if (!isEdit) {
      const allMetas = DataStore.getMetas();
      sugCode = `MET${(allMetas.length + 1).toString().padStart(4, '0')}`;
    }

    const content = `
      <form id="metaForm" onsubmit="Metas.saveMeta(event, '${editId || ''}')">
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Código *</label>
            <input class="form-input" name="codigo" required value="${meta ? meta.codigo : sugCode}" ${isEdit ? 'readonly' : ''} style="${isEdit ? 'background:var(--bg-2)' : ''}">
          </div>
          <div class="form-group form-full">
            <label class="form-label">Título *</label>
            <input class="form-input" name="titulo" required value="${meta ? meta.titulo : ''}" placeholder="Ex: Receita Bruta Anual">
          </div>
          
          <div class="form-group">
            <label class="form-label">Responsável *</label>
            <select class="form-input" name="responsavelId" id="metaResponsavel" required onchange="Metas.updatePesoProgress()">
              <option value="">Selecione...</option>
              ${users.map(u => `<option value="${u.id}" ${meta && meta.responsavelId === u.id ? 'selected' : ''}>${u.nome}</option>`).join('')}
            </select>
          </div>
          
          <div class="form-group" id="metaPesoGroup">
            <label class="form-label" id="metaPesoLabel">Peso (%) *</label>
            <input class="form-input" type="number" step="0.01" min="0" max="100" id="metaPeso" name="peso" value="${meta ? meta.peso : 10}" required oninput="Metas.updatePesoProgress()">
          </div>
          
          <div class="form-group form-full" style="margin-top:-10px; margin-bottom:10px;">
            <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--text-3); margin-bottom:4px;">
              <span>Peso Total do Responsável</span>
              <span id="pesoTotalLabel">0% / 100%</span>
            </div>
            <div style="height:6px; background:var(--bg-3); border-radius:3px; overflow:hidden;">
              <div id="pesoProgressBar" style="height:100%; width:0%; background:var(--primary); transition:0.3s;"></div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Tipo *</label>
            <select class="form-input" name="tipo" id="metaTipo" required onchange="Metas.handleTipoChange()">
              <option value="individual" ${meta && meta.tipo === 'individual' ? 'selected' : ''}>Individual</option>
              <option value="composta" ${meta && meta.tipo === 'composta' ? 'selected' : ''}>Composta</option>
              <option value="compartilhada" ${meta && meta.tipo === 'compartilhada' ? 'selected' : ''}>Compartilhada</option>
            </select>
          </div>
          
          <div id="extraFieldsContainer" class="form-group form-full" style="background: var(--bg-3); padding: 16px; border-radius: var(--radius-sm); border: 1px solid rgba(255,255,255,0.06); display: none;">
            <!-- Renderizado via handleTipoChange -->
          </div>
          
          <div class="form-group">
            <label class="form-label">Formato (Unidade)</label>
            <select class="form-input" name="unidade">
              ${['Número','Moeda','Horas','%'].map(u => {
                const val = u === 'Número' ? 'un' : u === 'Moeda' ? 'R$' : u === 'Horas' ? 'horas' : '%';
                return `<option value="${val}" ${meta && meta.unidade === val ? 'selected' : ''}>${u}</option>`;
              }).join('')}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Acumulação da Meta</label>
            <select class="form-input" name="acumulacao">
              <option value="soma" ${meta && meta.acumulacao === 'soma' ? 'selected' : ''}>Soma Simples</option>
              <option value="media" ${meta && meta.acumulacao === 'media' ? 'selected' : ''}>Média Simples</option>
              <option value="provider" ${meta && meta.acumulacao === 'provider' ? 'selected' : ''}>Data Provider</option>
              <option value="repetir" ${meta && meta.acumulacao === 'repetir' ? 'selected' : ''}>Repetir Valores</option>
            </select>
          </div>
          
          <div class="form-group">
            <label class="form-label">Polaridade</label>
            <select class="form-input" name="polaridade">
              <option value="maior_melhor" ${meta && meta.polaridade === 'maior_melhor' ? 'selected' : ''}>Maior Melhor (↑)</option>
              <option value="menor_melhor" ${meta && meta.polaridade === 'menor_melhor' ? 'selected' : ''}>Menor Melhor (↓)</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Tipo de Curva</label>
            <select class="form-input" name="tipoCurva" id="metaTipoCurva" onchange="Metas.renderCurvaInputs()">
              <option value="0-80-100-120" ${meta && meta.tipoCurva === '0-80-100-120' ? 'selected' : ''}>0 - 80 - 100 - 120</option>
              <option value="80-100-120" ${meta && meta.tipoCurva === '80-100-120' ? 'selected' : ''}>80 - 100 - 120</option>
              <option value="80-100" ${meta && meta.tipoCurva === '80-100' ? 'selected' : ''}>80 - 100</option>
              <option value="100-120" ${meta && meta.tipoCurva === '100-120' ? 'selected' : ''}>100 - 120</option>
              <option value="100" ${meta && meta.tipoCurva === '100' ? 'selected' : ''}>100 (Atingiu ou não)</option>
              <option value="120" ${meta && meta.tipoCurva === '120' ? 'selected' : ''}>120 (Superou ou não)</option>
            </select>
          </div>

          <div class="form-group form-full">
            <label class="form-label">Valores da Curva</label>
            <div id="curvaInputsContainer" style="display:flex; gap:12px; align-items:center; background:var(--bg-2); padding:12px; border-radius:var(--radius-sm); border:1px solid rgba(255,255,255,0.06);">
              <!-- Renderizado dinamicamente por renderCurvaInputs() -->
            </div>
          </div>

          <div class="form-group form-full">
            <label class="form-label">Observações</label>
            <textarea class="form-input" name="observacoes" rows="3" placeholder="Detalhe a regra de cálculo da meta e o que foi considerado...">${meta && meta.observacoes ? meta.observacoes : ''}</textarea>
          </div>

          <div class="form-group form-full">
            <label class="form-label">Base Metas</label>
            ${meta && meta.anexoRegra ? `
              <div style="margin-bottom: 8px; font-size: 0.85rem;">
                <strong>Arquivo atual:</strong> <a href="${meta.anexoRegra.url}" target="_blank" style="color:var(--primary);">${meta.anexoRegra.nome}</a>
              </div>
            ` : ''}
            <input type="file" class="form-input" id="metaAnexoRegra" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg">
          </div>


        </div>
      </form>`;

    const isAdmin = Auth.getSession()?.id === 'admin';
    const footer = `
      <button class="btn btn-ghost" onclick="Components.closeModal()">Cancelar</button>
      ${(isEdit && isAdmin) ? `<button type="button" class="btn btn-danger" onclick="Metas.confirmDelete('${editId}')">Excluir</button>` : ''}
      <button class="btn btn-primary" onclick="document.getElementById('metaForm').requestSubmit()">${isEdit ? 'Salvar Alterações' : 'Criar Meta'}</button>`;

    Components.openModal(isEdit ? 'Editar Meta' : 'Nova Meta', content, footer);
    
    // Inject the saved values into the window so we can render them properly
    window._tempMetaCurva = meta ? meta.valoresCurva : null;
    window._tempEditId = editId;
    setTimeout(() => {
      this.updatePesoProgress();
      this.renderCurvaInputs();
      this.handleTipoChange(); // Inicializa campos extras
    }, 100);
  },

  handleTipoChange() {
    const tipo = document.getElementById('metaTipo').value;
    const container = document.getElementById('extraFieldsContainer');
    const metaId = window._tempEditId;
    const meta = metaId ? DataStore.getMetaById(metaId) : null;
    const allMetas = DataStore.getMetas().filter(m => m.id !== metaId && m.tipo !== 'composta');

    const inputPeso = document.getElementById('metaPeso');
    const labelPeso = document.getElementById('metaPesoLabel');
    const grupoPeso = document.getElementById('metaPesoGroup');

    // Peso: obrigatório para individual e composta; opcional (e oculto) para compartilhada
    if (tipo === 'compartilhada') {
      if (inputPeso) { inputPeso.required = false; inputPeso.min = "0"; }
      if (labelPeso) labelPeso.textContent = 'Peso (%)';
      if (grupoPeso) grupoPeso.style.display = 'none';
    } else if (tipo === 'composta') {
      if (inputPeso) { inputPeso.required = true; inputPeso.min = "1"; }
      if (labelPeso) labelPeso.textContent = 'Peso (%) *';
      if (grupoPeso) grupoPeso.style.display = '';
    } else {
      // individual — peso obrigatório como era antes
      if (inputPeso) { inputPeso.required = true; inputPeso.min = "0"; }
      if (labelPeso) labelPeso.textContent = 'Peso (%) *';
      if (grupoPeso) grupoPeso.style.display = '';
    }

    if (tipo === 'individual') {
      // Campos de curva, observações e base metas já estão no HTML estático do formulário
      container.style.display = 'none';
      return;
    }

    if (tipo === 'composta') {
      const composicao = meta?.composicao || [{ metaId: '', peso: 0 }];
      container.style.display = 'block';
      container.innerHTML = `
        <label class="form-label">Composição da Meta (Soma deve ser 100%)</label>
        <div id="composicaoList" style="display:flex; flex-direction:column; gap:8px;">
          ${composicao.map((c, i) => `
            <div class="composicao-row" style="display:flex; gap:8px; align-items:center;">
              <select class="form-input" name="comp_meta_${i}" style="flex:2;">
                <option value="">Selecionar Meta Individual...</option>
                ${allMetas.map(m => `<option value="${m.id}" ${c.metaId === m.id ? 'selected' : ''}>${m.codigo} - ${m.titulo}</option>`).join('')}
              </select>
              <input type="number" step="0.01" class="form-input" name="comp_peso_${i}" value="${c.peso}" placeholder="Peso %" style="flex:1;" oninput="Metas.validateComposicao()">
              <button type="button" class="btn btn-icon" onclick="this.parentElement.remove(); Metas.validateComposicao();">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          `).join('')}
        </div>
        <button type="button" class="btn btn-ghost btn-sm" style="margin-top:8px;" onclick="Metas.addComposicaoRow()">+ Adicionar Meta Filha</button>
        <div id="composicaoTotal" style="font-size:0.75rem; font-weight:700; margin-top:8px; color:var(--text-3);">Total: 0%</div>
      `;
      this.validateComposicao();
      return;
    }

    if (tipo === 'compartilhada') {
      const available = DataStore.getMetas().filter(m => m.id !== metaId && m.tipo === 'individual');
      const users = DataStore.getUsers().filter(u => u.status !== 'inativo');
      container.style.display = 'block';
      container.innerHTML = `
        <div class="form-group">
          <label class="form-label">Vincular a Meta de Origem *</label>
          <select class="form-input" name="refMetaId" required onchange="Metas.syncFormWithSource(this.value)">
            <option value="">Selecionar meta para compartilhar...</option>
            ${available.map(m => `<option value="${m.id}" ${meta?.refMetaId === m.id ? 'selected' : ''}>${m.codigo} - ${m.titulo}</option>`).join('')}
          </select>
          <small style="color:var(--text-3); display:block; margin-top:4px;">Nota, Curva e Resultados serão sincronizados com a origem.</small>
        </div>
        <div class="form-group" style="margin-top: 16px;">
          <label class="form-label">Corresponsáveis (Quem vai receber essa meta?)</label>
          <div style="max-height: 150px; overflow-y: auto; border: 1px solid var(--border); padding: 8px; border-radius: 6px; background: var(--bg-1);">
            ${users.map(u => {
              const uArea = DataStore.getAreaAtual(u.id);
              const areaNome = uArea ? uArea.nome : 'Sem Área';
              const checked = meta?.coresponsavelIds?.includes(u.id) ? 'checked' : '';
              return `
                <label style="display:flex; align-items:center; gap:8px; margin-bottom:6px; font-size:0.85rem; cursor:pointer;">
                  <input type="checkbox" name="coresponsavel" value="${u.id}" ${checked}>
                  <span>${u.nome} <small style="color:var(--text-3)">(${areaNome})</small></span>
                </label>
              `;
            }).join('')}
          </div>
        </div>
      `;
      return;
    }

    container.style.display = 'none';
  },

  syncFormWithSource(sourceId) {
    if (!sourceId) return;
    const source = DataStore.getMetaById(sourceId);
    if (!source) return;

    const form = document.getElementById('metaForm');
    if (!form) return;

    // Preencher campos
    if (form.unidade) form.unidade.value = source.unidade || 'un';
    if (form.acumulacao) form.acumulacao.value = source.acumulacao || 'soma';
    if (form.polaridade) form.polaridade.value = source.polaridade || 'maior_melhor';
    
    const tipoCurvaSelect = document.getElementById('metaTipoCurva');
    if (tipoCurvaSelect) {
      tipoCurvaSelect.value = source.tipoCurva || '0-80-100-120';
      window._tempMetaCurva = source.valoresCurva;
      this.renderCurvaInputs();
    }
    
    if (form.titulo && (!form.titulo.value || form.titulo.value.trim() === "")) {
      form.titulo.value = source.titulo;
    }
  },

  addComposicaoRow() {
    const list = document.getElementById('composicaoList');
    const index = list.children.length;
    const allMetas = DataStore.getMetas().filter(m => m.id !== window._tempEditId && m.tipo !== 'composta');
    const div = document.createElement('div');
    div.className = 'composicao-row';
    div.style = 'display:flex; gap:8px; align-items:center;';
    div.innerHTML = `
      <select class="form-input" name="comp_meta_${index}" style="flex:2;">
        <option value="">Selecionar Meta Individual...</option>
        ${allMetas.map(m => `<option value="${m.id}">${m.codigo} - ${m.titulo}</option>`).join('')}
      </select>
      <input type="number" step="0.01" class="form-input" name="comp_peso_${index}" value="0" placeholder="Peso %" style="flex:1;" oninput="Metas.validateComposicao()">
      <button type="button" class="btn btn-icon" onclick="this.parentElement.remove(); Metas.validateComposicao();">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
      </button>
    `;
    list.appendChild(div);
  },

  validateComposicao() {
    const weights = Array.from(document.querySelectorAll('input[name^="comp_peso_"]')).map(i => parseFloat(i.value) || 0);
    const total = weights.reduce((s, w) => s + w, 0);
    const label = document.getElementById('composicaoTotal');
    if (label) {
      label.textContent = `Total: ${total}%`;
      label.style.color = total === 100 ? 'var(--success)' : 'var(--danger)';
    }
    return total;
  },

  updatePesoProgress() {
    const respId = document.getElementById('metaResponsavel').value;
    const pesoInput = parseFloat(document.getElementById('metaPeso').value) || 0;
    let somaOutros = 0;
    
    if (respId) {
      const metasResp = DataStore.getMetas().filter(m => m.responsavelId === respId && m.id !== window._tempEditId);
      somaOutros = metasResp.reduce((s, m) => s + (m.peso || 0), 0);
    }
    
    const total = somaOutros + pesoInput;
    const bar = document.getElementById('pesoProgressBar');
    const label = document.getElementById('pesoTotalLabel');
    
    label.textContent = `${total}% / 100%`;
    bar.style.width = `${Math.min(100, total)}%`;
    
    if (total > 100) {
      bar.style.background = 'var(--danger)';
      label.style.color = 'var(--danger)';
    } else {
      bar.style.background = 'var(--primary)';
      label.style.color = 'var(--text-3)';
    }
  },

  renderCurvaInputs() {
    const tipo = document.getElementById('metaTipoCurva').value;
    const container = document.getElementById('curvaInputsContainer');
    const saved = window._tempMetaCurva || {};
    
    let html = '';
    const points = tipo.split('-');
    
    points.forEach(p => {
      let v = saved[p] !== undefined ? saved[p] : '';
      let color = p === '100' ? 'var(--success)' : p === '120' ? 'var(--primary)' : p === '80' ? '#E8A81C' : 'var(--danger)';
      html += `
        <div style="flex:1;">
          <label style="font-size:0.75rem; color:${color}; font-weight:600; margin-bottom:4px; display:block;">Nota ${p}</label>
          <input type="number" step="any" class="form-input" name="curva_${p}" value="${v}" required placeholder="Valor...">
        </div>
      `;
    });
    
    container.innerHTML = html;
  },

  async saveMeta(e, editId) {
    e.preventDefault();
    const form = e.target;
    
    const submitBtn = document.querySelector('.modal-footer button.btn-primary');
    if (submitBtn) submitBtn.disabled = true;

    try {
      const data = Object.fromEntries(new FormData(form));
    
    // Validation
    const respId = data.responsavelId;
    const pesoInput = parseFloat(data.peso) || 0;
    const metasResp = DataStore.getMetas().filter(m => m.responsavelId === respId && m.id !== editId);
    const somaOutros = metasResp.reduce((s, m) => s + (m.peso || 0), 0);
    
    if ((somaOutros + pesoInput) > 100) {
      Components.toast('A soma dos pesos para este responsável não pode exceder 100%!', 'error');
      return;
    }
    
    // Extract Curve Values
    const tipoCurva = data.tipoCurva || '0-80-100-120';
    const points = tipoCurva.split('-');
    const valoresCurva = {};
    points.forEach(p => {
      valoresCurva[p] = parseFloat(data[`curva_${p}`]) || 0;
      delete data[`curva_${p}`]; // remove from main data object
    });
    
    data.tipoCurva = tipoCurva;   // Garante que tipoCurva seja sempre salvo corretamente
    data.valoresCurva = valoresCurva;
    data.peso = pesoInput;
    
    const fileInput = document.getElementById('metaAnexoRegra');
    const file = fileInput ? fileInput.files[0] : null;

    if (editId) {
      const oldMeta = DataStore.getMetaById(editId);
      if (oldMeta && oldMeta.anexoRegra) {
        data.anexoRegra = oldMeta.anexoRegra;
      }
    }

    if (file) {
      if (typeof GraphAPI !== 'undefined') {
        Components.toast('Fazendo upload do anexo da regra...', 'info');
        const safeMetaTitle = data.titulo.replace(/[^a-zA-Z0-9 _-]/g, '').trim() || 'RegraMeta';
        const extension = file.name.includes('.') ? file.name.split('.').pop() : '';
        const newFileName = `Regra_${safeMetaTitle}_${Date.now()}.${extension}`;
        
        try {
          const graphData = await GraphAPI.uploadFile(newFileName, file, 'RegrasMetas');
          data.anexoRegra = {
            nome: newFileName,
            url: graphData.webUrl || null,
            downloadUrl: graphData.downloadUrl || null,
            usuarioNome: Auth.getSession()?.nome || 'Admin',
            dataHora: new Date().toISOString()
          };
        } catch (err) {
           console.error("Erro no upload do anexo da regra", err);
           Components.toast('Erro no upload do anexo. Salvando meta sem o novo anexo.', 'error');
        }
      }
    }
    
    // Processar campos extras (Composição e Compartilhamento)
    if (data.tipo === 'composta') {
      const composicao = [];
      const rows = document.querySelectorAll('.composicao-row');
      rows.forEach((row, i) => {
        const metaId = row.querySelector('select').value;
        const peso = parseFloat(row.querySelector('input[type="number"]').value) || 0;
        if (metaId) composicao.push({ metaId, peso });
      });
      
      const totalPeso = composicao.reduce((s, c) => s + c.peso, 0);
      if (totalPeso !== 100 && composicao.length > 0) {
        Components.toast('A soma dos pesos da composição deve ser exatamente 100%!', 'error');
        return;
      }
      data.composicao = composicao;
      
      // Regra de Integridade: Zerar peso das metas filhas no sistema para evitar dupla contagem
      let metasStore = DataStore.get(DataStore.KEYS.METAS);
      let alterouFilhas = false;
      composicao.forEach(c => {
        const idx = metasStore.findIndex(x => x.id === c.metaId);
        if (idx !== -1 && metasStore[idx].peso !== 0) {
          metasStore[idx].peso = 0;
          alterouFilhas = true;
        }
      });
      if (alterouFilhas) {
        DataStore.set(DataStore.KEYS.METAS, metasStore);
        Components.toast('Pesos das metas individuais filhas foram ajustados para 0% para evitar duplicidade.', 'info');
      }
    } else if (data.tipo === 'compartilhada') {
      const checkboxes = document.querySelectorAll('input[name="coresponsavel"]:checked');
      data.coresponsavelIds = Array.from(checkboxes).map(cb => cb.value);
    }

    data.valorAlvo = valoresCurva['100'] || 0; 
    // We keep valorAtual as the accumulated R of the current month if existing
    
    if (editId) {
      const oldMeta = DataStore.getMetaById(editId);
      if (oldMeta) {
        data.mesesData = oldMeta.mesesData || [];
        data.valorAtual = oldMeta.valorAtual;
        if (oldMeta.composicao && !data.composicao) data.composicao = oldMeta.composicao;
        if (oldMeta.refMetaId && !data.refMetaId) data.refMetaId = oldMeta.refMetaId;
        if (oldMeta.refTipoOriginal && !data.refTipoOriginal) data.refTipoOriginal = oldMeta.refTipoOriginal;
        DataStore.recalcMesesData(data);
      }
      DataStore.update(DataStore.KEYS.METAS, editId, data);
      this.recalcParentMetas(editId); 
      this.syncResultToMirrors(editId); // Push curve and target value updates to all mirrors in Firebase
      Components.toast('Meta atualizada com sucesso!', 'success');
    } else {
      data.valorAtual = 0;
      // Usa o código da meta (ex: MET0100) como ID do documento no Firebase para facilitar a localização
      if (data.codigo && data.codigo.trim()) {
        data.id = data.codigo.trim().toUpperCase().replace(/\s+/g, '_');
        // Garante unicidade: se já existir uma meta com esse ID, adiciona sufixo
        const existing = DataStore.getMetas().find(m => m.id === data.id);
        if (existing) {
          data.id = data.id + '_' + Date.now().toString(36).substr(-4);
        }
      }
      const newMeta = DataStore.add(DataStore.KEYS.METAS, data);
      DataStore.recalcMesesData(newMeta);
      DataStore.update(DataStore.KEYS.METAS, newMeta.id, newMeta);
      Components.toast('Meta criada com sucesso!', 'success');
    }
    Components.closeModal();
    App.refreshPage();
    } catch (err) {
      console.error("Erro ao salvar meta:", err);
      Components.toast('Ocorreu um erro ao salvar a meta. Verifique os dados e tente novamente.', 'error');
    } finally {
      const submitBtn = document.querySelector('.modal-footer button.btn-primary');
      if (submitBtn) submitBtn.disabled = false;
    }
  },

  enableInlineEdit(metaId, mes, tdId, dataKey, field) {
    const td = document.getElementById(tdId);
    if (!td) return;
    const currentValue = td.dataset.value || '';
    const currentNa = td.dataset.na === 'true';
    
    // Use a temporary flag to prevent blur from saving when button is clicked
    window._isNaClick = false;

    td.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:6px; align-items:center;" onclick="event.stopPropagation()">
        <input type="text" id="inlineInput_${tdId}" class="form-input" style="width:70px; padding:4px; height:26px; font-size:0.8rem; text-align:center; background:var(--bg-2);" 
          value="${currentNa ? '' : currentValue}"
          placeholder="0,00"
          ${currentNa ? 'disabled style="background:var(--bg-3); opacity:0.5;"' : ''}
          onkeydown="if(event.key==='Enter') this.blur();"
          onblur="setTimeout(() => { if(!window._isNaClick) Metas.saveInlineResult('${metaId}', '${mes}', this.value, '${dataKey}', '${field}'); }, 150)">
        ${field === 'r' ? `
        <button type="button" class="btn btn-sm ${currentNa ? 'btn-primary' : 'btn-ghost'}" style="width:100%; font-size:0.7rem;" 
          onmousedown="window._isNaClick = true;"
          onclick="Metas.saveInlineResult('${metaId}', '${mes}', '${currentNa ? 'REMOVE_NA' : 'NA'}', '${dataKey}', '${field}')">
          ${currentNa ? 'Remover N/A' : 'N/A'}
        </button>` : ''}
      </div>
    `;
    
    const input = document.getElementById(`inlineInput_${tdId}`);
    if (input && !currentNa) input.focus();
  },

  cancelInlineEdit(metaId, mes, tdId, dataKey, field) {
    const td = document.getElementById(tdId);
    if (!td) return;
    const currentValue = td.dataset.value || '';
    const currentNa = td.dataset.na === 'true';
    
    td.innerHTML = `
      <div class="matrix-inline-edit" title="Editar Valor" onclick="Metas.enableInlineEdit('${metaId}', '${mes}', '${tdId}', '${dataKey}', '${field}')" style="display:flex; align-items:center; justify-content:center; gap:6px;">
        <span>${currentNa ? '<span style="color: var(--text-3); font-weight: 600;">N/A</span>' : (currentValue || '<span style="color: var(--text-3);">-</span>')}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </div>`;
  },

  saveInlineResult(metaId, mes, valueStr, dataKey, field) {
    const tdId = `cell_${metaId}_${dataKey}_${field}_${mes.replace(/\//g,'_')}`;
    const td = document.getElementById(tdId);
    
    if (valueStr === 'REMOVE_NA') {
      let metas = DataStore.getMetas();
      let m = metas.find(x => x.id === metaId);
      if (m && m.mesesData) {
        let monthObj = m.mesesData.find(x => x.mes === mes);
        if (monthObj && monthObj[dataKey]) {
          if (m.tipo === 'compartilhada' && m.refMetaId && field === 'r') {
            // Espelho: propaga para a origem → origem propaga para todos os espelhos
            this.syncResultToSource(m.refMetaId, mes, 'REMOVE_NA');
          } else {
            monthObj[dataKey].na = false;
            if (field === 'r') monthObj[dataKey].r = null;
            DataStore.recalcMesesData(m);
            DataStore.update(DataStore.KEYS.METAS, m.id, m);
            this.recalcParentMetas(metaId);
            // Propaga para todos os espelhos desta origem
            this.syncResultToMirrors(metaId, mes);
          }
          Components.toast('N/A removido.', 'info');
          App.refreshPage();
          setTimeout(() => Metas.openDetail(metaId), 100);
        }
      }
      return;
    }

    const isNA = valueStr.trim().toUpperCase() === 'NA';
    if (!valueStr.trim() && !isNA) {
      this.cancelInlineEdit(metaId, mes, tdId, dataKey, field);
      return;
    }

    if (isNA) {
      let metas = DataStore.getMetas();
      let m = metas.find(x => x.id === metaId);
      if (!m) return;

      if (m.tipo === 'compartilhada' && m.refMetaId && field === 'r') {
        // Espelho: propaga N/A para a origem → origem salva → origem propaga para TODOS os espelhos
        this.syncResultToSource(m.refMetaId, mes, 'NA');
      } else {
        // Origem: salva diretamente e propaga para todos os espelhos
        if (!m.mesesData) m.mesesData = [];
        let monthObj = m.mesesData.find(x => x.mes === mes);
        if (!monthObj) {
          monthObj = { mes, pontual: { p: null, r: null, d: null, nota: null, na: false }, acumulado: { p: null, r: null, d: null, nota: null }, anexos: [] };
          m.mesesData.push(monthObj);
        }
        if (!monthObj[dataKey]) monthObj[dataKey] = { p: null, r: null, d: null, nota: null, na: false };
        if (field === 'r') {
          monthObj[dataKey].r = null;
          monthObj[dataKey].na = true;
        }
        DataStore.recalcMesesData(m);
        DataStore.update(DataStore.KEYS.METAS, m.id, m);
        this.recalcParentMetas(metaId);
        // Propaga para todos os espelhos desta origem
        this.syncResultToMirrors(metaId, mes);
      }

      Components.toast('Apontamento salvo como N/A.', 'success');
      App.refreshPage();
      setTimeout(() => Metas.openDetail(metaId), 100);
      return;
    }
    
    let valStr = valueStr.replace(/\./g, '').replace(',', '.');
    const val = parseFloat(valStr);
    if (isNaN(val)) {
      Components.toast('Valor inválido!', 'error');
      this.cancelInlineEdit(metaId, mes, tdId, dataKey, field);
      return;
    }
    
    let metas = DataStore.getMetas();
    let m = metas.find(x => x.id === metaId);
    if (!m) return;
    if (!m.mesesData) m.mesesData = [];
    let monthObj = m.mesesData.find(x => x.mes === mes);
    if (!monthObj) {
      monthObj = { mes, pontual: { p: null, r: null, d: null, nota: null, na: false }, acumulado: { p: null, r: null, d: null, nota: null }, anexos: [] };
      m.mesesData.push(monthObj);
    }
    if (!monthObj[dataKey]) monthObj[dataKey] = { p: null, r: null, d: null, nota: null, na: false };
    monthObj[dataKey][field] = val;
    if (field === 'r') monthObj[dataKey].na = false;

    DataStore.recalcMesesData(m);
    DataStore.update(DataStore.KEYS.METAS, m.id, m);
    this.recalcParentMetas(metaId);

    // Sincronizar se for compartilhada: propaga para origem → origem propaga para todos os espelhos
    if (m.tipo === 'compartilhada' && m.refMetaId && field === 'r') {
       this.syncResultToSource(m.refMetaId, mes, valueStr);
    } else if (field === 'r') {
      // Origem: propaga resultado para todos os espelhos
      this.syncResultToMirrors(metaId, mes);
    }

    Components.toast('Valor salvo com sucesso.', 'success');
    App.refreshPage();
    setTimeout(() => Metas.openDetail(metaId), 100);
  },

  recalcParentMetas(childId) {
    let metas = DataStore.getMetas();
    metas.forEach(m => {
      if (m.tipo === 'composta' && Array.isArray(m.composicao)) {
        if (m.composicao.some(c => c.metaId === childId)) {
          DataStore.recalcMesesData(m);
          DataStore.update(DataStore.KEYS.METAS, m.id, m);
        }
      }
    });
  },

  syncResultToSource(sourceId, mes, valueStr) {
     let metas = DataStore.getMetas();
     const sourceIdx = metas.findIndex(x => String(x.id) === String(sourceId));
     if (sourceIdx !== -1) {
        const m = metas[sourceIdx];
        let monthObj = m.mesesData ? m.mesesData.find(d => d.mes === mes) : null;
        if (!monthObj) {
           if (!m.mesesData) m.mesesData = [];
           monthObj = { mes, pontual: { p: null, r: null, d: null, nota: null, na: false }, acumulado: { p: null, r: null, d: null, nota: null }, anexos: [] };
           m.mesesData.push(monthObj);
        }
        
        if (valueStr === null || valueStr === 'NA') {
           monthObj.pontual.na = true;
           monthObj.pontual.r = null;
           } else if (valueStr === 'REMOVE_NA') {
              monthObj.pontual.na = false;
              monthObj.pontual.r = null;
           } else {
              monthObj.pontual.r = parseFloat(String(valueStr).replace(',', '.'));
              monthObj.pontual.na = false;
           }
           DataStore.recalcMesesData(m);
           DataStore.update(DataStore.KEYS.METAS, m.id, m);
           // Recalcula hierarquia de metas compostas
           this.recalcParentMetas(sourceId);
           // Propaga o dado atualizado da origem para TODOS os espelhos
           this.syncResultToMirrors(sourceId, mes);
     }
  },

  syncResultToMirrors(sourceId, mes) {
     // Encontra todos os espelhos que referenciam esta origem
     let metas = DataStore.getMetas();
     const mirrors = metas.filter(x => x.tipo === 'compartilhada' && String(x.refMetaId) === String(sourceId));
     mirrors.forEach(mirror => {
        if (!mirror.mesesData) return;
        // recalcMesesData para espelhos copia automaticamente todos os dados da origem
        DataStore.recalcMesesData(mirror);
        DataStore.update(DataStore.KEYS.METAS, mirror.id, mirror);
     });
  },

  openAnexoForm(metaId, mes) {
    Components.closeModal();
    
    const meta = DataStore.getMetaById(metaId);
    let currentAnexos = [];
    if (meta && meta.mesesData) {
      const monthObj = meta.mesesData.find(x => x.mes === mes);
      if (monthObj && monthObj.anexos) {
        currentAnexos = monthObj.anexos;
      }
    }

    const session = Auth.getSession();
    const isAdmin = session?.nivel === 'Admin';
    const isOwner = session?.id === meta?.responsavelId;

    let listHtml = '';
    if (currentAnexos.length > 0) {
      listHtml = `
        <div style="margin-bottom: 20px;">
          <div style="font-size: 0.75rem; color: var(--text-3); font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">Evidências Anexadas</div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${currentAnexos.map((anexo, aIdx) => `
              <div style="display:flex; flex-direction:column; background:var(--bg-3); padding:12px; border-radius:var(--radius-sm); border: 1px solid rgba(255,255,255,0.05); gap: 8px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span style="font-size:0.85rem; color:var(--text-1); font-weight:500; word-break:break-all;">📎 ${anexo.nome}</span>
                  <div style="display:flex; gap:6px;">
                    ${anexo.url ? `<a href="${anexo.url}" target="_blank" class="btn btn-ghost btn-sm" style="padding:4px 8px; font-size:0.75rem; color:var(--primary); text-decoration:none; background:rgba(46, 134, 77, 0.1);">👁️ Visualizar</a>` : ''}
                    ${anexo.downloadUrl ? `<a href="${anexo.downloadUrl}" target="_blank" class="btn btn-ghost btn-sm" style="padding:4px 8px; font-size:0.75rem; color:var(--text-2); text-decoration:none; background:var(--bg-2);">⬇️ Baixar</a>` : ''}
                    ${(isAdmin || isOwner) ? `<button type="button" class="btn btn-ghost btn-sm" style="padding:4px 8px; font-size:0.75rem; color:var(--danger); background:rgba(255, 81, 68, 0.1);" onclick="Metas.deleteAnexo('${metaId}', '${mes}', ${aIdx})">Excluir</button>` : ''}
                  </div>
                </div>
                <div style="display:flex; gap:12px; font-size:0.7rem; color:var(--text-3);">
                  <span>👤 ${anexo.usuarioNome || 'Não registrado'}</span>
                  <span>🕒 ${new Date(anexo.dataHora || anexo.data || Date.now()).toLocaleString('pt-BR')}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>`;
    } else {
      listHtml = `<p style="font-size:0.8rem; color:var(--text-3); margin-bottom:20px;">Nenhuma evidência anexada para este mês.</p>`;
    }

    const content = `
      ${listHtml}
      <form id="anexoForm" onsubmit="Metas.saveAnexo(event, '${metaId}', '${mes}')">
        <div class="form-group form-full">
          <label class="form-label">Adicionar Nova Evidência *</label>
          <div style="border: 2px dashed rgba(255,255,255,0.2); padding: 20px; text-align: center; border-radius: var(--radius-sm); margin-bottom: 12px; cursor: pointer;" onclick="document.getElementById('fileInput').click()">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" style="margin-bottom: 8px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <div style="font-size: 0.85rem; color: var(--text-2);">Clique para procurar ou arraste o arquivo</div>
          </div>
          <input type="file" id="fileInput" name="arquivo" style="display:none;" onchange="document.getElementById('fileName').textContent = this.files[0]?.name || ''">
          <div id="fileName" style="font-size: 0.8rem; color: var(--success); font-weight: 600; text-align: center;"></div>
        </div>
        <div class="form-group form-full">
          <label class="form-label">Descrição / Observação</label>
          <textarea class="form-input form-textarea" name="descricao" rows="2" placeholder="Opcional..."></textarea>
        </div>
      </form>`;
      
    const footer = `
      <button class="btn btn-ghost" onclick="Metas.openDetail('${metaId}')">Voltar</button>
      <button class="btn btn-primary" onclick="document.getElementById('anexoForm').requestSubmit()">Salvar Anexo</button>`;
      
    setTimeout(() => Components.openModal(`Evidências — ${mes}`, content, footer), 350);
  },

  async saveAnexo(e, metaId, mes) {
    e.preventDefault();
    const file = document.getElementById('fileInput').files[0];
    if (!file) {
      Components.toast('Selecione um arquivo de evidência!', 'error');
      return;
    }
    const fileName = file.name;
    const session = Auth.getSession() || {};
    
    let metas = DataStore.getMetas();
    let m = metas.find(x => x.id === metaId);
    
    // GATILHO: Se for meta compartilhada, salvar o anexo na meta de ORIGEM
    if (m && m.tipo === 'compartilhada' && m.refMetaId) {
      m = metas.find(x => x.id === m.refMetaId);
      metaId = m.id; // Atualiza ID para redirecionar no final
    }

    if (!m) return;

    // Indicador de progresso
    Components.toast('Fazendo upload da evidência para o SharePoint...', 'info');

    const proceedWithSave = (fileData, finalFileName) => {
      if (m.mesesData) {
        let monthObj = m.mesesData.find(x => x.mes === mes);
        if (monthObj) {
           if (!monthObj.anexos) monthObj.anexos = [];
           monthObj.anexos.push({ 
             nome: finalFileName, 
             url: fileData.webUrl || null, 
             downloadUrl: fileData.downloadUrl || null,
             usuarioNome: session.nome || session.id || 'Usuário Desconhecido',
             dataHora: new Date().toISOString() 
           });
        }
      }
      
      DataStore.set(DataStore.KEYS.METAS, metas);
      Components.toast('Evidência salva com sucesso.', 'success');
      Components.closeModal();
      App.refreshPage();
      setTimeout(() => Metas.openAnexoForm(metaId, mes), 350);
    };

    if (typeof GraphAPI !== 'undefined') {
      try {
        const mesesMap = {
          'JAN': '01', 'FEV': '02', 'MAR': '03', 'ABR': '04', 'MAI': '05', 'JUN': '06',
          'JUL': '07', 'AGO': '08', 'SET': '09', 'OUT': '10', 'NOV': '11', 'DEZ': '12'
        };
        const mesKey = mes.split('/')[0].toUpperCase();
        const numMes = mesesMap[mesKey] || mesKey;
        
        const extension = fileName.includes('.') ? fileName.split('.').pop() : '';
        const extStr = extension ? `.${extension}` : '';
        
        const monthObj = m.mesesData ? m.mesesData.find(x => x.mes === mes) : null;
        const anexosCount = monthObj && monthObj.anexos ? monthObj.anexos.length : 0;
        
        // Renomeia o arquivo para o número do mês (01.pdf). Se houver múltiplos, adiciona sufixo (01_2.pdf)
        const newFileName = anexosCount === 0 ? `${numMes}${extStr}` : `${numMes}_${anexosCount + 1}${extStr}`;
        
        // Pasta baseada no nome da meta (removendo caracteres especiais que podem quebrar a URL do SharePoint)
        const safeMetaTitle = m.titulo.replace(/[^a-zA-Z0-9 _-]/g, '').trim() || 'Evidencias';

        const graphData = await GraphAPI.uploadFile(newFileName, file, safeMetaTitle);
        proceedWithSave(graphData, newFileName);
      } catch (error) {
        console.error("Erro no upload do Graph API:", error);
        Components.toast(`Erro: ${error.message}`, 'error');
      }
    } else {
      Components.toast('Módulo do SharePoint (Graph API) não encontrado!', 'error');
    }
  },

  deleteAnexo(metaId, mes, index) {
    let metas = DataStore.getMetas();
    let m = metas.find(x => x.id === metaId);
    
    if (m && m.tipo === 'compartilhada' && m.refMetaId) {
      m = metas.find(x => x.id === m.refMetaId);
      metaId = m.id;
    }

    if (m && m.mesesData) {
      let monthObj = m.mesesData.find(x => x.mes === mes);
      if (monthObj && monthObj.anexos) {
        monthObj.anexos.splice(index, 1);
      }
    }
    
    DataStore.set(DataStore.KEYS.METAS, metas);
    Components.toast('Evidência excluída com sucesso.', 'info');
    Components.closeModal();
    App.refreshPage();
    setTimeout(() => Metas.openAnexoForm(metaId, mes), 350);
  },

  viewAnexosOnly(metaId, mes) {
    Components.closeModal();
    const meta = DataStore.getMetaById(metaId);
    let currentAnexos = [];
    if (meta && meta.mesesData) {
      const monthObj = meta.mesesData.find(x => x.mes === mes);
      if (monthObj && monthObj.anexos) {
        currentAnexos = monthObj.anexos;
      }
    }

    let listHtml = '';
    if (currentAnexos.length > 0) {
      listHtml = `
        <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px;">
          ${currentAnexos.map(anexo => `
            <div style="display:flex; flex-direction:column; background:var(--bg-3); padding:12px; border-radius:var(--radius-sm); border: 1px solid rgba(255,255,255,0.05); gap: 8px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:0.85rem; color:var(--text-1); font-weight:500; word-break:break-all;">📎 ${anexo.nome}</span>
                <div style="display:flex; gap:6px;">
                  ${anexo.url ? `<a href="${anexo.url}" target="_blank" class="btn btn-ghost btn-sm" style="padding:4px 8px; font-size:0.75rem; color:var(--primary); text-decoration:none; background:rgba(46, 134, 77, 0.1);">👁️ Visualizar</a>` : ''}
                  ${anexo.downloadUrl ? `<a href="${anexo.downloadUrl}" target="_blank" class="btn btn-ghost btn-sm" style="padding:4px 8px; font-size:0.75rem; color:var(--text-2); text-decoration:none; background:var(--bg-2);">⬇️ Baixar</a>` : ''}
                </div>
              </div>
              <div style="display:flex; gap:12px; font-size:0.7rem; color:var(--text-3);">
                <span>👤 ${anexo.usuarioNome || 'Não registrado'}</span>
                <span>🕒 ${new Date(anexo.dataHora || anexo.data || Date.now()).toLocaleString('pt-BR')}</span>
              </div>
            </div>
          `).join('')}
        </div>`;
    } else {
      listHtml = `<p style="font-size:0.85rem; color:var(--text-3); text-align:center; padding:12px 0;">Nenhuma evidência anexada para este mês.</p>`;
    }

    const footer = `<button class="btn btn-primary" onclick="Metas.openDetail('${metaId}')">Voltar</button>`;
    setTimeout(() => Components.openModal(`Evidências — ${mes}`, listHtml, footer), 350);
  },

  confirmDelete(id) {
    const content = `<p style="color:var(--text-secondary);font-size:0.95rem;line-height:1.6">Deseja excluir essa meta?</p>`;
    const footer = `
      <button class="btn btn-ghost" onclick="Metas.openForm('${id}')">Não</button>
      <button class="btn btn-danger" onclick="Metas.executeDelete('${id}')">Sim</button>`;
    Components.openModal('Confirmação', content, footer);
  },

  executeDelete(id) {
    DataStore.remove(DataStore.KEYS.METAS, id);
    Components.toast('Meta excluída com sucesso', 'success');
    Components.closeModal();
    App.refreshPage();
  },

  openAcaoForm(metaId, acaoId = null) {
    const users = DataStore.getUsers();
    const acao = acaoId ? DataStore.getById(DataStore.KEYS.ACOES, acaoId) : null;
    const session = Auth.getSession() || {};
    const isAdmin = session.id === 'admin' || session.nivel === 'Admin';
    const isEdit = !!acao;
    
    // Regular users can only edit attachment if they are editing
    const disableFields = isEdit && !isAdmin;

    const content = `
      <form id="acaoForm" onsubmit="Metas.saveAcao(event, '${metaId}', '${acaoId || ''}')">
        <div class="form-grid">
          <div class="form-group form-full">
            <label class="form-label">Causa *</label>
            <input class="form-input" name="titulo" required placeholder="Descreva a causa da ação" value="${acao ? acao.titulo : ''}" ${disableFields ? 'disabled' : ''}>
          </div>
          <div class="form-group form-full">
            <label class="form-label">Descrição</label>
            <textarea class="form-input form-textarea" name="descricao" rows="2" placeholder="Descreva a ação..." ${disableFields ? 'disabled' : ''}>${acao ? (acao.descricao || '') : ''}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Responsável</label>
            <select class="form-input" name="responsavelId" ${disableFields ? 'disabled' : ''}>
              <option value="">Selecione...</option>
              ${users.map(u => `<option value="${u.id}" ${acao && acao.responsavelId === u.id ? 'selected' : ''}>${u.nome}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Prazo</label>
            <input class="form-input" type="date" name="prazo" value="${acao && acao.prazo ? acao.prazo : ''}" ${disableFields ? 'disabled' : ''}>
          </div>
          <div class="form-group form-full">
            <label class="form-label">Anexo</label>
            ${acao && acao.anexo && acao.anexo.nome ? `
              <div style="margin-bottom: 8px; font-size: 0.8rem; background: var(--bg-3); padding: 8px; border-radius: 4px;">
                <strong>Anexo atual:</strong> ${acao.anexo.url ? `<a href="${acao.anexo.url}" target="_blank">${acao.anexo.nome}</a>` : acao.anexo.nome}
                ${acao.anexo.usuarioNome ? `<div style="font-size: 0.7rem; color: var(--text-3); margin-top: 4px;">Anexado por ${acao.anexo.usuarioNome} em ${new Date(acao.anexo.dataHora || acao.anexo.data).toLocaleString('pt-BR')}</div>` : ''}
              </div>
            ` : ''}
            <div style="border: 2px dashed rgba(255,255,255,0.2); padding: 20px; text-align: center; border-radius: var(--radius-sm); cursor: pointer;" onclick="document.getElementById('acaoFileInput').click()">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" style="margin-bottom: 8px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <div style="font-size: 0.85rem; color: var(--text-2);">${acao && acao.anexo && acao.anexo.nome ? 'Clique para substituir o arquivo' : 'Clique para anexar arquivo'}</div>
            </div>
            <input type="file" id="acaoFileInput" name="arquivo" style="display:none;" onchange="document.getElementById('acaoFileName').textContent = this.files[0]?.name || ''">
            <div id="acaoFileName" style="font-size: 0.8rem; color: var(--success); font-weight: 600; text-align: center; margin-top: 4px;"></div>
          </div>
          ${isEdit ? `
          <div class="form-group form-full">
            <label class="form-label" style="font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-3);">Detalhes</label>
            <div style="background: var(--bg-3); border-radius: var(--radius-xs); padding: 12px 14px; display: flex; flex-direction: column; gap: 6px; border: 1px solid rgba(255,255,255,0.06);">
              <div style="display: flex; align-items: center; gap: 8px; font-size: 0.78rem;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <span style="color: var(--text-3);">Criado por:</span>
                <span style="color: var(--text-1); font-weight: 600;">${acao && acao.criadoPorNome ? acao.criadoPorNome : 'Não informado'}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 8px; font-size: 0.78rem;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <span style="color: var(--text-3);">Criado em:</span>
                <span style="color: var(--text-1);">${acao && acao.criadoEm ? new Date(acao.criadoEm).toLocaleString('pt-BR', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) : 'Não informado'}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 8px; font-size: 0.78rem;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                <span style="color: var(--text-3);">Última atualização:</span>
                <span style="color: var(--text-1);">${acao && acao.atualizadoEm ? new Date(acao.atualizadoEm).toLocaleString('pt-BR', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) : 'Não informado'}</span>
              </div>
            </div>
          </div>` : ''}
        </div>
      </form>`;

    const footer = `
      <button class="btn btn-ghost" onclick="Metas.openDetail('${metaId}')">Cancelar</button>
      ${isEdit && isAdmin ? `<button class="btn btn-danger" onclick="Metas.deleteAcao('${acaoId}', '${metaId}')">Excluir</button>` : ''}
      <button class="btn btn-primary" onclick="document.getElementById('acaoForm').requestSubmit()">${isEdit ? 'Salvar Alterações' : 'Criar Ação'}</button>`;

    Components.closeModal();
    setTimeout(() => Components.openModal(isEdit ? 'Editar Ação' : 'Nova Ação', content, footer), 350);
  },

  saveAcao(e, metaId, acaoId) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    const isEdit = !!acaoId;
    let acao = isEdit ? { ...DataStore.getById(DataStore.KEYS.ACOES, acaoId) } : {};
    
    const session = Auth.getSession() || {};
    const isAdmin = session.id === 'admin' || session.nivel === 'Admin';
    
    // GATILHO: Se for meta compartilhada, salvar a ação na meta de ORIGEM
    const meta = DataStore.getMetaById(metaId);
    const targetMetaId = (meta && meta.tipo === 'compartilhada' && meta.refMetaId) ? meta.refMetaId : metaId;

    if (!isEdit || isAdmin) {
      acao.titulo = data.titulo;
      acao.descricao = data.descricao;
      acao.responsavelId = data.responsavelId;
      acao.prazo = data.prazo;
    }

    if (!isEdit) {
      acao.metaId = targetMetaId;
      acao.status = 'nao_iniciada';
      acao.progresso = 0;
      acao.criadoEm = new Date().toISOString();
      acao.criadoPorId = session.id;
      acao.criadoPorNome = session.nome || session.id;
    }
    acao.atualizadoEm = new Date().toISOString();
    
    // Handle file attachment
    const file = document.getElementById('acaoFileInput').files[0];
    
    const proceedSaveAcao = (fileData) => {
      if (fileData) {
        acao.anexo = { 
          nome: fileData.nome, 
          url: fileData.url || null, 
          data: new Date().toISOString(),
          dataHora: new Date().toISOString(),
          usuarioId: session.id,
          usuarioNome: session.nome
        };
      }
      
      if (isEdit) {
        DataStore.update(DataStore.KEYS.ACOES, acaoId, acao);
        Components.toast('Ação atualizada com sucesso!', 'success');
      } else {
        DataStore.add(DataStore.KEYS.ACOES, acao);
        Components.toast('Ação criada com sucesso!', 'success');
      }
      Components.closeModal();
      setTimeout(() => Metas.openDetail(metaId), 350);
    };

    if (file) {
      Components.toast('Subindo anexo da ação para a nuvem...', 'info');
      if (isFirebaseActive && storage) {
        const storageRef = storage.ref(`acoes/${targetMetaId}_${Date.now()}_${file.name}`);
        const uploadTask = storageRef.put(file);
        uploadTask.on('state_changed', null, 
          (error) => {
            console.error("Erro no upload do Firebase Storage:", error);
            Components.toast('Falha ao subir arquivo. Salvando apenas offline.', 'warning');
            proceedSaveAcao({ nome: file.name, url: null });
          }, 
          () => {
            uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
              proceedSaveAcao({ nome: file.name, url: downloadURL });
            });
          }
        );
      } else {
        proceedSaveAcao({ nome: file.name, url: null });
      }
    } else {
      proceedSaveAcao(null);
    }
  },

  updateAcaoProgress(acaoId, metaId, progresso) {
    const acao = DataStore.get(DataStore.KEYS.ACOES, acaoId);
    if (acao) {
      const newProgress = parseInt(progresso, 10);
      acao.progresso = newProgress;
      acao.atualizadoEm = new Date().toISOString();
      DataStore.update(DataStore.KEYS.ACOES, acaoId, acao);
      
      let statusAuto = 'nao_iniciada';
      if (newProgress === 100) statusAuto = 'concluida';
      else if (newProgress > 0) statusAuto = 'em_andamento';
      else if (acao.prazo && new Date() > new Date(acao.prazo)) statusAuto = 'atrasada';

      const statusEl = document.getElementById(`acao-status-${acaoId}`);
      const percentEl = document.getElementById(`acao-percent-${acaoId}`);
      if (statusEl) statusEl.innerHTML = Components.badge(statusAuto, statusAuto);
      if (percentEl) percentEl.textContent = `${newProgress}%`;
      Components.toast('Progresso atualizado!', 'success');
    }
  },

  deleteAcao(acaoId, metaId) {
    DataStore.remove(DataStore.KEYS.ACOES, acaoId);
    Components.toast('Ação excluída.', 'info');
    Components.closeModal();
    setTimeout(() => Metas.openDetail(metaId), 350);
  }
};

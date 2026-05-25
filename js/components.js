// ============================================
// COMPONENTS.JS — Componentes reutilizáveis
// ============================================

const Components = {
  renderSidebar(activeRoute) {
    const session = Auth.getSession() || {};
    const isAdmin = session.id === 'admin' || session.nivel === 'Admin';
    
    let menuItems = [
      { id: 'dashboard', icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`, label: 'Dashboard' },
      { id: 'metas', icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`, label: 'Metas' }
    ];
    
    if (isAdmin) {
      menuItems.push({ id: 'remuneracao', icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`, label: 'Remuneração Variável' });
      menuItems.push({ id: 'relatorios', icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`, label: 'Relatórios' });
      menuItems.push({ id: 'configuracoes', icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`, label: 'Configurações' });
    }

    return `
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-brand">
          <div class="sidebar-logo">
            <img src="img/logo.png" style="width: 44px; height: 44px; object-fit: contain;" alt="Moura Leite Logo">
          </div>
          <span class="sidebar-brand-text">ML Metas</span>
        </div>
        <nav class="sidebar-nav">
          ${menuItems.map(item => `
            <a href="#${item.id}" class="sidebar-link ${activeRoute === item.id ? 'active' : ''}" data-route="${item.id}">
              <span class="sidebar-icon">${item.icon}</span>
              <span class="sidebar-label">${item.label}</span>
            </a>
          `).join('')}
        </nav>
        <div class="sidebar-footer">
          <button class="sidebar-link" id="btn-logout" onclick="Auth.logout()">
            <span class="sidebar-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></span>
            <span class="sidebar-label">Sair</span>
          </button>
        </div>
      </aside>`;
  },

  renderHeader(title, subtitle, showSearch = false) {
    let session = {};
    try {
      session = JSON.parse(localStorage.getItem('mp_session') || '{}');
    } catch (error) {
      session = {};
    }
    const userName = session.nome || 'Usuário';
    const avatar = session.avatar || 'U';
    return `
      <header class="main-header">
        <div class="header-left">
          <button class="sidebar-toggle" id="sidebarToggle" onclick="Components.toggleSidebar()">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <div class="header-title-group">
            <h1 class="header-title">${title}</h1>
            ${subtitle ? `<p class="header-subtitle">${subtitle}</p>` : ''}
          </div>
        </div>
        <div class="header-right">
          ${showSearch ? `
          <div class="header-search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Buscar..." class="search-input" id="globalSearch">
          </div>` : ''}
          <div class="header-profile">
            <div class="avatar">${avatar}</div>
            <span class="profile-name">${userName}</span>
          </div>
        </div>
      </header>`;
  },

  toggleSidebar() {
    document.querySelector('.app-layout')?.classList.toggle('sidebar-collapsed');
  },

  // KPI Card
  kpiCard(title, value, subtitle, icon, color = 'primary') {
    return `
      <div class="kpi-card kpi-${color}">
        <div class="kpi-icon-wrap">
          <div class="kpi-icon">${icon}</div>
        </div>
        <div class="kpi-content">
          <span class="kpi-value">${value}</span>
          <span class="kpi-title">${title}</span>
          ${subtitle ? `<span class="kpi-subtitle">${subtitle}</span>` : ''}
        </div>
      </div>`;
  },

  // Progress Bar with minimum marker (red line at targetMin %)
  // O label de mínimo NÃO é renderizado aqui — fica fora, abaixo de todos os gatilhos.
  progressBarWithMin(percent, targetMin = 80, color = '#F5883A', height = 8, showLabel = true) {
    const p = Math.min(150, Math.max(0, percent));
    const displayP = Math.min(100, p);
    let barColor = color;
    if (color === 'auto') {
      if (p >= 100) barColor = '#2E864D';
      else if (p >= 80) barColor = '#F5883A';
      else if (p >= 60) barColor = '#F9C094';
      else barColor = '#FF5144';
    }
    // Position of the minimum marker (clamped to 0-100%)
    const markerPos = Math.min(100, Math.max(0, targetMin));
    return `
      <div class="progress-wrap" style="display:flex;align-items:center;gap:10px;">
        <div style="flex:1;position:relative;">
          <div class="progress-bar" style="height:${height}px;position:relative;">
            <div class="progress-fill" style="width:${displayP}%;background:${barColor}" data-width="${displayP}"></div>
            <div style="position:absolute;top:-3px;left:${markerPos}%;transform:translateX(-50%);width:2px;height:${height + 6}px;background:#FF5144;border-radius:2px;z-index:2;" title="Mínimo: ${targetMin}%"></div>
          </div>
        </div>
        ${showLabel ? `<span class="progress-label" style="color:${barColor};font-size:0.8rem;font-weight:700;min-width:40px;text-align:right;white-space:nowrap;">${this.formatNumber(p)}%</span>` : ''}
      </div>`;
  },

  // Progress Bar
  progressBar(percent, color = '#F5883A', height = 8, showLabel = true) {
    const p = Math.min(150, Math.max(0, percent));
    const displayP = Math.min(100, p);
    let barColor = color;
    if (color === 'auto') {
      if (p >= 100) barColor = '#2E864D';
      else if (p >= 80) barColor = '#F5883A';
      else if (p >= 60) barColor = '#F9C094';
      else barColor = '#FF5144';
    }
    return `
      <div class="progress-wrap">
        <div class="progress-bar" style="height:${height}px">
          <div class="progress-fill" style="width:${displayP}%;background:${barColor}" data-width="${displayP}"></div>
        </div>
        ${showLabel ? `<span class="progress-label" style="color:${barColor}">${this.formatNumber(p)}%</span>` : ''}
      </div>`;
  },

  // Donut Chart (SVG)
  donutChart(percent, size = 120, strokeWidth = 12, color = '#F5883A') {
    const r = (size - strokeWidth) / 2;
    const circ = 2 * Math.PI * r;
    const p = Math.min(100, Math.max(0, percent));
    const offset = circ - (p / 100) * circ;
    let fillColor = color;
    if (color === 'auto') {
      if (p >= 100) fillColor = '#2E864D';
      else if (p >= 80) fillColor = '#F5883A';
      else if (p >= 60) fillColor = '#F9C094';
      else fillColor = '#FF5144';
    }
    return `
      <div class="donut-chart" style="width:${size}px;height:${size}px">
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
          <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="${strokeWidth}"/>
          <circle class="donut-fill" cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${fillColor}" stroke-width="${strokeWidth}" stroke-linecap="round"
            stroke-dasharray="${circ}" stroke-dashoffset="${offset}" transform="rotate(-90 ${size/2} ${size/2})"
            style="transition: stroke-dashoffset 1.2s ease-out"/>
        </svg>
        <div class="donut-label">
          <span class="donut-value">${this.formatNumber(p)}%</span>
        </div>
      </div>`;
  },

  // Status Badge
  badge(text, type = 'default') {
    const classes = { em_andamento: 'badge-warning', concluida: 'badge-success', atrasada: 'badge-danger', nao_iniciada: 'badge-neutral', pago: 'badge-success', nao_elegivel: 'badge-danger', default: 'badge-neutral' };
    const labels = { em_andamento: 'Em Andamento', concluida: 'Concluída', atrasada: 'Atrasada', nao_iniciada: 'Não Iniciada', pago: 'Pago', nao_elegivel: 'Não Elegível' };
    return `<span class="badge ${classes[type] || classes.default}">${labels[type] || text}</span>`;
  },

  // Modal
  openModal(title, content, footerHtml = '') {
    const existing = document.getElementById('app-modal');
    if (existing) existing.remove();
    const modal = document.createElement('div');
    modal.id = 'app-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-container">
        <div class="modal-header">
          <h2 class="modal-title">${title}</h2>
          <button class="modal-close" onclick="Components.closeModal()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body">${content}</div>
        ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ''}
      </div>`;
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('active'));
    modal.addEventListener('click', e => { if (e.target === modal) Components.closeModal(); });
  },

  closeModal() {
    const modal = document.getElementById('app-modal');
    if (modal) { modal.classList.remove('active'); setTimeout(() => modal.remove(), 300); }
  },

  // Toast Notification
  toast(message, type = 'info', duration = 3000) {
    let container = document.getElementById('toast-container');
    if (!container) { container = document.createElement('div'); container.id = 'toast-container'; container.className = 'toast-container'; document.body.appendChild(container); }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = {
      success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
      error: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };
    toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span class="toast-msg">${message}</span>`;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, duration);
  },

  // Confirm dialog
  confirm(message, onConfirm) {
    const content = `<p style="color:var(--text-secondary);font-size:0.95rem;line-height:1.6">${message}</p>`;
    const footer = `
      <button class="btn btn-ghost" onclick="Components.closeModal()">Cancelar</button>
      <button class="btn btn-danger" id="confirmBtn">Confirmar</button>`;
    this.openModal('Confirmação', content, footer);
    setTimeout(() => {
      document.getElementById('confirmBtn')?.addEventListener('click', () => { Components.closeModal(); onConfirm(); });
    }, 50);
  },

  // Bar chart (simple SVG)
  barChart(data, width = 500, height = 200) {
    if (!data || data.length === 0) return '<p class="text-muted">Sem dados</p>';
    const maxVal = Math.max(...data.map(d => d.valor)) || 1;
    const barW = Math.min(36, (width - 40) / data.length - 4);
    const chartH = height - 40;
    return `
      <div class="bar-chart-wrap" style="width:100%;overflow-x:auto">
        <svg width="${Math.max(width, data.length * (barW + 8) + 40)}" height="${height}" class="bar-chart">
          <line x1="30" y1="${chartH}" x2="${Math.max(width, data.length * (barW + 8) + 40) - 10}" y2="${chartH}" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
          ${data.map((d, i) => {
            const bh = (d.valor / maxVal) * (chartH - 10);
            const x = 35 + i * (barW + 8);
            const color = d.color || '#F5883A';
            return `
              <rect x="${x}" y="${chartH - bh}" width="${barW}" height="${bh}" rx="4" fill="${color}" opacity="0.85" class="bar-animate">
                <title>${d.label}: ${d.valor}</title>
              </rect>
              <text x="${x + barW/2}" y="${chartH + 16}" fill="#9ca3af" font-size="10" text-anchor="middle">${d.label}</text>`;
          }).join('')}
        </svg>
      </div>`;
  },

  // Format currency
  formatCurrency(val) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  },

  formatNumber(val) {
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(val);
  },

  // Empty state
  emptyState(message, icon = '') {
    return `
      <div class="empty-state">
        <div class="empty-icon">${icon || '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>'}</div>
        <p class="empty-text">${message}</p>
      </div>`;
  },

  // Animate progress bars after render
  animateProgressBars() {
    setTimeout(() => {
      document.querySelectorAll('.progress-fill').forEach(el => {
        const w = el.getAttribute('data-width');
        el.style.width = '0%';
        requestAnimationFrame(() => { el.style.width = w + '%'; });
      });
    }, 100);
  },

  // === Hierarchical Area Tree Components ===
  treeSelector(selectedId, onSelectName) {
    const authorizedTree = DataStore.getAuthorizedAreaTree();
    const currentArea = DataStore.getAreaById(selectedId);
    const label = currentArea ? `${currentArea.codigo} - ${currentArea.nome}` : (selectedId === 'todas' || selectedId === 'all' ? 'Todas as Áreas' : 'Selecione uma área');

    return `
      <div class="tree-dropdown-wrap" id="tree-selector-wrap">
        <div class="tree-dropdown-trigger" onclick="Components.toggleTreeSelector()">
          <span>${label}</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="tree-dropdown-content" id="tree-content">
          <div class="tree-search-wrap">
            <input type="text" class="form-input" placeholder="Pesquisar áreas..." oninput="Components.filterTreeNodes(this.value)">
          </div>
          <div class="tree-container">
            ${this.renderTreeNodes(authorizedTree, selectedId, onSelectName)}
          </div>
        </div>
      </div>
    `;
  },

  renderTreeNodes(nodes, selectedId, onSelectName) {
    return nodes.map(node => {
      const hasChildren = node.children && node.children.length > 0;
      const isActive = String(node.id) === String(selectedId);
      
      return `
        <div class="tree-node" data-node-id="${node.id}">
          <div class="tree-row ${isActive ? 'active' : ''}">
            <div class="tree-toggle ${!hasChildren ? 'empty' : ''}" onclick="Components.toggleTreeNode(event, '${node.id}')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
            <div class="tree-item" onclick="${onSelectName}('${node.id}'); Components.toggleTreeSelector(false)">
              <span class="tree-label">${node.codigo} - ${node.nome}</span>
            </div>
          </div>
          ${hasChildren ? `
            <div class="tree-children">
              ${this.renderTreeNodes(node.children, selectedId, onSelectName)}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  },

  toggleTreeSelector(forceState) {
    const el = document.getElementById('tree-content');
    if (!el) return;
    if (forceState !== undefined) {
      forceState ? el.classList.add('show') : el.classList.remove('show');
    } else {
      el.classList.toggle('show');
    }
  },

  toggleTreeNode(event, nodeId) {
    event.stopPropagation();
    const node = document.querySelector(`.tree-node[data-node-id="${nodeId}"]`);
    if (node) node.classList.toggle('expanded');
  },

  filterTreeNodes(query) {
    const s = query.toLowerCase();
    const rows = document.querySelectorAll('.tree-node');
    rows.forEach(row => {
      const text = row.querySelector('.tree-label').textContent.toLowerCase();
      const match = text.includes(s);
      row.style.display = match || s === '' ? 'flex' : 'none';
      
      // Se der match, expande os pais (opcional, complexo sem estrutura DOM clara de ancestrais)
    });
  }
};


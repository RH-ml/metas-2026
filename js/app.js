// ============================================
// APP.JS — Roteamento SPA e inicialização
// ============================================

const App = {
  currentRoute: 'login',

  async init() {
    try {
      await DataStore.init();
    } catch (e) {
      console.error("Erro na sincronização inicial do DataStore:", e);
    }
    // Inicia o motor de lembretes automaticamente
    if (typeof LembretesEngine !== 'undefined') {
      LembretesEngine.start();
    }
    window.addEventListener('hashchange', () => this.handleRoute());
    this.handleRoute();
  },

  handleRoute() {
    const isLoggedIn = Auth.isLoggedIn();
    const hash = window.location.hash.replace('#', '') || 'dashboard';

    if (!isLoggedIn) {
      // Se não estiver logado, obriga a ir para a tela de login
      if (hash !== 'login') {
        this.navigate('login');
        return;
      }
    } else {
      // Se já estiver logado e tentar acessar a tela de login, redireciona para o dashboard
      if (hash === 'login') {
        this.navigate('dashboard');
        return;
      }

      const session = Auth.getSession() || {};
      const isAdmin = session.id === 'admin' || session.nivel === 'Admin';
      if (!isAdmin && ['remuneracao', 'relatorios', 'configuracoes', 'lembretes'].includes(hash)) {
        this.navigate('dashboard');
        return;
      }
    }

    this.currentRoute = hash;
    this.renderPage(hash);
  },

  navigate(route) {
    window.location.hash = route;
  },

  renderPage(route) {
    const appRoot = document.getElementById('app');
    if (!appRoot) return;

    if (route === 'login') {
      appRoot.innerHTML = Auth.renderLoginPage();
      appRoot.className = 'app-root login-mode';
      return;
    }

    const titles = {
      dashboard:    ['Dashboard', 'Visão geral da performance'],
      metas:        ['Metas', 'Gerencie e acompanhe as metas da organização'],
      remuneracao:  ['Remuneração Variável', 'Bônus, simulações e regras de pagamento'],
      relatorios:   ['Relatórios', 'Extração de dados e histórico de metas'],
      lembretes:    ['Central de Lembretes', 'Notificações automáticas via Teams e E-mail'],
      configuracoes:['Configurações', 'Cadastro de usuários, áreas e movimentações']
    };

    const [title, subtitle] = titles[route] || ['Página', ''];

    let pageContent = '';
    let showSearch = false;
    switch (route) {
      case 'dashboard':    pageContent = Dashboard.render(); break;
      case 'metas':        pageContent = Metas.render(); showSearch = true; break;
      case 'remuneracao':  pageContent = Remuneracao.render(); break;
      case 'relatorios':   pageContent = Relatorios.render(); break;
      case 'lembretes':    pageContent = Lembretes.render(); break;
      case 'configuracoes':pageContent = Configuracoes.render(); break;
      default: pageContent = '<div class="page-content"><h2>Página não encontrada</h2></div>';
    }

    appRoot.className = 'app-root';
    appRoot.innerHTML = `
      <div class="app-layout">
        ${Components.renderSidebar(route)}
        <main class="main-content">
          ${Components.renderHeader(title, subtitle, showSearch)}
          <div id="page-content-root">
            ${pageContent}
          </div>
        </main>
      </div>`;

    Components.animateProgressBars();
  },

  // Extrai apenas o conteúdo da página (sem layout) — usado pelo refreshPage()
  _getPageContent(route) {
    switch (route) {
      case 'dashboard':     return Dashboard.render();
      case 'metas':         return Metas.render();
      case 'remuneracao':   return Remuneracao.render();
      case 'relatorios':    return Relatorios.render();
      case 'lembretes':     return Lembretes.render();
      case 'configuracoes': return Configuracoes.render();
      default: return '<div class="page-content"><h2>Página não encontrada</h2></div>';
    }
  },

  // Atualiza apenas o conteúdo interno da página — sem recriar sidebar/header.
  // Elimina o piscar causado pela substituição completa do DOM a cada sync do Firebase.
  refreshPage() {
    const contentRoot = document.getElementById('page-content-root');
    if (contentRoot) {
      contentRoot.innerHTML = this._getPageContent(this.currentRoute);
      Components.animateProgressBars();
    } else {
      // Fallback: render completo (ex: primeira carga, transição de rota)
      this.renderPage(this.currentRoute);
    }
  }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());

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
      dashboard: ['Dashboard', 'Visão geral da performance'],
      metas: ['Metas', 'Gerencie e acompanhe as metas da organização'],
      remuneracao: ['Remuneração Variável', 'Bônus, simulações e regras de pagamento'],
      relatorios: ['Relatórios', 'Extração de dados e histórico de metas'],
      configuracoes: ['Configurações', 'Cadastro de usuários, áreas e movimentações']
    };

    const [title, subtitle] = titles[route] || ['Página', ''];

    let pageContent = '';
    let showSearch = false;
    switch (route) {
      case 'dashboard': pageContent = Dashboard.render(); break;
      case 'metas': pageContent = Metas.render(); showSearch = true; break;
      case 'remuneracao': pageContent = Remuneracao.render(); break;
      case 'relatorios': pageContent = Relatorios.render(); break;
      case 'configuracoes': pageContent = Configuracoes.render(); break;
      default: pageContent = '<div class="page-content"><h2>Página não encontrada</h2></div>';
    }

    appRoot.className = 'app-root';
    appRoot.innerHTML = `
      <div class="app-layout">
        ${Components.renderSidebar(route)}
        <main class="main-content">
          ${Components.renderHeader(title, subtitle, showSearch)}
          ${pageContent}
        </main>
      </div>`;

    Components.animateProgressBars();
  },

  refreshPage() {
    this.renderPage(this.currentRoute);
  }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());

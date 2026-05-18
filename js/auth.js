// ============================================
// AUTH.JS — Autenticação e controle de sessão
// ============================================

const Auth = {
  isLoggedIn() {
    const sessionJson = localStorage.getItem('mp_session');
    if (!sessionJson) return false;
    try {
      const session = JSON.parse(sessionJson);
      return session && typeof session === 'object' && !!session.email;
    } catch (error) {
      localStorage.removeItem('mp_session');
      return false;
    }
  },

  getSession() {
    try {
      return JSON.parse(localStorage.getItem('mp_session') || 'null');
    } catch (error) {
      return null;
    }
  },

  login(email, senha) {
    const users = DataStore.get(DataStore.KEYS.USERS);
    const user = users.find(u => u.email === email && u.senha === senha);
    if (user) {
      const session = { id: user.id, nome: user.nome, email: user.email, cargo: user.cargo, area: user.area, nivel: user.nivel, avatar: user.avatar };
      localStorage.setItem('mp_session', JSON.stringify(session));
      return { success: true, user: session };
    }
    return { success: false, message: 'E-mail ou senha inválidos' };
  },

  logout() {
    localStorage.removeItem('mp_session');
    App.navigate('login');
  },

  getUserRootAreaId() {
    const session = this.getSession();
    if (!session) return null;
    if (session.id === 'admin') return 'all';
    // No DataStore, o getAreaAtual retorna o objeto da área. Precisamos do ID.
    const area = DataStore.getAreaAtual(session.id);
    return area ? area.id : null;
  },

  renderLoginPage() {
    return `
      <div class="login-page">
        <div class="login-image-side">
          <img src="img/login-bg.jpg" alt="Empreendimento Moura Leite" onerror="this.style.display='none'; this.parentElement.style.background='linear-gradient(135deg, #1a2332, #0f171e)';">
          <div class="login-image-overlay"></div>
          <div class="login-image-caption">
            <h2>Moura Leite</h2>
            <p>Transformando lugares em histórias de vida.</p>
          </div>
        </div>
        <div class="login-form-side">
          <div class="login-card">
            <div class="login-brand">
              <img src="img/Novo-logo.png" style="width: 52px; height: 52px; object-fit: contain;" alt="Moura Leite Logo">
              <h1 class="login-title">ML Metas</h1>
              <p class="login-subtitle">Gestão de Metas & Remuneração Variável</p>
            </div>
            <form class="login-form" id="loginForm" onsubmit="Auth.handleLogin(event)">
              <div class="form-group">
                <label class="form-label" for="loginEmail">E-mail</label>
                <input type="email" id="loginEmail" class="form-input" placeholder="seu@email.com" value="admin@empresa.com" required>
              </div>
              <div class="form-group">
                <label class="form-label" for="loginSenha">Senha</label>
                <input type="password" id="loginSenha" class="form-input" placeholder="••••••" value="admin" required>
              </div>
              <div id="loginError" class="form-error" style="display:none"></div>
              <button type="submit" class="btn btn-primary btn-block" id="loginBtn">Entrar</button>
            </form>
            <p class="login-hint">Use <strong>admin@empresa.com</strong> / <strong>admin</strong></p>
          </div>
        </div>
      </div>`;
  },

  handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const senha = document.getElementById('loginSenha').value;
    const result = Auth.login(email, senha);
    if (result.success) {
      Components.toast('Login realizado com sucesso!', 'success');
      App.navigate('dashboard');
    } else {
      const errEl = document.getElementById('loginError');
      errEl.textContent = result.message;
      errEl.style.display = 'block';
      document.getElementById('loginBtn').classList.add('shake');
      setTimeout(() => document.getElementById('loginBtn').classList.remove('shake'), 500);
    }
  }
};

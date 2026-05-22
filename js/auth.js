// ============================================
// AUTH.JS — Autenticação e controle de sessão
// ============================================

const msalConfig = {
    auth: {
        clientId: "1349995e-48d5-4f58-be87-c19d90593b07", // ID do Aplicativo
        // Acesso restrito ao diretório da Moura Leite (Tenant ID configurado)
        authority: "https://login.microsoftonline.com/34bf99e3-12de-4814-ab19-0d0f90fab15b",
        redirectUri: window.location.origin + window.location.pathname
    }
};

const msalInstance = new msal.PublicClientApplication(msalConfig);
window.msalInstance = msalInstance;

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
    localStorage.removeItem('metas_filter_area');
    localStorage.removeItem('dash_filter_area');
    if (typeof Metas !== 'undefined') Metas.currentArea = '';
    if (typeof Dashboard !== 'undefined') Dashboard.currentArea = '';
    App.navigate('login');
  },

  getUserRootAreaId() {
    const session = this.getSession();
    if (!session) return null;
    // Admin e Diretoria têm acesso total para visualizar todas as áreas
    if (session.id === 'admin' || session.nivel === 'Admin' || session.nivel === 'Diretoria') return 'all';
    // Gerência e demais: retorna sua própria área
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
                <input type="email" id="loginEmail" class="form-input" placeholder="seu@email.com" value="" required>
              </div>
              <div class="form-group">
                <label class="form-label" for="loginSenha">Senha</label>
                <input type="password" id="loginSenha" class="form-input" placeholder="••••••" value="" required>
              </div>
              <div id="loginError" class="form-error" style="display:none"></div>
              <button type="submit" class="btn btn-primary btn-block" id="loginBtn" style="background: linear-gradient(135deg, var(--primary), var(--primary-light)); border: none; font-weight: 700;">Entrar</button>
              
              <div class="login-divider" style="text-align: center; margin: 20px 0; color: #888; font-size: 0.9em; display: flex; align-items: center;">
                <hr style="flex: 1; border: none; border-top: 1px solid #333;"><span style="padding: 0 10px;">OU</span><hr style="flex: 1; border: none; border-top: 1px solid #333;">
              </div>
              
              <button type="button" class="btn btn-block" onclick="Auth.loginMicrosoft()" style="background: #fff; color: #333; border: 1px solid #ccc; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 10px; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                <img src="https://learn.microsoft.com/en-us/entra/identity-platform/media/howto-add-branding-in-apps/ms-symbollockup_mssymbol_19.png" alt="Microsoft" style="width: 20px;">
                Entrar com Microsoft
              </button>
            </form>
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
      localStorage.removeItem('metas_filter_area');
      localStorage.removeItem('dash_filter_area');
      // If hash is already '#dashboard', hashchange won't fire — call handleRoute directly
      if (window.location.hash === '#dashboard') {
        App.handleRoute();
      } else {
        App.navigate('dashboard');
        App.handleRoute();
      }
    } else {
      const errEl = document.getElementById('loginError');
      errEl.textContent = result.message;
      errEl.style.display = 'block';
      document.getElementById('loginBtn').classList.add('shake');
      setTimeout(() => document.getElementById('loginBtn').classList.remove('shake'), 500);
    }
  },

  async loginMicrosoft() {
    try {
      const loginRequest = {
        scopes: ["user.read"]
      };

      const response = await msalInstance.loginPopup(loginRequest);
      
      const emailMicrosoft = response.account.username;

      // Verifica se o usuário existe no DataStore do sistema
      const users = DataStore.get(DataStore.KEYS.USERS);
      const userNoSistema = users.find(u => u.email.toLowerCase() === emailMicrosoft.toLowerCase());

      if (userNoSistema) {
        const session = { 
          id: userNoSistema.id, 
          nome: userNoSistema.nome, 
          email: userNoSistema.email, 
          cargo: userNoSistema.cargo, 
          area: userNoSistema.area, 
          nivel: userNoSistema.nivel, 
          avatar: userNoSistema.avatar 
        };
        localStorage.setItem('mp_session', JSON.stringify(session));
        localStorage.removeItem('metas_filter_area');
        localStorage.removeItem('dash_filter_area');

        Components.toast('Login com Microsoft realizado!', 'success');
        if (window.location.hash === '#dashboard') {
          App.handleRoute();
        } else {
          App.navigate('dashboard');
        }
      } else {
        alert(`O e-mail ${emailMicrosoft} não está cadastrado no sistema ML Metas. Por favor, contate o Administrador.`);
        await msalInstance.logoutPopup();
      }

    } catch (error) {
      console.error("Erro no login com Microsoft:", error);
      Components.toast('Erro: ' + (error.message || 'Falha ao conectar com Microsoft'), 'error');
    }
  }
};

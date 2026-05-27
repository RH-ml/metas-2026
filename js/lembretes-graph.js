// ============================================================
// LEMBRETES-GRAPH.JS — Microsoft Graph API Client
// Envia e-mails via Outlook e mensagens DM via Teams
// ============================================================

const GraphClient = {
  GRAPH_BASE: 'https://graph.microsoft.com/v1.0',
  _tokenCache: null,

  // ── Escopos necessários para e-mail + Teams DM + busca de usuários ──
  _SCOPES: ['Mail.Send', 'Chat.ReadWrite', 'User.Read', 'User.ReadBasic.All'],

  // ── Obtém token de acesso ──────────────────────────────────────────────
  async getAccessToken(interactive = false) {
    if (!window.msalInstance) {
      throw new Error('MSAL não inicializado. Faça login com Microsoft primeiro.');
    }

    let accounts = msalInstance.getAllAccounts();

    if (!accounts || accounts.length === 0) {
      if (interactive) {
        try {
          const loginResponse = await msalInstance.loginPopup({ scopes: this._SCOPES });
          accounts = [loginResponse.account];
        } catch (loginError) {
          throw new Error('Não foi possível vincular sua conta Microsoft: ' + loginError.message);
        }
      } else {
        throw new Error('Nenhuma conta Microsoft ativa. Faça login com Microsoft para usar este recurso.');
      }
    }

    const request = { scopes: this._SCOPES, account: accounts[0] };

    try {
      const response = await msalInstance.acquireTokenSilent(request);
      this._tokenCache = response.accessToken;
      return response.accessToken;
    } catch (silentError) {
      if (interactive) {
        try {
          const response = await msalInstance.acquireTokenPopup(request);
          this._tokenCache = response.accessToken;
          return response.accessToken;
        } catch (popupError) {
          throw new Error('Não foi possível obter permissão de envio: ' + popupError.message);
        }
      } else {
        throw new Error('Sessão expirada. É necessário realizar login de forma interativa.');
      }
    }
  },

  // ── Requisição autenticada à Graph API ──────────────────────────────
  // Retorna null para 201/204 sem corpo, ou o JSON parseado
  async _fetch(method, endpoint, body = null, interactive = false) {
    const token = await this.getAccessToken(interactive);
    const opts = {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(`${this.GRAPH_BASE}${endpoint}`, opts);

    if (!res.ok) {
      let errMsg = `HTTP ${res.status}`;
      try {
        const errBody = await res.json();
        errMsg = errBody?.error?.message || errBody?.error?.code || errMsg;
      } catch (_) { /* resposta sem corpo JSON */ }
      throw new Error(`Graph API ${method} ${endpoint}: ${errMsg}`);
    }

    // Respostas sem corpo (204 No Content, 201 sem body)
    if (res.status === 204) return null;

    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) return null;

    const text = await res.text();
    if (!text || text.trim() === '') return null;

    try {
      return JSON.parse(text);
    } catch (e) {
      console.warn('[GraphClient] Resposta não-JSON:', text.slice(0, 200));
      return null;
    }
  },

  // ── Envia e-mail via Outlook / Microsoft 365 ────────────────────────
  async sendEmail({ to, subject, body, isHtml = false, interactive = false }) {
    const payload = {
      message: {
        subject,
        body: {
          contentType: isHtml ? 'HTML' : 'Text',
          content: body
        },
        toRecipients: [
          {
            emailAddress: {
              address: to.email,
              name: to.nome || to.email
            }
          }
        ]
      },
      saveToSentItems: false
    };
    await this._fetch('POST', '/me/sendMail', payload, interactive);
    return { success: true, canal: 'email', destinatario: to.email };
  },

  // ── Busca o ID Entra (Azure AD) de um usuário pelo e-mail ───────────
  // Usa $select para minimizar dados trafegados
  async getUserEntraId(email, interactive = false) {
    try {
      const result = await this._fetch(
        'GET',
        `/users/${encodeURIComponent(email)}?$select=id,displayName,mail`,
        null,
        interactive
      );
      return result?.id || null;
    } catch (e) {
      console.warn(`[GraphClient] Usuário não encontrado no Entra: ${email}`, e.message);
      return null;
    }
  },

  // ── Envia mensagem direta (DM) via Microsoft Teams ──────────────────
  async sendTeamsDM({ toUserId, message, interactive = false }) {
    // 1. ID do usuário autenticado (remetente)
    const me   = await this._fetch('GET', '/me?$select=id', null, interactive);
    const myId = me?.id;
    if (!myId) throw new Error('Não foi possível identificar o usuário autenticado.');

    // Evita enviar DM para si mesmo (caso raro)
    if (myId === toUserId) {
      console.warn('[GraphClient] Destinatário é o próprio remetente; DM ignorada.');
      return { success: true, canal: 'teams', destinatario: toUserId, skipped: true };
    }

    // 2. Cria ou abre chat 1:1 (Graph retorna o existente se já houver)
    const chat = await this._fetch('POST', '/chats', {
      chatType: 'oneOnOne',
      members: [
        {
          '@odata.type': '#microsoft.graph.aadUserConversationMember',
          roles: ['owner'],
          'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${myId}')`
        },
        {
          '@odata.type': '#microsoft.graph.aadUserConversationMember',
          roles: ['owner'],
          'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${toUserId}')`
        }
      ]
    }, interactive);

    const chatId = chat?.id;
    if (!chatId) throw new Error('Não foi possível criar/obter o chat no Teams.');

    // 3. Envia a mensagem
    await this._fetch('POST', `/chats/${chatId}/messages`, {
      body: {
        contentType: 'text',
        content: message
      }
    }, interactive);

    return { success: true, canal: 'teams', destinatario: toUserId };
  },

  // ── Método unificado: despacha para o canal correto ─────────────────
  async dispatch({ canal, destinatario, subject, message, isHtml = false, interactive = false }) {

    if (canal === 'email') {
      return this.sendEmail({
        to: { email: destinatario.email, nome: destinatario.nome },
        subject,
        body: message,
        isHtml,
        interactive
      });
    }

    if (canal === 'teams') {
      const entraId = await this.getUserEntraId(destinatario.email, interactive);
      if (!entraId) {
        throw new Error(
          `Usuário ${destinatario.email} não encontrado no Entra ID. ` +
          `Verifique se o e-mail está cadastrado na organização e se a permissão User.ReadBasic.All foi concedida.`
        );
      }
      return this.sendTeamsDM({ toUserId: entraId, message, interactive });
    }

    throw new Error(`Canal desconhecido: ${canal}`);
  }
};

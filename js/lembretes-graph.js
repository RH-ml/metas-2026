// ============================================================
// LEMBRETES-GRAPH.JS — Microsoft Graph API Client
// Envia e-mails via Outlook e mensagens DM via Teams
// ============================================================

const GraphClient = {
  GRAPH_BASE: 'https://graph.microsoft.com/v1.0',
  _tokenCache: null,

  // ── Obtém token de acesso com escopos de envio (incremental consent) ──
  async getAccessToken() {
    if (!window.msalInstance) {
      throw new Error('MSAL não inicializado. Faça login com Microsoft primeiro.');
    }

    const accounts = msalInstance.getAllAccounts();
    if (!accounts || accounts.length === 0) {
      throw new Error('Nenhuma conta Microsoft ativa. Faça login com Microsoft para usar este recurso.');
    }

    const request = {
      scopes: ['Mail.Send', 'Chat.ReadWrite', 'User.Read'],
      account: accounts[0]
    };

    try {
      // Tenta renovar silenciosamente
      const response = await msalInstance.acquireTokenSilent(request);
      this._tokenCache = response.accessToken;
      return response.accessToken;
    } catch (silentError) {
      // Se falhar silenciosamente, solicita interativo (popup)
      try {
        const response = await msalInstance.acquireTokenPopup(request);
        this._tokenCache = response.accessToken;
        return response.accessToken;
      } catch (popupError) {
        throw new Error('Não foi possível obter permissão de envio: ' + popupError.message);
      }
    }
  },

  // ── Requisição autenticada à Graph API ──
  async _fetch(method, endpoint, body = null) {
    const token = await this.getAccessToken();
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
      const err = await res.json().catch(() => ({}));
      throw new Error(`Graph API ${method} ${endpoint} falhou: ${err.error?.message || res.status}`);
    }
    if (res.status === 204) return null;
    return res.json();
  },

  // ── Envia e-mail via Outlook / Microsoft 365 ──
  // to: { email, nome }  |  subject: string  |  body: string (HTML ou texto)
  async sendEmail({ to, subject, body, isHtml = false }) {
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
    await this._fetch('POST', '/me/sendMail', payload);
    return { success: true, canal: 'email', destinatario: to.email };
  },

  // ── Envia mensagem direta (DM) via Microsoft Teams ──
  async sendTeamsDM({ toUserId, message }) {
    try {
      // 1. Cria ou abre chat 1:1
      const meAccounts = msalInstance.getAllAccounts();
      if (!meAccounts || meAccounts.length === 0) throw new Error('Sem conta ativa');

      // Busca o ID do usuário atual
      const me = await this._fetch('GET', '/me');
      const myId = me.id;

      // Cria o chat (Graph cria se não existir, ou retorna o existente)
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
      });

      const chatId = chat.id;

      // 2. Envia a mensagem
      await this._fetch('POST', `/chats/${chatId}/messages`, {
        body: {
          contentType: 'text',
          content: message
        }
      });

      return { success: true, canal: 'teams', destinatario: toUserId };
    } catch (e) {
      throw new Error('Falha ao enviar Teams DM: ' + e.message);
    }
  },

  // ── Busca o ID Entra (Azure AD) de um usuário pelo e-mail ──
  async getUserEntraId(email) {
    try {
      const result = await this._fetch('GET', `/users/${encodeURIComponent(email)}`);
      return result.id;
    } catch {
      return null;
    }
  },

  // ── Método unificado: despacha para o canal correto ──
  async dispatch({ canal, destinatario, subject, message, isHtml = false }) {
    if (canal === 'email') {
      return this.sendEmail({
        to: { email: destinatario.email, nome: destinatario.nome },
        subject,
        body: message,
        isHtml
      });
    }

    if (canal === 'teams') {
      // Busca o Entra ID do usuário pelo e-mail
      const entraId = await this.getUserEntraId(destinatario.email);
      if (!entraId) throw new Error(`Usuário ${destinatario.email} não encontrado no Entra ID.`);
      return this.sendTeamsDM({ toUserId: entraId, message });
    }

    throw new Error(`Canal desconhecido: ${canal}`);
  }
};

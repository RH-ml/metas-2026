// ============================================
// GRAPH.JS — Integração com Microsoft Graph API e SharePoint
// ============================================

const GraphAPI = {
  // Configurações do SharePoint extraídas do link fornecido
  siteUrl: "mouraleite1.sharepoint.com",
  sitePath: "/sites/BancodeDados",
  baseFolderPath: "/Metas_2026",
  listName: "FormServerTemplates",
  resolvedSiteId: null, // Cache para o Site ID real resolvida no getSiteId()
  resolvedDriveId: null, // Cache para o Drive ID da biblioteca de destino

  /**
   * Resolve e obtém o Site ID real gerado pela Microsoft a partir do hostname e caminho amigável.
   * Isso é CRÍTICO para evitar usar o caminho em texto corrido (que contém colons) junto com o 
   * caminho do arquivo (que também contém colons), o que confunde o OData parser do Graph API.
   */
  async getSiteId() {
    if (this.resolvedSiteId) return this.resolvedSiteId;
    
    const token = await this.getToken();
    if (!token) throw new Error("Usuário não autenticado no Microsoft Graph");
    
    const url = `https://graph.microsoft.com/v1.0/sites/${this.siteUrl}:${this.sitePath}`;
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Erro ao resolver Site ID (${response.status}): ${err}`);
    }
    
    const data = await response.json();
    this.resolvedSiteId = data.id;
    return this.resolvedSiteId;
  },

  /**
   * Resolve e obtém o Drive ID (Biblioteca de Documentos) pelo nome
   */
  async getDriveId() {
    if (this.resolvedDriveId) return this.resolvedDriveId;
    
    const siteId = await this.getSiteId();
    const token = await this.getToken();
    if (!token) throw new Error("Usuário não autenticado no Microsoft Graph");
    
    const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/drives`;
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Erro ao listar bibliotecas (${response.status}): ${err}`);
    }
    
    const data = await response.json();
    const drive = data.value.find(d => d.name === this.listName || (d.webUrl && d.webUrl.includes(this.listName)));
    
    if (!drive) {
      throw new Error(`Biblioteca '${this.listName}' não encontrada no site.`);
    }
    
    this.resolvedDriveId = drive.id;
    return this.resolvedDriveId;
  },

  /**
   * Obtém o token de acesso para o Graph API usando o MSAL já configurado no auth.js
   */
  async getToken() {
    const instance = window.msalInstance || (typeof msalInstance !== 'undefined' ? msalInstance : null);
    if (!instance) {
      console.error("MSAL não inicializado");
      return null;
    }
    
    let accounts = instance.getAllAccounts();
    if (accounts.length === 0) {
      console.warn("Nenhuma conta Microsoft ativa encontrada no MSAL. Tentando autenticação via popup...");
      try {
        const loginRequest = {
          scopes: ["Sites.ReadWrite.All", "Files.ReadWrite.All", "User.Read"]
        };
        await instance.loginPopup(loginRequest);
        accounts = instance.getAllAccounts();
      } catch (loginError) {
        console.error("Erro ao autenticar usuário via popup do MSAL:", loginError);
        return null;
      }
    }
    
    if (accounts.length === 0) return null;
    
    const request = {
      scopes: ["Sites.ReadWrite.All", "Files.ReadWrite.All", "User.Read"],
      account: accounts[0]
    };

    try {
      // Tenta obter o token silenciosamente (do cache)
      const response = await instance.acquireTokenSilent(request);
      return response.accessToken;
    } catch (e) {
      console.warn("Token silencioso falhou. Tentando popup...", e);
      try {
        const response = await instance.acquireTokenPopup(request);
        return response.accessToken;
      } catch (err) {
        console.error("Erro ao obter token do Graph:", err);
        return null;
      }
    }
  },

  /**
   * Faz o upload de um arquivo para o SharePoint
   * @param {string} fileName Nome do arquivo
   * @param {Blob|File} fileBlob O arquivo em si
   * @param {string} subFolder Subpasta opcional (ex: 'Anexos')
   * @returns {string} URL de acesso ao arquivo
   */
  async uploadFile(fileName, fileBlob, subFolder = "") {
    const token = await this.getToken();
    if (!token) throw new Error("Usuário não autenticado no Microsoft Graph");
    
    const driveId = await this.getDriveId();
    const folderPath = subFolder ? `${this.baseFolderPath}/${subFolder}` : this.baseFolderPath;
    
    // Escapar caracteres especiais no caminho e nome do arquivo (ex: espaços, parênteses como "(9)") para evitar erros no parser do OData/Graph API
    const escapedFolder = folderPath.split('/').map(seg => encodeURIComponent(seg)).join('/');
    const escapedFileName = encodeURIComponent(fileName);
    
    // Graph API endpoint acessando diretamente o Drive específico (biblioteca) resolvido
    const url = `https://graph.microsoft.com/v1.0/drives/${driveId}/root:${escapedFolder}/${escapedFileName}:/content`;

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': fileBlob.type || 'application/octet-stream'
      },
      body: fileBlob
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Erro no upload (${response.status}): ${err}`);
    }
    
    const data = await response.json();
    return {
      webUrl: data.webUrl,
      downloadUrl: data['@microsoft.graph.downloadUrl']
    };
  },

  /**
   * Baixa o arquivo de banco de dados do SharePoint
   */
  async downloadDatabase() {
    const token = await this.getToken();
    if (!token) return null;
    
    try {
      const driveId = await this.getDriveId();
      // Escapar caracteres especiais no caminho do banco de dados no SharePoint
      const escapedFolder = this.baseFolderPath.split('/').map(seg => encodeURIComponent(seg)).join('/');
      const url = `https://graph.microsoft.com/v1.0/drives/${driveId}/root:${escapedFolder}/banco_de_dados.json:/content`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.status === 404) {
        console.log("Banco de dados não encontrado no SharePoint (primeiro uso).");
        return null; 
      }
      if (!response.ok) throw new Error(`Erro ao baixar DB: ${response.statusText}`);
      return await response.json();
    } catch (e) {
      console.error("Erro no download do banco de dados:", e);
      return null;
    }
  },

  /**
   * Envia o estado atual do LocalStorage para o SharePoint
   * @param {object} jsonData Objeto completo com todas as tabelas do sistema
   */
  async uploadDatabase(jsonData) {
    // Transformar o JSON em um arquivo (Blob)
    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    return await this.uploadFile('banco_de_dados.json', blob);
  }
};

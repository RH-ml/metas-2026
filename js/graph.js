// ============================================
// GRAPH.JS — Integração com Microsoft Graph API e SharePoint
// ============================================

const GraphAPI = {
  // Configurações do SharePoint extraídas do link fornecido
  siteUrl: "mouraleite1.sharepoint.com",
  sitePath: "/sites/allcompany",
  baseFolderPath: "/Shared Documents/Metas 2026",

  /**
   * Obtém o token de acesso para o Graph API usando o MSAL já configurado no auth.js
   */
  async getToken() {
    if (!window.msalInstance) {
      console.error("MSAL não inicializado");
      return null;
    }
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length === 0) return null;
    
    const request = {
      scopes: ["Sites.ReadWrite.All", "Files.ReadWrite.All", "User.Read"],
      account: accounts[0]
    };

    try {
      // Tenta obter o token silenciosamente (do cache)
      const response = await msalInstance.acquireTokenSilent(request);
      return response.accessToken;
    } catch (e) {
      console.warn("Token silencioso falhou. Tentando popup...", e);
      try {
        const response = await msalInstance.acquireTokenPopup(request);
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
    
    const folderPath = subFolder ? `${this.baseFolderPath}/${subFolder}` : this.baseFolderPath;
    // Graph API endpoint para upload no drive padrão (Documentos Compartilhados) do site
    const url = `https://graph.microsoft.com/v1.0/sites/${this.siteUrl}:${this.sitePath}:/drive/root:${folderPath}/${fileName}:/content`;

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
    
    const url = `https://graph.microsoft.com/v1.0/sites/${this.siteUrl}:${this.sitePath}:/drive/root:${this.baseFolderPath}/banco_de_dados.json:/content`;
    
    try {
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

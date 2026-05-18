// ============================================
// RELATORIOS.JS — Exportação de dados e Analytics
// ============================================

const Relatorios = {
  render() {
    return `
      <div class="page-content fade-in">
        <div class="card" style="max-width: 800px; margin: 0 auto;">
          <div class="card-header" style="flex-direction: column; align-items: flex-start; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="background: rgba(46, 134, 77, 0.1); color: #2E864D; padding: 12px; border-radius: 12px;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              </div>
              <h3 class="card-title" style="font-size: 1.25rem;">Exportação de Metas (.xlsx)</h3>
            </div>
          </div>
          <div class="card-body">
            <p style="color: var(--text-2); margin-bottom: 24px; line-height: 1.6;">
              Gere uma planilha Excel completa contendo todas as metas do sistema. O arquivo incluirá o código, título, configurações da curva, polaridade, acumulação e os resultados previstos, realizados (P e R), desvios e notas de todos os meses do ano de forma tabular.
            </p>
            
            <div style="background: var(--bg-1); border: 1px solid rgba(0,0,0,0.05); padding: 20px; border-radius: 12px; margin-bottom: 24px;">
              <h4 style="font-size: 0.9rem; color: var(--text-1); margin-bottom: 16px; font-weight: 600;">Selecione o que deseja exportar:</h4>
              
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div class="filter-group">
                  <span style="display: block; font-size: 0.75rem; color: var(--text-2); text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px;">Dados Cadastrais</span>
                  <label class="checkbox-container" style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; cursor: pointer; font-size: 0.9rem;">
                    <input type="checkbox" id="exp-basico" checked disabled> 
                    <span style="color: var(--text-1)">Informações Básicas *</span>
                  </label>
                  <label class="checkbox-container" style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; cursor: pointer; font-size: 0.9rem;">
                    <input type="checkbox" id="exp-config" checked> 
                    <span style="color: var(--text-1)">Configurações da Meta</span>
                  </label>
                  <label class="checkbox-container" style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; cursor: pointer; font-size: 0.9rem;">
                    <input type="checkbox" id="exp-resp" checked> 
                    <span style="color: var(--text-1)">Área e Responsável</span>
                  </label>
                </div>

                <div class="filter-group">
                  <span style="display: block; font-size: 0.75rem; color: var(--text-2); text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px;">Dados de Performance</span>
                  <label class="checkbox-container" style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; cursor: pointer; font-size: 0.9rem;">
                    <input type="checkbox" id="exp-p" checked> 
                    <span style="color: var(--text-1)">Previsto (P)</span>
                  </label>
                  <label class="checkbox-container" style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; cursor: pointer; font-size: 0.9rem;">
                    <input type="checkbox" id="exp-r" checked> 
                    <span style="color: var(--text-1)">Realizado (R)</span>
                  </label>
                  <label class="checkbox-container" style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; cursor: pointer; font-size: 0.9rem;">
                    <input type="checkbox" id="exp-d" checked> 
                    <span style="color: var(--text-1)">Desvios</span>
                  </label>
                  <label class="checkbox-container" style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; cursor: pointer; font-size: 0.9rem;">
                    <input type="checkbox" id="exp-nota" checked> 
                    <span style="color: var(--text-1)">Notas Finais</span>
                  </label>
                </div>
              </div>
              <p style="font-size: 0.75rem; color: var(--text-3); margin-top: 12px;">* Itens obrigatórios: Código e Nome da Meta.</p>
            </div>

            <button class="btn btn-primary" onclick="Relatorios.exportarMetasParaExcel()" style="width: 100%; justify-content: center; padding: 12px; font-size: 1rem;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Baixar Relatório Personalizado (.xlsx)
            </button>
          </div>
        </div>
      </div>
    `;
  },

  exportarMetasParaExcel() {
    if (typeof XLSX === 'undefined') {
      Components.toast('A biblioteca de exportação (SheetJS) ainda está carregando ou foi bloqueada. Verifique sua conexão.', 'error');
      return;
    }

    Components.toast('Preparando relatório, aguarde...', 'info');

    try {
      const metas = DataStore.getMetas();
      const mesesAbv = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
      
      // Capturar seleções do usuário
      const opt = {
        config: document.getElementById('exp-config')?.checked,
        resp: document.getElementById('exp-resp')?.checked,
        p: document.getElementById('exp-p')?.checked,
        r: document.getElementById('exp-r')?.checked,
        d: document.getElementById('exp-d')?.checked,
        nota: document.getElementById('exp-nota')?.checked
      };

      const dadosPlanilha = metas.map(m => {
        // Objeto base sempre com Código e Nome
        const linha = {
          'Código da Meta': m.codigo || '-',
          'Nome da Meta': m.titulo || '-'
        };

        // Configurações
        if (opt.config) {
          let valoresCurvaStr = '';
          if (m.valoresCurva && typeof m.valoresCurva === 'object') {
            valoresCurvaStr = Object.entries(m.valoresCurva)
              .sort((a, b) => Number(a[0]) - Number(b[0]))
              .map(([nota, valor]) => valor)
              .join(' | ');
          } else {
            valoresCurvaStr = 'Padrão';
          }
          linha['Tipo de Curva'] = m.tipoCurva || 'Padrão';
          linha['Valores de Curva'] = valoresCurvaStr;
          linha['Formato'] = m.unidade || '-';
          linha['Polaridade'] = m.polaridade === 'menor_melhor' ? 'Menor é Melhor' : 'Maior é Melhor';
          linha['Acumulação'] = m.acumulacao === 'soma' ? 'Soma' : (m.acumulacao === 'media' ? 'Média' : (m.acumulacao === 'repetir' ? 'Repetir Valores' : 'Data Provider'));
        }

        // Responsável e Área
        if (opt.resp) {
          let nomeResponsavel = 'Não Atribuído';
          if (m.responsavelId) {
            const user = DataStore.getUserById(m.responsavelId);
            if (user) nomeResponsavel = user.nome;
          }
          linha['Área'] = (DataStore.getAreaById(m.areaId) || {}).nome || '-';
          linha['Responsável'] = nomeResponsavel;
        }

        // Dados Mensais
        if (m.mesesData && Array.isArray(m.mesesData)) {
          m.mesesData.forEach((mesObj, idx) => {
            const mesNome = mesesAbv[idx] || `Mes ${idx+1}`;
            
            if (opt.p) linha[`P - ${mesNome}`] = (mesObj.pontual && mesObj.pontual.p !== null) ? mesObj.pontual.p : '';
            if (opt.r) {
               if (mesObj.pontual && mesObj.pontual.na) linha[`R - ${mesNome}`] = 'N/A';
               else linha[`R - ${mesNome}`] = (mesObj.pontual && mesObj.pontual.r !== null) ? mesObj.pontual.r : '';
            }
            if (opt.d) {
               if (mesObj.pontual && mesObj.pontual.na) linha[`Desvio - ${mesNome}`] = '-';
               else linha[`Desvio - ${mesNome}`] = (mesObj.pontual && mesObj.pontual.d !== null) ? Number(mesObj.pontual.d.toFixed(2)) : '';
            }
            if (opt.nota) {
               if (mesObj.pontual && mesObj.pontual.na) linha[`Nota - ${mesNome}`] = '-';
               else linha[`Nota - ${mesNome}`] = (mesObj.pontual && mesObj.pontual.nota !== null) ? Number(mesObj.pontual.nota.toFixed(2)) : '';
            }
          });
        }

        return linha;
      });

      // Se não houver dados, avisa
      if (dadosPlanilha.length === 0) {
        Components.toast('Nenhuma meta encontrada para exportar.', 'error');
        return;
      }

      // Ajustar largura das colunas dinamicamente
      const worksheet = XLSX.utils.json_to_sheet(dadosPlanilha);
      const wscols = Object.keys(dadosPlanilha[0] || {}).map(key => {
        if (key.length > 20) return { wch: 25 };
        if (key.length > 10) return { wch: 15 };
        return { wch: 10 };
      });
      worksheet['!cols'] = wscols;

      // Criar o Workbook e adicionar a Worksheet
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Metas");

      // Gerar o arquivo e forçar o download
      const dataHoje = new Date().toISOString().split('T')[0];
      XLSX.writeFile(workbook, `Relatorio_MetasPro_${dataHoje}.xlsx`);

      Components.toast('Relatório exportado com sucesso!', 'success');
      
    } catch (err) {
      console.error(err);
      Components.toast('Erro ao gerar relatório.', 'error');
    }
  }
};

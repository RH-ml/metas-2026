// ============================================================
// LEMBRETES-ENGINE.JS — Motor de Regras e Scheduler
// Avalia regras, monta destinatários e despacha notificações
// ============================================================

const LembretesEngine = {
  _intervalId: null,
  _CHECK_INTERVAL_MS: 60 * 1000, // verifica a cada 60 segundos

  // ── Inicia o scheduler automático ──
  start() {
    if (this._intervalId) return; // já rodando
    console.log('🔔 LembretesEngine iniciado.');
    this._intervalId = setInterval(() => this.tick(), this._CHECK_INTERVAL_MS);
    // Roda uma vez imediatamente ao iniciar
    this.tick();
  },

  stop() {
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
      console.log('🔕 LembretesEngine parado.');
    }
  },

  // ── Ciclo principal ── avalia todas as regras ativas ──
  async tick() {
    const regras = DataStore.getLembreteRegras().filter(r => r.ativo);
    const agora = new Date();

    for (const regra of regras) {
      try {
        const proxima = regra.proximaExecucao ? new Date(regra.proximaExecucao) : null;
        if (!proxima || agora >= proxima) {
          await this.executeRegra(regra);
        }
      } catch (e) {
        console.error(`[LembretesEngine] Erro ao executar regra ${regra.id}:`, e);
      }
    }
  },

  // ── Executa uma regra específica (avalia condição e dispara) ──
  async executeRegra(regra, forceDispatch = false, interactive = false) {
    const destinatarios = DataStore.buildRecipientList(regra);
    const metasAfetadas = this.evaluateEvento(regra);

    // Atualiza última/próxima execução
    const agora = new Date().toISOString();
    const proxima = DataStore.calcProximaExecucao(regra);
    DataStore.updateLembreteRegra(regra.id, { ultimaExecucao: agora, proximaExecucao: proxima });

    if (metasAfetadas.length === 0 && !forceDispatch) return; // Nada a notificar

    const template = DataStore.getLembreteTemplateById(regra.templateId);
    const canais = regra.canais || [];
    const linkSistema = window.location.origin + window.location.pathname;
    const competencia = this._getCompetenciaAtual();

    // Dispara para cada destinatário × cada canal
    for (const user of destinatarios) {
      const userMetas = metasAfetadas.filter(m => m.responsavelId === user.id);
      const metasParaMsg = userMetas.length > 0 ? userMetas : (forceDispatch ? metasAfetadas.slice(0, 3) : []);
      if (metasParaMsg.length === 0) continue;

      for (const canal of canais) {
        try {
          // Formata as variáveis consolidadas
          let nomeMeta = '';
          let codigoMeta = '';
          let prazo = '';
          let area = '';
          let listaMetas = '';

          const listaMetasText = metasParaMsg.map(m => {
            const cod = m.codigo ? `[${m.codigo}] ` : '';
            const prazoStr = m.mesFim ? ` (Prazo: Mês ${m.mesFim})` : '';
            return `• ${cod}${m.titulo}${prazoStr}`;
          }).join('\n');

          if (metasParaMsg.length === 1) {
            const m = metasParaMsg[0];
            nomeMeta = m.titulo;
            codigoMeta = m.codigo || '—';
            prazo = m.mesFim ? `Mês ${m.mesFim}` : '—';
            const a = DataStore.getAreaById(m.areaId);
            area = a ? `${a.codigo} - ${a.nome}` : '—';
            listaMetas = `• ${m.codigo ? `[${m.codigo}] ` : ''}${m.titulo}`;
          } else {
            nomeMeta = '\n' + listaMetasText;
            codigoMeta = metasParaMsg.map(m => m.codigo).filter(Boolean).join(', ') || '—';
            prazo = metasParaMsg.map(m => m.mesFim ? `Mês ${m.mesFim}` : '').filter(Boolean).filter((v,i,a) => a.indexOf(v)===i).join(', ') || '—';
            area = metasParaMsg.map(m => {
              const a = DataStore.getAreaById(m.areaId);
              return a ? `${a.codigo} - ${a.nome}` : '';
            }).filter(Boolean).filter((v,i,a) => a.indexOf(v)===i).join(', ') || '—';
            listaMetas = listaMetasText;
          }

          const vars = {
            nome_usuario: user.nome,
            nome_meta: nomeMeta,
            codigo_meta: codigoMeta,
            competencia,
            prazo,
            gestor: this._getNomeGestor(user),
            area,
            link_sistema: linkSistema,
            lista_metas: listaMetas
          };

          const assunto = DataStore.resolveTemplate(
            template?.assunto || `⚠️ Lembrete: ${regra.nome}`,
            vars
          );
          const corpo = DataStore.resolveTemplate(
            template?.corpo || `Olá {{nome_usuario}},\n\nVocê possui as seguintes pendências de metas:\n\n{{lista_metas}}\n\nAcesse: {{link_sistema}}`,
            vars
          );

          await GraphClient.dispatch({
            canal,
            destinatario: { email: user.email, nome: user.nome },
            subject: assunto,
            message: corpo,
            isHtml: false,
            interactive
          });

          // Adiciona log consolidado
          DataStore.addLembreteLog({
            regraId: regra.id,
            regraNome: regra.nome,
            dataHora: new Date().toISOString(),
            canal,
            destinatarioId: user.id,
            destinatarioNome: user.nome,
            destinatarioEmail: user.email,
            metaId: metasParaMsg.map(m => m.id).join(', '),
            metaTitulo: metasParaMsg.map(m => m.titulo).join(', '),
            status: 'enviado',
            erro: null
          });

        } catch (err) {
          DataStore.addLembreteLog({
            regraId: regra.id,
            regraNome: regra.nome,
            dataHora: new Date().toISOString(),
            canal,
            destinatarioId: user.id,
            destinatarioNome: user.nome,
            destinatarioEmail: user.email,
            metaId: metasParaMsg.map(m => m.id).join(', '),
            metaTitulo: metasParaMsg.map(m => m.titulo).join(', ') || '—',
            status: 'erro',
            erro: err.message
          });
          if (interactive) throw err;
        }
      }
    }
  },

  // ── Avalia o evento/gatilho e retorna as metas afetadas ──
  evaluateEvento(regra) {
    const metas = DataStore.getMetas();
    const areasIds = regra.areasIds || [];
    const metasFiltradas = areasIds.length > 0
      ? metas.filter(m => areasIds.includes(m.areaId))
      : metas;

    const agora = new Date();
    const mesAtual = agora.getMonth(); // 0-based

    switch (regra.evento) {
      case 'meta_sem_resultado': {
        // Metas sem resultado (R) lançado no mês corrente
        return metasFiltradas.filter(m => {
          if (!m.mesesData || !m.mesesData[mesAtual]) return false;
          const pontual = m.mesesData[mesAtual].pontual;
          return pontual && (pontual.r === null || pontual.r === undefined) && !pontual.na;
        });
      }

      case 'prazo_vencendo': {
        // Metas com prazo (mesFim) nos próximos N dias
        const diasAlerta = regra.parametros?.diasAlerta || 7;
        const limiteData = new Date();
        limiteData.setDate(limiteData.getDate() + diasAlerta);
        return metasFiltradas.filter(m => {
          if (!m.mesFim) return false;
          const mesLimite = parseInt(m.mesFim);
          const dataFim = new Date(agora.getFullYear(), mesLimite - 1, 28); // último dia aprox.
          return dataFim >= agora && dataFim <= limiteData;
        });
      }

      case 'resultado_abaixo': {
        // Metas com nota abaixo do limiar configurado
        const limiar = regra.parametros?.limiarNota || 80;
        return metasFiltradas.filter(m => {
          const perf = DataStore.calcPerformance(m);
          return perf !== null && perf < limiar;
        });
      }

      case 'sem_atualizacao': {
        // Metas sem edição há N dias
        const diasSemUpdate = regra.parametros?.diasSemUpdate || 30;
        const limite = new Date();
        limite.setDate(limite.getDate() - diasSemUpdate);
        return metasFiltradas.filter(m => {
          if (!m.atualizadoEm) return true; // nunca atualizado
          return new Date(m.atualizadoEm) < limite;
        });
      }

      case 'plano_vencido': {
        // Planos de ação com prazo ultrapassado e progresso < 100%
        const acoes = DataStore.get(DataStore.KEYS.ACOES) || [];
        const acoesVencidas = acoes.filter(a => {
          if (!a.prazo || (a.progresso || 0) >= 100) return false;
          return new Date(a.prazo) < agora;
        });
        // Retorna as metas correspondentes
        const metaIds = new Set(acoesVencidas.map(a => a.metaId));
        return metasFiltradas.filter(m => metaIds.has(m.id));
      }

      case 'fechamento_ciclo': {
        // Último dia do mês corrente
        const ultimoDia = new Date(agora.getFullYear(), agora.getMonth() + 1, 0);
        const isUltimoDia = agora.getDate() === ultimoDia.getDate() && agora.getMonth() === ultimoDia.getMonth();
        return isUltimoDia ? metasFiltradas : [];
      }

      case 'abertura_ciclo': {
        // Primeiro dia do mês
        const isPrimeiroDia = agora.getDate() === 1;
        return isPrimeiroDia ? metasFiltradas : [];
      }

      case 'atraso_evidencia': {
        // Meses com resultado mas sem anexo
        return metasFiltradas.filter(m => {
          if (!m.mesesData) return false;
          return m.mesesData.some((mes, idx) => {
            if (idx > mesAtual) return false;
            const temR = mes.pontual && mes.pontual.r !== null;
            const semAnexo = !mes.anexos || mes.anexos.length === 0;
            return temR && semAnexo;
          });
        });
      }

      default:
        return [];
    }
  },

  // ── Helpers internos ──
  _getCompetenciaAtual() {
    const d = new Date();
    return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  },

  _getNomeGestor(user) {
    const users = DataStore.getUsers();
    const uArea = DataStore.getAreaAtual(user.id);
    if (!uArea) return '—';
    const gestor = users.find(u => {
      if (u.id === user.id) return false;
      if (u.nivel !== 'Gerência' && u.nivel !== 'Diretoria') return false;
      const gArea = DataStore.getAreaAtual(u.id);
      return gArea && (gArea.id === uArea.id || gArea.id === uArea.parentId);
    });
    return gestor ? gestor.nome : '—';
  },

  _getNomeArea(user) {
    const uArea = DataStore.getAreaAtual(user.id);
    return uArea ? `${uArea.codigo} - ${uArea.nome}` : '—';
  }
};

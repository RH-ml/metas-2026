// ============================================================
// LEMBRETES-ENGINE.JS — Motor de Regras e Scheduler
// Avalia regras, monta destinatários e despacha notificações
// ============================================================

const LembretesEngine = {
  _intervalId: null,
  _CHECK_INTERVAL_MS: 60 * 1000, // verifica a cada 60 segundos

  // ── Inicia o scheduler automático ──
  start() {
    if (this._intervalId) return;
    console.log('🔔 LembretesEngine iniciado.');
    this._intervalId = setInterval(() => this.tick(), this._CHECK_INTERVAL_MS);
    this.tick();
  },

  stop() {
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
      console.log('🔕 LembretesEngine parado.');
    }
  },

  // ── Ciclo principal ──
  async tick() {
    const regras = DataStore.getLembreteRegras().filter(r => r.ativo);
    const agora  = new Date();
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

  // ── Executa uma regra específica ──
  // forceDispatch=true → botão "Testar" (ignora janela de 5º dia útil)
  // interactive=false  → autenticação já feita pelo testDispatch antes de entrar aqui
  async executeRegra(regra, forceDispatch = false, interactive = false) {
    const destinatarios = DataStore.buildRecipientList(regra);
    let   metasAfetadas = this.evaluateEvento(regra, forceDispatch);

    // Salva última/próxima execução
    DataStore.updateLembreteRegra(regra.id, {
      ultimaExecucao  : new Date().toISOString(),
      proximaExecucao : DataStore.calcProximaExecucao(regra)
    });

    if (metasAfetadas.length === 0 && !forceDispatch) return;

    // Disparo forçado sem metas → fallback: primeiras 5 metas disponíveis
    if (metasAfetadas.length === 0 && forceDispatch) {
      const todas  = DataStore.getMetas();
      const areas  = regra.areasIds || [];
      metasAfetadas = areas.length > 0
        ? todas.filter(m => areas.includes(m.areaId)).slice(0, 5)
        : todas.slice(0, 5);
    }

    if (destinatarios.length === 0 || metasAfetadas.length === 0) return;

    const template    = DataStore.getLembreteTemplateById(regra.templateId);
    const canais      = regra.canais || [];
    const linkSistema = window.location.origin + window.location.pathname;

    // Para "meta_sem_resultado" a competência é o mês ANTERIOR (mês cobrado)
    const competencia = regra.evento === 'meta_sem_resultado'
      ? this._getCompetenciaMesAnterior()
      : this._getCompetenciaAtual();

    // ── UM ÚNICO envio por destinatário com TODAS as suas metas ──
    for (const user of destinatarios) {

      const userMetas    = metasAfetadas.filter(m => m.responsavelId === user.id);
      const metasParaMsg = userMetas.length > 0
        ? userMetas
        : (forceDispatch ? metasAfetadas : []);

      if (metasParaMsg.length === 0) continue;

      // Lista numerada SEM prazo (apenas código e título)
      const listaFormatada = metasParaMsg.map((m, i) => {
        const cod = m.codigo ? `[${m.codigo}] ` : '';
        return `${i + 1}. ${cod}${m.titulo}`;
      }).join('\n');

      const primeiraArea = DataStore.getAreaById(metasParaMsg[0]?.areaId);

      const vars = {
        nome_usuario : user.nome,
        nome_meta    : metasParaMsg.length === 1
          ? metasParaMsg[0].titulo
          : `${metasParaMsg.length} metas pendentes`,
        codigo_meta  : metasParaMsg.map(m => m.codigo).filter(Boolean).join(', ') || '—',
        competencia,
        prazo        : [...new Set(
          metasParaMsg.map(m => m.mesFim ? `Mês ${m.mesFim}` : '').filter(Boolean)
        )].join(', ') || '—',
        gestor       : this._getNomeGestor(user),
        area         : primeiraArea
          ? `${primeiraArea.codigo} - ${primeiraArea.nome}`
          : this._getNomeArea(user),
        link_sistema : linkSistema,
        lista_metas  : listaFormatada
      };

      const assunto = DataStore.resolveTemplate(
        template?.assunto || `⚠️ Lembrete: ${regra.nome}`,
        vars
      );
      const corpo = DataStore.resolveTemplate(
        template?.corpo ||
          `Olá {{nome_usuario}},\n\nVocê possui as seguintes metas pendentes referentes a {{competencia}}:\n\n{{lista_metas}}\n\nAcesse o sistema: {{link_sistema}}`,
        vars
      );

      const metaIds    = metasParaMsg.map(m => m.id).join(', ');
      const metaTitulo = `${metasParaMsg.length} meta(s): ${metasParaMsg.map(m => m.titulo).join('; ')}`;

      for (const canal of canais) {
        try {
          await GraphClient.dispatch({
            canal,
            destinatario: { email: user.email, nome: user.nome },
            subject : assunto,
            message : corpo,
            isHtml  : false,
            interactive
          });

          DataStore.addLembreteLog({
            regraId          : regra.id,
            regraNome        : regra.nome,
            dataHora         : new Date().toISOString(),
            canal,
            destinatarioId   : user.id,
            destinatarioNome : user.nome,
            destinatarioEmail: user.email,
            metaId           : metaIds,
            metaTitulo,
            status           : 'enviado',
            erro             : null
          });

        } catch (err) {
          DataStore.addLembreteLog({
            regraId          : regra.id,
            regraNome        : regra.nome,
            dataHora         : new Date().toISOString(),
            canal,
            destinatarioId   : user.id,
            destinatarioNome : user.nome,
            destinatarioEmail: user.email,
            metaId           : metaIds,
            metaTitulo,
            status           : 'erro',
            erro             : err.message
          });
          // Não interrompe: continua para próximo canal/usuário
        }
      }
    }
  },

  // ── Avalia o evento/gatilho e retorna as metas afetadas ──
  // forceDispatch=true ignora a janela do 5º dia útil (usado pelo botão Testar)
  evaluateEvento(regra, forceDispatch = false) {
    const metas = DataStore.getMetas();
    const areasIds = regra.areasIds || [];
    const metasFiltradas = areasIds.length > 0
      ? metas.filter(m => areasIds.includes(m.areaId))
      : metas;

    const agora    = new Date();
    const mesAtual = agora.getMonth(); // 0-based: 0=Jan … 11=Dez

    switch (regra.evento) {

      // ──────────────────────────────────────────────────────────────────
      // REGRA: Metas sem preenchimento
      //   • Cobrar o mês ANTERIOR (Jan→cobrar em Fev, Fev→cobrar em Mar…)
      //   • Só disparar a partir do 5º dia útil do mês corrente
      //   • Metas marcadas como N/A NÃO são cobradas
      // ──────────────────────────────────────────────────────────────────
      case 'meta_sem_resultado': {
        // Índice do mês a cobrar (mês anterior, com wrap de Dez→Jan)
        const mesPendente = mesAtual === 0 ? 11 : mesAtual - 1;

        // Janela de cobrança: a partir do 5º dia útil do mês corrente
        if (!forceDispatch) {
          const quintoUtil = this._getNthBusinessDay(agora.getFullYear(), mesAtual, 5);
          if (agora < quintoUtil) return []; // ainda não chegou o prazo
        }

        return metasFiltradas.filter(m => {
          if (!m.mesesData) return false;
          const mesDado = m.mesesData[mesPendente];
          if (!mesDado) return false;
          const pontual = mesDado.pontual;
          if (!pontual) return false;
          // Não cobrar se marcado como N/A
          if (pontual.na) return false;
          // Cobrar somente se o resultado (r) não foi preenchido
          return pontual.r === null || pontual.r === undefined || pontual.r === '';
        });
      }

      case 'prazo_vencendo': {
        const diasAlerta = regra.parametros?.diasAlerta || 7;
        const limiteData = new Date();
        limiteData.setDate(limiteData.getDate() + diasAlerta);
        return metasFiltradas.filter(m => {
          if (!m.mesFim) return false;
          const dataFim = new Date(agora.getFullYear(), parseInt(m.mesFim) - 1, 28);
          return dataFim >= agora && dataFim <= limiteData;
        });
      }

      case 'resultado_abaixo': {
        const limiar = regra.parametros?.limiarNota || 80;
        return metasFiltradas.filter(m => {
          const perf = DataStore.calcPerformance(m);
          return perf !== null && perf < limiar;
        });
      }

      case 'sem_atualizacao': {
        const diasSemUpdate = regra.parametros?.diasSemUpdate || 30;
        const limite = new Date();
        limite.setDate(limite.getDate() - diasSemUpdate);
        return metasFiltradas.filter(m => {
          if (!m.atualizadoEm) return true;
          return new Date(m.atualizadoEm) < limite;
        });
      }

      case 'plano_vencido': {
        const acoes = DataStore.get(DataStore.KEYS.ACOES) || [];
        const acoesVencidas = acoes.filter(a => {
          if (!a.prazo || (a.progresso || 0) >= 100) return false;
          return new Date(a.prazo) < agora;
        });
        const metaIds = new Set(acoesVencidas.map(a => a.metaId));
        return metasFiltradas.filter(m => metaIds.has(m.id));
      }

      case 'fechamento_ciclo': {
        const ultimoDia = new Date(agora.getFullYear(), agora.getMonth() + 1, 0);
        const isUltimoDia = agora.getDate() === ultimoDia.getDate() &&
                            agora.getMonth() === ultimoDia.getMonth();
        return isUltimoDia ? metasFiltradas : [];
      }

      case 'abertura_ciclo': {
        return agora.getDate() === 1 ? metasFiltradas : [];
      }

      case 'atraso_evidencia': {
        return metasFiltradas.filter(m => {
          if (!m.mesesData) return false;
          return m.mesesData.some((mes, idx) => {
            if (idx > mesAtual) return false;
            const temR     = mes.pontual && mes.pontual.r !== null && mes.pontual.r !== undefined;
            const semAnexo = !mes.anexos || mes.anexos.length === 0;
            return temR && semAnexo;
          });
        });
      }

      default:
        return [];
    }
  },

  // ── Helpers ──────────────────────────────────────────────────────────

  // Retorna a data do N-ésimo dia útil (seg–sex) de um dado mês/ano
  _getNthBusinessDay(year, month, n) {
    let count = 0;
    let day   = 1;
    while (true) {
      const d   = new Date(year, month, day);
      const dow = d.getDay(); // 0=Dom, 6=Sáb
      if (dow !== 0 && dow !== 6) {
        count++;
        if (count === n) return d;
      }
      day++;
    }
  },

  // Retorna "mês de ano" do mês CORRENTE (ex: "maio de 2026")
  _getCompetenciaAtual() {
    return new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  },

  // Retorna "mês de ano" do mês ANTERIOR — usado no evento meta_sem_resultado
  _getCompetenciaMesAnterior() {
    const d = new Date();
    d.setDate(1);          // evita problema de dias (31 → 31 de fevereiro)
    d.setMonth(d.getMonth() - 1);
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

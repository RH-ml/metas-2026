// ============================================
// DATA.JS — Dados mockados e CRUD localStorage
// ============================================

const DataStore = {
  KEYS: { USERS: 'mp_users', METAS: 'mp_metas', ACOES: 'mp_acoes', BONUS: 'mp_bonus', REGRAS: 'mp_regras', AREAS: 'mp_areas', HISTORICO_AREAS: 'mp_hist_areas', SESSION: 'mp_session', LEMBRETE_REGRAS: 'mp_lem_regras', LEMBRETE_TEMPLATES: 'mp_lem_templates', LEMBRETE_LOGS: 'mp_lem_logs', LEMBRETE_CHANNELS: 'mp_lem_channels' },
  DELETED_KEY: 'mp_deleted_ids',       // Tombstone local
  TOMBSTONES_FB: 'mp_tombstones',       // Coleção Firebase para sincronizar exclusões entre dispositivos

  // =====================================================================
  // COMPRESSÃO DE METAS (Otimização de localStorage)
  // Remove campos null e arrays vazios do mesesData antes de persistir.
  // Reduz o tamanho armazenado em ~40-60% sem alterar nenhuma lógica.
  // =====================================================================

  // Comprime uma meta removendo campos null/vazios do mesesData antes de salvar.
  // Preserva SEMPRE: mes, pontual.na (false é informação), e qualquer valor não-null.
  _compressMeta(meta) {
    if (!meta || !Array.isArray(meta.mesesData)) return meta;
    const clone = Object.assign({}, meta);
    clone.mesesData = meta.mesesData.map(monthObj => {
      if (!monthObj) return monthObj;
      const m = { mes: monthObj.mes };

      // Pontual: só salva se tiver ao menos um campo com valor real
      if (monthObj.pontual) {
        const p = monthObj.pontual;
        const pOut = {};
        if (p.p !== null && p.p !== undefined)  pOut.p  = p.p;
        if (p.r !== null && p.r !== undefined)  pOut.r  = p.r;
        if (p.d !== null && p.d !== undefined)  pOut.d  = p.d;
        if (p.nota !== null && p.nota !== undefined) pOut.nota = p.nota;
        // na:false é informação relevante (distingue de "sem dado") — sempre preserva
        pOut.na = !!p.na;
        // Só inclui o bloco se tiver algum campo além de `na:false`
        if (Object.keys(pOut).length > 1 || pOut.na === true) m.pontual = pOut;
      }

      // Acumulado: só salva se tiver ao menos um campo com valor real
      if (monthObj.acumulado) {
        const a = monthObj.acumulado;
        const aOut = {};
        if (a.p !== null && a.p !== undefined)    aOut.p    = a.p;
        if (a.r !== null && a.r !== undefined)    aOut.r    = a.r;
        if (a.d !== null && a.d !== undefined)    aOut.d    = a.d;
        if (a.nota !== null && a.nota !== undefined) aOut.nota = a.nota;
        if (Object.keys(aOut).length > 0) m.acumulado = aOut;
      }

      // Anexos: só salva se não estiver vazio
      if (Array.isArray(monthObj.anexos) && monthObj.anexos.length > 0) {
        m.anexos = monthObj.anexos;
      }

      return m;
    });
    return clone;
  },

  // Hidrata uma meta restaurando a estrutura completa do mesesData ao ler do localStorage.
  // Garante que todo código downstream encontre pontual/acumulado/anexos sempre presentes.
  _hydrateMeta(meta) {
    if (!meta || !Array.isArray(meta.mesesData)) return meta;
    meta.mesesData = meta.mesesData.map(monthObj => {
      if (!monthObj) return monthObj;
      // Garante estrutura pontual completa
      const p = monthObj.pontual || {};
      monthObj.pontual = {
        p:    p.p    !== undefined ? p.p    : null,
        r:    p.r    !== undefined ? p.r    : null,
        d:    p.d    !== undefined ? p.d    : null,
        nota: p.nota !== undefined ? p.nota : null,
        na:   p.na   !== undefined ? p.na   : false
      };
      // Garante estrutura acumulado completa
      const a = monthObj.acumulado || {};
      monthObj.acumulado = {
        p:    a.p    !== undefined ? a.p    : null,
        r:    a.r    !== undefined ? a.r    : null,
        d:    a.d    !== undefined ? a.d    : null,
        nota: a.nota !== undefined ? a.nota : null
      };
      // Garante array de anexos
      if (!Array.isArray(monthObj.anexos)) monthObj.anexos = [];
      return monthObj;
    });
    return meta;
  },

  // Aplica compressão a uma lista de metas antes de persistir no localStorage.
  _compressMetaList(list) {
    if (!Array.isArray(list)) return list;
    return list.map(m => this._compressMeta(m));
  },


  // Registra um ID como excluído permanentemente (local + Firebase)
  _registerDeleted(id) {
    try {
      const deleted = JSON.parse(localStorage.getItem(this.DELETED_KEY) || '{}');
      deleted[id] = new Date().toISOString();
      localStorage.setItem(this.DELETED_KEY, JSON.stringify(deleted));
    } catch(e) { /* silencioso */ }

    // Persiste o tombstone no Firebase para sincronizar com TODOS os dispositivos
    if (isFirebaseActive && db) {
      db.collection(this.TOMBSTONES_FB).doc(id).set({ id, deletedAt: new Date().toISOString() })
        .catch(e => console.error('Erro ao salvar tombstone no Firebase:', e));
    }
  },

  // Verifica se um ID foi excluído (consulta o cache local)
  _isDeleted(id) {
    try {
      const deleted = JSON.parse(localStorage.getItem(this.DELETED_KEY) || '{}');
      return !!deleted[id];
    } catch(e) { return false; }
  },

  // Carrega tombstones do Firebase e atualiza o localStorage local
  // Deve ser chamado no início do init() ANTES de qualquer merge de dados
  async _loadTombstonesFromFirebase() {
    if (!isFirebaseActive || !db) return;
    try {
      const snapshot = await db.collection(this.TOMBSTONES_FB).get();
      if (snapshot.empty) return;
      const deleted = JSON.parse(localStorage.getItem(this.DELETED_KEY) || '{}');
      let changed = false;
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data && data.id && !deleted[data.id]) {
          deleted[data.id] = data.deletedAt || new Date().toISOString();
          changed = true;
        }
      });
      if (changed) {
        localStorage.setItem(this.DELETED_KEY, JSON.stringify(deleted));
        console.log(`🗑️ Tombstones sincronizados do Firebase: ${Object.keys(deleted).length} IDs excluídos carregados.`);
      }
    } catch(e) {
      console.warn('Aviso: não foi possível carregar tombstones do Firebase:', e);
    }
  },

  async init() {
    // 0. Carregar tombstones do Firebase PRIMEIRO — antes de qualquer merge.
    //    Isso garante que exclusões feitas em outros dispositivos sejam respeitadas.
    await this._loadTombstonesFromFirebase();

    // 1. Se o Firebase estiver ativo, tenta puxar os dados atualizados da nuvem
    if (isFirebaseActive && db) {
      try {
        console.log("🔄 Sincronizando dados com o Firebase Firestore...");
        
        // Vamos verificar se a coleção de usuários existe/tem dados
        const usersSnapshot = await db.collection(this.KEYS.USERS).get();
        
        if (usersSnapshot.empty) {
          // Se o Firestore estiver vazio, vamos semeá-lo com os dados padrões locais!
          console.log("🌱 Firestore vazio! Semeando banco de dados com dados padrões...");
          await this.seedFirebaseDatabase();
        } else {
          // Baixa os dados das coleções e faz merge inteligente por timestamp.
          // REGRA ANTI-AMNÉSIA: Se o item local for mais novo que o do Firebase
          // (ex: usuário editou mas F5 foi pressionado antes do Firebase confirmar),
          // o item LOCAL prevalece. Isso elimina a race condition de escrita.
          for (const key of Object.values(this.KEYS)) {
            if (key === this.KEYS.SESSION) continue; // Sessão é puramente local
            const snapshot = await db.collection(key).get();

            // CORREÇÃO: Filtrar tombstones do fbList ANTES de qualquer merge.
            // Isso garante que itens excluídos no Firebase ainda não propagados
            // (race condition) não entrem na lista de merge.
            const fbList = [];
            snapshot.forEach(doc => {
              const data = doc.data();
              if (data && data.id && !this._isDeleted(data.id)) fbList.push(data);
              // Se o item está nos tombstones mas ainda existe no Firebase, re-exclui
              else if (data && data.id && this._isDeleted(data.id)) {
                db.collection(key).doc(data.id).delete().catch(console.error);
              }
            });

            const localList = this.get(key) || [];
            const localMap = {};
            localList.forEach(item => { if (item.id) localMap[item.id] = item; });

            // Para cada item do Firebase, verificar se o local é significativamente mais novo.
            // MARGEM DE 5 SEGUNDOS: evita que caches locais levemente desatualizados (por
            // diferença de relógio, migração ou recálculo automático) sobrescrevam dados válidos
            // do Firebase quando múltiplos usuários estão ativos simultaneamente.
            const mergedList = fbList.map(fbItem => {
              const localItem = localMap[fbItem.id];
              if (!localItem) return fbItem;
              const fbTime = fbItem.atualizadoEm ? new Date(fbItem.atualizadoEm).getTime() : 0;
              const localTime = localItem.atualizadoEm ? new Date(localItem.atualizadoEm).getTime() : 0;
              const MARGIN_MS = 5000; // Local só ganha se for >5s mais novo (edição genuína do usuário)
              if (localTime > fbTime + MARGIN_MS) {
                console.log(`⚡ Merge: item local mais novo para ${key}/${fbItem.id} — preservando edição local e curando a nuvem.`);
                // Push para o Firebase para curar a nuvem (sincronização bidirecional)
                db.collection(key).doc(localItem.id).set(JSON.parse(JSON.stringify(localItem))).catch(console.error);
                return localItem; // Local ganhou: tem dados genuinamente mais recentes
              }
              return fbItem; // Firebase ganhou: fonte da verdade para edições concorrentes
            });

            // Incluir itens locais que não existem no Firebase (segurança)
            // IMPORTANTE: Verificar tombstone — itens excluídos intencionalmente NÃO devem ser restaurados
            const fbIds = new Set(fbList.map(f => f.id));
            localList.forEach(l => {
              if (l.id && !fbIds.has(l.id) && !this._isDeleted(l.id)) {
                mergedList.push(l);
                // Push para curar a nuvem
                db.collection(key).doc(l.id).set(JSON.parse(JSON.stringify(l))).catch(console.error);
              }
            });
            
            // Filtrar do merged qualquer item que conste nos tombstones (defesa em profundidade)
            const finalList = mergedList.filter(item => !this._isDeleted(item.id));

            localStorage.setItem(key, key === this.KEYS.METAS ? JSON.stringify(this._compressMetaList(finalList)) : JSON.stringify(finalList));
          }
          console.log("✅ Sincronização com Firebase concluída (merge inteligente aplicado).");
        }
      } catch (error) {
        console.error("❌ Falha ao sincronizar dados com o Firebase, usando cache local:", error);
      }
    }

    // 2. Fallback de inicialização local padrão (caso o Firebase esteja inativo ou offline)
    let users = this.get(this.KEYS.USERS);
    const shouldInitialize = !Array.isArray(users) || users.length === 0;
    if (shouldInitialize) {
      localStorage.setItem(this.KEYS.USERS, JSON.stringify(this.defaultUsers()));
      localStorage.setItem(this.KEYS.METAS, JSON.stringify(this._compressMetaList(this.defaultMetas())));
      localStorage.setItem(this.KEYS.ACOES, JSON.stringify(this.defaultAcoes()));
      localStorage.setItem(this.KEYS.BONUS, JSON.stringify(this.defaultBonus()));
      localStorage.setItem(this.KEYS.REGRAS, JSON.stringify(this.defaultRegras()));
      localStorage.setItem(this.KEYS.AREAS, JSON.stringify(this.defaultAreas()));
      localStorage.setItem(this.KEYS.HISTORICO_AREAS, JSON.stringify(this.defaultHistoricoAreas()));
      users = this.get(this.KEYS.USERS);
    }
    
    // Migrate: add areas/historico if missing (existing installs)
    if (!localStorage.getItem(this.KEYS.AREAS)) {
      localStorage.setItem(this.KEYS.AREAS, JSON.stringify(this.defaultAreas()));
    }
    if (!localStorage.getItem(this.KEYS.HISTORICO_AREAS)) {
      localStorage.setItem(this.KEYS.HISTORICO_AREAS, JSON.stringify(this.defaultHistoricoAreas()));
    }
    
    // Migrate: Ensure admin exists and password is updated
    if (users && users.length > 0) {
      const adminUser = users.find(u => u.email === 'admin@empresa.com');
      if (!adminUser) {
        users.push({ id: 'admin', nome: 'Administrador', email: 'admin@empresa.com', senha: 'tofu2025', cargo: 'Administrador do Sistema', area: 'TI', nivel: 'Admin', salario: 0, avatar: 'AD', ativo: true });
        this.set(this.KEYS.USERS, users);
      } else if (adminUser.senha === 'admin') {
        adminUser.senha = 'tofu2025';
        this.set(this.KEYS.USERS, users);
      }
    }

    // Recálculo global de migração: roda UMA ÚNICA VEZ por versão de código.
    // Garante retroatividade dos bugfixes sem sobrescrever dados válidos em cargas subsequentes.
    const MIGRATION_KEY = 'mp_migration_recalc_v5';
    if (!localStorage.getItem(MIGRATION_KEY)) {
      console.log('🔧 Executando migração de dados v5 (única vez) — persistindo mesesData e corrigindo P...');
      this.globalRecalcMetas();
      localStorage.setItem(MIGRATION_KEY, new Date().toISOString());
      console.log('✅ Migração v5 concluída.');
    }

    // Migração v6: Atualizar todos os meses já salvos na base de '/25' para '/26'
    const MIGRATION_KEY_V6 = 'mp_migration_year_v6';
    if (!localStorage.getItem(MIGRATION_KEY_V6)) {
      console.log('🔧 Executando migração de dados v6 — atualizando ano de /25 para /26...');
      let metas = this.get(this.KEYS.METAS) || [];
      let updatedAny = false;
      metas.forEach(m => {
        let changed = false;
        if (m.mesesData && Array.isArray(m.mesesData)) {
          m.mesesData.forEach(monthObj => {
            if (monthObj.mes && monthObj.mes.includes('/25')) {
              monthObj.mes = monthObj.mes.replace('/25', '/26');
              changed = true;
            }
          });
        }
        if (changed) {
          updatedAny = true;
          // Puxa o item inteiro atualizado e joga pro Firebase individualmente para evitar concorrência
          if (isFirebaseActive && db) {
            const cleanItem = JSON.parse(JSON.stringify(m));
            db.collection(this.KEYS.METAS).doc(m.id).set(cleanItem).catch(e => console.error(e));
          }
        }
      });
      if (updatedAny) {
        localStorage.setItem(this.KEYS.METAS, JSON.stringify(this._compressMetaList(metas)));
        console.log('✅ Dados atualizados com sucesso para 2026!');
      }
      localStorage.setItem(MIGRATION_KEY_V6, new Date().toISOString());
      
      // Força um recarregamento total da página para garantir que o cache de scripts antigos seja ignorado
      if (updatedAny) {
        setTimeout(() => window.location.reload(true), 1500);
      }
    }

    // Migração v7: Varredura agressiva final para '/25' (garante que quem pulou a v6 seja corrigido)
    const MIGRATION_KEY_V7 = 'mp_migration_year_v7_force';
    if (!localStorage.getItem(MIGRATION_KEY_V7)) {
      let metas = this.get(this.KEYS.METAS) || [];
      let updatedAny = false;
      metas.forEach(m => {
        if (m.mesesData && Array.isArray(m.mesesData)) {
          m.mesesData.forEach(monthObj => {
            if (monthObj.mes && monthObj.mes.includes('/25')) {
              monthObj.mes = monthObj.mes.replace('/25', '/26');
              updatedAny = true;
            }
          });
        }
      });
      if (updatedAny) {
        localStorage.setItem(this.KEYS.METAS, JSON.stringify(this._compressMetaList(metas)));
        setTimeout(() => window.location.reload(true), 1500);
      }
      localStorage.setItem(MIGRATION_KEY_V7, new Date().toISOString());
    }

    // Migração v8: Corrigir acumulados auto-replicados em metas Data Provider.
    const MIGRATION_KEY_V8 = 'mp_migration_provider_fix_v8';
    if (!localStorage.getItem(MIGRATION_KEY_V8)) {
      console.log('Executando migracao v8 - limpando acumulado auto-replicado em metas Data Provider...');
      let metasV8 = this.get(this.KEYS.METAS) || [];
      let updatedV8 = false;
      metasV8.forEach(function(m) {
        if (m.acumulacao === 'provider' && m.mesesData && Array.isArray(m.mesesData)) {
          m.mesesData.forEach(function(monthObj) {
            var pontualR = monthObj.pontual ? monthObj.pontual.r : undefined;
            var isNa = monthObj.pontual ? monthObj.pontual.na : false;
            var acumR = monthObj.acumulado ? monthObj.acumulado.r : undefined;
            if (pontualR === null && !isNa && acumR !== null && acumR !== undefined) {
              monthObj.acumulado.r = null;
              monthObj.acumulado.d = null;
              monthObj.acumulado.nota = null;
              updatedV8 = true;
            }
          });
        }
      });
      if (updatedV8) {
        localStorage.setItem(this.KEYS.METAS, JSON.stringify(this._compressMetaList(metasV8)));
        if (isFirebaseActive && db) {
          metasV8.filter(function(m) { return m.acumulacao === 'provider'; }).forEach(function(m) {
            db.collection('mp_metas').doc(m.id).set(JSON.parse(JSON.stringify(m))).catch(function(e) { console.error(e); });
          });
        }
        console.log('Migracao v8 concluida - acumulados indevidos removidos.');
      }
      localStorage.setItem(MIGRATION_KEY_V8, new Date().toISOString());
    }

    // Inicia sincronizacao em tempo real para manter todos os usuarios sincronizados
    this.startRealtimeSync();
  },

  globalRecalcMetas() {
    let metas = this.getMetas();
    if (!metas || metas.length === 0) return;

    // Passo 1: Recalcula todas as metas Individuais e Compartilhadas primeiro
    metas.filter(m => m.tipo !== 'composta').forEach(m => {
      if (m.mesesData) this.recalcMesesData(m);
    });
    // IMPORTANTE: usa localStorage diretamente para NÃO sobrescrever o Firebase.
    // O Firebase é sempre a fonte da verdade — a migração só corrige o cache local.
    localStorage.setItem(this.KEYS.METAS, JSON.stringify(this._compressMetaList(metas)));

    // Passo 2: Recalcula as metas Compostas (que agora lerão as notas corrigidas das filhas do banco)
    metas = this.getMetas();
    metas.filter(m => m.tipo === 'composta').forEach(m => {
      if (m.mesesData) this.recalcMesesData(m);
    });
    localStorage.setItem(this.KEYS.METAS, JSON.stringify(this._compressMetaList(metas)));
  },

  // =====================================================================
  // SINCRONIZAÇÃO EM TEMPO REAL (onSnapshot)
  // Mantém todos os usuários sincronizados sem precisar recarregar a página.
  // A origem da verdade é sempre o Firebase Firestore.
  // =====================================================================
  startRealtimeSync() {
    if (!isFirebaseActive || !db) return;
    if (this._realtimeSyncing) return; // Previne configuração dupla
    this._realtimeSyncing = true;

    // Aguarda 500ms para que a página termine de renderizar antes de ativar os listeners.
    // Delay reduzido de 2s para minimizar a janela em que mudanças podem ser perdidas.
    setTimeout(() => {
      const syncKeys = [
        this.KEYS.METAS,
        this.KEYS.ACOES,
        this.KEYS.USERS,
        this.KEYS.AREAS,
        this.KEYS.HISTORICO_AREAS
      ];

      syncKeys.forEach(key => {
        let isFirstSnapshot = true;

        db.collection(key).onSnapshot(snapshot => {
          // O primeiro disparo do onSnapshot é o estado atual (já sincronizado no init)
          // Ignoramos para evitar re-render desnecessário na inicialização
          if (isFirstSnapshot) {
            isFirstSnapshot = false;
            return;
          }

          if (!snapshot) return;

          const fbList = [];
          // CORREÇÃO: Re-excluir do Firebase itens que constam nos tombstones locais
          // mas ainda aparecem no snapshot (race condition entre delete e onSnapshot)
          snapshot.forEach(doc => {
            const data = doc.data();
            if (!data || !data.id) return;
            if (this._isDeleted(data.id)) {
              // Item excluído localmente ainda existe no Firebase — re-exclui
              db.collection(key).doc(data.id).delete().catch(console.error);
            } else {
              fbList.push(data);
            }
          });

          // CORREÇÃO: Não retornar prematuramente quando fbList está vazio após filtrar tombstones.
          // O localStorage precisa ser atualizado para refletir a lista sem os itens excluídos.

          // TRAVA ANTI-RACE-CONDITION: Se um anexo foi salvo nos últimos 10 segundos,
          // ignora completamente a atualização do Firebase para METAS.
          // Isso impede que o onSnapshot (que dispara milissegundos após o set())
          // sobrescreva o localStorage com dados antigos do Firebase antes da confirmação.
          if (key === this.KEYS.METAS && this._recentAnexoSave && (Date.now() - this._recentAnexoSave) < 10000) {
            console.log('🛡️ onSnapshot ignorado para METAS — proteção de anexo recente ativo');
            return;
          }

          // Merge inteligente: não sobrescreve dados locais mais novos com dados do Firebase
          // Isso protege contra race conditions (ex: anexo salvo localmente desaparece ao onSnapshot disparar)
          const MARGIN_MS = 5000;
          const localList = JSON.parse(localStorage.getItem(key) || '[]');
          const localMap = {};
          if (Array.isArray(localList)) {
            localList.forEach(item => { if (item && item.id) localMap[item.id] = item; });
          }

          const mergedList = fbList.map(fbItem => {
            const localItem = localMap[fbItem.id];
            if (!localItem) return fbItem;
            const fbTime = new Date(fbItem.atualizadoEm || 0).getTime();
            const localTime = new Date(localItem.atualizadoEm || 0).getTime();
            // Se o item local for genuinamente mais novo, preserva o local
            if (localTime > fbTime + MARGIN_MS) return localItem;
            // Caso especial: preservar anexos do mesesData locais se o Firebase perdeu (race condition do upload)
            if (key === this.KEYS.METAS && localItem.mesesData && fbItem.mesesData) {
              const merged = { ...fbItem };
              merged.mesesData = fbItem.mesesData.map((fbMonth, idx) => {
                const localMonth = localItem.mesesData[idx];
                // Se o mês local tem mais anexos, preserva (evita apagar anexo recém-salvo)
                if (localMonth && Array.isArray(localMonth.anexos) && localMonth.anexos.length > (fbMonth.anexos || []).length) {
                  return { ...fbMonth, anexos: localMonth.anexos };
                }
                return fbMonth;
              });
              return merged;
            }
            return fbItem;
          });

          // Incluir itens locais que não existem no Firebase (segurança)
          const fbIds = new Set(fbList.map(f => f.id));
          if (Array.isArray(localList)) {
            localList.forEach(l => {
              if (l && l.id && !fbIds.has(l.id) && !this._isDeleted(l.id)) {
                mergedList.push(l);
              }
            });
          }

          const newStr = JSON.stringify(mergedList);
          const toSave = (key === this.KEYS.METAS) ? JSON.stringify(this._compressMetaList(mergedList)) : newStr;
          const prevStr = localStorage.getItem(key);
          if (toSave === prevStr) return;

          // Atualiza o localStorage com os dados mesclados
          localStorage.setItem(key, toSave);
          console.log(`🔄 Dados atualizados em tempo real (merge): ${key}`);

          // Atualiza a UI somente se o usuário não estiver editando (modal fechado)
          const isModalOpen = !!document.querySelector('.modal-overlay');
          if (!isModalOpen && typeof App !== 'undefined' && App.currentRoute && App.currentRoute !== 'login') {
            clearTimeout(this._refreshDebounce);
            this._refreshDebounce = setTimeout(() => {
              // Dupla verificação: não interrompe se modal abriu enquanto aguardava
              if (!document.querySelector('.modal-overlay')) {
                this._showSyncNotification();
                App.refreshPage();
              }
            }, 600);
          } else if (isModalOpen) {
            // Modal aberto: marca que há dados pendentes para atualizar ao fechar
            this._hasPendingSync = true;
          }
        }, error => {
          console.error(`[Sync em tempo real] Erro na coleção ${key}:`, error);
        });
      });

      // Observa fechamento de modal para aplicar sync pendente
      document.addEventListener('click', (e) => {
        if (this._hasPendingSync && !document.querySelector('.modal-overlay')) {
          this._hasPendingSync = false;
          this._showSyncNotification();
          if (typeof App !== 'undefined') App.refreshPage();
        }
      }, true);

      console.log('🟢 Sincronização em tempo real ativada. Todos os usuários estão conectados.');
    }, 2000);
  },

  _showSyncNotification() {
    // Toast discreto desativado a pedido do usuário
    // if (typeof Components !== 'undefined' && Components.toast) {
    //   Components.toast('🔄 Dados atualizados por outro usuário.', 'info', 2500);
    // }
  },

  // Sincronização forçada: puxar TUDO do Firebase agora, sem anti-amnésia.
  // Firebase é sempre a fonte da verdade neste caso.
  async forceSyncFromFirebase() {
    if (!isFirebaseActive || !db) {
      Components.toast('⚠️ Firebase inativo — rodando em modo local.', 'error');
      return;
    }

    // Animação no botão
    const btn = document.getElementById('btn-force-sync');
    const icon = document.getElementById('sync-icon');
    if (btn) btn.disabled = true;
    if (icon) icon.style.animation = 'spin 0.8s linear infinite';

    // Injeta keyframe de rotação se necessário
    if (!document.getElementById('sync-keyframes')) {
      const style = document.createElement('style');
      style.id = 'sync-keyframes';
      style.textContent = '@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }';
      document.head.appendChild(style);
    }

    try {
      // PASSO 0: Carregar tombstones do Firebase ANTES de processar qualquer coleção.
      // Isso garante que exclusões feitas em outros dispositivos sejam respeitadas aqui também.
      await this._loadTombstonesFromFirebase();

      const syncKeys = Object.values(this.KEYS).filter(k => k !== this.KEYS.SESSION);

      for (const key of syncKeys) {
        const snapshot = await db.collection(key).get();
        if (snapshot.empty) {
          // Se o Firebase estiver vazio, fazemos o upload da base local para inicializá-lo!
          const localData = this.get(key).filter(item => item && item.id && !this._isDeleted(item.id));
          if (localData.length > 0) {
            console.warn(`Coleção ${key} vazia na nuvem. Enviando dados locais para o Firebase...`);
            localData.forEach(item => {
              db.collection(key).doc(item.id).set(item).catch(e => {
                console.error('Erro ao semear Firebase:', e);
                if (typeof Components !== 'undefined' && Components.toast) Components.toast('❌ Erro de permissão no Firebase.', 'error');
              });
            });
          }
          continue;
        }

        const fbList = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          if (!data || !data.id) return;
          if (this._isDeleted(data.id)) {
            // Item com tombstone ainda existe no Firebase — re-exclui
            db.collection(key).doc(data.id).delete()
              .then(() => console.log(`🗑️ Sync forçada: ${data.id} excluído do Firebase (${key}).`))
              .catch(e => console.error(`Erro ao re-excluir ${data.id} do Firebase:`, e));
          } else {
            fbList.push(data);
          }
        });

        // Atualiza o localStorage (mesmo que fbList esteja vazio — significa que tudo foi excluído)
        localStorage.setItem(key, key === this.KEYS.METAS ? JSON.stringify(this._compressMetaList(fbList)) : JSON.stringify(fbList));
      }

      this.globalRecalcMetas();
      Components.toast('✅ Dados sincronizados com sucesso!', 'success');
      App.refreshPage();
    } catch (err) {
      console.error('Erro na sincronização forçada:', err);
      Components.toast('❌ Falha ao sincronizar. Verifique a conexão.', 'error');
    } finally {
      if (btn) btn.disabled = false;
      if (icon) icon.style.animation = '';
    }
  },

  async seedFirebaseDatabase() {
    if (!isFirebaseActive || !db) return;
    try {
      const seedData = {
        [this.KEYS.USERS]: this.get(this.KEYS.USERS).length > 0 ? this.get(this.KEYS.USERS) : this.defaultUsers(),
        [this.KEYS.METAS]: this.get(this.KEYS.METAS).length > 0 ? this.get(this.KEYS.METAS) : this.defaultMetas(),
        [this.KEYS.ACOES]: this.get(this.KEYS.ACOES).length > 0 ? this.get(this.KEYS.ACOES) : this.defaultAcoes(),
        [this.KEYS.BONUS]: this.get(this.KEYS.BONUS).length > 0 ? this.get(this.KEYS.BONUS) : this.defaultBonus(),
        [this.KEYS.REGRAS]: this.get(this.KEYS.REGRAS).length > 0 ? this.get(this.KEYS.REGRAS) : this.defaultRegras(),
        [this.KEYS.AREAS]: this.get(this.KEYS.AREAS).length > 0 ? this.get(this.KEYS.AREAS) : this.defaultAreas(),
        [this.KEYS.HISTORICO_AREAS]: this.get(this.KEYS.HISTORICO_AREAS).length > 0 ? this.get(this.KEYS.HISTORICO_AREAS) : this.defaultHistoricoAreas()
      };

      for (const [key, list] of Object.entries(seedData)) {
        console.log(`Semeando coleção ${key}...`);
        // Divide em chunks de 400 para respeitar limite do batch do Firestore
        const chunks = [];
        for (let i = 0; i < list.length; i += 400) {
          chunks.push(list.slice(i, i + 400));
        }
        
        for (const chunk of chunks) {
          const batch = db.batch();
          chunk.forEach(item => {
            const docRef = db.collection(key).doc(item.id);
            const cleanItem = JSON.parse(JSON.stringify(item));
            batch.set(docRef, cleanItem);
          });
          await batch.commit();
        }
        localStorage.setItem(key, JSON.stringify(list));
      }
      console.log("🌱 Semeamento do Firestore concluído com sucesso!");
    } catch (e) {
      console.error("Erro ao semear o Firestore:", e);
    }
  },

  get(key) {
    const value = localStorage.getItem(key);
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      if (key !== this.KEYS.SESSION && !Array.isArray(parsed)) {
        return [];
      }
      // Hidrata metas ao ler — restaura estrutura completa de mesesData comprimido
      if (key === this.KEYS.METAS && Array.isArray(parsed)) {
        return parsed.map(m => this._hydrateMeta(m));
      }
      return parsed;
    } catch (error) {
      console.warn(`DataStore: invalid JSON for ${key} — resetting value`, error);
      localStorage.removeItem(key);
      return [];
    }
  },

  set(key, data) {
    // Comprime metas antes de persistir para economizar espaço no localStorage
    const toStore = (key === this.KEYS.METAS) ? this._compressMetaList(data) : data;
    localStorage.setItem(key, JSON.stringify(toStore));
    
    // Sincronização em Lote com o Firebase — apenas para arrays de objetos com .id
    if (isFirebaseActive && db && key !== this.KEYS.SESSION && Array.isArray(data) && data.length > 0 && data[0] && data[0].id) {
      try {
        // Divide em blocos de 400 para evitar o limite de 500 do Firestore
        const chunks = [];
        for (let i = 0; i < data.length; i += 400) {
          chunks.push(data.slice(i, i + 400));
        }
        
        chunks.forEach(chunk => {
          const batch = db.batch();
          chunk.forEach(item => {
            const docRef = db.collection(key).doc(item.id);
            const cleanItem = JSON.parse(JSON.stringify(item));
            batch.set(docRef, cleanItem);
          });
          batch.commit().catch(e => console.error(`Erro ao salvar lote no Firebase para ${key}:`, e));
        });
      } catch (err) {
        console.error(`Falha ao preparar lote do Firebase para ${key}:`, err);
      }
    }
  },

  getById(key, id) { return this.get(key).find(i => i.id === id); },
 
  add(key, item) {
    const data = this.get(key);
    // Se o item já tiver um id customizado (ex: código da meta), usa esse; caso contrário gera um hash aleatório
    if (!item.id) {
      item.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }
    item.criadoEm = new Date().toISOString();
    item.atualizadoEm = item.criadoEm;
    data.push(item);
    // Grava apenas no localStorage localmente; Firebase recebe só o documento novo
    localStorage.setItem(key, JSON.stringify(data));

    if (isFirebaseActive && db && key !== this.KEYS.SESSION) {
      const cleanItem = JSON.parse(JSON.stringify(item));
      db.collection(key).doc(item.id).set(cleanItem)
        .catch(e => {
          console.error(`Erro ao adicionar registro no Firebase para ${key}:`, e);
          if (typeof Components !== 'undefined' && Components.toast) {
            Components.toast('❌ Erro de permissão. O Firebase bloqueou o salvamento. Verifique as regras (Rules) do Firestore.', 'error');
          }
        });
    }
    return item;
  },
 
  update(key, id, updates) {
    const data = this.get(key);
    const idx = data.findIndex(i => i.id === id);
    if (idx !== -1) { 
      data[idx] = { ...data[idx], ...updates, atualizadoEm: new Date().toISOString() }; 
      // Grava apenas no localStorage — NÃO faz batch de todos os itens no Firebase.
      // O Firebase recebe somente o documento modificado, evitando race conditions
      // entre usuários que estejam salvando simultaneamente.
      localStorage.setItem(key, JSON.stringify(data));
      
      if (isFirebaseActive && db && key !== this.KEYS.SESSION) {
        const cleanItem = JSON.parse(JSON.stringify(data[idx]));
        db.collection(key).doc(id).set(cleanItem)
          .catch(e => {
            console.error(`Erro ao atualizar registro no Firebase para ${key}:`, e);
            if (typeof Components !== 'undefined' && Components.toast) {
              Components.toast('❌ Erro de permissão. O Firebase bloqueou o salvamento. Verifique as regras (Rules) do Firestore.', 'error');
            }
          });
      }
    }
    return data[idx];
  },
 
  remove(key, id) {
    // 1. Registrar tombstone ANTES de qualquer operação (local + Firebase)
    // _registerDeleted já persiste no Firebase via TOMBSTONES_FB
    this._registerDeleted(id);
    
    const data = this.get(key).filter(i => i.id !== id);
    localStorage.setItem(key, JSON.stringify(data));

    // 2. Exclui o documento individual do Firebase com re-tentativas
    if (isFirebaseActive && db && key !== this.KEYS.SESSION) {
      const attemptDelete = (retries = 5) => {
        db.collection(key).doc(id).delete()
          .then(() => {
            console.log(`✅ Registro ${id} excluído do Firebase (${key}).`);
            // Proteção pós-onSnapshot: se o item voltou ao localStorage, remove novamente
            const current = this.get(key);
            if (current.some(i => i.id === id)) {
              localStorage.setItem(key, JSON.stringify(current.filter(i => i.id !== id)));
              console.warn(`⚠️ Item ${id} reentrou via onSnapshot — removido novamente do localStorage.`);
            }
          })
          .catch(e => {
            console.error(`Erro ao deletar registro no Firebase para ${key}:`, e);
            if (retries > 0) {
              console.log(`↩ Tentando novamente... (${retries} tentativas restantes)`);
              setTimeout(() => attemptDelete(retries - 1), 2000);
            }
          });
      };
      attemptDelete();
    }
  },

  defaultUsers() {
    return [
      { id: 'u1', nome: 'Ana Silva', email: 'ana@empresa.com', senha: '123456', cargo: 'Diretora Comercial', area: 'Comercial', nivel: 'Diretoria', salario: 18000, avatar: 'AS', ativo: true },
      { id: 'u2', nome: 'Carlos Santos', email: 'carlos@empresa.com', senha: '123456', cargo: 'Gerente de Operações', area: 'Operações', nivel: 'Gerência', salario: 12000, avatar: 'CS', ativo: true },
      { id: 'u3', nome: 'Juliana Costa', email: 'juliana@empresa.com', senha: '123456', cargo: 'Coordenadora de Marketing', area: 'Marketing', nivel: 'Coordenação', salario: 8500, avatar: 'JC', ativo: true },
      { id: 'u4', nome: 'Rafael Lima', email: 'rafael@empresa.com', senha: '123456', cargo: 'Analista Sr. de TI', area: 'Tecnologia', nivel: 'Analista', salario: 7200, avatar: 'RL', ativo: true },
      { id: 'u5', nome: 'Beatriz Oliveira', email: 'beatriz@empresa.com', senha: '123456', cargo: 'Analista de RH', area: 'RH', nivel: 'Analista', salario: 5800, avatar: 'BO', ativo: true },
      { id: 'u6', nome: 'Pedro Mendes', email: 'pedro@empresa.com', senha: '123456', cargo: 'Supervisor de Logística', area: 'Logística', nivel: 'Supervisão', salario: 6500, avatar: 'PM', ativo: true },
      { id: 'u7', nome: 'Fernanda Rocha', email: 'fernanda@empresa.com', senha: '123456', cargo: 'Gerente Financeiro', area: 'Financeiro', nivel: 'Gerência', salario: 11000, avatar: 'FR', ativo: true },
      { id: 'u8', nome: 'Lucas Almeida', email: 'lucas@empresa.com', senha: '123456', cargo: 'Analista Comercial', area: 'Comercial', nivel: 'Analista', salario: 5500, avatar: 'LA', ativo: true },
      { id: 'admin', nome: 'Administrador', email: 'admin@empresa.com', senha: 'tofu2025', cargo: 'Administrador do Sistema', area: 'TI', nivel: 'Admin', salario: 0, avatar: 'AD', ativo: true }
    ];
  },

  defaultMetas() {
    return [
      { id: 'm1', titulo: 'Receita Bruta Anual', descricao: 'Atingir a receita bruta planejada para o ano fiscal', responsavelId: 'u1', tipo: 'corporativa', isGatilho: true, categoria: 'Financeiro', unidade: 'R$', valorAlvo: 5000000, valorAtual: 3750000, peso: 25, status: 'em_andamento', periodo: '2026', mesInicio: 1, mesFim: 12, historico: [{mes:'Jan',valor:280000},{mes:'Fev',valor:350000},{mes:'Mar',valor:420000},{mes:'Abr',valor:380000},{mes:'Mai',valor:450000},{mes:'Jun',valor:390000},{mes:'Jul',valor:480000},{mes:'Ago',valor:0},{mes:'Set',valor:0},{mes:'Out',valor:0},{mes:'Nov',valor:0},{mes:'Dez',valor:0}] },
      { id: 'm2', titulo: 'Margem de Lucro Líquido', descricao: 'Manter a margem de lucro líquido acima da meta', responsavelId: 'u7', tipo: 'corporativa', isGatilho: true, categoria: 'Financeiro', unidade: '%', valorAlvo: 15, valorAtual: 13.2, peso: 20, status: 'em_andamento', periodo: '2026', mesInicio: 1, mesFim: 12, historico: [{mes:'Jan',valor:11},{mes:'Fev',valor:12.5},{mes:'Mar',valor:13},{mes:'Abr',valor:12.8},{mes:'Mai',valor:13.5},{mes:'Jun',valor:13.2},{mes:'Jul',valor:13.2},{mes:'Ago',valor:0},{mes:'Set',valor:0},{mes:'Out',valor:0},{mes:'Nov',valor:0},{mes:'Dez',valor:0}] },
      { id: 'm13', titulo: 'Geração de Caixa Livre', descricao: 'Gatilho de geração de caixa operacional livre de despesas', responsavelId: 'u1', tipo: 'corporativa', isGatilho: true, categoria: 'Financeiro', unidade: 'R$', valorAlvo: 1000000, valorAtual: 900000, peso: 15, status: 'em_andamento', periodo: '2026', mesInicio: 1, mesFim: 12, historico: [{mes:'Jan',valor:80000},{mes:'Fev',valor:90000},{mes:'Mar',valor:100000},{mes:'Abr',valor:95000},{mes:'Mai',valor:110000},{mes:'Jun',valor:105000},{mes:'Jul',valor:120000},{mes:'Ago',valor:0},{mes:'Set',valor:0},{mes:'Out',valor:0},{mes:'Nov',valor:0},{mes:'Dez',valor:0}] },
      { id: 'm3', titulo: 'Novos Clientes', descricao: 'Conquistar novos clientes corporativos', responsavelId: 'u1', tipo: 'area', categoria: 'Comercial', unidade: 'un', valorAlvo: 50, valorAtual: 38, peso: 15, status: 'em_andamento', periodo: '2026', mesInicio: 1, mesFim: 12, historico: [{mes:'Jan',valor:4},{mes:'Fev',valor:6},{mes:'Mar',valor:5},{mes:'Abr',valor:7},{mes:'Mai',valor:8},{mes:'Jun',valor:4},{mes:'Jul',valor:4},{mes:'Ago',valor:0},{mes:'Set',valor:0},{mes:'Out',valor:0},{mes:'Nov',valor:0},{mes:'Dez',valor:0}] },
      { id: 'm4', titulo: 'Satisfação do Cliente (NPS)', descricao: 'Elevar o NPS para nível de excelência', responsavelId: 'u3', tipo: 'area', categoria: 'Marketing', unidade: 'pts', valorAlvo: 75, valorAtual: 72, peso: 10, status: 'em_andamento', periodo: '2026', mesInicio: 1, mesFim: 12, historico: [{mes:'Jan',valor:65},{mes:'Fev',valor:68},{mes:'Mar',valor:70},{mes:'Abr',valor:69},{mes:'Mai',valor:71},{mes:'Jun',valor:72},{mes:'Jul',valor:72},{mes:'Ago',valor:0},{mes:'Set',valor:0},{mes:'Out',valor:0},{mes:'Nov',valor:0},{mes:'Dez',valor:0}] },
      { id: 'm5', titulo: 'Redução de Custos Operacionais', descricao: 'Reduzir custos operacionais em relação ao ano anterior', responsavelId: 'u2', tipo: 'area', categoria: 'Operações', unidade: '%', valorAlvo: 10, valorAtual: 10.5, peso: 15, status: 'concluida', periodo: '2026', mesInicio: 1, mesFim: 6, historico: [{mes:'Jan',valor:2},{mes:'Fev',valor:4.5},{mes:'Mar',valor:6},{mes:'Abr',valor:7.8},{mes:'Mai',valor:9.2},{mes:'Jun',valor:10.5}] },
      { id: 'm6', titulo: 'Uptime de Sistemas', descricao: 'Garantir disponibilidade dos sistemas críticos', responsavelId: 'u4', tipo: 'individual', categoria: 'Tecnologia', unidade: '%', valorAlvo: 99.9, valorAtual: 99.7, peso: 10, status: 'em_andamento', periodo: '2026', mesInicio: 1, mesFim: 12, historico: [{mes:'Jan',valor:99.8},{mes:'Fev',valor:99.5},{mes:'Mar',valor:99.9},{mes:'Abr',valor:99.6},{mes:'Mai',valor:99.8},{mes:'Jun',valor:99.7},{mes:'Jul',valor:99.7},{mes:'Ago',valor:0},{mes:'Set',valor:0},{mes:'Out',valor:0},{mes:'Nov',valor:0},{mes:'Dez',valor:0}] },
      { id: 'm7', titulo: 'Turnover Voluntário', descricao: 'Reduzir o índice de turnover voluntário', responsavelId: 'u5', tipo: 'area', categoria: 'RH', unidade: '%', valorAlvo: 5, valorAtual: 6.2, peso: 10, status: 'atrasada', periodo: '2026', mesInicio: 1, mesFim: 12, historico: [{mes:'Jan',valor:8},{mes:'Fev',valor:7.5},{mes:'Mar',valor:7.2},{mes:'Abr',valor:7},{mes:'Mai',valor:6.5},{mes:'Jun',valor:6.2},{mes:'Jul',valor:6.2},{mes:'Ago',valor:0},{mes:'Set',valor:0},{mes:'Out',valor:0},{mes:'Nov',valor:0},{mes:'Dez',valor:0}] },
      { id: 'm8', titulo: 'Prazo de Entrega', descricao: 'Reduzir tempo médio de entrega para clientes', responsavelId: 'u6', tipo: 'individual', categoria: 'Logística', unidade: 'dias', valorAlvo: 3, valorAtual: 3.8, peso: 10, status: 'atrasada', periodo: '2026', mesInicio: 1, mesFim: 12, historico: [{mes:'Jan',valor:5.2},{mes:'Fev',valor:4.8},{mes:'Mar',valor:4.5},{mes:'Abr',valor:4.2},{mes:'Mai',valor:4},{mes:'Jun',valor:3.8},{mes:'Jul',valor:3.8},{mes:'Ago',valor:0},{mes:'Set',valor:0},{mes:'Out',valor:0},{mes:'Nov',valor:0},{mes:'Dez',valor:0}] },
      { id: 'm9', titulo: 'Ticket Médio', descricao: 'Aumentar o ticket médio de vendas', responsavelId: 'u8', tipo: 'individual', categoria: 'Comercial', unidade: 'R$', valorAlvo: 2500, valorAtual: 2280, peso: 10, status: 'em_andamento', periodo: '2026', mesInicio: 1, mesFim: 12, historico: [{mes:'Jan',valor:1800},{mes:'Fev',valor:1950},{mes:'Mar',valor:2050},{mes:'Abr',valor:2100},{mes:'Mai',valor:2200},{mes:'Jun',valor:2280},{mes:'Jul',valor:2280},{mes:'Ago',valor:0},{mes:'Set',valor:0},{mes:'Out',valor:0},{mes:'Nov',valor:0},{mes:'Dez',valor:0}] },
      { id: 'm10', titulo: 'Treinamentos Realizados', descricao: 'Garantir horas de treinamento por colaborador', responsavelId: 'u5', tipo: 'area', categoria: 'RH', unidade: 'horas', valorAlvo: 40, valorAtual: 42, peso: 5, status: 'concluida', periodo: '2026', mesInicio: 1, mesFim: 6, historico: [{mes:'Jan',valor:6},{mes:'Fev',valor:8},{mes:'Mar',valor:7},{mes:'Abr',valor:8},{mes:'Mai',valor:7},{mes:'Jun',valor:6}] },
      { id: 'm11', titulo: 'Leads Qualificados', descricao: 'Gerar leads qualificados via campanhas digitais', responsavelId: 'u3', tipo: 'individual', categoria: 'Marketing', unidade: 'un', valorAlvo: 500, valorAtual: 320, peso: 8, status: 'em_andamento', periodo: '2026', mesInicio: 1, mesFim: 12, historico: [{mes:'Jan',valor:35},{mes:'Fev',valor:42},{mes:'Mar',valor:48},{mes:'Abr',valor:50},{mes:'Mai',valor:55},{mes:'Jun',valor:45},{mes:'Jul',valor:45},{mes:'Ago',valor:0},{mes:'Set',valor:0},{mes:'Out',valor:0},{mes:'Nov',valor:0},{mes:'Dez',valor:0}] },
      { id: 'm12', titulo: 'Automação de Processos', descricao: 'Implementar automação nos processos internos chave', responsavelId: 'u4', tipo: 'individual', categoria: 'Tecnologia', unidade: 'processos', valorAlvo: 8, valorAtual: 5, peso: 7, status: 'em_andamento', periodo: '2026', mesInicio: 1, mesFim: 12, historico: [{mes:'Jan',valor:0},{mes:'Fev',valor:1},{mes:'Mar',valor:1},{mes:'Abr',valor:1},{mes:'Mai',valor:1},{mes:'Jun',valor:1},{mes:'Jul',valor:0},{mes:'Ago',valor:0},{mes:'Set',valor:0},{mes:'Out',valor:0},{mes:'Nov',valor:0},{mes:'Dez',valor:0}] }
    ];
  },

  defaultAcoes() {
    return [
      { id: 'a1', metaId: 'm7', titulo: 'Pesquisa de clima organizacional', responsavelId: 'u5', status: 'concluida', prazo: '2026-03-30', descricao: 'Aplicar pesquisa de clima para identificar pontos de melhoria' },
      { id: 'a2', metaId: 'm7', titulo: 'Programa de benefícios flexíveis', responsavelId: 'u5', status: 'em_andamento', prazo: '2026-08-30', descricao: 'Implementar pacote de benefícios flexíveis' },
      { id: 'a3', metaId: 'm8', titulo: 'Otimizar rotas de entrega', responsavelId: 'u6', status: 'em_andamento', prazo: '2026-09-30', descricao: 'Revisar e otimizar rotas com novo software de roteirização' },
      { id: 'a4', metaId: 'm3', titulo: 'Campanha de prospecção ativa', responsavelId: 'u8', status: 'em_andamento', prazo: '2026-10-30', descricao: 'Realizar campanha de prospecção ativa em novos segmentos' },
      { id: 'a5', metaId: 'm1', titulo: 'Lançamento de novo produto', responsavelId: 'u1', status: 'nao_iniciada', prazo: '2026-09-15', descricao: 'Lançar nova linha de produtos premium' },
      { id: 'a6', metaId: 'm4', titulo: 'Programa de fidelização', responsavelId: 'u3', status: 'em_andamento', prazo: '2026-07-30', descricao: 'Criar programa de fidelização e pós-venda' },
      { id: 'a7', metaId: 'm6', titulo: 'Migração para cloud', responsavelId: 'u4', status: 'em_andamento', prazo: '2026-11-30', descricao: 'Migrar servidores principais para infraestrutura cloud' },
      { id: 'a8', metaId: 'm2', titulo: 'Renegociação com fornecedores', responsavelId: 'u7', status: 'concluida', prazo: '2026-04-30', descricao: 'Renegociar contratos com principais fornecedores' }
    ];
  },

  defaultBonus() {
    return [
      { id: 'b1', periodo: '2025-S2', userId: 'u1', salarioBase: 18000, performance: 92, bonusCalculado: 24840, status: 'pago', dataPagamento: '2026-02-15' },
      { id: 'b2', periodo: '2025-S2', userId: 'u2', salarioBase: 12000, performance: 88, bonusCalculado: 12672, status: 'pago', dataPagamento: '2026-02-15' },
      { id: 'b3', periodo: '2025-S2', userId: 'u3', salarioBase: 8500, performance: 95, bonusCalculado: 9690, status: 'pago', dataPagamento: '2026-02-15' },
      { id: 'b4', periodo: '2025-S2', userId: 'u7', salarioBase: 11000, performance: 85, bonusCalculado: 11220, status: 'pago', dataPagamento: '2026-02-15' },
      { id: 'b5', periodo: '2025-S2', userId: 'u4', salarioBase: 7200, performance: 78, bonusCalculado: 0, status: 'nao_elegivel', dataPagamento: null },
      { id: 'b6', periodo: '2025-S2', userId: 'u5', salarioBase: 5800, performance: 91, bonusCalculado: 6334, status: 'pago', dataPagamento: '2026-02-15' },
      { id: 'b7', periodo: '2025-S2', userId: 'u6', salarioBase: 6500, performance: 82, bonusCalculado: 6396, status: 'pago', dataPagamento: '2026-02-15' },
      { id: 'b8', periodo: '2025-S2', userId: 'u8', salarioBase: 5500, performance: 74, bonusCalculado: 0, status: 'nao_elegivel', dataPagamento: null }
    ];
  },

  defaultRegras() {
    return [
      { id: 'r1', nome: 'Gatilho Mínimo de Performance', descricao: 'Performance mínima para elegibilidade ao bônus', tipo: 'gatilho', valor: 80, ativo: true },
      { id: 'r2', nome: 'Multiplicador Diretoria', descricao: 'Multiplicador de salários para cálculo do bônus da diretoria', tipo: 'multiplicador', nivel: 'Diretoria', valor: 1.5, ativo: true },
      { id: 'r3', nome: 'Multiplicador Gerência', descricao: 'Multiplicador para gerentes', tipo: 'multiplicador', nivel: 'Gerência', valor: 1.2, ativo: true },
      { id: 'r4', nome: 'Multiplicador Coordenação', descricao: 'Multiplicador para coordenadores e supervisores', tipo: 'multiplicador', nivel: 'Coordenação', valor: 1.2, ativo: true },
      { id: 'r5', nome: 'Multiplicador Supervisão', descricao: 'Multiplicador para supervisores', tipo: 'multiplicador', nivel: 'Supervisão', valor: 1.2, ativo: true },
      { id: 'r6', nome: 'Multiplicador Analista', descricao: 'Multiplicador para analistas', tipo: 'multiplicador', nivel: 'Analista', valor: 1.0, ativo: true },
      { id: 'r7', nome: 'Teto de Bônus', descricao: 'Percentual máximo do salário que pode ser pago como bônus', tipo: 'teto', valor: 200, ativo: true },
      { id: 'r8', nome: 'Bônus por Superação', descricao: 'Bônus adicional de 10% para performance acima de 100%', tipo: 'superacao', valor: 10, ativo: true }
    ];
  },

  // Helper functions
  getUsers() { return this.get(this.KEYS.USERS).filter(u => u.id !== 'admin'); },
  getUserById(id) { return this.getById(this.KEYS.USERS, id); },
  getMetas() {
    const metas = this.get(this.KEYS.METAS) || [];
    const mesesNomes = ['Jan/26','Fev/26','Mar/26','Abr/26','Mai/26','Jun/26','Jul/26','Ago/26','Set/26','Out/26','Nov/26','Dez/26'];
    
    // Processamento leve em memória, sem salvar de volta no localStorage aqui
    // IMPORTANTE: captura o resultado do map em `resolved` para poder fazer
    // o recalc das compostas DEPOIS que todas as filhas já foram processadas.
    const resolved = metas.map((m, index) => {
      // Sincronização básica de parâmetros para metas compartilhadas
      if (m.tipo === 'compartilhada' && m.refMetaId) {
        const source = metas.find(x => String(x.id) === String(m.refMetaId));
        if (source) {
          m.titulo = source.titulo;
          m.unidade = source.unidade;
          m.polaridade = source.polaridade;
          m.tipoCurva = source.tipoCurva;
          m.valoresCurva = source.valoresCurva;
          m.acumulacao = source.acumulacao;
          m.codigo = source.codigo;
          m.categoria = source.categoria;
          m.descricao = source.descricao;
          if (source.tipo === 'composta') m.refTipoOriginal = 'composta';
        }
      }

      if (!m.codigo) m.codigo = `MET${(index + 1).toString().padStart(4, '0')}`;
      if (!m.tipo) m.tipo = 'individual';
      if (!m.status) m.status = 'nao_iniciada';
      // Migração: garante que tipoCurva e valorAlvo estejam sempre presentes
      // E limpa curvas corrompidas (salvas como 0,0,0,0 durante o bug) para usar o fallback
      if (m.valoresCurva && m.valoresCurva['100'] === 0 && m.valoresCurva['80'] === 0 && m.valoresCurva['120'] === 0) {
          delete m.valoresCurva;
          delete m.tipoCurva;
      }
      if (!m.tipoCurva) m.tipoCurva = '0-80-100-120';
      if (!m.valorAlvo && m.valoresCurva && m.valoresCurva['100']) {
        m.valorAlvo = parseFloat(m.valoresCurva['100']) || 0;
      }
      
      // Resolve a área atual do responsável APENAS SE a meta não possuir areaId salva,
      // ou para garantir integridade caso a meta perca sua área.
      // O usuário pode ter metas associadas a áreas diferentes do seu setor atual.
      if (!m.areaId && m.responsavelId) {
        const areaObj = this.getAreaAtual(m.responsavelId);
        if (areaObj) {
          m.areaId = areaObj.id; // ✅ Fonte principal: historico_areas
        } else {
          // Fallback: busca o areaId direto no cadastro do usuário
          const user = this.getUserById(m.responsavelId);
          if (user && user.areaId) {
            m.areaId = user.areaId;
          }
        }
      }
      
      // Se não tem estrutura de meses, gera uma temporária (será salva no próximo recalc oficial)
      if (!m.mesesData) {
        let pAcum = 0;
        m.mesesData = mesesNomes.map((mes) => {
          let pVal = m.valorAlvo || 100;
          if (m.acumulacao === 'soma') {
            pVal = pVal / 12;
            pAcum += pVal;
          } else if (m.acumulacao === 'repetir') {
            pAcum = pVal;
          } else {
            pAcum += pVal;
          }
          return {
            mes,
            pontual: { p: pVal, r: null, na: false, d: null, nota: null },
            acumulado: { p: pAcum, r: null, d: null, nota: null },
            anexos: []
          };
        });
      }
      return m;
    });

    // Recalc em memória das metas compostas para garantir que a nota apareça
    // corretamente no painel sem depender de um ciclo de salvamento/Firebase.
    // Guard anti-recursão: usa `resolved` como contexto em vez de chamar getMetas() novamente.
    if (!this._inMemoryRecalcActive) {
      this._inMemoryRecalcActive = true;
      try {
        resolved.filter(m => m.tipo === 'composta').forEach(m => {
          if (m.mesesData) this.recalcMesesData(m, resolved);
        });
      } finally {
        this._inMemoryRecalcActive = false;
      }
    }

    return resolved;
  },
  
  
  recalcMesesData(meta, _allMetas = null) {
    if (!meta || !meta.mesesData) return;
    
    let isAcumulativo = meta.acumulacao === 'soma';
    let pAcum = 0;
    let rAcum = 0;
    let pCount = 0;
    let rCount = 0;
    let naCount = 0;
    
    const calcDesvio = (r, p) => this.calcDesvio(meta, r, p);
    
    // LOGICA DE META COMPARTILHADA (VÍNCULO): Sincronizar com a meta de origem antes de calcular
    if (meta.tipo === 'compartilhada' && meta.refMetaId) {
       const allMetasRaw = localStorage.getItem(this.KEYS.METAS);
       const allMetas = allMetasRaw ? JSON.parse(allMetasRaw) : [];
       const sourceMeta = allMetas.find(x => String(x.id) === String(meta.refMetaId));
       
       if (sourceMeta) {
          // Copia propriedades essenciais da origem para o espelho
          meta.titulo = sourceMeta.titulo;
          meta.unidade = sourceMeta.unidade;
          meta.polaridade = sourceMeta.polaridade;
          meta.tipoCurva = sourceMeta.tipoCurva;
          meta.valoresCurva = sourceMeta.valoresCurva;
          meta.acumulacao = sourceMeta.acumulacao;
          
          // Se a origem for composta, o espelho também herda a composição
          if (sourceMeta.tipo === 'composta') {
             meta.refTipoOriginal = 'composta';
             meta.composicao = sourceMeta.composicao;
          }

          // Sincroniza TODOS os dados calculados de cada mês (fundamental para metas compostas)
          if (sourceMeta.mesesData) {
             meta.mesesData.forEach((m, i) => {
                const sMonth = sourceMeta.mesesData[i];
                if (sMonth) {
                   // Cópia profunda dos dados pontuais e acumulados da origem (fonte da verdade)
                   if (sMonth.pontual) {
                      m.pontual = { ...sMonth.pontual };
                   }
                   if (sMonth.acumulado) {
                      m.acumulado = { ...sMonth.acumulado };
                   }
                   // Sincronizar evidências (anexos)
                   m.anexos = sMonth.anexos || [];
                }
             });
             // O valor atual da meta espelho deve ser idêntico ao da meta mãe
             meta.valorAtual = sourceMeta.valorAtual;
             return; // Finaliza o recalc aqui para espelhos, pois os dados já foram herdados
          }
       }
    }

    meta.mesesData.forEach((m, index) => {
       let pVal = m.pontual.p;
       let rVal = m.pontual.r;
       const isNa = m.pontual && m.pontual.na;

       // LOGICA DE META COMPOSTA: Se for composta (ou espelho de composta)
       if ((meta.tipo === 'composta' || meta.refTipoOriginal === 'composta') && Array.isArray(meta.composicao) && meta.composicao.length > 0) {
          let somaR = 0;           // Soma direta dos R das filhas (para acumulação 'soma')
          let weightedSumNota = 0;
          let totalValidWeight = 0;
          let hasValidData = false;
          const allMetas = _allMetas || this.getMetas();
          
          meta.composicao.forEach(comp => {
             const child = allMetas.find(x => String(x.id) === String(comp.metaId));
             if (child && child.mesesData && child.mesesData[index]) {
                const childMonth = child.mesesData[index];
                const childR = (childMonth.pontual && childMonth.pontual.r !== null) ? parseFloat(String(childMonth.pontual.r).replace(',', '.')) : null;
                const childNota = (childMonth.pontual && childMonth.pontual.nota !== null) ? parseFloat(String(childMonth.pontual.nota).replace(',', '.')) : null;
                const childNa = childMonth.pontual ? childMonth.pontual.na : false;

                 let n = childNota;
                 // Se o mensal for nulo, usamos o acumulado para manter a meta no cálculo (proporcional)
                 if (n === null) {
                    n = (childMonth.acumulado && childMonth.acumulado.nota !== null) ? parseFloat(String(childMonth.acumulado.nota).replace(',', '.')) : null;
                 }

                 if (n !== null && n !== undefined) {
                    const pesoOriginal = parseFloat(String(comp.peso).replace(',', '.')) || 0;
                    // R: soma direta (não pondera o valor real pelo peso; peso só afeta a NOTA)
                    somaR += (childR || 0);
                    weightedSumNota += (n * (pesoOriginal / 100));
                    totalValidWeight += pesoOriginal;
                    hasValidData = true;
                 }
             }
          });
          
          if (hasValidData && totalValidWeight > 0) {
             // scaleFactor renormaliza quando nem todas as filhas têm dados
             const scaleFactor = 100 / totalValidWeight;
             const compositeNota = weightedSumNota * scaleFactor;
             m.pontual.nota = compositeNota;
             m.pontual.na = false;

             if (meta.acumulacao === 'soma') {
                // SOMA: R = soma direta dos Rs das filhas
                rVal = somaR;
             } else if (meta.acumulacao === 'media') {
                // MEDIA SIMPLES: R = média ponderada das NOTAS das filhas
                // Exemplo: A(nota=80,peso=50) + B(nota=50,peso=25) + C(nota=100,peso=25) = 77,50
                rVal = compositeNota;
             } else {
                rVal = somaR * scaleFactor;
             }
             m.pontual.r = rVal;
          } else {
             rVal = null;
             m.pontual.r = null;
             m.pontual.nota = null;
          }
       }
       
       // Inicializar estrutura se não existir
       if (!m.pontual) m.pontual = { p: pVal, r: rVal, d: null, nota: null, na: isNa };
       if (!m.acumulado) m.acumulado = { p: null, r: null, d: null, nota: null };
       
       // PONTUAL: calcular apenas se há valor válido (não N/A)
       if (rVal !== null && rVal !== undefined && rVal !== '' && !isNa) {
          // Só calcula a nota padrão se NÃO for meta composta (que já recebeu a nota ponderada acima)
          if (meta.tipo !== 'composta') {
             m.pontual.nota = this.calcPerformance({...meta, valorAlvo: pVal, valorAtual: rVal}, true);
          }
          m.pontual.d = calcDesvio(rVal, pVal);
       } else {
          m.pontual.nota = null;
          m.pontual.d = null;
       }
       
       // PLANEJADO acumulado
       pAcum += pVal;
       pCount++;
       
       // RESULTADO acumulado: só inclui se não é N/A
       if (rVal !== null && rVal !== undefined && rVal !== '' && !isNa) {
          rAcum += parseFloat(rVal); 
          rCount++;
       }
       
       if (isNa) {
          naCount++;
       }
       
       // Cálculo do acumulado (ignorando meses N/A)
       let curAcumP, curAcumR;
       
       if (meta.acumulacao === 'media') {
          // Para média: manter a meta individual como P, e média dos válidos como R
          curAcumP = pVal;
          curAcumR = rCount > 0 ? rAcum / rCount : null;
       } else if (meta.acumulacao === 'provider') {
          // Para Data Provider, pontual e acumulado são informados SEPARADAMENTE pelo usuário.
          // O acumulado NUNCA é preenchido automaticamente com base no pontual.
          // Preservamos o valor manual se existir; caso contrário, mantém null.
          curAcumP = (m.acumulado && m.acumulado.p !== null) ? m.acumulado.p : pAcum;
          curAcumR = (m.acumulado && m.acumulado.r !== null) ? m.acumulado.r : null;
       } else if (meta.acumulacao === 'repetir') {
          // Para Repetir Valores, o acumulado é sempre igual ao pontual do mês corrente.
          curAcumP = pVal;
          curAcumR = (rVal !== null && rVal !== undefined && rVal !== '' && !isNa) ? rVal : null;
       } else {
          // Para soma: acumular P e R
          curAcumP = pAcum;
          curAcumR = rCount > 0 ? rAcum : null;
       }
       
       m.acumulado.p = curAcumP;

        // ── COMPOSTA: calcula acumulado diretamente das filhas (independente do curAcumR próprio) ──
        if (meta.tipo === 'composta' && Array.isArray(meta.composicao) && meta.composicao.length > 0) {
           let somaRAcum = 0;
           let weightedSumNotaAcum = 0;
           let totalValidWeightAcum = 0;
           let hasValidAcum = false;
           const allM = _allMetas || this.getMetas();

           meta.composicao.forEach(comp => {
              const ch = allM.find(x => String(x.id) === String(comp.metaId));

              let n = ch?.mesesData?.[index]?.acumulado?.nota;
              const childAcumR = ch?.mesesData?.[index]?.acumulado?.r;

              if (n !== null && n !== undefined) {
                 const pesoOriginal = parseFloat(String(comp.peso).replace(',', '.')) || 0;
                 somaRAcum += (childAcumR !== null && childAcumR !== undefined ? parseFloat(String(childAcumR).replace(',', '.')) : 0);
                 weightedSumNotaAcum += (parseFloat(String(n).replace(',', '.')) * (pesoOriginal / 100));
                 totalValidWeightAcum += pesoOriginal;
                 hasValidAcum = true;
              }
           });

           if (hasValidAcum && totalValidWeightAcum > 0) {
              const scaleFactor = 100 / totalValidWeightAcum;
              const compositeNotaAcum = weightedSumNotaAcum * scaleFactor;
              m.acumulado.nota = compositeNotaAcum;

              let acumR;
              if (meta.acumulacao === 'soma') {
                 // SOMA: R = soma direta dos Rs das filhas
                 acumR = somaRAcum;
              } else if (meta.acumulacao === 'media') {
                 // MEDIA SIMPLES: R = média ponderada das NOTAS das filhas
                 // Exemplo: A(nota=80,peso=50) + B(nota=50,peso=25) + C(nota=100,peso=25) = 77,50
                 acumR = compositeNotaAcum;
              } else {
                 acumR = somaRAcum * scaleFactor;
              }
              m.acumulado.r = acumR;
              m.acumulado.d = calcDesvio(acumR, curAcumP);
           } else {
              m.acumulado.r = null;
              m.acumulado.d = null;
              m.acumulado.nota = null;
           }
        } else if (curAcumR !== null) {
           // ── NÃO COMPOSTA: caminho normal ──
           m.acumulado.r = curAcumR;
           m.acumulado.d = calcDesvio(curAcumR, curAcumP);

           if (meta.acumulacao === 'repetir') {
              m.acumulado.nota = m.pontual.nota;
           } else {
              m.acumulado.nota = this.calcPerformance({...meta, valorAlvo: curAcumP, valorAtual: curAcumR}, true);
           }
        } else {
           m.acumulado.r = null;
           m.acumulado.d = null;
           m.acumulado.nota = null;
        }
    });
    
    // Atualizar valor atual: se todos N/A, manter como null; senão, usar acumulado
    const allNa = naCount === meta.mesesData.length;
    if (allNa || rCount === 0) {
       meta.valorAtual = null;
    } else if (meta.acumulacao === 'media') {
       meta.valorAtual = rAcum / rCount;
    } else if (meta.acumulacao === 'repetir') {
       // Para Data Provider e Repetir Valores, o valor atual da meta é o acumulado do último mês que possui dados
       const lastWithAcum = [...meta.mesesData].reverse().find(m => m.acumulado && m.acumulado.r !== null);
       meta.valorAtual = lastWithAcum ? lastWithAcum.acumulado.r : null;
    } else {
       meta.valorAtual = rAcum;
    }
  },

  getMetaById(id) { return this.getMetas().find(m => m.id === id); },
  getAcoesByMeta(metaId) {
    const meta = this.getMetaById(metaId);
    if (meta && meta.tipo === 'compartilhada' && meta.refMetaId) {
      return this.get(this.KEYS.ACOES).filter(a => a.metaId === meta.refMetaId);
    }
    return this.get(this.KEYS.ACOES).filter(a => a.metaId === metaId);
  },
  getRegras() { return this.get(this.KEYS.REGRAS); },
  getBonusByPeriodo(periodo) { return this.get(this.KEYS.BONUS).filter(b => b.periodo === periodo); },

  calcPerformance(meta, _isRawCalc = false, targetMonthIndex = null) {
    if (!meta) return null;
    
    // Se for meta composta, compartilhada ou repetir, a performance é a nota já calculada no último mês válido
    // (a menos que estejamos fazendo o cálculo matemático base do mês, indicado por _isRawCalc)
    if (!_isRawCalc && (meta.tipo === 'composta' || meta.tipo === 'compartilhada' || meta.acumulacao === 'repetir')) {
       if (!meta.mesesData) return null;

       // Se um mês específico foi solicitado, retorna a nota exata daquele mês
       if (targetMonthIndex !== null && targetMonthIndex >= 0 && targetMonthIndex < meta.mesesData.length) {
          const m = meta.mesesData[targetMonthIndex];
          return m.acumulado && m.acumulado.nota !== null && m.acumulado.nota !== undefined ? m.acumulado.nota : null;
       }

       // Para compostas com acumulação SOMA: usar a nota do último mês onde o
       // acumulado.r realmente MUDOU (= última entrada real de dados).
       // Isso evita que meses de "carry-forward" (onde o R fica estático mas o P
       // continua crescendo) mostrem uma nota degradada no painel.
       if (meta.tipo === 'composta' && meta.acumulacao === 'soma') {
          for (let i = meta.mesesData.length - 1; i >= 0; i--) {
             const m = meta.mesesData[i];
             if (!m.acumulado || m.acumulado.r === null || m.acumulado.r === undefined) continue;
             const prevR = i > 0 ? (meta.mesesData[i - 1]?.acumulado?.r ?? null) : null;
             // Detecta o último mês com entrada real: r mudou em relação ao mês anterior
             if (prevR === null || prevR === undefined || m.acumulado.r !== prevR) {
                // Retorna a nota ACUMULADA desse mês (nota do período até aqui)
                return m.acumulado.nota !== null && m.acumulado.nota !== undefined
                   ? m.acumulado.nota
                   : null;
             }
          }
       }

       // Para outros tipos (media, repetir, compartilhada): último mês com nota válida
       for (let i = meta.mesesData.length - 1; i >= 0; i--) {
          const m = meta.mesesData[i];
          if (m.acumulado && m.acumulado.nota !== null) {
             return m.acumulado.nota;
          }
       }
       return null;
    }


    // Para metas normais, usa o valor atual. Se targetMonthIndex for fornecido, pega do mês específico.
    let r = meta.valorAtual;
    let targetValP = meta.valorAlvo;
    
    if (targetMonthIndex !== null && meta.mesesData && targetMonthIndex >= 0 && targetMonthIndex < meta.mesesData.length) {
       const monthData = meta.mesesData[targetMonthIndex];
       r = monthData.acumulado ? monthData.acumulado.r : null;
       targetValP = monthData.acumulado ? monthData.acumulado.p : meta.valorAlvo;
    }

    if (r === null || r === undefined) return null;
    
    // Curva customizada
    if (meta.tipoCurva && meta.valoresCurva) {
      const values = [];
      const v = meta.valoresCurva;
      
      // LOGICA DE ESCALONAMENTO: Se o valorAlvo (P do mês) for diferente do valor de 100% da curva,
      // devemos proporcionalizar todos os pontos da curva para este mês.
      // EXCEÇÃO: curvas que não possuem nenhum score abaixo de 100 (ex: "100-120", "100", "120")
      // usam limiares absolutos — o escalonamento não se aplica, pois o valor informado
      // na curva já é o limiar fixo de resultado esperado.
      const base100 = parseFloat(v['100']);
      const currentTarget = parseFloat(targetValP);
      const minScore = Math.min(...Object.keys(v).map(k => parseFloat(k)).filter(k => !isNaN(k)));

      const scale = (base100 && base100 !== 0 && minScore < 100) ? (currentTarget / base100) : 1;

      for (const key in v) {
        if (!Object.prototype.hasOwnProperty.call(v, key)) continue;
        const score = parseFloat(key);
        let val = parseFloat(v[key]);
        
        // Aplicar escala proporcional ao P do mês
        if (!isNaN(val)) val = val * scale;

        if (!Number.isNaN(score) && !Number.isNaN(val)) values.push({ score, val });
      }
      if (values.length === 1) {
        if (r === null || r === undefined || isNaN(r)) return null;
        const targetVal = values[0].val;
        const targetScore = values[0].score;
        const isMenor = meta.polaridade === 'menor_melhor';
        if (isMenor) {
          return r <= targetVal ? targetScore : 0;
        } else {
          return r >= targetVal ? targetScore : 0;
        }
      }
      if (values.length < 2) return 0;
      values.sort((a, b) => a.val - b.val);
      if (r === null || r === undefined || isNaN(r)) return null;

      const first = values[0];
      const last = values[values.length - 1];
      const isMenor = meta.polaridade === 'menor_melhor';

      if (r < first.val) {
        return isMenor ? first.score : 0;
      }
      if (r > last.val) {
        return isMenor ? 0 : last.score;
      }

      for (let i = 0; i < values.length - 1; i++) {
        const p1 = values[i];
        const p2 = values[i + 1];
        if (r >= p1.val && r <= p2.val) {
          if (p2.val === p1.val) return Math.max(p1.score, p2.score);
          const ratio = (r - p1.val) / (p2.val - p1.val);
          return p1.score + ratio * (p2.score - p1.score);
        }
      }
      return 0;
    }

    // Fallback original
    if (!meta.valorAlvo) return null;
    const raw = (r / meta.valorAlvo) * 100;
    if (meta.polaridade === 'menor_melhor') {
      if (r === null || r === undefined) return null;
      if (r <= 0) return 150;
      return Math.min(150, meta.valorAlvo > 0 ? (meta.valorAlvo / r) * 100 : 0);
    }
    return Math.min(150, raw);
  },

  calcDesvio(meta, r, p) {
    if (p === null || p === undefined || p <= 0 || r === null || r === undefined) return null;
    if (meta.polaridade === 'menor_melhor') {
      return ((p - r) / p) * 100;
    }
    return ((r - p) / p) * 100;
  },

  // === ÁREAS ===
  defaultAreas() {
    return [
      { id: 'ar1', codigo: '1.0', nome: 'Diretoria Financeira', parentId: null, criadoEm: '2026-01-01' },
      { id: 'ar2', codigo: '1.1', nome: 'Gerência Financeira', parentId: 'ar1', criadoEm: '2026-01-01' },
      { id: 'ar3', codigo: '2.0', nome: 'Diretoria Comercial', parentId: null, criadoEm: '2026-01-01' },
      { id: 'ar4', codigo: '2.1', nome: 'Gerência de Marketing', parentId: 'ar3', criadoEm: '2026-01-01' },
      { id: 'ar5', codigo: '2.2', nome: 'Gerência Comercial', parentId: 'ar3', criadoEm: '2026-01-01' },
      { id: 'ar6', codigo: '3.0', nome: 'Diretoria de Operações', parentId: null, criadoEm: '2026-01-01' },
      { id: 'ar7', codigo: '3.1', nome: 'Gerência de Logística', parentId: 'ar6', criadoEm: '2026-01-01' },
      { id: 'ar8', codigo: '4.0', nome: 'Diretoria de Pessoas', parentId: null, criadoEm: '2026-01-01' },
      { id: 'ar9', codigo: '4.1', nome: 'Gerência de RH', parentId: 'ar8', criadoEm: '2026-01-01' },
      { id: 'ar10', codigo: '5.0', nome: 'Diretoria de Tecnologia', parentId: null, criadoEm: '2026-01-01' },
    ];
  },

  defaultHistoricoAreas() {
    return [
      { id: 'ha1', userId: 'u1', areaId: 'ar3', dataInicio: '2026-01-01', dataFim: null },
      { id: 'ha2', userId: 'u2', areaId: 'ar6', dataInicio: '2026-01-01', dataFim: null },
      { id: 'ha3', userId: 'u3', areaId: 'ar4', dataInicio: '2026-01-01', dataFim: null },
      { id: 'ha4', userId: 'u4', areaId: 'ar10', dataInicio: '2026-01-01', dataFim: null },
      { id: 'ha5', userId: 'u5', areaId: 'ar9', dataInicio: '2026-01-01', dataFim: null },
      { id: 'ha6', userId: 'u6', areaId: 'ar7', dataInicio: '2026-01-01', dataFim: null },
      { id: 'ha7', userId: 'u7', areaId: 'ar1', dataInicio: '2026-01-01', dataFim: null },
      { id: 'ha8', userId: 'u8', areaId: 'ar5', dataInicio: '2026-01-01', dataFim: null },
    ];
  },

  getAreas() { return this.get(this.KEYS.AREAS); },
  getAreaById(id) { return this.getById(this.KEYS.AREAS, id); },
  getChildAreas(parentId) { return this.getAreas().filter(a => a.parentId === parentId); },
  getHistoricoAreas() { return this.get(this.KEYS.HISTORICO_AREAS); },
  getHistoricoByUser(userId) { return this.getHistoricoAreas().filter(h => h.userId === userId).sort((a,b) => a.dataInicio.localeCompare(b.dataInicio)); },
  getAreaAtual(userId) {
    const hist = this.getHistoricoByUser(userId).filter(h => !h.dataFim);
    return hist.length > 0 ? this.getAreaById(hist[hist.length - 1].areaId) : null;
  },

  // Get all area IDs visible to a given area (itself + all descendants)
  getVisibleAreaIds(areaId) {
    const ids = [areaId];
    const children = this.getChildAreas(areaId);
    children.forEach(c => { ids.push(...this.getVisibleAreaIds(c.id)); });
    return ids;
  },

  // Build area tree structure
  buildAreaTree() {
    const areas = this.getAreas();
    const roots = areas.filter(a => !a.parentId);
    const buildNode = (area) => ({
      ...area,
      children: areas.filter(a => a.parentId === area.id).map(buildNode)
    });
    return roots.map(buildNode);
  },

  // Helper: check if a user is Apoio for an area
  isUserApoioDaArea(userId, areaId) {
    if (!userId || !areaId) return false;
    const area = this.getAreaById(areaId);
    return area && area.apoioIds && Array.isArray(area.apoioIds) && area.apoioIds.includes(userId);
  },

  getAuthorizedAreas() {
    const session = Auth.getSession() || {};
    const rootId = Auth.getUserRootAreaId();
    
    // Todas as áreas do banco
    const allAreas = this.getAreas();

    if (rootId === 'all') return allAreas;

    const authorized = new Set();

    // 1. Área própria + sub-áreas (Hierarquia normal)
    if (rootId) {
      const visibleIds = this.getVisibleAreaIds(rootId);
      
      // Para Diretoria: adicionar também a área pai (corporativa)
      if (session.nivel === 'Diretoria') {
        const ownArea = this.getAreaById(rootId);
        if (ownArea && ownArea.parentId && !visibleIds.includes(ownArea.parentId)) {
          visibleIds.unshift(ownArea.parentId);
        }
      }
      
      visibleIds.forEach(id => authorized.add(id));
    }

    // 2. Áreas de Apoio (Digitador) - o usuário ganha acesso a qualquer área que o inclua como Apoio
    allAreas.forEach(a => {
      if (a.apoioIds && Array.isArray(a.apoioIds) && a.apoioIds.includes(session.id)) {
        authorized.add(a.id);
        // Opcional: Permitir que ele veja a área e as sub-áreas daquela que ele é apoio
        // this.getVisibleAreaIds(a.id).forEach(subId => authorized.add(subId));
      }
    });

    return allAreas.filter(a => authorized.has(a.id));
  },

  getAuthorizedAreaTree() {
    const session = Auth.getSession() || {};
    const rootId = Auth.getUserRootAreaId();
    if (rootId === 'all') return this.buildAreaTree();
    
    const areas = this.getAuthorizedAreas();
    if (areas.length === 0) return [];

    const buildNode = (area) => ({
      ...area,
      children: areas.filter(a => a.parentId === area.id).map(buildNode)
    });

    // Encontra todos os "roots" virtuais (áreas às quais o usuário tem acesso, 
    // mas não tem acesso à área pai correspondente)
    const areaIds = new Set(areas.map(a => a.id));
    const virtualRoots = areas.filter(a => !a.parentId || !areaIds.has(a.parentId));
    
    return virtualRoots.map(buildNode);
  },

  calcBonusColaborador(userId) {
    const user = this.getUserById(userId);
    if (!user) return null;
    const metas = this.getMetas().filter(m => m.responsavelId === userId);
    const regras = this.getRegras();
    const gatilho = regras.find(r => r.tipo === 'gatilho');
    const mult = regras.find(r => r.tipo === 'multiplicador' && r.nivel === user.nivel);
    const teto = regras.find(r => r.tipo === 'teto');

    let perfPonderada = metas.length > 0 ? metas.reduce((s, m) => s + ((this.calcPerformance(m) * m.peso) / 100), 0) : 0;

    const elegivel = perfPonderada >= (gatilho ? gatilho.valor : 80);
    const multiplicador = mult ? mult.valor : 1;
    let bonus = elegivel ? user.salario * multiplicador * (perfPonderada / 100) : 0;
    const tetoValor = teto ? (user.salario * teto.valor / 100) : user.salario * 2;
    bonus = Math.min(bonus, tetoValor);

    return { user, metas, perfPonderada: Math.round(perfPonderada * 10) / 10, elegivel, multiplicador, bonus: Math.round(bonus * 100) / 100, teto: tetoValor };
  },

  // ============================================================
  // CENTRAL DE LEMBRETES — Helpers de CRUD
  // ============================================================

  getLembreteRegras() { return this.get(this.KEYS.LEMBRETE_REGRAS) || []; },
  getLembreteTemplates() { return this.get(this.KEYS.LEMBRETE_TEMPLATES) || []; },
  getLembreteLogs() { return this.get(this.KEYS.LEMBRETE_LOGS) || []; },
  getLembreteChannels() {
    const saved = this.get(this.KEYS.LEMBRETE_CHANNELS);
    if (saved && saved.length > 0) return saved;
    // Defaults
    const defaults = [
      { id: 'lc_email', tipo: 'email', nome: 'E-mail Corporativo (Microsoft 365)', ativo: true, icone: '📧' },
      { id: 'lc_teams', tipo: 'teams', nome: 'Microsoft Teams (Mensagem Direta)', ativo: true, icone: '🟦' }
    ];
    this.set(this.KEYS.LEMBRETE_CHANNELS, defaults);
    return defaults;
  },

  addLembreteRegra(regra) { return this.add(this.KEYS.LEMBRETE_REGRAS, regra); },
  updateLembreteRegra(id, updates) { return this.update(this.KEYS.LEMBRETE_REGRAS, id, updates); },
  removeLembreteRegra(id) { return this.remove(this.KEYS.LEMBRETE_REGRAS, id); },
  getLembreteRegraById(id) { return this.getLembreteRegras().find(r => r.id === id); },

  addLembreteTemplate(tpl) { return this.add(this.KEYS.LEMBRETE_TEMPLATES, tpl); },
  updateLembreteTemplate(id, updates) { return this.update(this.KEYS.LEMBRETE_TEMPLATES, id, updates); },
  removeLembreteTemplate(id) { return this.remove(this.KEYS.LEMBRETE_TEMPLATES, id); },
  getLembreteTemplateById(id) { return this.getLembreteTemplates().find(t => t.id === id); },

  addLembreteLog(log) { return this.add(this.KEYS.LEMBRETE_LOGS, log); },

  // Calcula próxima execução de uma regra com base em frequência e horário
  calcProximaExecucao(regra) {
    const agora = new Date();
    const [h, m] = (regra.horario || '08:00').split(':').map(Number);
    const proxima = new Date();
    proxima.setHours(h, m, 0, 0);

    if (regra.frequencia === 'imediato') return agora.toISOString();
    if (regra.frequencia === 'diario') {
      if (proxima <= agora) proxima.setDate(proxima.getDate() + 1);
      return proxima.toISOString();
    }
    if (regra.frequencia === 'semanal') {
      const diasAlvo = regra.diasSemana && regra.diasSemana.length > 0 ? regra.diasSemana : [1];
      let d = new Date(agora);
      for (let i = 1; i <= 7; i++) {
        d = new Date(agora);
        d.setDate(agora.getDate() + i);
        if (diasAlvo.includes(d.getDay())) break;
      }
      d.setHours(h, m, 0, 0);
      return d.toISOString();
    }
    if (regra.frequencia === 'mensal') {
      proxima.setMonth(proxima.getMonth() + 1, 1);
      proxima.setHours(h, m, 0, 0);
      return proxima.toISOString();
    }
    return proxima.toISOString();
  },

  // Resolve variáveis dinâmicas em templates: {{variavel}}
  resolveTemplate(texto, vars) {
    if (!texto) return '';
    return texto.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] !== undefined ? vars[key] : `{{${key}}}`);
  },

  // Monta a lista de destinatários de uma regra, respeitando hierarquia
  buildRecipientList(regra) {
    const publico = regra.publicoAlvo || [];
    const areasIds = regra.areasIds || [];
    const users = this.getUsers();
    const metas = this.getMetas();
    const recipientMap = new Map(); // userId -> user

    const addUser = (u) => { if (u && u.id) recipientMap.set(u.id, u); };

    // Filtra metas pelas áreas configuradas na regra (ou todas se não especificado)
    const metasFiltradas = areasIds.length > 0
      ? metas.filter(m => areasIds.includes(m.areaId))
      : metas;

    metasFiltradas.forEach(meta => {
      if (publico.includes('responsavel')) {
        const u = this.getUserById(meta.responsavelId);
        addUser(u);
      }
      if (publico.includes('gestor')) {
        // Gestor = usuário de nível Gerência ou Diretoria que está na mesma área
        const respArea = meta.areaId ? this.getAreaById(meta.areaId) : null;
        if (respArea) {
          users.filter(u => (u.nivel === 'Gerência' || u.nivel === 'Diretoria')).forEach(u => {
            const uArea = this.getAreaAtual(u.id);
            if (uArea && (uArea.id === respArea.id || uArea.id === respArea.parentId)) addUser(u);
          });
        }
      }
    });

    if (publico.includes('diretoria')) {
      users.filter(u => u.nivel === 'Diretoria').forEach(addUser);
    }
    if (publico.includes('corporativo')) {
      users.filter(u => u.nivel === 'Admin' || u.nivel === 'Diretoria').forEach(addUser);
    }
    if (publico.includes('areas_especificas') && areasIds.length > 0) {
      users.forEach(u => {
        const uArea = this.getAreaAtual(u.id);
        if (uArea && areasIds.includes(uArea.id)) addUser(u);
      });
    }

    return Array.from(recipientMap.values());
  }
};

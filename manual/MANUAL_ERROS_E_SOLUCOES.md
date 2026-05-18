# 📋 Manual de Erros e Soluções - Sistema MetasPro

## 📑 Índice
1. [Autenticação e Sessão](#autenticação-e-sessão)
2. [Gestão de Metas](#gestão-de-metas)
3. [Cálculos e Performance](#cálculos-e-performance)
4. [Dados e Persistência](#dados-e-persistência)
5. [Remuneração e Bônus](#remuneração-e-bônus)
6. [Gestão de Usuários e Áreas](#gestão-de-usuários-e-áreas)
7. [Interface e Navegação](#interface-e-navegação)
8. [Troubleshooting Avançado](#troubleshooting-avançado)

---

## 🔐 Autenticação e Sessão

### ❌ Erro 1: Login não funciona
**Sintomas:**
- Botão "Entrar" não responde
- Mensagem: "E-mail ou senha inválidos"
- Fica na tela de login indefinidamente

**Causas Possíveis:**
- Credenciais incorretas
- Dados de usuários corrompidos em localStorage
- Navegador com JavaScript desabilitado

**Solução:**
1. **Verificar credenciais padrão:**
   - E-mail: `admin@empresa.com`
   - Senha: `admin`

2. **Limpar localStorage:**
   - F12 → Console
   - `localStorage.clear()`
   - Recarregar a página (Ctrl+F5)

3. **Verificar dados:**
   - F12 → Application → LocalStorage
   - Procurar por `mp_users`
   - Confirmar que existe usuário "admin"

4. **Restaurar dados padrão:**
   ```javascript
   localStorage.removeItem('mp_users');
   localStorage.removeItem('mp_session');
   location.reload();
   ```

---

### ❌ Erro 2: Sessão expira inesperadamente
**Sintomas:**
- Volta à tela de login sem razão
- Perda de dados não salvos
- É deslogado durante o uso

**Causas Possíveis:**
- localStorage foi limpo pelo navegador
- Outro aba ou navegador fez logout
- Dados de sessão corrompidos

**Solução:**
1. **Verificar se localStorage está funcionando:**
   ```javascript
   try {
     localStorage.setItem('teste', 'valor');
     localStorage.removeItem('teste');
     console.log('localStorage OK');
   } catch(e) {
     console.error('localStorage indisponível');
   }
   ```

2. **Sincronizar sessão entre abas:**
   - Fechar outras abas do mesmo site
   - Fazer login novamente na aba atual

3. **Verificar se não tem modo privado:**
   - Dados não persistem em modo privado/incógnito

---

### ❌ Erro 3: Admin bloqueado
**Sintomas:**
- Não consegue criar nova conta admin
- Admin desaparece da lista de usuários
- Só um admin é permitido no sistema

**Causas Possíveis:**
- Admin foi acidentalmente deletado
- Dados corrompidos

**Solução:**
1. **Restaurar admin:**
   ```javascript
   DataStore.init(); // Reinicia com dados padrão
   const users = DataStore.getUsers();
   if (!users.find(u => u.email === 'admin@empresa.com')) {
     users.unshift({
       id: 'admin',
       nome: 'Administrador',
       email: 'admin@empresa.com',
       senha: 'admin',
       cargo: 'Administrador do Sistema',
       area: 'TI',
       nivel: 'Admin',
       salario: 0,
       avatar: 'AD',
       ativo: true
     });
     DataStore.set(DataStore.KEYS.USERS, users);
   }
   location.reload();
   ```

---

## 🎯 Gestão de Metas

### ❌ Erro 4: Meta não aparece na lista
**Sintomas:**
- Meta foi criada mas não está visível
- Tabela de metas vazia mesmo após criar
- Filtros ocultam a meta

**Causas Possíveis:**
- Filtro de status está ativado (ex: "Apenas Concluídas")
- Filtro de área está selecionado e meta pertence a outra área
- Meta foi criada mas não foi persistida

**Solução:**
1. **Verificar filtros:**
   - "Status" deve estar em "Todas"
   - "Áreas" deve estar em "Todas"

2. **Forçar recalcular:**
   ```javascript
   let metas = DataStore.getMetas();
   metas.forEach(m => delete m.mesesData); // Força recalc
   DataStore.set(DataStore.KEYS.METAS, metas);
   App.refreshPage();
   ```

3. **Se ainda não aparecer:**
   ```javascript
   const metas = DataStore.get(DataStore.KEYS.METAS);
   console.log('Total de metas:', metas.length);
   console.log('Metas:', metas.map(m => m.titulo));
   ```

---

### ❌ Erro 5: Não consegue salvar meta
**Sintomas:**
- Clica em "Criar Meta" mas nada acontece
- Formulário não valida
- Mensagem de erro não aparece

**Causas Possíveis:**
- Campo obrigatório não preenchido
- Peso total excede 100%
- Valores de curva inválidos
- localStorage cheio

**Solução:**
1. **Verificar validações obrigatórias:**
   - ✓ Código (gerado automaticamente)
   - ✓ Título (ex: "Receita Bruta Anual")
   - ✓ Responsável (selecionado na lista)
   - ✓ Peso (1-100)
   - ✓ Tipo (Corporativa/Área/Individual)
   - ✓ Valores de curva (números válidos)

2. **Verificar peso total:**
   - Soma dos pesos do responsável não pode > 100%
   - Mensagem: "A soma dos pesos para este responsável não pode exceder 100%"
   - **Solução:** Reduzir peso de outras metas do mesmo responsável

3. **Valores de curva:**
   - Devem ser números válidos (ex: 0, 80, 100, 120)
   - Não podem estar vazios
   - Deve haver progressão (0 < 80 < 100 < 120)

4. **localStorage cheio:**
   ```javascript
   // Verificar tamanho
   const used = Object.keys(localStorage)
     .reduce((size, key) => size + localStorage[key].length, 0);
   console.log('localStorage usado:', (used / 1024).toFixed(2) + ' KB');
   
   // Limpar dados desnecessários
   localStorage.removeItem('mp_backup'); // Se houver
   ```

---

### ❌ Erro 6: Editar meta causa perda de dados
**Sintomas:**
- Abre formulário de edição
- Meses históricos desaparecem
- Resultados digitados se perdem

**Causas Possíveis:**
- Dados de `mesesData` não foram preservados
- Acumulação foi alterada
- Erros no salvar

**Solução:**
1. **Antes de editar:**
   - Fazer backup dos dados (F12 → Application → LocalStorage → Copy mp_metas)
   - Salvar em arquivo de texto

2. **Se perdeu dados:**
   ```javascript
   // Restaurar do backup (se tiver)
   // Copiar JSON do backup e colar:
   localStorage.setItem('mp_metas', JSON.stringify([...]));
   App.refreshPage();
   ```

3. **Melhorar fluxo de edição:**
   - Salvar dados antes de abrir modal
   - Não alterar "Acumulação" (cause recalc)

---

### ❌ Erro 7: Resultados mensais não salvam
**Sintomas:**
- Digita resultado mensal
- Fecha modal
- Valor desaparece
- Sempre mostra "-"

**Causas Possíveis:**
- Campo de entrada não captura valor corretamente
- Formato de número inválido
- Dados não persistem em localStorage
- Campo é de apenas leitura (sem permissão)

**Solução:**
1. **Verificar permissões:**
   - Você é Admin ou Responsável pela meta?
   - Não-admin não consegue editar

2. **Validar formato de número:**
   - Aceita: `1000`, `1000.50`, `1.000,50`
   - Não aceita: letras, símbolos especiais
   - Use sempre ponto ou vírgula consistentemente

3. **Tentar salvar novamente:**
   - Clique no mês
   - Tipo o valor
   - Pressione Enter ou click fora
   - Espere mensagem: "Apontamento salvo com sucesso"

4. **Forçar recalc:**
   ```javascript
   const metaId = 'm1'; // Seu ID de meta
   const metas = DataStore.get(DataStore.KEYS.METAS);
   const meta = metas.find(m => m.id === metaId);
   if (meta) {
     DataStore.recalcMesesData(meta);
     DataStore.set(DataStore.KEYS.METAS, metas);
     App.refreshPage();
   }
   ```

---

### ❌ Erro 8: Marcar como N/A não funciona
**Sintomas:**
- Clica em "N/A" mas nada acontece
- Campo continua editável
- N/A não é salvo

**Causas Possíveis:**
- Interface não renderizou corretamente
- Campo `na` não foi inicializado
- localStorage corrompido

**Solução:**
1. **Recarregar página:**
   - Ctrl+Shift+Delete (limpar cache)
   - F5 (recarregar completo)

2. **Inicializar campo N/A:**
   ```javascript
   const metas = DataStore.getMetas();
   metas.forEach(m => {
     if (m.mesesData) {
       m.mesesData.forEach(mes => {
         if (mes.pontual && !('na' in mes.pontual)) {
           mes.pontual.na = false;
         }
       });
     }
   });
   DataStore.set(DataStore.KEYS.METAS, metas);
   App.refreshPage();
   ```

---

## 📊 Cálculos e Performance

### ❌ Erro 9: Nota está incorreta
**Sintomas:**
- Performance não corresponde aos resultados
- Nota negativa ou acima de 150
- Acumulado não bate com pontual

**Causas Possíveis:**
- Valores de curva incorretos
- Polaridade da meta está inversa
- Acumulação configurada errada
- Meses N/A não estão sendo ignorados

**Solução:**
1. **Verificar valores de curva:**
   ```javascript
   const meta = DataStore.getMetaById('m1');
   console.log('Curva:', meta.valoresCurva);
   // Deve estar em ordem: 0 < 80 < 100 < 120
   ```

2. **Verificar polaridade:**
   - Maior Melhor (↑): valor aumenta, nota aumenta
   - Menor Melhor (↓): valor diminui, nota aumenta
   - **Exemplo para SLA (menor é melhor):**
     - Meta: 27 dias
     - Resultado: 20 dias
     - Deve ter nota alta (porque está abaixo do alvo)

3. **Validar cálculo manualmente:**
   ```javascript
   const meta = DataStore.getMetaById('m1');
   const perf = DataStore.calcPerformance(meta);
   console.log('Performance:', perf);
   
   // Para "Maior Melhor"
   // perf = (resultado / alvo) * 100
   
   // Para "Menor Melhor"
   // perf = (alvo / resultado) * 100
   ```

4. **Se tem N/A marcado:**
   - Verificar que N/A não está contando no acumulado
   - Meses N/A devem ter nota = null

---

### ❌ Erro 10: Acumulado não calcula direito
**Sintomas:**
- Acumulado não é a soma/média dos meses
- Números não conferem
- Janeiro tem valor diferente do acumulado de janeiro

**Causas Possíveis:**
- Tipo de acumulação incorreta (Soma vs Média)
- Meses N/A não sendo ignorados
- Recalc não foi executado após alteração

**Solução:**
1. **Verificar tipo de acumulação:**
   ```javascript
   const meta = DataStore.getMetaById('m1');
   console.log('Acumulação:', meta.acumulacao); // 'soma' ou 'media'
   ```

2. **Para Soma (ex: Receita):**
   - Cada mês = 1/12 da meta
   - Acumulado = soma dos resultados válidos
   - Exemplo: Jan=1000, Fev=1500, Mar=N/A
     - Acumulado até Mar = 1000+1500 = 2500

3. **Para Média (ex: NPS):**
   - Cada mês = meta full (não divide)
   - Acumulado = média dos resultados válidos
   - Exemplo: Jan=70, Fev=75, Mar=N/A
     - Acumulado até Mar = (70+75)/2 = 72.5

4. **Forçar recalc:**
   ```javascript
   const metas = DataStore.getMetas();
   const meta = metas.find(m => m.id === 'm1');
   DataStore.recalcMesesData(meta);
   DataStore.set(DataStore.KEYS.METAS, metas);
   App.refreshPage();
   ```

---

### ❌ Erro 11: Desvio está negativo
**Sintomas:**
- Coluna "D:" mostra números negativos
- Desvio não faz sentido com o resultado
- Sempre negativo mesmo quando acima da meta

**Causas Possíveis:**
- Polaridade invertida
- Cálculo de desvio incorreto
- Valor não foi salvo corretamente

**Solução:**
1. **Fórmula do desvio:**
   ```
   Para Maior Melhor:
   Desvio = ((R - P) / P) × 100
   
   Para Menor Melhor:
   Desvio = ((P - R) / P) × 100
   
   Exemplo (Menor Melhor, P=27, R=20):
   Desvio = ((27 - 20) / 27) × 100 = 25.93%
   (Resultado está 25.93% abaixo do esperado - BOM!)
   ```

2. **Se está sempre negativo:**
   - Verificar se polaridade está correta
   - Editar meta e validar polaridade

---

### ❌ Erro 12: Performance global incorreta
**Sintomas:**
- Dashboard mostra nota diferente da esperada
- Nota global não é ponderada corretamente
- Ranking de performance está errado

**Causas Possíveis:**
- Metas com peso > 100% para um responsável
- Metas sem valores definidos
- Cálculo de performance individual incorreto
- Metas N/A não sendo ignoradas

**Solução:**
1. **Verificar soma de pesos:**
   ```javascript
   const users = DataStore.getUsers();
   users.forEach(u => {
     const metas = DataStore.getMetas()
       .filter(m => m.responsavelId === u.id);
     const totalPeso = metas.reduce((s, m) => s + m.peso, 0);
     if (totalPeso !== 100 && totalPeso !== 0) {
       console.warn(`${u.nome}: peso total = ${totalPeso}% (deve ser 100%)`);
     }
   });
   ```

2. **Recalcular performance global:**
   ```javascript
   const metas = DataStore.getMetas();
   const pesoTotal = metas.reduce((s, m) => s + (m.peso || 0), 0);
   const perfGeral = pesoTotal > 0 ?
     metas.reduce((s, m) => {
       const p = DataStore.calcPerformance(m);
       return s + (p * (m.peso || 0));
     }, 0) / pesoTotal : 0;
   console.log('Performance Geral:', perfGeral.toFixed(2));
   ```

---

## 💾 Dados e Persistência

### ❌ Erro 13: localStorage corrompido
**Sintomas:**
- Mensagens de erro na console
- Dados desaparecem periodicamente
- JSON.parse error
- Aplicação trava ou fica lenta

**Causas Possíveis:**
- localStorage excedeu limite (5-10MB)
- Dados foram mal formatados
- Outro script modificou localStorage
- Navegador com problemas

**Solução:**
1. **Limpar localStorage completamente:**
   ```javascript
   localStorage.clear();
   // Recarregar e deixar reinicializar
   location.reload();
   ```

2. **Restaurar um backup:**
   - Se tiver backup em JSON, restaurar:
   ```javascript
   localStorage.setItem('mp_metas', JSON.stringify([...]));
   localStorage.setItem('mp_users', JSON.stringify([...]));
   // etc
   ```

3. **Desabilitar extensões:**
   - Algumas extensões modificam localStorage
   - Testar em modo incógnito (sem extensões)

4. **Verificar cotas:**
   ```javascript
   try {
     const test = 'x'.repeat(1024 * 1024); // 1MB
     localStorage.setItem('quota_test', test);
     localStorage.removeItem('quota_test');
     console.log('Storage disponível: OK');
   } catch(e) {
     console.error('Storage cheio:', e);
   }
   ```

---

### ❌ Erro 14: Dados inconsistentes entre abas
**Sintomas:**
- Uma aba mostra dado diferente da outra
- Mudança em uma aba não reflete na outra
- Conflito de dados

**Causas Possíveis:**
- localStorage não sincroniza entre abas em tempo real
- Dados foram alterados simultaneamente
- Cache de página está ativo

**Solução:**
1. **Implementar sincronização:**
   ```javascript
   // Em cada aba, escute mudanças
   window.addEventListener('storage', (e) => {
     if (e.key === 'mp_metas' || e.key === 'mp_session') {
       console.log('Dados atualizados em outra aba');
       App.refreshPage();
     }
   });
   ```

2. **Para usar agora:**
   - Fechar todas as abas do site
   - Abrir apenas uma aba
   - Trabalhar em uma aba por vez

---

### ❌ Erro 15: Histórico não persiste
**Sintomas:**
- Dados antigos desaparecem
- Meses anteriores ficam vazios
- Histórico de áreas se perde

**Causas Possíveis:**
- Dados não foram salvos em primeiro lugar
- localStorage foi limpo
- Migração de dados incompleta

**Solução:**
1. **Verificar estrutura de dados:**
   ```javascript
   const metas = DataStore.get(DataStore.KEYS.METAS);
   metas.forEach(m => {
     console.log('Meta:', m.titulo);
     console.log('Meses dados:', m.mesesData ? m.mesesData.length : 0);
     if (m.mesesData) {
       console.log('Primeiros dados:', m.mesesData[0]);
     }
   });
   ```

2. **Re-popular dados históricos:**
   - Se perdeu dados do ano anterior
   - Será necessário reimportar ou re-digitar

---

## 💰 Remuneração e Bônus

### ❌ Erro 16: Bônus não calcula
**Sintomas:**
- Painel mostra valor 0 ou R$ 0,00
- Colaborador aparece como "Não Elegível"
- Simulador não funciona

**Causas Possíveis:**
- Performance abaixo do gatilho (< 80%)
- Salário não foi definido
- Regras não foram configuradas
- Cálculo de bônus tem erro

**Solução:**
1. **Verificar performance do colaborador:**
   ```javascript
   const userId = 'u1';
   const calc = DataStore.calcBonusColaborador(userId);
   console.log('Cálculo:', calc);
   console.log('Performance:', calc.perfPonderada);
   console.log('Elegível:', calc.elegivel);
   ```

2. **Performance abaixo de 80%:**
   - Aumentar performance (melhores resultados nas metas)
   - Ou diminuir gatilho em Configurações → Regras

3. **Salário não definido:**
   - Ir em Configurações → Colaboradores
   - Editar colaborador
   - Adicionar "Salário Base"

4. **Regras não configuradas:**
   ```javascript
   const regras = DataStore.getRegras();
   console.log('Regras:', regras);
   // Deve ter: gatilho, multiplicador, teto
   ```

---

### ❌ Erro 17: Multiplicador está errado
**Sintomas:**
- Bônus calculado diferente que esperado
- Multiplicador de cargo não está sendo aplicado
- Todos têm mesma taxa de bônus

**Causas Possíveis:**
- Nível do usuário não corresponde à regra
- Multiplicador não foi definido
- Usuário tem nível não reconhecido

**Solução:**
1. **Verificar níveis disponíveis:**
   - Diretoria → 1.5x
   - Gerência → 1.2x
   - Coordenação → 1.2x
   - Supervisão → 1.2x
   - Analista → 1.0x

2. **Validar nível do usuário:**
   ```javascript
   const user = DataStore.getUserById('u1');
   console.log('Nível:', user.nivel);
   ```

3. **Se nível está errado:**
   - Editar usuário em Configurações
   - Corrigir nível hierárquico
   - Salvar

---

### ❌ Erro 18: Simulador não funciona
**Sintomas:**
- Slider não muda o valor
- Resultado não atualiza
- Mostra resultado anterior

**Causas Possíveis:**
- JavaScript desabilitado
- Elemento não foi renderizado
- Evento onchange não funciona

**Solução:**
1. **Tentar recarregar página:**
   - F5 ou Ctrl+R

2. **Verificar se elementos existem:**
   ```javascript
   console.log('simUser:', document.getElementById('simUser'));
   console.log('simPerf:', document.getElementById('simPerf'));
   console.log('simResult:', document.getElementById('simResult'));
   ```

3. **Executar simulação manualmente:**
   ```javascript
   Remuneracao.simular();
   ```

---

## 👥 Gestão de Usuários e Áreas

### ❌ Erro 19: Não consegue criar usuário
**Sintomas:**
- Formulário não valida
- Botão "Criar" não funciona
- Usuário não aparece na lista

**Causas Possíveis:**
- Campo obrigatório não preenchido
- E-mail duplicado
- Peso total excede 100%
- localStorage cheio

**Solução:**
1. **Campos obrigatórios:**
   - ✓ Nome Completo
   - ✓ E-mail (deve ser único)
   - ✓ Cargo
   - ✓ Nível Hierárquico

2. **E-mail duplicado:**
   ```javascript
   const users = DataStore.getUsers();
   const duplicados = users
     .map(u => u.email)
     .filter((e, i, arr) => arr.indexOf(e) !== i);
   console.log('E-mails duplicados:', duplicados);
   ```

3. **Remover duplicado:**
   ```javascript
   const users = DataStore.getUsers();
   const filtrados = users.filter((u, i, arr) =>
     arr.findIndex(x => x.email === u.email) === i
   );
   DataStore.set(DataStore.KEYS.USERS, filtrados);
   App.refreshPage();
   ```

---

### ❌ Erro 20: Usuário não consegue ser deletado
**Sintomas:**
- Clica delete, nada acontece
- Usuário continua na lista
- Mensagem de confirmação não aparece

**Causas Possíveis:**
- Usuário tem metas atribuídas
- Admin protegido contra deleção
- Erro de permissão

**Solução:**
1. **Se tem metas:**
   - Reatribuir todas as metas para outro responsável
   - Depois deletar

2. **Verificar metas do usuário:**
   ```javascript
   const userId = 'u1';
   const metas = DataStore.getMetas()
     .filter(m => m.responsavelId === userId);
   console.log('Metas:', metas.length);
   ```

3. **Reatribuir metas:**
   - Editar cada meta
   - Trocar responsável
   - Salvar

4. **Deletar manualmente:**
   ```javascript
   DataStore.remove(DataStore.KEYS.USERS, 'u1');
   App.refreshPage();
   ```

---

### ❌ Erro 21: Área não aparece na lista
**Sintomas:**
- Criou área mas não está visível
- Área desaparece ao recarregar
- Não consegue atribuir usuários a área

**Causas Possíveis:**
- Área foi criada mas não foi persistida
- Área é subcategoria e está oculta
- localStorage corrompido

**Solução:**
1. **Verificar áreas salvas:**
   ```javascript
   const areas = DataStore.getAreas();
   console.log('Áreas:', areas);
   ```

2. **Se não aparece:**
   - Verificar se estrutura hierárquica está correta
   - parentId deve apontar para área pai válida

3. **Recrear área:**
   - Usar tabela de Estrutura de Áreas
   - Criar novamente com dados corretos

---

### ❌ Erro 22: Histórico de áreas não sincroniza
**Sintomas:**
- Usuário muda de área mas histórico não atualiza
- Áreas antigas aparecem como atuais
- Datas de movimentação estão erradas

**Causas Possíveis:**
- Histórico não foi gravado
- Datas incorretas
- Registro duplicado

**Solução:**
1. **Verificar histórico:**
   ```javascript
   const historico = DataStore.get(DataStore.KEYS.HISTORICO_AREAS);
   console.log('Histórico:', historico);
   ```

2. **Adicionar movimentação:**
   ```javascript
   const historico = DataStore.get(DataStore.KEYS.HISTORICO_AREAS);
   historico.push({
     id: 'ha' + Date.now(),
     userId: 'u1',
     areaId: 'ar3',
     dataInicio: new Date().toISOString(),
     dataFim: null
   });
   DataStore.set(DataStore.KEYS.HISTORICO_AREAS, historico);
   ```

---

## 🎨 Interface e Navegação

### ❌ Erro 23: Página fica em branco
**Sintomas:**
- Navegação não funciona
- Apenas loading spinner
- Sem mensagem de erro

**Causas Possíveis:**
- JavaScript error não tratado
- Dados não carregaram
- Loop infinito em render

**Solução:**
1. **Abrir DevTools (F12):**
   - Ir em Console
   - Procurar por erros em vermelho

2. **Forçar reinicialização:**
   ```javascript
   App.init();
   ```

3. **Se ainda não funciona:**
   ```javascript
   localStorage.clear();
   location.reload();
   ```

---

### ❌ Erro 24: Sidebar desaparece
**Sintomas:**
- Menu lateral some
- Navegar fica difícil
- Botão toggle não funciona

**Causas Possíveis:**
- CSS não carregou
- JavaScript de toggle com erro
- Zoom do navegador afetou layout

**Solução:**
1. **Restaurar CSS:**
   - Ctrl+Shift+Delete (limpar cache)
   - Recarregar página

2. **Toggle manual:**
   ```javascript
   Components.toggleSidebar();
   ```

3. **Resetar zoom:**
   - Ctrl+0 (volta ao 100%)

---

### ❌ Erro 25: Buscador (search) não funciona
**Sintomas:**
- Campo de busca não filtra
- Digitação não faz efeito
- Sempre mostra tudo

**Causas Possíveis:**
- Evento não está conectado
- Filtro não foi implementado
- Função não existe

**Solução:**
1. **Buscar metas manualmente:**
   - Usar filtros (Status, Áreas)
   - Em vez de buscador

2. **Implementar filtro por titulo:**
   ```javascript
   const termo = 'receita';
   const metas = DataStore.getMetas()
     .filter(m =>
       m.titulo.toLowerCase().includes(termo.toLowerCase()) ||
       m.descricao.toLowerCase().includes(termo.toLowerCase())
     );
   console.log('Encontradas:', metas.length);
   ```

---

### ❌ Erro 26: Modal fica atrás da página
**Sintomas:**
- Modal aparece mas não consegue interagir
- Conteúdo fica atrás de outro elemento
- z-index parece errado

**Causas Possíveis:**
- Z-index CSS conflitante
- Múltiplas modais abertas
- Layout overflow

**Solução:**
1. **Fechar modais abertas:**
   ```javascript
   Components.closeModal();
   ```

2. **Se tiver texto digitado na modal:**
   - Salvar o conteúdo primeiro (selecionar + Ctrl+C)
   - Fechar modal (Esc)
   - Tentar novamente

---

## 🔧 Troubleshooting Avançado

### ❌ Erro 27: Sincronização de cálculos desatualizada
**Sintomas:**
- Valores aparecem mas cálculo não atualiza
- Dashboard mostra valores antigos
- Precisa recarregar para ver mudanças

**Causas Possíveis:**
- recalcMesesData não foi executado
- Cache do JavaScript
- Observer não ativado

**Solução:**
1. **Forçar recalc completo:**
   ```javascript
   const metas = DataStore.get(DataStore.KEYS.METAS);
   metas.forEach(meta => {
     if (meta.mesesData) {
       delete meta.mesesData; // Force recalc
     }
   });
   DataStore.set(DataStore.KEYS.METAS, metas);
   App.refreshPage();
   ```

2. **Limpar cache:**
   - Ctrl+Shift+Delete (cache do navegador)
   - Recarregar

---

### ❌ Erro 28: Performance lenta
**Sintomas:**
- Sistema demora para responder
- Cliques não reagem imediatamente
- Página trava ao editar muitas metas

**Causas Possíveis:**
- localStorage muito grande
- Muitos dados para renderizar
- Cálculos pesados

**Solução:**
1. **Reduzir dados:**
   ```javascript
   // Arquivar metas antigas
   let metas = DataStore.get(DataStore.KEYS.METAS);
   metas = metas.filter(m => m.status !== 'concluida');
   // Ou criar período separado
   ```

2. **Verificar tamanho:**
   ```javascript
   const metas = DataStore.get(DataStore.KEYS.METAS);
   const size = JSON.stringify(metas).length;
   console.log('Tamanho metas:', (size / 1024).toFixed(2) + ' KB');
   ```

3. **Otimizar renderização:**
   - Usar filtros para mostrar menos dados
   - Não abrir múltiplos modais

---

### ❌ Erro 29: Validação de peso total não funciona
**Sintomas:**
- Consegue criar meta com peso > 100%
- Validação não bloqueia
- Mensagem de erro não aparece

**Causas Possíveis:**
- Validação não foi executada
- Lógica de soma incorreta
- Meta anterior não foi persistida

**Solução:**
1. **Validar peso manualmente:**
   ```javascript
   const responsavel = 'u1';
   const metas = DataStore.getMetas()
     .filter(m => m.responsavelId === responsavel);
   const totalPeso = metas.reduce((s, m) => s + m.peso, 0);
   console.log('Peso total para responsável:', totalPeso);
   if (totalPeso > 100) {
     console.error('ERRO: Peso total > 100%!');
   }
   ```

2. **Corrigir pesos:**
   - Editar cada meta
   - Reduzir peso para ficando <= 100% total

---

### ❌ Erro 30: Curva de performance não interpolada corretamente
**Sintomas:**
- Scores entre os pontos da curva estão errados
- Interpolação não é linear
- Nota não progride como esperado

**Causas Possíveis:**
- Valores de curva não em ordem
- Interpolação com bug
- Valores duplicados

**Solução:**
1. **Verificar ordem de curva:**
   ```javascript
   const meta = DataStore.getMetaById('m1');
   const pontos = Object.keys(meta.valoresCurva)
     .map(k => ({ score: parseFloat(k), valor: meta.valoresCurva[k] }))
     .sort((a, b) => a.valor - b.valor);
   console.log('Pontos:', pontos);
   // Deve estar em ordem: 0 < 80 < 100 < 120
   ```

2. **Recalc com curva corrigida:**
   ```javascript
   meta.valoresCurva = {
     '0': 0,      // Score 0 para valor 0
     '80': 2000,  // Score 80 para valor 2000
     '100': 2500, // Score 100 para valor 2500
     '120': 3000  // Score 120 para valor 3000
   };
   DataStore.set(DataStore.KEYS.METAS, metas);
   App.refreshPage();
   ```

---

## 📞 Checklist de Diagnóstico Rápido

Ao encontrar um erro, seguir essa ordem:

1. ✓ **Recarregar página** (F5 ou Ctrl+F5)
2. ✓ **Verificar localStorage** (F12 → Application → LocalStorage)
3. ✓ **Verificar console** (F12 → Console, procurar erros em vermelho)
4. ✓ **Limpar cache** (Ctrl+Shift+Delete)
5. ✓ **Tentar em modo incógnito** (sem extensões)
6. ✓ **Verificar outro navegador** (Firefox, Chrome, Edge)
7. ✓ **Restaurar dados** (localStorage.clear() + reload)
8. ✓ **Se nada funcionar: contatar suporte com print da console**

---

## 🎯 Dicas Preventivas

- ✅ Sempre fazer backup de dados importantes
- ✅ Usar sempre o mesmo navegador
- ✅ Não usar modo privado/incógnito para dados persistentes
- ✅ Fechar outras abas do mesmo site
- ✅ Manter navegador atualizado
- ✅ Desabilitar bloqueadores de ads que afetam localStorage
- ✅ Não compartilhar localStorage entre múltiplos usuários

---

**Última atualização:** 12 de maio de 2026
**Versão do Manual:** 1.0

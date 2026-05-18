# 🆘 Guia de Recuperação de Desastres - MetasPro

## 1. Perda Total de Dados

### Cenário: localStorage foi completamente limpo

**O que aconteceu:**
- Todos os dados sumiram
- Metas, usuários, histórico zerados
- Sistema em estado inicial

**Recuperação:**

**Opção A: Restaurar do Backup (RECOMENDADO)**
```javascript
// Se tiver backup em JSON, colar aqui
const backup = {
  metas: [...], // dados do backup
  users: [...],
  areas: [...]
};

// Restaurar tudo
localStorage.setItem('mp_metas', JSON.stringify(backup.metas));
localStorage.setItem('mp_users', JSON.stringify(backup.users));
localStorage.setItem('mp_areas', JSON.stringify(backup.areas));
localStorage.setItem('mp_acoes', JSON.stringify(backup.acoes || []));
localStorage.setItem('mp_bonus', JSON.stringify(backup.bonus || []));
localStorage.setItem('mp_regras', JSON.stringify(backup.regras || []));
localStorage.setItem('mp_historico_areas', JSON.stringify(backup.historico || []));

location.reload();
```

**Opção B: Reconstruir dados padrão**
```javascript
// Inicializar com dados padrão
localStorage.clear();
DataStore.init(); // Repovoar com dados padrão
location.reload();
```

**Opção C: Restaurar parcialmente (se tiver arquivo exportado)**
- Importar JSON exportado anteriormente
- Recalcular meses manualmente

---

## 2. Dados Corrompidos ou Inconsistentes

### Cenário: Valores estão errados, cálculos não batem, dados contraditórios

**Diagnosticar:**
```javascript
// 1. Verificar integridade de metas
const metas = DataStore.get(DataStore.KEYS.METAS);
metas.forEach((m, i) => {
  console.log(`Meta ${i}: ${m.titulo}`);
  console.log('  - Campos obrigatórios?', m.titulo && m.responsavelId && m.peso);
  console.log('  - mesesData?', m.mesesData ? m.mesesData.length : 'FALTANDO');
  console.log('  - Acumulação?', m.acumulacao);
});

// 2. Verificar integridade de usuários
const users = DataStore.get(DataStore.KEYS.USERS);
users.forEach(u => {
  console.log(`Usuário: ${u.email}`);
  console.log('  - Email válido?', u.email && u.email.includes('@'));
  console.log('  - Tem metas?', DataStore.getMetas().filter(m => m.responsavelId === u.id).length);
});

// 3. Verificar peso total por responsável
const pesosPorResp = {};
metas.forEach(m => {
  pesosPorResp[m.responsavelId] = (pesosPorResp[m.responsavelId] || 0) + m.peso;
});
Object.entries(pesosPorResp).forEach(([resp, peso]) => {
  if (peso !== 100 && peso > 0) {
    console.warn(`ALERTA: ${resp} tem peso total ${peso}% (deve ser 100%)`);
  }
});
```

**Reparar:**

**Reparar Metas com estrutura ruim:**
```javascript
let metas = DataStore.get(DataStore.KEYS.METAS);
metas = metas.filter(m => {
  // Remover metas sem título ou responsável
  return m.titulo && m.responsavelId;
});
metas.forEach(m => {
  // Garantir campos essenciais
  if (!m.codigo) m.codigo = 'META_' + Date.now();
  if (!m.polaridade) m.polaridade = 'maior_melhor';
  if (!m.acumulacao) m.acumulacao = 'soma';
  if (!m.status) m.status = 'em_andamento';
  if (m.peso > 100) m.peso = 100;
  if (m.peso < 1) m.peso = 10;
});
DataStore.set(DataStore.KEYS.METAS, metas);
```

**Reparar pesos que somam > 100%:**
```javascript
let metas = DataStore.get(DataStore.KEYS.METAS);
const pesosPorResp = {};

// Calcular excesso
metas.forEach(m => {
  pesosPorResp[m.responsavelId] = (pesosPorResp[m.responsavelId] || 0) + m.peso;
});

// Ajustar proporcionalmente
metas = metas.map(m => {
  const totalResp = pesosPorResp[m.responsavelId];
  if (totalResp > 100) {
    m.peso = Math.floor((m.peso / totalResp) * 100);
  }
  return m;
});

DataStore.set(DataStore.KEYS.METAS, metas);
```

---

## 3. mesesData Corrompido ou Faltando

### Cenário: Matriz de meses desapareceu, recalc não funciona

**Diagnosticar:**
```javascript
const metas = DataStore.getMetas();
metas.forEach(m => {
  if (!m.mesesData || m.mesesData.length === 0) {
    console.warn(`Meta ${m.titulo} SEM mesesData`);
  }
});
```

**Reparar: Forçar recalc de todas**
```javascript
let metas = DataStore.get(DataStore.KEYS.METAS);
metas.forEach(m => {
  delete m.mesesData; // Deletar para forçar recalc
});
DataStore.set(DataStore.KEYS.METAS, metas);

// Agora chamar getMetas que vai recalcular tudo
DataStore.getMetas();
App.refreshPage();
```

---

## 4. Cálculos de Performance Errados

### Cenário: Notas não batem, performance global está errada

**Diagnosticar e reparar:**
```javascript
// 1. Recalcular acumulados
const metas = DataStore.get(DataStore.KEYS.METAS);
metas.forEach(m => {
  DataStore.recalcMesesData(m);
});
DataStore.set(DataStore.KEYS.METAS, metas);

// 2. Validar curvas
metas.forEach(m => {
  if (m.valoresCurva) {
    const scores = Object.keys(m.valoresCurva)
      .map(s => ({ score: parseFloat(s), val: m.valoresCurva[s] }))
      .sort((a, b) => a.val - b.val);
    
    // Verificar se está em ordem
    for (let i = 0; i < scores.length - 1; i++) {
      if (scores[i].val >= scores[i+1].val) {
        console.error(`Meta ${m.titulo}: curva fora de ordem`);
      }
    }
  }
});

// 3. Recarregar interface
App.refreshPage();
```

---

## 5. Duplicação de Dados

### Cenário: Mesmo usuário/meta aparece múltiplas vezes

**Diagnosticar:**
```javascript
// Encontrar duplicados
const users = DataStore.get(DataStore.KEYS.USERS);
const emailCount = {};
users.forEach(u => {
  emailCount[u.email] = (emailCount[u.email] || 0) + 1;
});
const duplicados = Object.entries(emailCount)
  .filter(([email, count]) => count > 1)
  .map(([email]) => email);
console.log('Emails duplicados:', duplicados);
```

**Reparar:**
```javascript
// Remover duplicados mantendo primeiro
const users = DataStore.get(DataStore.KEYS.USERS);
const unicos = {};
const usersFiltrados = users.filter(u => {
  if (unicos[u.email]) return false;
  unicos[u.email] = true;
  return true;
});
DataStore.set(DataStore.KEYS.USERS, usersFiltrados);

// Mesmo para metas
const metas = DataStore.get(DataStore.KEYS.METAS);
const uniqueIds = new Set();
const metasUnicas = metas.filter(m => {
  if (uniqueIds.has(m.id)) return false;
  uniqueIds.add(m.id);
  return true;
});
DataStore.set(DataStore.KEYS.METAS, metasUnicas);
```

---

## 6. Histórico de Áreas Quebrado

### Cenário: Movimentações de áreas não sincronizam, usuários em áreas erradas

**Reparar:**
```javascript
// 1. Identificar usuários sem movimentação
const users = DataStore.getUsers();
const historico = DataStore.get(DataStore.KEYS.HISTORICO_AREAS);
const areasAtuais = {};

historico.forEach(h => {
  if (!h.dataFim) {
    areasAtuais[h.userId] = h.areaId;
  }
});

users.forEach(u => {
  if (!areasAtuais[u.id]) {
    console.warn(`Usuário ${u.nome} sem movimentação de área`);
  }
});

// 2. Criar movimentação para quem não tem
users.forEach(u => {
  if (!areasAtuais[u.id] && u.area) {
    const areas = DataStore.getAreas();
    const area = areas.find(a => a.nome === u.area);
    if (area) {
      historico.push({
        id: 'ha_' + u.id + '_' + Date.now(),
        userId: u.id,
        areaId: area.id,
        dataInicio: '2026-01-01',
        dataFim: null
      });
    }
  }
});

DataStore.set(DataStore.KEYS.HISTORICO_AREAS, historico);
```

---

## 7. Bonus Não Calcula Corretamente

### Cenário: Valores de bônus estão errados, elegibilidade não funciona

**Diagnosticar:**
```javascript
const users = DataStore.getUsers();
users.forEach(u => {
  const calc = DataStore.calcBonusColaborador(u.id);
  if (calc) {
    console.log(`${u.nome}:`);
    console.log('  - Performance:', calc.perfPonderada);
    console.log('  - Elegível:', calc.elegivel);
    console.log('  - Bônus:', calc.bonus);
    console.log('  - Multiplicador:', calc.multiplicador);
  }
});
```

**Reparar: Recalcular com regras corretas**
```javascript
// 1. Verificar regras
const regras = DataStore.getRegras();
console.log('Regras:', regras.map(r => ({ tipo: r.tipo, valor: r.valor })));

// 2. Se gatilho está muito alto, baixar
const gatilho = regras.find(r => r.tipo === 'gatilho');
if (gatilho && gatilho.valor > 90) {
  gatilho.valor = 80; // Valor recomendado
  DataStore.set(DataStore.KEYS.REGRAS, regras);
}

// 3. Recalcular bônus
const bonus = DataStore.get(DataStore.KEYS.BONUS);
users.forEach(u => {
  const calc = DataStore.calcBonusColaborador(u.id);
  // Atualizar/criar registro
});
```

---

## 8. Performance Lenta - Otimização

### Cenário: Sistema travando, cálculos demoram, muita latência

**Diagnosticar tamanho:**
```javascript
// Verificar quanto localStorage está usando
const tamanhos = {};
Object.keys(localStorage).forEach(key => {
  if (key.startsWith('mp_')) {
    const size = localStorage[key].length;
    tamanhos[key] = {
      bytes: size,
      kb: (size / 1024).toFixed(2)
    };
  }
});
console.table(tamanhos);

// Total
const total = Object.values(tamanhos)
  .reduce((sum, s) => sum + s.bytes, 0);
console.log('Total localStorage:', (total / 1024).toFixed(2), 'KB');
```

**Otimizar:**

**Remover dados antigos:**
```javascript
// Remover metas concluídas de anos anteriores
let metas = DataStore.get(DataStore.KEYS.METAS);
const anoAtual = new Date().getFullYear();
metas = metas.filter(m => {
  // Manter: metas em andamento, atrasadas, ou do ano atual
  if (m.status !== 'concluida') return true;
  if (m.periodo === anoAtual.toString()) return true;
  return false;
});
DataStore.set(DataStore.KEYS.METAS, metas);
```

**Arquivar dados:**
```javascript
// Exportar dados antigos para JSON externo
const backup = {
  metas: DataStore.get(DataStore.KEYS.METAS),
  bonus: DataStore.get(DataStore.KEYS.BONUS)
};

// Salvar como arquivo
const json = JSON.stringify(backup, null, 2);
const blob = new Blob([json], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'backup_' + new Date().toISOString() + '.json';
a.click();
```

---

## 9. Sincronização Entre Abas Falhando

### Cenário: Mudanças em uma aba não refletem em outra

**Solução:**
```javascript
// Adicionar listener em cada aba
window.addEventListener('storage', (e) => {
  if (e.key && e.key.startsWith('mp_')) {
    console.log('Dados atualizados em outra aba:', e.key);
    // Dar tempo para o evento propagar
    setTimeout(() => {
      App.refreshPage();
    }, 100);
  }
});

// Ou sincronizar manualmente
// Uma aba: salvar
// Outra aba: recarregar
```

---

## 10. Backup e Exportação

### Criar backup automático

```javascript
// Salvar backup no localStorage
function criarBackup() {
  const backup = {
    timestamp: new Date().toISOString(),
    metas: DataStore.get(DataStore.KEYS.METAS),
    users: DataStore.get(DataStore.KEYS.USERS),
    areas: DataStore.get(DataStore.KEYS.AREAS),
    bonus: DataStore.get(DataStore.KEYS.BONUS),
    regras: DataStore.get(DataStore.KEYS.REGRAS),
    historico: DataStore.get(DataStore.KEYS.HISTORICO_AREAS),
    acoes: DataStore.get(DataStore.KEYS.ACOES)
  };
  
  return JSON.stringify(backup, null, 2);
}

// Exportar para arquivo
function exportarBackup() {
  const json = criarBackup();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'backup_' + new Date().toISOString().split('T')[0] + '.json';
  link.click();
}

// Restaurar do arquivo
function restaurarBackup(jsonFile) {
  try {
    const backup = JSON.parse(jsonFile);
    DataStore.set(DataStore.KEYS.METAS, backup.metas);
    DataStore.set(DataStore.KEYS.USERS, backup.users);
    DataStore.set(DataStore.KEYS.AREAS, backup.areas);
    DataStore.set(DataStore.KEYS.BONUS, backup.bonus);
    DataStore.set(DataStore.KEYS.REGRAS, backup.regras);
    DataStore.set(DataStore.KEYS.HISTORICO_AREAS, backup.historico);
    DataStore.set(DataStore.KEYS.ACOES, backup.acoes);
    
    console.log('Backup restaurado com sucesso!');
    App.refreshPage();
  } catch (e) {
    console.error('Erro ao restaurar:', e);
  }
}

// Usar:
// exportarBackup(); // Faz download
// restaurarBackup(conteudoDoArquivo); // Restaura
```

---

## Procedimento de Recuperação Passo-a-Passo

### Se o sistema ficou totalmente quebrado:

1. **Abrir DevTools** (F12)
2. **Ir em Console**
3. **Colar o código apropriado conforme o erro**
4. **Pressionar Enter**
5. **Aguardar "done!" na console**
6. **Recarregar página** (F5)

---

## Checklist Semanal de Manutenção

- [ ] Fazer backup do localStorage
- [ ] Verificar se há dados corrompidos
- [ ] Testar cálculos em algumas metas
- [ ] Verificar se pesos batem
- [ ] Validar bônus de 2-3 colaboradores
- [ ] Conferir se histórico de áreas está correto
- [ ] Verificar se há metas sem mesesData
- [ ] Limpar dados muito antigos

---

## Checklist Mensal de Manutenção

- [ ] Exportar backup completo
- [ ] Validar integridade de todos os dados
- [ ] Recalcular todas as metas
- [ ] Verificar performance do sistema
- [ ] Testar sincronização entre abas
- [ ] Revisar regras de bônus
- [ ] Documentar possíveis problemas
- [ ] Planejar limpeza de dados antigos

---

**IMPORTANTE:** Sempre fazer backup ANTES de fazer reparos!


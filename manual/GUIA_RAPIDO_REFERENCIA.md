# 🎯 Guia Rápido de Referência - Diagnóstico de Problemas

## 🔍 Fluxograma de Diagnóstico

```
┌─────────────────────────────┐
│   Problema Identificado?    │
└──────────────┬──────────────┘
               │
        ┌──────▼──────┐
        │ Recarregar? │ ──YES──→ [F5 ou Ctrl+F5] ──→ Resolvido? YES→ ✅
        └──────┬──────┘
               │ NO
        ┌──────▼──────────────────┐
        │ Erro na Console (F12)?  │
        └──────┬─────────────────┘
               │ YES
        ┌──────▼────────────────┐
        │ Anotar erro exato     │
        │ (copiar mensagem)     │
        └──────┬────────────────┘
               │
        ┌──────▼────────────────────────┐
        │ Procurar na Seção Apropriada  │
        │ do Manual de Erros            │
        └──────┬────────────────────────┘
               │
        ┌──────▼────────────────┐
        │ Aplicar Solução       │
        └──────┬────────────────┘
               │
        ┌──────▼───────────────┐
        │ Problema Resolvido?  │
        └──────┬───────────────┘
          ┌────┴────┐
        YES        NO
        ✅      [Tentar solução alternativa ou contatar suporte]
```

---

## 🚨 Problemas Mais Comuns (Top 10)

| # | Problema | Solução Rápida | Tempo |
|---|----------|---|---|
| 1 | Login não funciona | `localStorage.clear(); location.reload()` | 10s |
| 2 | Meta não aparece | Verificar filtros (Status, Área) | 5s |
| 3 | Resultado não salva | Verificar permissões (você é admin?) | 5s |
| 4 | Performance lenta | Fechar outras abas, limpar extensões | 30s |
| 5 | Página branca | F12 → Console, anotar erro em vermelho | 10s |
| 6 | Cálculo errado | `DataStore.recalcMesesData()` + reload | 20s |
| 7 | Dados desapareceram | Restaurar de backup (teria que ter feito antes) | ⚠️ |
| 8 | Usuário não deleta | Remover metas atribuídas primeiro | 30s |
| 9 | Peso > 100% | Reduzir peso de outras metas do mesmo responsável | 15s |
| 10 | Dados em outra aba diferentes | Fechar todas as abas, abrir só uma | 20s |

---

## 🎨 Identificar Tipo de Erro

**Erro de LOGIN?**
- Tela de login, não consegue entrar
- → Ir para: SEÇÃO "Autenticação e Sessão" (Erros 1-3)

**Erro de METAS?**
- Metas não aparecem, não consegue criar/editar
- → Ir para: SEÇÃO "Gestão de Metas" (Erros 4-8)

**Erro de CÁLCULOS?**
- Valores estão errados, notas não batem
- → Ir para: SEÇÃO "Cálculos e Performance" (Erros 9-12)

**Erro de DADOS?**
- Dados desapareceram, corrompidos, inconsistentes
- → Ir para: SEÇÃO "Dados e Persistência" (Erros 13-15)

**Erro de BÔNUS?**
- Bônus não calcula, valores errados
- → Ir para: SEÇÃO "Remuneração e Bônus" (Erros 16-18)

**Erro de USUÁRIOS/ÁREAS?**
- Não consegue criar/deletar, não aparece
- → Ir para: SEÇÃO "Gestão de Usuários e Áreas" (Erros 19-22)

**Erro de INTERFACE?**
- Página branca, sidebar desaparece, modal não aparece
- → Ir para: SEÇÃO "Interface e Navegação" (Erros 23-26)

**Erro DESCONHECIDO?**
- → Ir para: SEÇÃO "Troubleshooting Avançado" (Erros 27-30)

---

## 📋 Checklist Rápido de Ações

### Se o sistema está completamente quebrado:
```
[ ] 1. Abrir DevTools (F12)
[ ] 2. Limpar cache (Ctrl+Shift+Delete)
[ ] 3. localStorage.clear()
[ ] 4. Recarregar (Ctrl+F5)
[ ] 5. Se nada funcionar, restaurar de backup
```

### Se há erros de cálculo:
```
[ ] 1. Forçar recalc: DataStore.recalcMesesData()
[ ] 2. Recarregar página: App.refreshPage()
[ ] 3. Verificar polaridade das metas
[ ] 4. Verificar valores de curva
[ ] 5. Validar meses N/A não estão gerando nota
```

### Se há problemas de dados:
```
[ ] 1. Validar integridade: console.log(localStorage)
[ ] 2. Procurar por null/undefined inesperados
[ ] 3. Verificar duplicatas
[ ] 4. Reparar dados conforme Guia de Recuperação
[ ] 5. Restaurar de backup se tiver
```

### Se há problemas de performance:
```
[ ] 1. Verificar tamanho localStorage (>5MB?)
[ ] 2. Fechar extensões (modo incógnito)
[ ] 3. Fechar outras abas
[ ] 4. Limpar dados antigos
[ ] 5. Reiniciar navegador
```

---

## 🔧 Comandos Úteis (Copiar e Colar no Console)

### 1. Diagnosticar tudo
```javascript
console.log('=== DIAGNÓSTICO ===');
console.log('Metas:', DataStore.get(DataStore.KEYS.METAS).length);
console.log('Usuários:', DataStore.get(DataStore.KEYS.USERS).length);
console.log('Áreas:', DataStore.get(DataStore.KEYS.AREAS).length);
console.log('LocalStorage:', (JSON.stringify(localStorage).length / 1024).toFixed(2) + ' KB');
console.log('Sessão:', Auth.getSession());
```

### 2. Verificar peso total
```javascript
const users = DataStore.getUsers();
const metas = DataStore.getMetas();
users.forEach(u => {
  const peso = metas
    .filter(m => m.responsavelId === u.id)
    .reduce((s, m) => s + m.peso, 0);
  console.log(`${u.nome}: ${peso}%`);
});
```

### 3. Listar todas as metas
```javascript
DataStore.getMetas().forEach(m => {
  console.log(`${m.codigo} - ${m.titulo}`);
});
```

### 4. Recalcular tudo
```javascript
const metas = DataStore.get(DataStore.KEYS.METAS);
metas.forEach(m => DataStore.recalcMesesData(m));
DataStore.set(DataStore.KEYS.METAS, metas);
App.refreshPage();
console.log('✅ Recalcado!');
```

### 5. Limpar tudo (CUIDADO!)
```javascript
if (confirm('Tem certeza? Isso apagará TODOS os dados!')) {
  localStorage.clear();
  location.reload();
}
```

### 6. Ver performance de usuário
```javascript
const userId = 'u1'; // trocar pelo ID
const calc = DataStore.calcBonusColaborador(userId);
console.table(calc);
```

### 7. Validar integridade
```javascript
const metas = DataStore.get(DataStore.KEYS.METAS);
metas.forEach(m => {
  const ok = m.titulo && m.responsavelId && m.peso > 0;
  if (!ok) console.warn('❌ Meta inválida:', m);
});
console.log('✅ Validação concluída');
```

### 8. Exportar backup
```javascript
const backup = JSON.stringify({
  metas: DataStore.get(DataStore.KEYS.METAS),
  users: DataStore.get(DataStore.KEYS.USERS),
  areas: DataStore.get(DataStore.KEYS.AREAS),
  bonus: DataStore.get(DataStore.KEYS.BONUS)
}, null, 2);
console.log(backup); // Copiar e salvar em arquivo .json
```

### 9. Encontrar bugs
```javascript
// Metas sem mesesData
const metas = DataStore.getMetas();
metas.filter(m => !m.mesesData)
  .forEach(m => console.warn('Sem mesesData:', m.titulo));

// Usuários sem cargo
const users = DataStore.getUsers();
users.filter(u => !u.cargo)
  .forEach(u => console.warn('Sem cargo:', u.nome));

// Pesos inválidos
const pesosErrados = metas.filter(m => m.peso < 1 || m.peso > 100);
console.log('Pesos errados:', pesosErrados.length);
```

### 10. Resetar completamente
```javascript
localStorage.clear();
DataStore.init();
Auth.login('admin@empresa.com', 'admin');
App.init();
console.log('✅ Sistema reinicializado');
```

---

## 📞 Como Coletar Informações para Suporte

**Se precise pedir ajuda, coleta essas informações:**

```javascript
console.log('=== INFORMAÇÕES PARA SUPORTE ===');
console.log('Navegador:', navigator.userAgent);
console.log('Timestamp:', new Date().toISOString());
console.log('---');

// Erro específico
console.log('Passo realizado:', 'ex: Tentando criar meta');
console.log('Resultado esperado:', 'ex: Modal de nova meta');
console.log('Resultado obtido:', 'ex: Nada aconteceu');
console.log('---');

// Dados do sistema
console.log('Sessão:', Auth.getSession());
console.log('Metas:', DataStore.get(DataStore.KEYS.METAS).length);
console.log('Usuários:', DataStore.get(DataStore.KEYS.USERS).length);

// Erro na console (se houver)
console.log('Erros:', 'Ver aba Console do DevTools');
```

**Colar tudo em:**
- Email de suporte
- Chat de suporte
- Ticket de suporte

---

## ⏱️ Tempos Estimados de Resolução

| Severidade | Tempo | Exemplo |
|----------|-------|---------|
| 🟢 Baixa | < 1 min | Resultado não salva, recarregar |
| 🟡 Média | 5-15 min | Peso > 100%, editar e reparar |
| 🔴 Alta | 15-60 min | Dados corrompidos, restaurar backup |
| 🔴 Crítica | > 1 hora | Sistema não inicia, reconstruir |

---

## 🎓 Dicas de Prevenção

1. ✅ **Fazer backup semanal** (usar exportação)
2. ✅ **Testar em modo incógnito** (sem extensões)
3. ✅ **Não usar em modo privado** (dados não persistem)
4. ✅ **Usar sempre o mesmo navegador** (consistência)
5. ✅ **Fechar outras abas** (evitar conflitos)
6. ✅ **Atualizar navegador** (bug fixes)
7. ✅ **Validar dados antes de salvar** (ler mensagens)
8. ✅ **Manter localStorage limpo** (remover dados antigos)

---

## 📚 Documentação Relacionada

| Documento | Utilidade |
|-----------|-----------|
| MANUAL_ERROS_E_SOLUCOES.md | Erros específicos com soluções |
| GUIA_RECUPERACAO_DESASTRES.md | Recuperação de dados perdidos/corrompidos |
| NA_IMPLEMENTATION_GUIDE.md | Como usar N/A em metas |
| COMO_USAR_NA.md | Guia prático do usuário para N/A |
| TECNICA_NA_IMPLEMENTATION.md | Detalhes técnicos de N/A |

---

## 🆘 Escalação de Suporte

### Nível 1: Usuário Final
- Problema: Não consegue salvar resultado
- Ação: Verificar se é admin, recarregar
- Se não funcionar → Nível 2

### Nível 2: Administrador do Sistema
- Problema: Dados inconsistentes
- Ação: Rodar diagnóstico, validar integridade
- Se não funcionar → Nível 3

### Nível 3: Desenvolvedor
- Problema: Bug no código
- Ação: Revisar console, coletar logs, investigar código
- Implementar fix

---

**Última atualização:** 12 de maio de 2026  
**Versão:** 1.0


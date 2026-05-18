# Documentação Técnica - Implementação de N/A em Metas

## 📐 Arquitetura de Dados

### Estrutura de um Mês (mesesData)
```javascript
{
  mes: 'Jan/25',
  pontual: {
    p: 27,              // Planejado
    r: 20,              // Resultado (null se N/A)
    na: false,          // Flag N/A
    d: 25.93,           // Desvio (null se N/A)
    nota: 107.41        // Performance (null se N/A)
  },
  acumulado: {
    p: 27,              // P acumulado
    r: 20,              // R acumulado (null se todos N/A até agora)
    d: 25.93,           // Desvio acumulado (null se N/A)
    nota: 107.41        // Performance acumulada (null se N/A)
  },
  anexos: []            // Evidências
}
```

## 🔧 Algoritmo recalcMesesData

### Pseudocódigo
```
para cada mês em mesesData:
  1. SE (r ≠ null E r ≠ '' E não é N/A):
     - Calcular nota pontual
     - Calcular desvio pontual
     - Incrementar rCount
     - Acumular r em rAcum
  SENÃO:
     - nota pontual = null
     - desvio pontual = null

  2. Acumular p em pAcum
  3. Incrementar pCount

  4. SE acumulacao == 'media':
     - curAcumP = pVal (meta individual)
     - curAcumR = rAcum / rCount (média dos válidos)
  SENÃO (soma):
     - curAcumP = pAcum (soma planejada)
     - curAcumR = rAcum (soma realizadas)

  5. SE curAcumR ≠ null:
     - Calcular nota acumulada
     - Calcular desvio acumulado
  SENÃO:
     - nota acumulada = null
     - desvio acumulado = null

6. SE todos N/A:
   - valorAtual = null
SENÃO SE media:
   - valorAtual = rAcum / rCount
SENÃO:
   - valorAtual = rAcum
```

## 🎯 Regras de Cálculo

### 1. Diferenciação entre estados
```javascript
// VAZIO (não preenchido)
r: null              // Será preenchido depois
na: false            // Não é N/A

// ZERO (resultado válido)
r: 0                 // Zero é um número válido!
na: false            // Não é N/A
// Isso gera nota e desvio normalmente

// N/A (não aplicável)
r: null              // Sem número
na: true             // Explicitamente marcado como N/A
// Isso NÃO gera nota, NÃO gera desvio, é ignorado em acumulados
```

### 2. Média Simples (ex: NPS, %)
```
Planejado acumulado: sempre pVal (meta mensal individual)
Resultado acumulado: média dos R válidos (ignorando N/A)

Exemplo: Meta 75 pts
- Jan: R=70  → Acum: 70/1 = 70
- Fev: R=N/A → Acum: 70/1 = 70 (Fev não conta!)
- Mar: R=80  → Acum: (70+80)/2 = 75
```

### 3. Soma Acumulativa (ex: Receita, Unidades)
```
Planejado acumulado: soma dos pVal
Resultado acumulado: soma dos R válidos (ignorando N/A)

Exemplo: Meta anual 12.000 (1.000/mês)
- Jan: R=900  → Acum: 900
- Fev: R=N/A  → Acum: 900 (Fev não conta!)
- Mar: R=1200 → Acum: 900 + 1200 = 2100
```

## 🔄 Fluxo de Operações

### Ao clicar em "N/A"
```
enableInlineEdit()
  ↓
saveInlineResult(metaId, mes, 'NA')
  ↓
  1. monthObj.pontual.r = null
  2. monthObj.pontual.na = true
  3. DataStore.recalcMesesData(meta)
  4. DataStore.set(KEYS.METAS, metas)
  5. Atualizar DOM (célula R fica vazia)
  6. Atualizar DOM (célula Nota fica vazia)
  ↓
Toast: "Apontamento salvo como N/A."
```

### Ao clicar em número (convertendo N/A → valor)
```
enableInlineEdit()
  ↓
saveInlineResult(metaId, mes, '123')
  ↓
  1. monthObj.pontual.r = parseFloat(123)
  2. monthObj.pontual.na = false
  3. monthObj.pontual.nota = calcPerformance()
  4. monthObj.pontual.d = calcDesvio()
  5. DataStore.recalcMesesData(meta)
  6. DataStore.set(KEYS.METAS, metas)
  7. Atualizar DOM (célula R mostra valor formatado)
  8. Atualizar DOM (célula Nota mostra score)
  ↓
Toast: "Apontamento salvo com sucesso."
```

## 🧮 Cálculo de Performance com N/A

### Fórmula
```javascript
// No renderMatrixRow para tabela principal
const perf = DataStore.calcPerformance(meta);
// Se meta.valorAtual é null (todos N/A), perf = 0

// Nota ponderada global
notaGlobal = Σ(perf_meta × peso_meta) / Σ(peso_meta)

// Se uma meta tem todos N/A:
// - perf = 0
// - contribui 0 × peso = 0 para nota global
// - não prejudica nota de outras metas
```

## 🎨 CSS & Visualização

### Célula N/A
```css
/* Quando é N/A */
background-color: rgba(255, 255, 255, 0.04);
border: 1px dashed rgba(255, 255, 255, 0.15);

/* Conteúdo da célula */
content = '—'  /* travessão para D e Nota */
content = ''   /* vazio para R */
```

### Data Attributes
```html
<!-- Célula de resultado -->
<td id="cell_${metaId}_pontual_r_..." 
    data-value="${val}"
    data-na="${isNa}">
```

## 🔗 Funções Principais

### data.js

#### recalcMesesData(meta)
- Recalcula todos os meses da meta
- Ignora N/A nos cálculos de acumulado
- Atualiza `meta.valorAtual`
- **Chamada por**: saveInlineResult, saveMeta

#### calcPerformance(meta)
- Retorna score 0-150 baseado em `meta.valorAtual`
- Se `valorAtual === null`, retorna 0
- Suporta curvas customizadas

#### calcDesvio(meta, r, p)
- Calcula desvio percentual
- Retorna null se r é null

### metas.js

#### renderMatrixRow(label, dataKey, field)
- Renderiza linha da tabela de detalhes
- Detecta N/A via `m.pontual.na`
- Aplica estilos visuais para N/A

#### renderMetaRow(meta)
- Renderiza linha da tabela principal
- Busca último mês com dados
- Verifica `lastIsNa` para formatação especial

#### enableInlineEdit(metaId, mes, tdId)
- Abre input para edição
- Se já é N/A, mostra opção "Manter N/A"

#### saveInlineResult(metaId, mes, valueStr)
- Salva resultado ou N/A
- Valida formato (ex: 1.500,50)
- Chama recalcMesesData

## 🧪 Testes de Integração

### Test 1: Marcar N/A
```
1. Criar meta com acumulacao='media'
2. Preencher Jan=100, Fev=110
3. Clicar em Mar, escolher N/A
4. Verificar:
   - mesesData[2].pontual.na === true
   - mesesData[2].pontual.r === null
   - mesesData[2].acumulado.r = (100+110)/2 = 105 (não alterou)
```

### Test 2: Todos N/A
```
1. Marcar todos 12 meses como N/A
2. Verificar:
   - meta.valorAtual === null
   - calcPerformance(meta) === 0
   - notaGlobal não prejudicada
```

### Test 3: Conversão N/A → Valor
```
1. Mês marcado como N/A
2. Clicar e inserir número
3. Verificar:
   - mesesData[i].na === false
   - mesesData[i].r === número
   - acumulado recalculado corretamente
```

## 📦 Persistência

### localStorage
```javascript
localStorage.setItem('mp_metas', JSON.stringify(metas));
// metas[i].mesesData[j].pontual.na é preservado

// Ao recuperar
const metas = JSON.parse(localStorage.getItem('mp_metas'));
// Campo 'na' está disponível para uso
```

## 🚀 Deploy

### Passos
1. Testar em development (localhost)
2. Limpar localStorage se tiver dados antigos
3. Deploy em produção
4. Avisar usuários sobre nova funcionalidade

### Backward Compatibility
- ✅ Código verifica `if (!meta.mesesData)` antes de usar
- ✅ Se campo `na` não existir, usa valor padrão `false`
- ✅ Dados antigos funcionam normalmente

## 📝 Changelog

### v1.0 - N/A Implementation
- ✅ Adicionado campo `na` em mesesData
- ✅ Corrigido algoritmo `recalcMesesData`
- ✅ Melhorada visualização de N/A
- ✅ Botão "N/A" em inline edit
- ✅ Diferenciação: 0 vs null vs N/A

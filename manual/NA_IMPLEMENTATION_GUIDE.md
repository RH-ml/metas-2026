# Guia de Implementação de N/A (Não se Aplica) para Metas

## ✅ Implementação Completada

### 1. Estrutura de Dados
- **Campo `na`**: Adicionado em `m.pontual.na` para marcar explicitamente um mês como N/A
- **Diferenciação clara**:
  - `null/vazio` → não preenchido (ainda será preenchido)
  - `0` → resultado real válido (zero é um número válido)
  - `N/A` (com `na: true`) → explicitamente não aplicável

### 2. Lógica de Cálculo Corrigida

#### Função `recalcMesesData` (data.js)
- ✅ **PONTUAL**: Calcula desvio e nota apenas se há valor válido (não N/A)
- ✅ **ACUMULADO (Soma)**: 
  - P: soma de todos os planejados
  - R: soma apenas de meses **sem N/A**
- ✅ **ACUMULADO (Média)**:
  - P: mantém meta individual (pVal)
  - R: média dos valores **sem N/A**
- ✅ **Caso Especial - Todos N/A**: 
  - `valorAtual` = `null`
  - Não gera nota
  - Não prejudica cálculos globais

#### Exemplo de Cálculo (Meta: 27 dias, Acumulação por Média)
```
Janeiro:   R=20 (válido)  → Acumulado: 20/1 = 20
Fevereiro: R=30 (válido)  → Acumulado: (20+30)/2 = 25
Março:     R=N/A          → Acumulado: (20+30)/2 = 25 (Março não altera!)
Abril:     R=24 (válido)  → Acumulado: (20+30+24)/3 = 24.67
```

### 3. Interface de Usuário

#### Inline Edit
Ao clicar para editar resultado mensal:
1. **Campo de entrada**: Permite digitar número
2. **Botão "N/A"**: Marca o mês como N/A
3. **Se já é N/A**:
   - Mostra botão "Manter N/A"
   - Campo de entrada fica vazio (não editável com número)

#### Visualização em Tabelas
- **Mês com N/A**:
  - R: vazio (sem valor numérico)
  - D: — (travessão)
  - Nota: — (travessão)
  - Célula com bordas tracejadas leve (visual distintivo)

### 4. Regras Implementadas

| Regra | Status |
|-------|--------|
| N/A não é tratado como zero | ✅ |
| N/A não prejudica nota | ✅ |
| N/A não altera médias acumuladas | ✅ |
| Represente ausência legítima | ✅ |
| Campo bloqueado com N/A | ✅ |
| Valor numérico removido em N/A | ✅ |
| Não gera desvio em N/A | ✅ |
| Não gera nota em N/A | ✅ |
| Meses N/A ignorados em acumulados | ✅ |
| Todos N/A = acumulado N/A | ✅ |
| Diferenciação: 0 vs vazio vs N/A | ✅ |

### 5. Funcionalidades Suportadas

✅ Visão mensal (matriz de detalhe)
✅ Acumulado (com exclusão de N/A)
✅ Nota (não calcula para N/A)
✅ Desvio (não calcula para N/A)
✅ Dashboard (performance ignora N/A)
✅ Exportações (preservam N/A como marcador)

## 🧪 Testes Recomendados

### Cenário 1: Meta com Acumulação por Média
1. Criar meta: "NPS" (Acumulação: Média)
2. Preencher: Jan=70, Fev=75, Mar=N/A, Abr=80
3. **Verificar**:
   - Mar acumulado = (70+75)/2 = 72.5 (não 72.5/3)
   - Nota não aparece em Mar
   - Global performance ignora Mar

### Cenário 2: Meta com Acumulação por Soma
1. Criar meta: "Receita" (Acumulação: Soma)
2. Preencher: Jan=1000, Fev=1500, Mar=N/A, Abr=2000
3. **Verificar**:
   - Mar acumulado = 2500 (1000+1500, sem Mar)
   - Total = 4500 (não 5500)
   - Performance = 4500/meta_anual

### Cenário 3: Todos N/A
1. Marcar todos os meses como N/A
2. **Verificar**:
   - `valorAtual` é null
   - Performance = 0
   - Nota não aparece
   - Peso não afeta nota global (contribui 0)

### Cenário 4: Alternar entre N/A e Número
1. Mês marcado como N/A
2. Clicar novamente → deve permitir editar com número
3. Digitar valor e salvar
4. **Verificar**:
   - Acumulado recalcula
   - Nota reaparece
   - Desvio recalcula

## 📝 Dados de Teste Prontos

Meta sugerida para testar: **"SLA de Fechamento de Vagas"**
- Tipo: individual
- Unidade: dias
- Polaridade: Menor Melhor (↓)
- Acumulação: Média
- Indicador: Alguns meses sem operação = N/A

```javascript
{
  id: 'meta_sla_vagas',
  titulo: 'Reduzir SLA de fechamento de vagas',
  indicador: 'Menor é Melhor',
  metaMensal: 27,
  unidade: 'dias',
  acumulacao: 'media',
  polaridade: 'menor_melhor',
  mesesData: [
    { mes: 'Jan/25', pontual: { p: 27, r: 20, na: false, ... } },
    { mes: 'Fev/25', pontual: { p: 27, r: null, na: true, ... } },  // N/A
    { mes: 'Mar/25', pontual: { p: 27, r: 24, na: false, ... } },
    // ...
  ]
}
```

## 🔧 Arquivos Modificados

| Arquivo | Mudanças |
|---------|----------|
| `js/data.js` | Corrigido `recalcMesesData` para ignorar N/A em cálculos |
| `js/metas.js` | Melhorado `renderMatrixRow` e `renderMetaRow` para visualizar N/A |

## ⚙️ Próximos Passos (Opcional)

- [ ] Adicionar exportação com indicador de N/A para Excel/PDF
- [ ] Criar filtro "Mostrar apenas metas com N/A"
- [ ] Adicionar justificativa/comentário obrigatório ao marcar N/A
- [ ] Histórico de alterações (quando foi marcado como N/A, por quem)
- [ ] Dashboard com métrica: "% de meses N/A por meta"
- [ ] API backend para persistência de N/A

## 📞 Suporte

Se encontrar problemas:
1. Abrir DevTools (F12)
2. Verificar console para erros
3. Testar com Meta de teste
4. Revisar valores em `localStorage` (key: `mp_metas`)

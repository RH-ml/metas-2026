# Como Usar a Funcionalidade N/A (Não se Aplica) no Sistema de Metas

## 🚀 Como Marcar um Mês como N/A

### Passo a Passo

1. **Abra a visão detalhada da meta**
   - Clique na meta que deseja editar na tabela principal
   - Será aberta uma modal com a matriz de meses

2. **Localize a linha "R:" (Resultado) na seção "Pontual"**
   - Esta linha contém os resultados mensais que você pode editar

3. **Clique no mês que deseja marcar como N/A**
   - Um ícone de lápis aparecerá, indicando que é editável
   - Clique sobre o mês

4. **Escolha "N/A"**
   - Você verá um campo de entrada com dois botões:
     - Campo de texto: para digitar um número
     - Botão "N/A": para marcar como não aplicável

5. **Confirme**
   - O sistema salvará automaticamente
   - Você verá uma mensagem: "Apontamento salvo como N/A"

## 📊 O Que Acontece ao Marcar N/A

### Linha Pontual (R:)
- Campo fica vazio (sem número)
- Não mostra desvio (D: mostra "—")
- Não mostra nota (Nota: mostra "—")

### Linha Acumulado (R:)
- Calcula ignorando o mês com N/A
- **Exemplo**:
  - Jan: 20 → Acumulado = 20
  - Fev: 30 → Acumulado = 25
  - Mar: N/A → Acumulado = 25 (não muda!)
  - Abr: 24 → Acumulado = (20+30+24)/3 = 24,67

### Performance Global
- Mês com N/A não afeta a nota global
- Se todos os meses forem N/A, a performance é 0 (não prejudica a média ponderada)

## 🔄 Como Alterar N/A para um Número

1. **Clique novamente no mês marcado com N/A**
2. Você verá as opções:
   - Botão "Manter N/A": mantém como N/A
   - Botão "Cancelar": fecha sem fazer nada

3. **Para inserir um número**:
   - Você precisa cancelar e clicar novamente
   - Na próxima vez, o campo de entrada estará disponível

## ⚠️ Diferenças Importantes

| Situação | Significado | Efeito |
|----------|------------|--------|
| Célula vazia (—) | Não preenchido | Será preenchido depois |
| Valor "0" | Zero é um resultado real | Gera nota e desvio |
| "N/A" | Não se aplica naquele mês | Ignora em cálculos |

## 💡 Exemplo Prático

**Meta: SLA de Fechamento de Vagas**
- Indicador: Menor é Melhor (dias)
- Meta mensal: 27 dias

### Cenário
- Janeiro: 20 dias ✅
- Fevereiro: Sem vagas abertas → **N/A**
- Março: 30 dias ⚠️
- Abril: 25 dias ✅

### Resultado
- Nota pontual de Fevereiro: não aparece (—)
- Acumulado até Fevereiro: (20)/1 = 20 dias
- Acumulado de Março: (20+30)/2 = 25 dias
- Acumulado até Abril: (20+30+25)/3 = 25 dias
- Performance global: calcula baseado em (20, 30, 25), ignorando o mês sem dados

## 🎯 Casos de Uso Ideais para N/A

- ✅ Mês sem operação (vagas abertas, vendas, etc.)
- ✅ Indicador fora do escopo temporário
- ✅ Departamento sem atividade (férias, greve, etc.)
- ✅ Evento externo que invalida a métrica
- ❌ Não use para: resultado ruim, desempenho fraco, etc.

## 📋 Perguntas Frequentes

**P: Se marcar todos os meses como N/A, qual é a nota?**
R: A nota será "N/A" (não aplicável). Isso não prejudica sua performance global pois contribui com peso zero.

**P: Posso converter N/A de volta para um número?**
R: Sim! Clique novamente no mês e insira um valor numérico. O acumulado será recalculado automaticamente.

**P: N/A afeta o bônus?**
R: Não. Como não prejudica a nota, não afeta o cálculo do bônus.

**P: Todos veem quando marco como N/A?**
R: Sim. A visualização mostra claramente quando um mês é "N/A" para todos os usuários.

**P: Posso anexar evidência em um mês N/A?**
R: Ainda assim você pode anexar uma explicação (arquivo) ao mês marcado como N/A.

---

**Precisa de ajuda?** Entre em contato com o administrador do sistema.

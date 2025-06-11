# 🤖 Guia de Configuração OpenAI + Calendário

## ✅ Status do Deploy

Todos os componentes foram deployados com sucesso no **calendarioScratch**:

- ✅ **OpenAIController.cls** - Controlador principal
- ✅ **EventSummaryGenerator.cls** - Processamento de dados
- ✅ **aiSummaryPanel** - Componente LWC
- ✅ **calendarioReino** - Atualizado com integração IA
- ✅ **OpenAI_Config__mdt** - Custom Metadata Type
- ✅ **Default_Config** - Registro de configuração padrão

## 🔧 Configuração Necessária

### 1. Named Credential para OpenAI API

**⚠️ IMPORTANTE**: O Named Credential precisa ser configurado manualmente no Setup.

#### Passos

1. **Acesse Setup** → Named Credentials → Legacy
2. **Clique em "New"**
3. **Configure os campos**:
   - **Label**: `OpenAI API`
   - **Name**: `OpenAI_API`
   - **URL**: `https://api.openai.com`
   - **Identity Type**: `Named Principal`
   - **Authentication Protocol**: `Autenticação de senha`
   - **Username**: `Bearer`
   - **Password**: `YOUR_OPENAI_API_KEY` (sua chave da OpenAI)

4. **Salve a configuração**

**💡 Explicação**: O Salesforce vai enviar `Authorization: Bearer YOUR_API_KEY` automaticamente.

### 2. Obter API Key da OpenAI

1. **Acesse**: <https://platform.openai.com/api-keys>
2. **Faça login** na sua conta OpenAI
3. **Clique em "Create new secret key"**
4. **Copie a chave** (ela só aparece uma vez!)
5. **Cole no Named Credential** no lugar de `YOUR_OPENAI_API_KEY`

### 3. Configurar Permissões

#### Remote Site Settings

1. **Setup** → Remote Site Settings
2. **New Remote Site**:
   - **Name**: `OpenAI_API`
   - **URL**: `https://api.openai.com`
   - **Active**: ✅

#### Permissões de Usuário

- Usuários precisam de acesso aos **Apex Classes**:
  - `OpenAIController`
  - `EventSummaryGenerator`

## 🧪 Testando a Integração

### 1. Teste de Conectividade

```javascript
// Execute no Developer Console (Anonymous Apex)
Map<String, Object> result = OpenAIController.testOpenAIConnection();
System.debug('Resultado: ' + result);
```

### 2. Teste de Resumo

```javascript
// Execute no Developer Console
Date startDate = Date.today().addDays(-30);
Date endDate = Date.today();
Map<String, Object> summary = OpenAIController.generateEventSummary(
    startDate, endDate, 'monthly'
);
System.debug('Resumo: ' + summary);
```

### 3. Verificar no Calendário

1. **Abra o calendarioReino**
2. **Procure pela seção "Insights IA"** na sidebar
3. **Deve mostrar status de conexão**
4. **Clique para expandir e testar**

## 🎯 Funcionalidades Disponíveis

### No Painel AI Summary

- **🔗 Teste de Conectividade**: Automático ao carregar
- **📊 Resumos Inteligentes**: Mensal, Semanal, Próximos Eventos
- **💡 Insights**: Análise de padrões e tendências
- **🎯 Sugestões**: Recomendações baseadas em IA
- **🔄 Atualização Automática**: Quando o calendário muda

### Tipos de Análise

- **Resumo Mensal**: Visão geral do mês
- **Resumo Semanal**: Análise da semana
- **Próximos Eventos**: Preparação e conflitos

## 🛠️ Configurações Avançadas

### Custom Metadata (OpenAI_Config__mdt)

- **API_Model__c**: `gpt-4` (padrão)
- **Max_Tokens__c**: `1000` (padrão)
- **Temperature__c**: `0.70` (padrão)
- **Enabled__c**: `true` (padrão)

### Para Modificar Configurações

1. **Setup** → Custom Metadata Types
2. **OpenAI Configuration** → Manage Records
3. **Default Config** → Edit

## 🚨 Troubleshooting

### Problema: "IA Desconectada"

**Soluções**:

1. Verificar Named Credential configurado
2. Verificar API Key válida
3. Verificar Remote Site Settings
4. Verificar saldo da conta OpenAI

### Problema: "Erro ao gerar resumo"

**Soluções**:

1. Verificar se há eventos no período
2. Verificar logs no Developer Console
3. Verificar limites de API da OpenAI

### Problema: Componente não aparece

**Soluções**:

1. Verificar deploy do aiSummaryPanel
2. Verificar deploy do calendarioReino atualizado
3. Limpar cache do navegador

## 💰 Custos da OpenAI (OTIMIZADO)

### Modelo GPT-4

- **Input**: ~$0.03 por 1K tokens
- **Output**: ~$0.06 por 1K tokens
- **Estimativa**: ~$0.05-0.15 por resumo (REDUZIDO!)

### ✅ Otimizações Implementadas

- **Prompts Concisos**: Foco apenas nos dados dos eventos
- **Sem Dicas Extras**: Elimina conteúdo desnecessário
- **Teste Simples**: Conectividade com apenas "OK"
- **Máximo 3-4 frases**: Por tópico analisado

### Dicas para Economizar

- Use GPT-3.5-turbo para testes (mais barato)
- Configure Max_Tokens menor se necessário
- Monitore uso no dashboard OpenAI

## 🎉 Próximos Passos

1. **Configure a API Key** seguindo o guia acima
2. **Teste a conectividade** no Developer Console
3. **Abra o calendário** e teste o painel IA
4. **Ajuste configurações** conforme necessário
5. **Monitore custos** no dashboard OpenAI

## 📞 Suporte

Se encontrar problemas:

1. **Verifique logs** no Developer Console
2. **Teste conectividade** com Anonymous Apex
3. **Verifique configurações** do Named Credential
4. **Monitore limites** da API OpenAI

---

**🎯 O sistema está pronto para uso!**
Configure a API Key e comece a usar insights de IA no seu calendário.

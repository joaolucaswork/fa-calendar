# 🚀 Deploy OpenAI + Calendar System to Production

## 📋 **Pré-requisitos**

1. **Salesforce CLI** instalado e configurado
2. **Conexão com org de produção** configurada
3. **Permissões de deploy** no org de destino
4. **Chave da OpenAI API** disponível

## 🎯 **Opção 1: Deploy Automático (Recomendado)**

### **Windows:**

```bash
deploy-openai-calendar.bat
```

### **Linux/Mac:**

```bash
chmod +x deploy-openai-calendar.sh
./deploy-openai-calendar.sh
```

## 🔧 **Opção 2: Deploy Manual**

### **1. Custom Object e Metadata:**

```bash
sf project deploy start --metadata CustomObject:OpenAI_Config__mdt --test-level NoTestRun
sf project deploy start --metadata CustomMetadata:OpenAI_Config.Default_Config --test-level NoTestRun
```

### **2. Named Credential:**

```bash
sf project deploy start --metadata NamedCredential:OpenAI_API --test-level NoTestRun
```

### **3. Apex Classes:**

```bash
sf project deploy start --metadata ApexClass:OpenAIController,ApexClass:EventSummaryGenerator,ApexClass:OpenAICacheManager --test-level NoTestRun
```

### **4. Lightning Web Components:**

```bash
sf project deploy start --metadata LightningComponentBundle:aiSummaryPanel,LightningComponentBundle:calendarioReino --test-level NoTestRun
```

## ⚙️ **Configuração Pós-Deploy**

### **1. Named Credential (OBRIGATÓRIO)**

1. **Setup** → Named Credentials → Legacy
2. **Editar "OpenAI API"**
3. **Configurar**:
   - **Username**: `Bearer`
   - **Password**: `SUA_CHAVE_OPENAI_AQUI`
4. **Salvar**

### **2. Remote Site Setting (OBRIGATÓRIO)**

1. **Setup** → Remote Site Settings
2. **New Remote Site**:
   - **Name**: `OpenAI_API`
   - **URL**: `https://api.openai.com`
   - **Active**: ✅
3. **Salvar**

### **3. Permissões de Usuário**

Usuários precisam de acesso aos **Apex Classes**:

- `OpenAIController`
- `EventSummaryGenerator`

## 🧪 **Teste de Conectividade**

### **Developer Console (Anonymous Apex):**

```apex
Map<String, Object> result = OpenAIController.testOpenAIConnection();
System.debug('Resultado: ' + result);
```

**Resultado esperado**: `success: true`

## 📁 **Arquivos Incluídos no Deploy**

### **Backend:**

- `OpenAIController.cls` - Integração OpenAI API
- `EventSummaryGenerator.cls` - Processamento de dados
- `OpenAICacheManager.cls` - Sistema de cache inteligente
- `OpenAI_Config__mdt` - Custom Metadata Type
- `Default_Config` - Configuração padrão
- `OpenAI_API` - Named Credential

### **Frontend:**

- `aiSummaryPanel` - Painel IA na sidebar
- `calendarioReino` - Calendário atualizado com IA

## 🎯 **Verificação do Deploy**

### **1. Componentes Deployados:**

- ✅ Custom Object: `OpenAI_Config__mdt`
- ✅ Custom Metadata: `Default_Config`
- ✅ Named Credential: `OpenAI_API`
- ✅ Apex Classes: `OpenAIController`, `EventSummaryGenerator`, `OpenAICacheManager`
- ✅ LWC: `aiSummaryPanel`, `calendarioReino`

### **2. Funcionalidades Ativas:**

- 🤖 Teste automático de conectividade
- 📊 Resumos inteligentes (mensal/semanal/próximos)
- 💡 Insights de padrões
- 🎯 Sugestões baseadas em IA
- 🔄 Atualização automática
- 💾 Cache inteligente (economia de 50-70% nos custos)

## 💰 **Custos Otimizados**

- **Prompts concisos**: Foco apenas nos dados
- **Sem dicas extras**: Elimina conteúdo desnecessário
- **Cache inteligente**: Evita chamadas redundantes da API
- **Estimativa**: ~$0.05-0.15 por resumo (redução de 50-70%)

## 🆘 **Troubleshooting**

### **Erro: "IA Desconectada"**

1. Verificar Named Credential configurado
2. Verificar API Key válida
3. Verificar Remote Site Settings
4. Verificar saldo da conta OpenAI

### **Erro: "Componente não aparece"**

1. Verificar deploy do aiSummaryPanel
2. Verificar deploy do calendarioReino
3. Limpar cache do navegador
4. Verificar permissões de usuário

## 📞 **Suporte**

Se encontrar problemas:

1. **Verifique logs** no Developer Console
2. **Teste conectividade** com Anonymous Apex
3. **Verifique configurações** do Named Credential
4. **Monitore limites** da API OpenAI

---

**🎉 Sistema pronto para produção!**
Configure a API Key e comece a usar insights de IA no calendário.

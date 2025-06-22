import { LightningElement, wire, track, api } from "lwc";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import { NavigationMixin } from "lightning/navigation";
import getLeadsForSelection from "@salesforce/apex/WelcomeScreen.getLeadsForSelection";
import getPicklistValues from "@salesforce/apex/WelcomeScreen.getPicklistValues";
import createCallTask from "@salesforce/apex/WelcomeScreen.createCallTask";
import getUserFirstName from "@salesforce/apex/WelcomeScreen.getUserFirstName";
import getLeadCallsCount from "@salesforce/apex/WelcomeScreen.getLeadCallsCount";
import getLeadCallHistory from "@salesforce/apex/WelcomeScreen.getLeadCallHistory";
import getAccountsForSelection from "@salesforce/apex/WelcomeScreen.getAccountsForSelection";
import createAccountCallTask from "@salesforce/apex/WelcomeScreen.createAccountCallTask";
import checkForNewOpportunity from "@salesforce/apex/OpportunityManager.checkForNewOpportunity";

import updateOpportunity from "@salesforce/apex/OpportunityManager.updateOpportunity";
import getRecentCallHistory from "@salesforce/apex/WelcomeScreen.getRecentCallHistory";
import createLeadEventAndOpportunity from "@salesforce/apex/LeadEventController.createLeadEventAndOpportunity";
import userId from "@salesforce/user/Id";

export default class SidebarChamada extends NavigationMixin(LightningElement) {
  @api isOpen = false; // Propriedade para controlar a visibilidade do componente
  @track leads = [];
  @track canaisComunicacao = [];
  @track classificacoesLead = [];
  @track isLoading = true;
  @track error;
  @track userFirstName = "";
  @track showMiniCard = false; // Controla a visibilidade do mini card
  @track showOportunidadeBanner = false; // Controla a visibilidade do banner de oportunidade
  @track recentCallHistory = []; // Array para armazenar o histórico recente de chamadas
  @track isCallHistoryLoading = false; // Controla o estado de carregamento do histórico

  // Novas propriedades para gerenciar a oportunidade criada
  @track showOpportunityModal = false;
  @track opportunityDetails = null;
  @track opportunityId = null;
  @track stageOptions = [];
  @track isLoadingOpportunity = false;
  @track isPreparingOpportunity = false; // Estado de loading enquanto prepara para exibir o editor
  @track opportunityError = null;
  @track opportunityAmount = null;
  @track opportunityCloseDate = null;
  @track opportunityName = null;
  @track opportunityStageName = null;
  @track opportunityDescription = null;

  // Novas propriedades para gerenciar a troca de abas (Lead/Conta)
  @track activeTab = "lead"; // Controla qual aba está ativa (padrão: lead)
  @track accounts = [];
  @track selectedAccount;
  @track selectedAccountId;
  @track accountSearchTerm = "";
  @track accountSearchResults = [];
  @track showAccountSearchResults = false;

  // Conector de observação de visibilidade
  leadCardObserver;

  // Getter para controlar a classe CSS do mini card
  get miniCardClass() {
    return this.showMiniCard ? "mini-lead-card visible" : "mini-lead-card";
  }

  // Getter para controlar a classe CSS do conteúdo do acordeão
  get callHistoryContentClass() {
    return this.isCallHistoryOpen
      ? "call-history-content expanded"
      : "call-history-content collapsed";
  }

  // Getter para a classe de conteúdo da seção de WhatsApp
  get whatsappContentClass() {
    return this.isWhatsAppSectionOpen
      ? "whatsapp-content expanded"
      : "whatsapp-content collapsed";
  }

  // Getters para controlar quais classes CSS aplicar nas abas
  get leadTabClass() {
    return this.activeTab === "lead" ? "tab-active" : "";
  }

  get accountTabClass() {
    return this.activeTab === "account" ? "tab-active" : "";
  }

  // Mantendo os getters de variante para compatibilidade, mas agora usam sempre "neutral"
  get leadTabVariant() {
    return "neutral";
  }

  get accountTabVariant() {
    return "neutral";
  }

  get leadContentClass() {
    return this.activeTab === "lead" ? "slds-show" : "slds-hide";
  }

  get accountContentClass() {
    return this.activeTab === "account" ? "slds-show" : "slds-hide";
  }

  // Atualizar o getter de classe do formulário para considerar tanto leads quanto contas
  get formFieldsClass() {
    return (this.activeTab === "lead" && this.selectedLead) ||
      (this.activeTab === "account" && this.selectedAccount)
      ? "normal-opacity-fields"
      : "low-opacity-fields";
  }

  // Atualizar o getter para verificar se o formulário deve estar desabilitado
  get isFormDisabled() {
    return (
      (this.activeTab === "lead" && !this.selectedLead) ||
      (this.activeTab === "account" && !this.selectedAccount)
    );
  }

  // Atualizar o getter para verificar se o botão Salvar deve estar desabilitado
  get isSaveDisabled() {
    return (
      this.isLoading ||
      (this.activeTab === "lead" && !this.selectedLead) ||
      (this.activeTab === "account" && !this.selectedAccount)
    );
  }

  // Atualizar o getter para verificar se o botão WhatsApp deve estar desabilitado
  get isWhatsAppButtonDisabled() {
    if (this.activeTab === "lead") {
      return !this.selectedLead || !this.selectedLead.Phone;
    } else if (this.activeTab === "account") {
      return !this.selectedAccount || !this.selectedAccount.Phone;
    }
    return true;
  }

  // Getter para URL da conta selecionada
  get selectedAccountUrl() {
    return this.selectedAccountId ? `/${this.selectedAccountId}` : "#";
  }

  // Getter para verificar se há resultados na pesquisa de contas
  get hasAccountSearchResults() {
    return this.accountSearchResults && this.accountSearchResults.length > 0;
  }

  // Getter para controlar se o botão limpar deve ser exibido na pesquisa de contas
  get showAccountClearButton() {
    return (
      this.selectedAccount ||
      (this.accountSearchTerm && this.accountSearchTerm.trim() !== "")
    );
  }

  // Getter para verificar se há chamadas registradas
  get hasCallHistory() {
    return this.leadCallsCount && this.leadCallsCount > 0;
  }

  // Getter para verificar se há histórico recente de chamadas
  get hasRecentCallHistory() {
    return this.recentCallHistory && this.recentCallHistory.length > 0;
  }

  // Getter para obter a URL do lead selecionado
  get selectedLeadUrl() {
    return this.selectedLeadId ? `/${this.selectedLeadId}` : "#";
  }

  // Getter para verificar se há resultados na pesquisa de leads
  get hasSearchResults() {
    return this.searchResults && this.searchResults.length > 0;
  }

  // Getter para controlar se o botão limpar deve ser exibido na pesquisa de leads
  get showClearButton() {
    return (
      this.selectedLead || (this.searchTerm && this.searchTerm.trim() !== "")
    );
  }

  // Valores do formulário
  @track selectedLeadId;
  @track selectedLead;
  @track canalComunicacao;
  @track classificacaoLead;
  @track comentarios;
  @track dataVencimento = new Date().toISOString().split("T")[0]; // Data de hoje
  @track leadCallsCount = 0;
  @track callHistory = [];
  @track isCallHistoryOpen = false;
  @track ligacaoFoiAtendida = false; // Novo campo para controlar se a ligação foi atendida
  @track isWhatsAppSectionOpen = false; // Controla se o acordeão do WhatsApp está aberto

  // Propriedades para pesquisa
  @track searchTerm = "";
  @track searchResults = [];
  @track showSearchResults = false;
  @wire(getLeadsForSelection)
  wiredLeads({ error, data }) {
    if (data) {
      this.leads = data.map((lead) => ({
        label: lead.Name ? lead.Name : lead.LastName,
        value: lead.Id,
        name: lead.Name || lead.LastName,
        email: lead.Email,
        phone: lead.Phone,
        company: lead.Company
      }));
      this.error = undefined;
    } else if (error) {
      this.error = error;
      this.leads = [];
      this.showToast(
        "Erro",
        "Não foi possível carregar os leads: " + error.body.message,
        "error"
      );
    }
    this.isLoading = false;
  }

  @wire(getUserFirstName)
  wiredUserName({ error, data }) {
    if (data) {
      this.userFirstName = data;
    } else if (error) {
      console.error("Erro ao carregar nome do usuário:", error);
      this.userFirstName = "Representante";
    }
  }

  // Método do ciclo de vida - conectado ao DOM
  connectedCallback() {
    // Carregar os valores de picklist ao inicializar
    this.loadPicklistValues();

    // Configurar o observador de scroll
    if (typeof IntersectionObserver !== "undefined") {
      this.setupScrollObserver();
    }
    
    // Carregar histórico recente de chamadas
    this.loadRecentCallHistory();
  }
  
  // Método para carregar o histórico recente de chamadas
  // Tornando público para poder ser chamado pela página PWA
  @api
  loadRecentCallHistory(forceRefresh = false) {
    // Se forceRefresh for true, vamos limpar o array atual antes de carregar
    if (forceRefresh) {
      this.recentCallHistory = [];
    }
    this.isCallHistoryLoading = true;
    
    // Adicionar timestamp como parâmetro fictício para evitar cache do navegador/Salesforce
    const timestamp = new Date().getTime();
    
    // Chamar o método Apex com o parâmetro de timestamp para evitar cache
    getRecentCallHistory({ timestamp: timestamp })
      .then((result) => {
        if (result) {
          // Processar e formatar os dados retornados
          // Adicionando log para debug
          console.log('Dados do histórico de chamadas:', JSON.stringify(result));
          
          // Filtrar tarefas sem relacionamentos válidos (relações deletadas)
          const filteredResults = result.filter(call => {
            // Verificar se tem pelo menos um relacionamento válido (Who ou What)
            return (call.Who && call.Who.Name) || (call.What && call.What.Name);
          });
          
          console.log('Resultados filtrados (sem relações deletadas):', filteredResults.length);
          
          this.recentCallHistory = filteredResults.map((call) => {
            // Log para cada item para debug
            console.log('Item do histórico:', JSON.stringify(call));
            
            // Formatar a data e hora da chamada
            const callDate = new Date(call.CreatedDate);
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            
            // Formatar a hora no formato HH:MM
            const hours = callDate.getHours().toString().padStart(2, '0');
            const minutes = callDate.getMinutes().toString().padStart(2, '0');
            const timeString = `${hours}:${minutes}`;
            
            // Definir o texto da data baseado em quando a chamada foi feita
            let dateText;
            if (callDate.toDateString() === today.toDateString()) {
              dateText = `Hoje ${timeString}`;
            } else if (callDate.toDateString() === yesterday.toDateString()) {
              dateText = `Ontem ${timeString}`;
            } else {
              // Formatar como DD/MM HH:MM para datas mais antigas
              const day = callDate.getDate().toString().padStart(2, '0');
              const month = (callDate.getMonth() + 1).toString().padStart(2, '0');
              dateText = `${day}/${month} ${timeString}`;
            }
            
            // Determinar o tipo de tarefa com base no canal de comunicação
            let taskType = "Chamada";
            if (call.CanaldeComunicacao__c) {
              taskType = call.CanaldeComunicacao__c;
            }
            
            // Abordagem baseada nos prefixos de ID do Salesforce
            let recordTypeIcon = "standard:default";
            let recordTypeLabel = "Registro";
            
            // Verificar se temos IDs associados e registrá-los para debug
            const whoId = call.WhoId || '';
            const whatId = call.WhatId || '';
            console.log(`IDs da tarefa ${call.Id}: WhoId=${whoId}, WhatId=${whatId}`);
            
            // Verificar também se temos algum ID em outras propriedades
            console.log('Relacionados:', call.Who ? `Who: ${JSON.stringify(call.Who)}` : 'Who não definido',
                      call.What ? `What: ${JSON.stringify(call.What)}` : 'What não definido');
            
            // Verificação direta por prefixos de ID do Salesforce
            // Prefixo 00Q = Lead
            // Prefixo 001 = Account
            // Prefixo 003 = Contact
            
            // Para chamadas a leads (prefixo 00Q)
            if ((whoId && whoId.startsWith('00Q')) || 
                (call.Who && call.Who.Id && call.Who.Id.startsWith('00Q'))) {
                recordTypeIcon = "standard:lead";
                recordTypeLabel = "Lead";
                console.log('Identificado como Lead pelo prefixo 00Q');
            }
            // Para chamadas a contas (prefixo 001)
            else if ((whatId && whatId.startsWith('001')) || 
                     (call.What && call.What.Id && call.What.Id.startsWith('001'))) {
                recordTypeIcon = "standard:account";
                recordTypeLabel = "Cliente";
                console.log('Identificado como Cliente pelo prefixo 001');
            }
            // Para chamadas a contatos (prefixo 003)
            else if ((whoId && whoId.startsWith('003')) || 
                     (call.Who && call.Who.Id && call.Who.Id.startsWith('003'))) {
                // Verificar se este contato está associado a uma conta (Person Account)
                if (whatId && whatId.startsWith('001')) {
                    recordTypeIcon = "standard:account";
                    recordTypeLabel = "Cliente";
                    console.log('Identificado como Person Account');
                } else {
                    recordTypeIcon = "standard:contact";
                    recordTypeLabel = "Contato";
                    console.log('Identificado como Contato');
                }
            }
            // Fallback para o nome do registro
            else if (call.leadName) {
                // Última tentativa - verificar se o nome do registro contém informações que possam identificar o tipo
                // Esta é uma verificação de fallback caso não tenhamos informações de ID
                const name = call.leadName.toLowerCase();
                if (name.includes('lead')) {
                    recordTypeIcon = "standard:lead";
                    recordTypeLabel = "Lead";
                    console.log('Identificado como Lead pelo nome');
                } else if (name.includes('client') || name.includes('conta') || name.includes('account')) {
                    recordTypeIcon = "standard:account";
                    recordTypeLabel = "Cliente";
                    console.log('Identificado como Cliente pelo nome');
                }
            }
            
            // Retornar o objeto formatado para cada chamada
            return {
              Id: call.Id,
              leadName: call.Who?.Name || call.What?.Name || "", // Não precisamos mais do fallback, pois filtramos antes
              timeFormatted: dateText,
              taskType: taskType,
              whatsAppMessage: call.Description || "",
              recordTypeIcon: recordTypeIcon,
              recordTypeLabel: recordTypeLabel
            };
          });
        }
        this.isCallHistoryLoading = false;
      })
      .catch((error) => {
        console.error('Erro ao carregar histórico de chamadas:', error);
        this.isCallHistoryLoading = false;
      });
  }
  
  // Método para carregar os valores de picklist
  async loadPicklistValues() {
    try {
      const picklistResult = await getPicklistValues({
        objectName: "Task",
        picklistFields: [
          "CanaldeComunicacao__c",
          "classificacaoLeadAtividade__c"
        ]
      });

      if (picklistResult) {
        // Formatar os valores para o combobox de canal de comunicação
        if (picklistResult.CanaldeComunicacao__c) {
          this.canaisComunicacao = picklistResult.CanaldeComunicacao__c.map(
            (value) => ({
              label: value,
              value: value
            })
          );
        }

        // Formatar os valores para o combobox de classificação
        if (picklistResult.classificacaoLeadAtividade__c) {
          this.classificacoesLead =
            picklistResult.classificacaoLeadAtividade__c.map((value) => ({
              label: value,
              value: value
            }));
        }
      }
    } catch (error) {
      console.error("Erro ao carregar valores de picklist:", error);
      this.showToast(
        "Erro",
        "Não foi possível carregar os valores dos campos de seleção.",
        "error"
      );
    }
  }

  // Método para configurar o observador de scroll
  setupScrollObserver() {
    // Implementar caso necessário a funcionalidade de detectar quando
    // o card de lead sai da visão para mostrar o mini card
  }

  // Atualização do método validateForm para validar tanto leads quanto contas
  validateForm() {
    let isValid = true;

    if (this.activeTab === "lead") {
      // Validar a seleção de lead
      if (!this.selectedLeadId) {
        this.showToast(
          "Erro",
          "Por favor, selecione um lead antes de prosseguir.",
          "error"
        );
        isValid = false;
      }
    } else if (this.activeTab === "account") {
      // Validar a seleção de conta
      if (!this.selectedAccountId) {
        this.showToast(
          "Erro",
          "Por favor, selecione uma conta antes de prosseguir.",
          "error"
        );
        isValid = false;
      }
    }

    // Validar canal de comunicação
    const canalCombobox = this.template.querySelector(
      'lightning-combobox[label="Canal de comunicação"]'
    );
    if (canalCombobox && !canalCombobox.reportValidity()) {
      isValid = false;
    }

    // Validar classificação apenas se a ligação foi atendida
    if (this.ligacaoFoiAtendida) {
      const classificacaoCombobox = this.template.querySelector(
        'lightning-combobox[label="Classificação do Lead"]'
      );
      if (classificacaoCombobox && !classificacaoCombobox.reportValidity()) {
        isValid = false;
      }
    }

    return isValid;
  }

  // Atualização do método handleSave para suportar tanto leads quanto contas
  async handleSave() {
    if (!this.validateForm()) {
      return;
    }

    this.isLoading = true;

    try {
      if (this.activeTab === "lead" && this.selectedLeadId) {
        // Armazenar o ID do lead em uma variável local para garantir que seja capturado corretamente
        const currentLeadId = this.selectedLeadId;

        // Lógica existente para registro de chamada para lead
        await createCallTask({
          leadId: currentLeadId,
          canalComunicacao: this.canalComunicacao,
          classificacao: this.classificacaoLead,
          comentarios: this.comentarios,
          ownerId: userId,
          ligacaoFoiAtendida: this.ligacaoFoiAtendida
        });

        this.showToast(
          "Sucesso",
          "Chamada para lead registrada com sucesso!",
          "success"
        );

        // Atualizar a contagem de chamadas do lead e o histórico
        this.updateLeadCallsCount();
        
        // Se a classificação for "Interessado", verificar se uma oportunidade foi criada
        if (this.classificacaoLead === "Interessado") {
          console.log("Lead classificado como Interessado, verificando oportunidade...");
          // Iniciar processo de verificação de oportunidade sem setTimeout
          // para evitar problemas com contexto
          this.checkForCreatedOpportunity(currentLeadId, null);
        }
      } else if (this.activeTab === "account" && this.selectedAccountId) {
        // Armazenar o ID da conta em uma variável local
        const currentAccountId = this.selectedAccountId;
        
        // Criar o registro de chamada para conta
        await createAccountCallTask({
          accountId: currentAccountId,
          canalComunicacao: this.canalComunicacao,
          classificacao: this.classificacaoLead,
          comentarios: this.comentarios,
          ownerId: userId,
          ligacaoFoiAtendida: this.ligacaoFoiAtendida
        });

        this.showToast(
          "Sucesso",
          "Chamada para conta registrada com sucesso!",
          "success"
        );

        // Se a classificação for "Interessado", verificar se uma oportunidade foi criada
        if (this.classificacaoLead === "Interessado") {
          console.log("Conta classificada como Interessado, verificando oportunidade...");
          // Iniciar processo de verificação de oportunidade sem setTimeout
          this.checkForCreatedOpportunity(null, currentAccountId);
        }
      }

      this.resetForm();

      // Usar um sistema de múltiplas atualizações para garantir a consistência
    // Primeiro, atualizar imediatamente para responsividade da UI
    this.loadRecentCallHistory(true);
    
    // Em seguida, programar atualizações adicionais para garantir que os dados do servidor estejam persistidos
    setTimeout(() => {
      this.loadRecentCallHistory(true);
      
      // Segunda atualização após mais tempo, caso a primeira não tenha capturado os dados
      setTimeout(() => {
        this.loadRecentCallHistory(true);
      }, 2000);
    }, 1000);
    
    // Notificar o componente pai que houve uma atualização com um evento específico para histórico
    this.dispatchEvent(new CustomEvent("refresh", {
      bubbles: true,
      composed: true
    }));
    
    // Disparar evento customizado para notificar que uma chamada foi registrada
    // Este evento será capturado pela página PWA para atualização automática
    // Incluir informações detalhadas sobre a chamada para a notificação
    let leadOrAccountName = '';
    
    if (this.activeTab === 'lead' && this.selectedLead) {
      leadOrAccountName = this.selectedLead.Name || '';
    } else if (this.activeTab === 'account' && this.selectedAccount) {
      leadOrAccountName = this.selectedAccount.Name || '';
    }
    
    // Usar um evento com maior visibilidade e detalhes mais específicos
    this.dispatchEvent(new CustomEvent("callregistered", {
      bubbles: true,
      composed: true,
      detail: { 
        success: true,
        leadName: leadOrAccountName,
        classificacao: this.classificacaoLead || 'Não classificado',
        tipoChamada: this.canalComunicacao || 'Telefone',
        timestamp: new Date().getTime(),
        needsHistoryRefresh: true
      }
    }));
    
    // Disparar um evento global para garantir que todos os componentes sejam notificados
    // Isso é especialmente útil para componentes que estão em diferentes contextos DOM
    if (window) {
      try {
        window.dispatchEvent(new CustomEvent('reino_capital_call_registered', {
          detail: {
            timestamp: new Date().getTime(),
            source: 'sidebarChamada'
          }
        }));
      } catch (e) {
        console.error('Erro ao disparar evento global:', e);
      }
    }
    } catch (error) {
      this.showToast(
        "Erro",
        "Não foi possível registrar a chamada: " +
          (error.body ? error.body.message : error.message),
        "error"
      );
    } finally {
      // Finalizar o estado de loading
      this.isLoading = false;
    }
  }

  // Método para converter Lead em Oportunidade usando Admin Flow
  async checkForCreatedOpportunity(leadId, accountId) {
    console.log(`Método checkForCreatedOpportunity iniciado. Usando Flow Admin.`);
    
    // Mostrar o estado de loading
    this.isPreparingOpportunity = true;

    try {
      // Verificar se temos um ID de lead ou conta para consultar
      if (!leadId && !accountId) {
        console.error('Método checkForCreatedOpportunity chamado sem leadId ou accountId');
        this.isPreparingOpportunity = false;
        return;
      }

      if (leadId) {
        // Usar o sistema de Lead Event Management para criar evento e oportunidade
        console.log('Criando Lead Event e Oportunidade usando Lead Event Management:', leadId);

        const result = await createLeadEventAndOpportunity({
          leadId: leadId,
          taskId: null // Não temos taskId neste contexto
        });

        console.log('Resultado do Lead Event Management:', JSON.stringify(result));

        if (result.success && result.opportunityId) {
          this.opportunityId = result.opportunityId;
          console.log('Evento e Oportunidade criados com sucesso, Opportunity ID:', this.opportunityId);

          // Finalizar o estado de loading primeiro
          this.isPreparingOpportunity = false;
          this.isLoadingOpportunity = false;

          // Abrir diretamente o modal do novo componente combinado
          this.showOpportunityModal = true;

          this.showToast(
            "🎉 Evento Criado!",
            "Compromisso e oportunidade criados automaticamente. Configure os detalhes no modal.",
            "success"
          );
          return;
        } else {
          // Falha na criação do Lead Event
          console.error('Falha na criação do Lead Event:', result.message || result.error);
          this.isPreparingOpportunity = false;

          this.showToast(
            "Erro",
            result.message || result.error || "Não foi possível criar o evento e oportunidade.",
            "error"
          );
        }
      } else if (accountId) {
        // Para contas, mantemos a verificação tradicional de oportunidade existente
        const result = await checkForNewOpportunity({
          accountId: accountId
        });

        console.log('Resultado da verificação de oportunidade para conta:', JSON.stringify(result));

        if (result.opportunityFound) {
          this.opportunityId = result.opportunityId;
          console.log('Oportunidade encontrada para conta, ID:', this.opportunityId);

          // Finalizar o estado de loading primeiro
          this.isPreparingOpportunity = false;
          this.isLoadingOpportunity = false;

          // Abrir diretamente o modal do novo componente combinado
          this.showOpportunityModal = true;

          this.showToast(
            "Sucesso",
            "Oportunidade encontrada! Configure os detalhes agora.",
            "success"
          );
          return;
        } else {
          // Se não encontrou oportunidade para a conta
          console.log('Oportunidade não encontrada para a conta.');
          this.isPreparingOpportunity = false;

          this.showToast(
            "Aviso",
            "Não foi possível encontrar uma oportunidade associada a esta conta.",
            "warning"
          );
        }
      }
    } catch (error) {
      console.error('Erro ao processar conversão de Lead ou verificar oportunidade:', error);
      this.isPreparingOpportunity = false;
      
      this.showToast(
        "Erro",
        "Ocorreu um erro ao processar a conversão do Lead: " + 
        (error.body && error.body.message ? error.body.message : error.message || 'Erro desconhecido'),
        "error"
      );
    }
  }


  handleOpportunityModalClose() {
    console.log("sidebarChamada - Modal de oportunidade fechado");
    this.showOpportunityModal = false;
    this.isPreparingOpportunity = false; // Garantir que o loading screen seja removido
    this.isLoadingOpportunity = false; // Limpar qualquer estado de loading residual
    
    // Resetar o ID da oportunidade após um breve período para evitar problemas
    setTimeout(() => {
      this.opportunityId = null;
    }, 500);
  }

  // Handler para quando a oportunidade é atualizada
  handleOpportunityUpdate(event) {
    console.log(
      "sidebarChamada - Oportunidade atualizada:",
      event.detail.opportunityId
    );
    this.showToast("Sucesso", "Oportunidade atualizada com sucesso", "success");
    this.showOpportunityModal = false;
  }

  // Handler para quando o lead event e oportunidade são salvos no novo componente combinado
  handleLeadEventOpportunitySave(event) {
    console.log(
      "sidebarChamada - Lead Event e Oportunidade salvos:",
      event.detail
    );

    const { eventId, opportunityId, action } = event.detail;

    if (action === "create") {
      this.showToast(
        "Sucesso",
        "Compromisso e oportunidade criados com sucesso",
        "success"
      );
    } else {
      this.showToast(
        "Sucesso",
        "Compromisso e oportunidade atualizados com sucesso",
        "success"
      );
    }

    // Close the modal
    this.showOpportunityModal = false;
    this.isPreparingOpportunity = false;
    this.isLoadingOpportunity = false;

    // Clear opportunity ID after a delay to allow modal to close gracefully
    setTimeout(() => {
      this.opportunityId = null;
    }, 500);

    // Optionally refresh any data or dispatch events to parent components
    this.dispatchEvent(new CustomEvent("leadprocessed", {
      detail: {
        leadId: this.selectedLeadId,
        eventId: eventId,
        opportunityId: opportunityId,
        action: action
      },
      bubbles: true,
      composed: true
    }));
  }

  // Método atualizado para resetar o formulário (mantendo a aba atual)
  resetForm() {

    // Limpar propriedades de lead ou conta dependendo da aba ativa
    if (this.activeTab === "lead") {
      this.selectedLeadId = undefined;
      this.selectedLead = undefined;
      this.searchTerm = "";
      this.searchResults = [];
      this.showSearchResults = false;
    } else if (this.activeTab === "account") {
      this.selectedAccountId = undefined;
      this.selectedAccount = undefined;
      this.accountSearchTerm = "";
      this.accountSearchResults = [];
      this.showAccountSearchResults = false;
    }

    // Limpar dados do formulário comum
    this.canalComunicacao = undefined;
    this.classificacaoLead = undefined;
    this.comentarios = undefined;
    this.dataVencimento = new Date().toISOString().split("T")[0];
    this.leadCallsCount = 0;
    this.callHistory = [];
    this.isCallHistoryOpen = false;
    this.ligacaoFoiAtendida = false;

    // Resetar os componentes do DOM
    const inputFields = this.template.querySelectorAll(
      "lightning-combobox, lightning-textarea, input"
    );
    if (inputFields) {
      inputFields.forEach((field) => {
        field.value = undefined;
      });
    }

    // Resetar o componente de templates de comentários
    const commentTemplatesComponent = this.template.querySelector(
      "c-comment-templates"
    );
    if (commentTemplatesComponent) {
      commentTemplatesComponent.clearTemplateSelection();
    }
  }

  // Método para troca de aba
  handleTabChange(event) {
    // Agora estamos usando divs, então o valor vem de data-value em vez de event.target.value
    this.activeTab = event.currentTarget.dataset.value;

    // O restante do método permanece igual
    if (this.activeTab === "lead") {
      this.selectedAccount = undefined;
      this.selectedAccountId = undefined;
      this.accountSearchTerm = "";
      this.accountSearchResults = [];
      this.showAccountSearchResults = false;
    } else if (this.activeTab === "account") {
      this.selectedLead = undefined;
      this.selectedLeadId = undefined;
      this.searchTerm = "";
      this.searchResults = [];
      this.showSearchResults = false;

      // Limpar histórico de chamadas ao trocar para conta
      this.leadCallsCount = 0;
      this.callHistory = [];
      this.isCallHistoryOpen = false;
    }
  }

  // Wire para contas
  @wire(getAccountsForSelection)
  wiredAccounts({ error, data }) {
    if (data) {
      this.accounts = data.map((account) => ({
        label: account.Name,
        value: account.Id,
        name: account.Name,
        email: account.PersonEmail,
        phone: account.Phone,
        type: account.Type
      }));
      this.error = undefined;
    } else if (error) {
      this.error = error;
      this.accounts = [];
      this.showToast(
        "Erro",
        "Não foi possível carregar as contas: " + error.body.message,
        "error"
      );
    }
  }

  // Método para pesquisa de contas
  handleAccountSearch(event) {
    this.accountSearchTerm = event.target.value;

    // Se o termo de busca estiver vazio, não mostra resultados
    if (!this.accountSearchTerm || this.accountSearchTerm.length < 2) {
      this.showAccountSearchResults = false;
      return;
    }

    // Filtra as contas com base no termo de busca
    const term = this.accountSearchTerm.toLowerCase();
    // Verifica se o termo é um número (para busca por telefone)
    const isNumericSearch = /\d/.test(term);

    this.accountSearchResults = this.accounts
      .filter((account) => {
        const accountName = account.label.toLowerCase();
        const accountEmail = account.email ? account.email.toLowerCase() : "";
        const accountPhone = account.phone ? account.phone.toLowerCase() : "";
        const accountType = account.type ? account.type.toLowerCase() : "";

        // Para pesquisas numéricas, dá prioridade à correspondência de telefone
        if (isNumericSearch && accountPhone.includes(term)) {
          return true;
        }

        return (
          accountName.includes(term) ||
          accountEmail.includes(term) ||
          accountPhone.includes(term) ||
          accountType.includes(term)
        );
      })
      .map((account) => ({
        Id: account.value,
        Name: account.name,
        Email: account.email || "",
        Phone: account.phone || "",
        Type: account.type || ""
      }));

    this.showAccountSearchResults = true;
  }

  // Método para seleção de conta
  handleAccountSelection(event) {
    const selectedAccountId = event.currentTarget.dataset.id;
    const selectedAccount = this.accountSearchResults.find(
      (account) => account.Id === selectedAccountId
    );

    if (selectedAccount) {
      this.selectedAccountId = selectedAccount.Id;
      this.selectedAccount = selectedAccount;
      this.accountSearchTerm = selectedAccount.Name;
      this.showAccountSearchResults = false;
    }
  }

  // Método para limpar a pesquisa de contas
  handleClearAccountSearch() {
    this.accountSearchTerm = "";
    this.selectedAccount = undefined;
    this.selectedAccountId = undefined;
    this.showAccountSearchResults = false;

    // Focar no campo de pesquisa após limpar
    Promise.resolve().then(() => {
      const searchInput = this.template.querySelector("#accountSearchInput");
      if (searchInput) {
        searchInput.focus();
      }
    });
  }

  // Método para navegação para conta
  navigateToAccount(event) {
    event.preventDefault();
    if (this.selectedAccountId) {
      this[NavigationMixin.Navigate]({
        type: "standard__recordPage",
        attributes: {
          recordId: this.selectedAccountId,
          objectApiName: "Account",
          actionName: "view"
        }
      });
    }
  }

  // Método para pesquisa de leads
  handleLeadSearch(event) {
    this.searchTerm = event.target.value;

    // Se o termo de busca estiver vazio, não mostra resultados
    if (!this.searchTerm || this.searchTerm.length < 2) {
      this.showSearchResults = false;
      return;
    }

    // Filtra os leads com base no termo de busca
    const term = this.searchTerm.toLowerCase();
    // Verifica se o termo é um número (para busca por telefone)
    const isNumericSearch = /\d/.test(term);

    this.searchResults = this.leads
      .filter((lead) => {
        const leadName = lead.label.toLowerCase();
        const leadEmail = lead.email ? lead.email.toLowerCase() : "";
        const leadPhone = lead.phone ? lead.phone.toLowerCase() : "";
        const leadCompany = lead.company ? lead.company.toLowerCase() : "";

        // Para pesquisas numéricas, dá prioridade à correspondência de telefone
        if (isNumericSearch && leadPhone.includes(term)) {
          return true;
        }

        return (
          leadName.includes(term) ||
          leadEmail.includes(term) ||
          leadPhone.includes(term) ||
          leadCompany.includes(term)
        );
      })
      .map((lead) => {
        // Obter o email original, se existir
        const originalEmail = lead.email || "";
        
        // Criar o objeto do lead com email formatado
        return {
          Id: lead.value,
          Name: lead.name,
          // Salvar email original para uso em title/tooltip
          FullEmail: originalEmail,
          // Formatar o email para exibição
          Email: this.formatEmail(originalEmail),
          Phone: lead.phone || "",
          Company: lead.company || ""
        };
      });

    this.showSearchResults = true;
  }

  // Função auxiliar para formatar emails
  formatEmail(email) {
    if (!email) return "";
    // Agora retornamos o email completo, deixando o CSS lidar com a exibição
    return email;
  }

  // Método para seleção de lead
  handleLeadSelection(event) {
    const selectedLeadId = event.currentTarget.dataset.id;
    const selectedLead = this.searchResults.find(
      (lead) => lead.Id === selectedLeadId
    );

    if (selectedLead) {
      // Formatar o email se existir e for muito longo
      if (selectedLead.Email) {
        // Preservar o email original como atributo adicional para uso em title/tooltip
        selectedLead.FullEmail = selectedLead.Email;
        // Formatar o email para exibição
        selectedLead.Email = this.formatEmail(selectedLead.Email);
      }
      
      this.selectedLeadId = selectedLead.Id;
      this.selectedLead = selectedLead;
      this.searchTerm = selectedLead.Name;
      this.showSearchResults = false;

      // Carregar contagem de chamadas e histórico para o lead selecionado
      this.updateLeadCallsCount();
    }
  }

  // Método para limpar a pesquisa de leads
  handleClearSearch() {
    this.searchTerm = "";
    this.selectedLead = undefined;
    this.selectedLeadId = undefined;
    this.showSearchResults = false;
    this.leadCallsCount = 0;
    this.callHistory = [];

    // Focar no campo de pesquisa após limpar
    Promise.resolve().then(() => {
      const searchInput = this.template.querySelector("#leadSearchInput");
      if (searchInput) {
        searchInput.focus();
      }
    });
  }

  // Método para atualizar a contagem de chamadas do lead
  async updateLeadCallsCount() {
    if (this.selectedLeadId) {
      try {
        this.leadCallsCount = await getLeadCallsCount({
          leadId: this.selectedLeadId
        });
        if (this.leadCallsCount > 0) {
          this.loadLeadCallHistory();
        } else {
          this.callHistory = [];
        }
      } catch (error) {
        console.error("Erro ao carregar contagem de chamadas:", error);
      }
    }
  }

  // Método para carregar o histórico de chamadas
  async loadLeadCallHistory() {
    if (this.selectedLeadId) {
      try {
        const callHistory = await getLeadCallHistory({
          leadId: this.selectedLeadId
        });

        // Adicionar campos formatados ao histórico
        this.callHistory = callHistory.map((call) => {
          const callDate = new Date(call.CreatedDate);
          return {
            ...call,
            formattedDate: callDate.toLocaleDateString("pt-BR"),
            formattedTime: callDate.toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit"
            })
          };
        });
      } catch (error) {
        console.error("Erro ao carregar histórico de chamadas:", error);
        this.callHistory = [];
      }
    }
  }

  // Método para alternar a exibição do histórico de chamadas
  toggleCallHistory() {
    this.isCallHistoryOpen = !this.isCallHistoryOpen;
    
    // Se estiver abrindo, recarregar o histórico para garantir dados atualizados
    if (this.isCallHistoryOpen) {
      if (this.selectedLeadId) {
        this.loadLeadCallHistory();
      }
      // Sempre atualizar o histórico recente ao expandir a seção
      this.loadRecentCallHistory(true);
    }
  }
  
  // Handler para evento global de registro de chamada
  handleGlobalCallRegistered(event) {
    console.log('Evento global de chamada registrada recebido:', event.detail);
    // Recarregar o histórico recente de chamadas quando qualquer componente registrar uma chamada
    this.loadRecentCallHistory(true);
  }
  
  // Método para alternar a exibição da seção de WhatsApp
  toggleWhatsAppSection() {
    this.isWhatsAppSectionOpen = !this.isWhatsAppSectionOpen;
  }
  
  // Método do ciclo de vida - desconectado do DOM
  disconnectedCallback() {
    // Remover o listener global ao desmontar o componente
    if (window && this.callRegisteredListener) {
      try {
        window.removeEventListener('reino_capital_call_registered', this.callRegisteredListener);
      } catch (e) {
        console.error('Erro ao remover listener global:', e);
      }
    }
  }

  // Navegação para o lead
  navigateToLead(event) {
    event.preventDefault();
    if (this.selectedLeadId) {
      this[NavigationMixin.Navigate]({
        type: "standard__recordPage",
        attributes: {
          recordId: this.selectedLeadId,
          objectApiName: "Lead",
          actionName: "view"
        }
      });
    }
  }

  // Versão atualizada do método para abrir WhatsApp
  handleOpenWhatsApp(event) {
    event.preventDefault();
    event.stopPropagation();

    const phoneNumber = event.currentTarget.dataset.phone;
    const leadId = event.currentTarget.dataset.leadId;
    const accountId = event.currentTarget.dataset.accountId;
    let contactName = "";

    // Selecionar lead ou conta se clicou no número direto dos resultados da pesquisa
    if (leadId) {
      const selectedLead = this.searchResults.find(
        (lead) => lead.Id === leadId
      );
      if (selectedLead) {
        this.selectedLeadId = selectedLead.Id;
        this.selectedLead = selectedLead;
        this.searchTerm = selectedLead.Name;
        this.showSearchResults = false;
        contactName = selectedLead.Name;
      }
    } else if (accountId) {
      const selectedAccount = this.accountSearchResults.find(
        (account) => account.Id === accountId
      );
      if (selectedAccount) {
        this.selectedAccountId = selectedAccount.Id;
        this.selectedAccount = selectedAccount;
        this.accountSearchTerm = selectedAccount.Name;
        this.showAccountSearchResults = false;
        contactName = selectedAccount.Name;
      }
    } else if (this.activeTab === "lead" && this.selectedLead) {
      contactName = this.selectedLead.Name;
    } else if (this.activeTab === "account" && this.selectedAccount) {
      contactName = this.selectedAccount.Name;
    }

    if (phoneNumber) {
      // Remove todos os caracteres não numéricos
      let formattedPhone = phoneNumber.replace(/\D/g, "");

      if (formattedPhone.length > 0) {
        if (!formattedPhone.startsWith("55") && formattedPhone.length >= 8) {
          formattedPhone = "55" + formattedPhone;
        }

        const templateComponent = this.template.querySelector(
          "c-whatsapp-message-template"
        );
        let messageText = "";

        if (templateComponent) {
          // Formata a mensagem com o nome do contato
          messageText = templateComponent.formatMessage(
            contactName || "Cliente",
            this.userFirstName || "Representante"
          );

          // Codifica a mensagem para URL
          const encodedMessage = encodeURIComponent(messageText);

          try {
            // Abrir WhatsApp Web
            const whatsappWebUrl = `https://web.whatsapp.com/send?phone=${formattedPhone}&text=${encodedMessage}`;
            window.open(whatsappWebUrl, "_blank");
          } catch (error) {
            console.error("Erro ao abrir WhatsApp:", error);
            this.showToast(
              "Erro",
              "Não foi possível abrir o WhatsApp.",
              "error"
            );
          }
        }
      }
    }
  }

  // Método para enviar WhatsApp - suporta leads e contas
  handleSendWhatsApp() {
    let phoneNumber, contactName;

    if (
      this.activeTab === "lead" &&
      this.selectedLead &&
      this.selectedLead.Phone
    ) {
      phoneNumber = this.selectedLead.Phone;
      contactName = this.selectedLead.Name || "Cliente";
    } else if (
      this.activeTab === "account" &&
      this.selectedAccount &&
      this.selectedAccount.Phone
    ) {
      phoneNumber = this.selectedAccount.Phone;
      contactName = this.selectedAccount.Name || "Cliente";
    } else {
      let message =
        this.activeTab === "lead"
          ? "Selecione um lead com telefone para enviar mensagem"
          : "Selecione uma conta com telefone para enviar mensagem";

      this.showToast("Aviso", message, "warning");
      return;
    }

    // Cria um evento simulado para utilizar o método existente
    const event = {
      preventDefault: () => {},
      stopPropagation: () => {},
      currentTarget: {
        dataset: {
          phone: phoneNumber,
          leadName: this.activeTab === "lead" ? contactName : undefined,
          accountId:
            this.activeTab === "account" ? this.selectedAccountId : undefined
        }
      }
    };

    this.handleOpenWhatsApp(event);
  }

  // Métodos para manipular mudanças nos campos do formulário
  handleCanalChange(event) {
    this.canalComunicacao = event.detail.value;
  }

  handleLigacaoAtendidaChange(event) {
    this.ligacaoFoiAtendida = event.target.checked;
  }

  handleClassificacaoChange(event) {
    this.classificacaoLead = event.detail.value;
    
    // Verificar se a classificação selecionada é "interessado" para mostrar o banner
    this.showOportunidadeBanner = this.classificacaoLead === "Interessado";
  }

  handleComentariosChange(event) {
    this.comentarios = event.target.value;
  }

  // Método para tratar clique no badge de chamadas
  handleCallBadgeClick() {
    // Abrir o histórico de chamadas se existir
    if (this.leadCallsCount > 0) {
      this.isCallHistoryOpen = true;
    }
  }

  // Método para tratar seleção de template de comentário
  handleTemplateSelected(event) {
    if (event.detail) {
      // Substitui o conteúdo atual pelo texto do template selecionado
      this.comentarios = event.detail;
    }
  }

  // Método para mostrar mensagens toast
  showToast(title, message, variant) {
    const evt = new ShowToastEvent({
      title: title,
      message: message,
      variant: variant
    });
    this.dispatchEvent(evt);
  }

  // Método para gerenciar o evento de exibição de toast do componente filho
  handleShowToast(event) {
    if (event.detail) {
      this.showToast(
        event.detail.title || "Informação",
        event.detail.message,
        event.detail.variant || "info"
      );
    }
  }

  // Método para receber atualizações do template de WhatsApp
  handleTemplateUpdated(event) {
    // Este método é chamado quando o template de WhatsApp é atualizado
    // Se necessário, pode armazenar o template atualizado
    console.log("Template de WhatsApp atualizado", event.detail);
  }

  // Getters para o ícone do acordeão
  get accordionIcon() {
    return this.isCallHistoryOpen ? "utility:chevrondown" : "utility:chevronright";
  }

  get accordionAltText() {
    return this.isCallHistoryOpen ? "Recolher" : "Expandir";
  }
  
  // Getters para o ícone do acordeão de WhatsApp e texto alternativo
  get whatsappAccordionIcon() {
    return this.isWhatsAppSectionOpen ? "utility:chevrondown" : "utility:chevronright";
  }

  get whatsappAccordionAltText() {
    return this.isWhatsAppSectionOpen ? "Recolher" : "Expandir";
  }

  // Definição do getter para classe do footer
  get footerClass() {
    return "sidebar-footer";
  }
  
  // Getter para controlar a visibilidade do botão de salvar (só exibido quando um lead estiver selecionado)
  get showSaveButton() {
    return !this.isLoading && 
           ((this.activeTab === "lead" && this.selectedLead) || 
            (this.activeTab === "account" && this.selectedAccount));
  }

  // Método para rolar o carrossel para a esquerda
  scrollCarouselLeft() {
    const carousel = this.template.querySelector('[data-id="call-history-carousel"]');
    if (carousel) {
      // Definir quantidade de rolagem para aproximadamente 2 cards
      const scrollAmount = 330;
      carousel.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    }
  }

  // Método para rolar o carrossel para a direita
  scrollCarouselRight() {
    const carousel = this.template.querySelector('[data-id="call-history-carousel"]');
    if (carousel) {
      // Definir quantidade de rolagem para aproximadamente 2 cards
      const scrollAmount = 330;
      carousel.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }

  // Método para navegar para o registro da tarefa quando a seta diagonal for clicada
  navigateToTask(event) {
    // Prevenir comportamento padrão do link
    event.preventDefault();
    event.stopPropagation();
    
    // Obter o ID da tarefa do atributo data-id
    const taskId = event.currentTarget.dataset.id;
    
    if (taskId) {
      // Navegar para o registro da tarefa usando NavigationMixin
      this[NavigationMixin.Navigate]({
        type: 'standard__recordPage',
        attributes: {
          recordId: taskId,
          objectApiName: 'Task',
          actionName: 'view'
        }
      });
    } else {
      // Exibir mensagem de erro se o ID da tarefa não estiver disponível
      this.showToast(
        "Erro",
        "Não foi possível encontrar o registro da tarefa.",
        "error"
      );
    }
  }
}
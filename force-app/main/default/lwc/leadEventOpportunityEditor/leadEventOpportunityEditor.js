import { LightningElement, api, track } from "lwc";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import { NavigationMixin } from "lightning/navigation";

// Apex methods from appointmentEditor
import getAppointmentDetails from "@salesforce/apex/AppointmentController.getAppointmentDetails";
import createAppointment from "@salesforce/apex/AppointmentController.createAppointment";
import updateAppointment from "@salesforce/apex/AppointmentController.updateAppointment";
import searchUsers from "@salesforce/apex/AppointmentController.searchUsers";
import searchContacts from "@salesforce/apex/AppointmentController.searchContacts";
import validarDisponibilidadeSala from "@salesforce/apex/ReuniaoController.validarDisponibilidadeSala";
import getStatusPicklistValues from "@salesforce/apex/CalendarioReinoController.getStatusPicklistValues";
import getOpportunityStageOptions from "@salesforce/apex/AppointmentController.getOpportunityStageOptions";

// Apex methods from opportunityEditor
import getOpportunityDetails from "@salesforce/apex/OpportunityManager.getOpportunityDetails";
import updateOpportunity from "@salesforce/apex/OpportunityManager.updateOpportunity";

// Apex methods for Lead Event system
import getLeadEventDetails from "@salesforce/apex/LeadEventController.getLeadEventDetails";

/**
 * Combined component for editing both appointment and opportunity details
 * Opens when lead call status is set to "Interessado" instead of separate opportunityEditor
 * @author Reino Capital
 * @last-modified 2025-06-20
 */
export default class LeadEventOpportunityEditor extends NavigationMixin(LightningElement) {
  // API properties
  @api recordId; // Lead ID or Event ID
  @api opportunityId; // Opportunity ID when editing existing opportunity
  @api leadId; // Lead ID for new event/opportunity creation
  @api showModal = false;

  // Loading and error states
  @track isLoading = false;
  @track error = null;
  @track isLoadingEvent = false;
  @track isLoadingOpportunity = false;

  // Tab management
  @track activeTab = "event"; // "event" or "opportunity"

  // Event data properties (from appointmentEditor)
  @track eventData = {};
  @track appointmentType = "";
  @track salaReuniao = "salaPrincipal";
  @track linkReuniao = "";
  @track statusReuniao = null;
  @track isAutomatedEvent = false;

  // Participant management
  @track selectedGestorName = "";
  @track selectedLiderComercialName = "";
  @track selectedSdrName = "";
  @track userOptions = [];
  @track sdrUserOptions = [];
  @track commercialManagerUserOptions = [];
  @track gestorUserOptions = [];
  @track statusOptions = [];

  // Contact/Lead information
  @track contactInfo = {};
  @track leadInfo = {};
  @track hasContactInfo = false;
  @track hasLeadInfo = false;
  @track selectedContactName = "";

  // Opportunity data properties (from opportunityEditor)
  @track opportunityDetails = null;
  @track opportunityError = null;
  @track opportunityAmount = null;
  @track opportunityCloseDate = null;
  @track opportunityName = null;
  @track opportunityStageName = null;
  @track opportunityDescription = null;
  @track opportunityType = null;
  @track opportunityTypeApiValue = null;
  @track opportunityProbability = null;

  // Picklist options
  @track stageOptions = [];
  @track typeOptions = [];

  // Internal event ID tracking
  _eventId;

  // Tab initialization tracking
  hasInitializedTabs = false;

  // Computed properties for modal title
  get modalTitle() {
    if (this.leadInfo && this.leadInfo.Name) {
      return `${this.leadInfo.Name} - Evento Criado com Sucesso!`;
    }
    return "Evento e Oportunidade Criados!";
  }

  get isEventTab() {
    return this.activeTab === "event";
  }

  get isOpportunityTab() {
    return this.activeTab === "opportunity";
  }

  // Event ID getter/setter
  @api
  get eventId() {
    return this._eventId;
  }
  set eventId(value) {
    const oldValue = this._eventId;
    this._eventId = value;
    if (this.isConnected && oldValue !== value) {
      this.loadEventData();
    }
  }

  // Lifecycle hooks
  connectedCallback() {
    console.log('🔄 leadEventOpportunityEditor connectedCallback - Iniciando carregamento');
    console.log('📋 Props recebidas:', {
      eventId: this.eventId,
      opportunityId: this.opportunityId,
      leadId: this.leadId,
      isOpen: this.isOpen
    });
    this.initializeComponent();
  }

  renderedCallback() {
    // Set initial active tab
    if (!this.hasInitializedTabs) {
      this.hasInitializedTabs = true;
      this.setActiveTab();
    }
  }

  setActiveTab() {
    console.log('🎯 setActiveTab - Inicializando tabs');

    // Set active class on event tab by default and show its content
    const eventTab = this.template.querySelector('[data-tab="event"]');
    const opportunityTab = this.template.querySelector('[data-tab="opportunity"]');
    const eventContent = this.template.querySelector('[data-tab-content="event"]');
    const opportunityContent = this.template.querySelector('[data-tab-content="opportunity"]');

    console.log('📋 Elementos encontrados:', {
      eventTab: !!eventTab,
      eventContent: !!eventContent,
      opportunityTab: !!opportunityTab,
      opportunityContent: !!opportunityContent
    });

    // Reset all tabs and content
    if (eventTab) eventTab.classList.remove('active');
    if (opportunityTab) opportunityTab.classList.remove('active');
    if (eventContent) eventContent.classList.remove('show');
    if (opportunityContent) opportunityContent.classList.remove('show');

    // Set event tab as active by default
    if (eventTab) {
      eventTab.classList.add('active');
      console.log('✅ Event tab ativada');
    } else {
      console.error('❌ Event tab não encontrado');
    }

    if (eventContent) {
      eventContent.classList.add('show');
      console.log('✅ Event content mostrado');
    } else {
      console.error('❌ Event content não encontrado');
    }

    // Update activeTab property
    this.activeTab = 'event';
    console.log('✅ activeTab definido como:', this.activeTab);
  }

  // Initialize component data
  async initializeComponent() {
    try {
      console.log('🚀 initializeComponent - Iniciando inicialização');
      this.isLoading = true;
      console.log('⏳ isLoading definido como true');

      // Initialize event data with defaults
      console.log('📝 Inicializando dados do evento com defaults');
      this.initializeEventData();

      // Load users and picklist options
      console.log('📊 Carregando usuários e opções de picklist');
      await Promise.all([
        this.loadAllUsers(),
        this.loadStatusOptions(),
        this.loadOpportunityPicklists()
      ]);
      console.log('✅ Usuários e picklists carregados');

      // For automation-created events, load lead event details first
      if (this.leadId && this.opportunityId && !this.eventId) {
        console.log('Loading automation-created event for lead:', this.leadId);
        await this.loadLeadEventDetails();
      }

      // Load existing data if IDs are provided
      if (this.eventId || this.leadId) {
        await this.loadEventData();
      }

      if (this.opportunityId) {
        await this.loadOpportunityData();
      }

    } catch (error) {
      this.error = "Erro ao inicializar componente: " + this.reduceErrors(error);
      console.error('❌ Error initializing component:', error);
    } finally {
      this.isLoading = false;
      console.log('✅ initializeComponent concluído, isLoading = false');
    }
  }

  // Initialize event data with default values
  initializeEventData() {
    const now = new Date();
    const endTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour later

    this.eventData = {
      subject: "",
      location: "",
      startDateTime: this.formatDateTimeLocal(now),
      endDateTime: this.formatDateTimeLocal(endTime),
      isAllDayEvent: false,
      description: "",
      whoId: this.leadId || null,
      whatId: null,
      reuniaoCriada: false,
      faseEvento: "Primeira Reunião",
      produtoEvento: ""
    };
  }

  // Load all user options for dropdowns
  async loadAllUsers() {
    try {
      const result = await searchUsers({ searchTerm: "", roleFilter: "" });
      this.userOptions = result.map(user => ({
        label: user.Name,
        value: user.Name
      }));

      // Filter users by role for specific dropdowns
      this.sdrUserOptions = result
        .filter(user => user.UserRole && user.UserRole.Name === "SDR")
        .map(user => ({ label: user.Name, value: user.Name }));

      this.commercialManagerUserOptions = result
        .filter(user => user.UserRole && user.UserRole.Name === "gestor líder comercial")
        .map(user => ({ label: user.Name, value: user.Name }));

      this.gestorUserOptions = result
        .filter(user => user.UserRole && user.UserRole.Name === "Gestor")
        .map(user => ({ label: user.Name, value: user.Name }));

    } catch (error) {
      console.error("Error loading users:", error);
    }
  }

  // Load status picklist options
  async loadStatusOptions() {
    try {
      const result = await getStatusPicklistValues();
      this.statusOptions = result.map(option => ({
        label: option.label,
        value: option.value
      }));
    } catch (error) {
      console.error("Error loading status options:", error);
    }
  }

  // Load opportunity picklist options
  async loadOpportunityPicklists() {
    try {
      // Dynamically fetch stage options from Salesforce
      const stageResult = await getOpportunityStageOptions();
      if (stageResult && stageResult.length > 0) {
        this.stageOptions = stageResult.map(option => ({
          label: option.label,
          value: option.value
        }));
        console.log('✅ Stage options loaded dynamically:', this.stageOptions);
      } else {
        // Fallback to hardcoded options if dynamic fetch fails
        this.stageOptions = [
          { label: "Reunião Agendada", value: "Reunião Agendada" },
          { label: "Primeira Reunião", value: "Primeira Reunião" },
          { label: "Devolutiva", value: "Devolutiva" },
          { label: "Negociação", value: "Negociação" },
          { label: "Cliente", value: "Cliente" }
        ];
        console.log('⚠️ Using fallback stage options');
      }
    } catch (error) {
      console.error('Error loading stage options:', error);
      // Use fallback options
      this.stageOptions = [
        { label: "Reunião Agendada", value: "Reunião Agendada" },
        { label: "Primeira Reunião", value: "Primeira Reunião" },
        { label: "Devolutiva", value: "Devolutiva" },
        { label: "Negociação", value: "Negociação" },
        { label: "Cliente", value: "Cliente" }
      ];
    }

    // Set type options (from opportunityEditor)
    this.typeOptions = [
      { label: "Liquidação Otimizada", value: "Liquidação Otimizada" },
      { label: "Consultoria Societária", value: "Consultoria Societária" },
      { label: "Gestão de Patrimônio", value: "Gestão de Patrimônio" }
    ];
  }

  // Load lead event details for automation-created events
  async loadLeadEventDetails() {
    if (!this.leadId) return;

    try {
      console.log('Loading lead event details for lead:', this.leadId);
      const result = await getLeadEventDetails({ leadId: this.leadId });

      if (result && result.success) {
        console.log('Lead event details loaded:', result);
        if (result.eventId) {
          this._eventId = result.eventId;
          console.log('Event ID set to:', this._eventId);
        }
        if (result.opportunityId && !this.opportunityId) {
          this.opportunityId = result.opportunityId;
          console.log('Opportunity ID set to:', this.opportunityId);
        }

        // Load lead info if available
        if (result.leadInfo) {
          this.leadInfo = result.leadInfo;
          this.hasLeadInfo = true;
        }
      }
    } catch (error) {
      console.error('Error loading lead event details:', error);
      this.error = "Erro ao carregar detalhes do evento do lead: " + this.reduceErrors(error);
    }
  }

  // Load event data
  async loadEventData() {
    if (!this.eventId && !this.leadId) return;

    try {
      this.isLoadingEvent = true;

      let result;
      if (this.eventId) {
        // Load existing event
        console.log('Loading event details for event ID:', this.eventId);
        result = await getAppointmentDetails({ eventId: this.eventId });
      } else if (this.leadId) {
        // Load lead event details (for automation-created events)
        console.log('Loading lead event details for lead ID:', this.leadId);
        result = await getLeadEventDetails({ leadId: this.leadId });
        if (result.eventId) {
          this._eventId = result.eventId;
          this.opportunityId = result.opportunityId;
        }
      }

      if (result && result.success) {
        console.log('Event data loaded successfully:', result);
        this.populateEventData(result);
      } else {
        console.error('Failed to load event data:', result);
      }

    } catch (error) {
      console.error('Error loading event data:', error);
      this.error = "Erro ao carregar dados do evento: " + this.reduceErrors(error);
    } finally {
      this.isLoadingEvent = false;
    }
  }

  // Load opportunity data
  async loadOpportunityData() {
    if (!this.opportunityId) {
      console.log('No opportunity ID provided, skipping opportunity data load');
      return;
    }

    try {
      this.isLoadingOpportunity = true;
      console.log('Loading opportunity data for ID:', this.opportunityId);

      const result = await getOpportunityDetails({ opportunityId: this.opportunityId });
      console.log('Opportunity data loaded:', result);

      if (result && result.success !== false) {
        this.populateOpportunityData(result);
        console.log('Opportunity data populated successfully');
      } else {
        console.error('Failed to load opportunity data:', result);
        this.opportunityError = "Não foi possível carregar os dados da oportunidade";
      }

    } catch (error) {
      console.error('Error loading opportunity data:', error);
      this.opportunityError = "Erro ao carregar dados da oportunidade: " + this.reduceErrors(error);
    } finally {
      this.isLoadingOpportunity = false;
    }
  }

  // Populate event data from API response
  populateEventData(result) {
    if (result.eventDetails) {
      const event = result.eventDetails;
      this.eventData = {
        ...this.eventData,
        subject: event.Subject || "",
        location: event.Location || "",
        startDateTime: event.StartDateTime ? this.formatDateTimeLocal(new Date(event.StartDateTime)) : this.eventData.startDateTime,
        endDateTime: event.EndDateTime ? this.formatDateTimeLocal(new Date(event.EndDateTime)) : this.eventData.endDateTime,
        isAllDayEvent: event.IsAllDayEvent || false,
        description: event.Description || "",
        whoId: event.WhoId || null,
        whatId: event.WhatId || null,
        faseEvento: event.fase_evento__c || "Primeira Reunião",
        produtoEvento: event.produto_evento__c || ""
      };

      // Set appointment type and room
      this.appointmentType = event.tipoReuniao__c || "";
      this.salaReuniao = event.salaReuniao__c || "salaPrincipal";
      this.linkReuniao = event.linkReuniao__c || "";
      this.statusReuniao = event.statusReuniao__c || null;
      this.isAutomatedEvent = event.Criado_Por_Automacao__c || false;

      // Set participant names
      this.selectedGestorName = event.gestorName__c || "";
      this.selectedLiderComercialName = event.liderComercialName__c || "";
      this.selectedSdrName = event.sdrName__c || "";
    }

    // Set contact/lead information
    if (result.contactInfo) {
      this.contactInfo = result.contactInfo;
      this.hasContactInfo = true;
      this.selectedContactName = result.contactInfo.Name || "";
    }

    if (result.leadInfo) {
      this.leadInfo = result.leadInfo;
      this.hasLeadInfo = true;
    }
  }

  // Populate opportunity data from API response
  populateOpportunityData(result) {
    console.log('🔄 populateOpportunityData - Dados recebidos:', result);

    this.opportunityDetails = result;

    // Ensure required fields are populated with defaults if empty
    this.opportunityName = result.Name || `Oportunidade - ${new Date().toLocaleDateString('pt-BR')}`;
    this.opportunityAmount = result.Amount || null;
    this.opportunityCloseDate = result.CloseDate || null;

    // Use the first stage option as default, or "Reunião Agendada" as fallback
    const defaultStage = this.stageOptions && this.stageOptions.length > 0
      ? this.stageOptions[0].value
      : "Reunião Agendada";
    this.opportunityStageName = result.StageName || defaultStage;

    this.opportunityDescription = result.Description || "";
    this.opportunityType = result.Tipo_de_produto__c || "";
    this.opportunityTypeApiValue = result.Tipo_de_produto__c || "";
    this.opportunityProbability = result.Probabilidade_da_Oportunidade__c || "treze";

    console.log('✅ Dados da oportunidade populados:', {
      id: this.opportunityId,
      name: this.opportunityName,
      amount: this.opportunityAmount,
      stage: this.opportunityStageName,
      type: this.opportunityType,
      probability: this.opportunityProbability,
      closeDate: this.opportunityCloseDate,
      description: this.opportunityDescription
    });

    console.log('🎯 Estado atual das propriedades reativas:', {
      isLoading: this.isLoading,
      isLoadingOpportunity: this.isLoadingOpportunity,
      opportunityError: this.opportunityError,
      activeTab: this.activeTab
    });
  }

  // Utility methods
  formatDateTimeLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  reduceErrors(errors) {
    if (!errors) return "Erro desconhecido";
    if (typeof errors === "string") return errors;
    if (errors.body && errors.body.message) return errors.body.message;
    if (errors.message) return errors.message;
    if (Array.isArray(errors)) return errors.map(error => error.message || error).join(", ");
    return JSON.stringify(errors);
  }

  // Event handlers
  handleTabChange(event) {
    const newTab = event.target.dataset.tab;
    console.log('🔄 handleTabChange - Tentativa de mudança de tab:', {
      newTab: newTab,
      currentTab: this.activeTab,
      target: event.target
    });

    // Only proceed if we're switching to a different tab
    if (newTab && newTab !== this.activeTab) {
      console.log('✅ Mudando tab de', this.activeTab, 'para', newTab);
      this.activeTab = newTab;

      // Update active class on tabs
      const tabs = this.template.querySelectorAll('.slds-tabs_default__link');
      console.log('📋 Tabs encontradas:', tabs.length);
      tabs.forEach(tab => {
        tab.classList.remove('active');
      });
      event.target.classList.add('active');

      // Update tab content visibility
      const tabContents = this.template.querySelectorAll('.tab-content');
      console.log('📋 Tab contents encontrados:', tabContents.length);
      tabContents.forEach(content => {
        content.classList.remove('show');
      });

      const selectorString = `[data-tab-content="${this.activeTab}"]`;
      console.log('🔍 Procurando por seletor:', selectorString);

      const activeContent = this.template.querySelector(selectorString);
      console.log('🎯 Active content encontrado:', activeContent);

      // Debug: listar todos os elementos com data-tab-content
      const allTabContents = this.template.querySelectorAll('[data-tab-content]');
      console.log('📋 Todos os elementos com data-tab-content encontrados:');
      allTabContents.forEach(el => {
        console.log('  - data-tab-content:', el.getAttribute('data-tab-content'), 'Tag:', el.tagName, 'Classes:', el.className);
      });

      if (activeContent) {
        activeContent.classList.add('show');
        console.log('✅ Classe "show" adicionada ao conteúdo ativo');
      } else {
        console.error('❌ Conteúdo ativo não encontrado para tab:', this.activeTab);
      }

      console.log('✅ Tab switched to:', this.activeTab);
    } else {
      console.log('⚠️ Mudança de tab ignorada - mesmo tab ou tab inválida');
    }
  }

  closeModal() {
    this.showModal = false;
    this.dispatchEvent(new CustomEvent("close"));
  }

  showToast(title, message, variant) {
    this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
  }

  // Event form handlers
  handleEventFieldChange(event) {
    const field = event.target.name;
    const value = event.target.value;

    if (field === "linkReuniao") {
      this.linkReuniao = value;
    } else {
      this.eventData = { ...this.eventData, [field]: value };
    }
  }

  handleAppointmentTypeChange(event) {
    this.appointmentType = event.target.value;

    // Clear meeting link if not online meeting
    if (this.appointmentType !== "Reunião Online") {
      this.linkReuniao = "";
    }
  }

  handleRoomChange(event) {
    this.salaReuniao = event.target.value;
  }

  handleStatusChange(event) {
    this.statusReuniao = event.target.value;
  }

  handleParticipantChange(event) {
    const field = event.target.name;
    const value = event.target.value;

    switch (field) {
      case "gestorName":
        this.selectedGestorName = value;
        break;
      case "liderComercialName":
        this.selectedLiderComercialName = value;
        break;
      case "sdrName":
        this.selectedSdrName = value;
        break;
    }
  }

  // Opportunity form handlers - following opportunityEditor.js pattern
  handleOpportunityFieldChange(event) {
    const field = event.target.name;
    const value = event.target.value;

    switch (field) {
      case "opportunityName":
        this.opportunityName = value;
        break;
      case "opportunityAmount":
        this.opportunityAmount = value;
        break;
      case "opportunityCloseDate":
        this.opportunityCloseDate = value;
        break;
      case "opportunityStageName":
        this.opportunityStageName = value;
        break;
      case "opportunityDescription":
        this.opportunityDescription = value;
        break;
      case "opportunityProbability":
        this.opportunityProbability = value;
        break;
    }
  }

  handleTypeCardClick(event) {
    const selectedType = event.currentTarget.dataset.type;
    this.opportunityType = selectedType;
    this.opportunityTypeApiValue = selectedType;
  }

  handleRangeSliderChange(event) {
    const numericValue = event.detail.value;
    // Convert numeric value to text representation
    const probabilityMap = {
      0: "zero",
      13: "treze",
      34: "trintaequatro",
      55: "cinquentaecinco",
      89: "oitentaenove",
      100: "cem"
    };
    this.opportunityProbability = probabilityMap[numericValue] || "treze";
  }

  handleTemplateCardClick(event) {
    const templateValue = event.currentTarget.dataset.value;
    this.opportunityProbability = templateValue;

    // Add template description based on probability
    const templates = {
      zero: "Sem chance de concretização identificada.",
      treze: "Contato inicial realizado, cliente demonstrou interesse básico.",
      trintaequatro: "Necessidades identificadas, proposta em elaboração.",
      cinquentaecinco: "Proposta aceita, negociação de detalhes em andamento.",
      oitentaenove: "Fechamento iminente, documentação em andamento.",
      cem: "Negócio fechado e confirmado."
    };

    const template = templates[templateValue];
    if (template) {
      this.opportunityDescription = (this.opportunityDescription || "") +
        (this.opportunityDescription ? "\n\n" : "") + template;
    }
  }

  // Save methods
  async saveEvent() {
    try {
      this.isLoadingEvent = true;

      const eventDataToSave = {
        id: this.eventId,
        subject: this.eventData.subject,
        location: this.eventData.location,
        startDateTime: this.eventData.startDateTime,
        endDateTime: this.eventData.endDateTime,
        isAllDayEvent: this.eventData.isAllDayEvent,
        tipoReuniao: this.appointmentType,
        description: this.eventData.description,
        statusReuniao: this.statusReuniao,
        whoId: this.eventData.whoId,
        whatId: this.eventData.whatId,
        gestorName: this.selectedGestorName,
        liderComercialName: this.selectedLiderComercialName,
        sdrName: this.selectedSdrName,
        linkReuniao: this.linkReuniao,
        salaReuniao: this.salaReuniao,
        faseEvento: this.eventData.faseEvento,
        produtoEvento: this.eventData.produtoEvento
      };

      let result;
      if (this.eventId) {
        result = await updateAppointment({ eventData: eventDataToSave });
      } else {
        result = await createAppointment({ eventData: eventDataToSave });
        if (result.success && result.eventId) {
          this._eventId = result.eventId;
        }
      }

      if (result.success) {
        this.showToast("Sucesso", "Compromisso salvo com sucesso", "success");
        return true;
      } else {
        throw new Error(result.errorMessage || "Erro ao salvar compromisso");
      }

    } catch (error) {
      this.error = "Erro ao salvar compromisso: " + this.reduceErrors(error);
      return false;
    } finally {
      this.isLoadingEvent = false;
    }
  }

  async saveOpportunity() {
    try {
      this.isLoadingOpportunity = true;

      // Use the same parameter structure as opportunityEditor.js
      const result = await updateOpportunity({
        opportunityId: this.opportunityId,
        name: this.opportunityName,
        stageName: this.opportunityStageName,
        amount: this.opportunityAmount,
        closeDate: this.opportunityCloseDate,
        description: this.opportunityDescription,
        type: this.opportunityTypeApiValue,
        probabilidade: this.opportunityProbability || ''
      });

      if (result && result.success) {
        this.showToast("Sucesso", "Oportunidade salva com sucesso", "success");
        return true;
      } else {
        throw new Error(result.error || "Erro ao atualizar oportunidade");
      }

    } catch (error) {
      this.opportunityError = "Erro ao salvar oportunidade: " + this.reduceErrors(error);
      return false;
    } finally {
      this.isLoadingOpportunity = false;
    }
  }

  async saveAll() {
    try {
      this.isLoading = true;

      const eventSaved = await this.saveEvent();
      const opportunitySaved = await this.saveOpportunity();

      if (eventSaved && opportunitySaved) {
        this.showToast("Sucesso", "Compromisso e oportunidade salvos com sucesso", "success");
        this.closeModal();

        // Dispatch event for parent components
        this.dispatchEvent(new CustomEvent("save", {
          detail: {
            eventId: this.eventId,
            opportunityId: this.opportunityId,
            action: this.eventId ? "update" : "create"
          }
        }));
      }

    } catch (error) {
      this.error = "Erro ao salvar: " + this.reduceErrors(error);
    } finally {
      this.isLoading = false;
    }
  }

  // Computed properties for opportunity type cards
  get liquidacaoOtimizadaClass() {
    return `type-card ${this.opportunityType === "Liquidação Otimizada" ? "selected" : ""}`;
  }

  get consultoriaSocietariaClass() {
    return `type-card ${this.opportunityType === "Consultoria Societária" ? "selected" : ""}`;
  }

  get gestaoPatrimonioClass() {
    return `type-card ${this.opportunityType === "Gestão de Patrimônio" ? "selected" : ""}`;
  }

  get opportunityProbabilityNumericValue() {
    const probabilityMap = {
      zero: 0,
      treze: 13,
      trintaequatro: 34,
      cinquentaecinco: 55,
      oitentaenove: 89,
      cem: 100
    };
    return probabilityMap[this.opportunityProbability] || 13;
  }

  // Room options
  get roomOptions() {
    return [
      { label: "Sala Principal", value: "salaPrincipal" },
      { label: "Sala do Gabriel", value: "salaGabriel" },
      { label: "Outra", value: "Outra" }
    ];
  }

  // Appointment type options
  get appointmentTypeOptions() {
    return [
      { label: "Reunião Presencial", value: "Reunião Presencial" },
      { label: "Reunião Online", value: "Reunião Online" },
      { label: "Ligação Telefônica", value: "Ligação Telefônica" }
    ];
  }

  // Computed properties for conditional rendering
  get isPresentialMeeting() {
    return this.appointmentType === "Reunião Presencial";
  }

  get isOnlineMeeting() {
    return this.appointmentType === "Reunião Online";
  }

  get isRoomDisabled() {
    return this.appointmentType !== "Reunião Presencial";
  }

  // Save methods - using the working OpportunityManager.updateOpportunity method
  async handleSave() {
    try {
      this.isLoading = true;

      // Validate required fields
      if (!this.opportunityId) {
        throw new Error("ID da oportunidade não encontrado. Tente fechar e reabrir o modal.");
      }

      // Ensure required fields are populated before save
      if (!this.opportunityName || this.opportunityName.trim() === '') {
        this.opportunityName = `Oportunidade - ${new Date().toLocaleDateString('pt-BR')}`;
      }

      if (!this.opportunityStageName || this.opportunityStageName.trim() === '') {
        // Use the first stage option as default, or "Reunião Agendada" as fallback
        const defaultStage = this.stageOptions && this.stageOptions.length > 0
          ? this.stageOptions[0].value
          : "Reunião Agendada";
        this.opportunityStageName = defaultStage;
      }

      console.log('Saving opportunity with ID:', this.opportunityId);
      console.log('Opportunity data (with required field validation):', {
        name: this.opportunityName,
        stageName: this.opportunityStageName,
        amount: this.opportunityAmount,
        closeDate: this.opportunityCloseDate,
        description: this.opportunityDescription,
        type: this.opportunityTypeApiValue,
        probabilidade: this.opportunityProbability
      });

      // Use the same method as opportunityEditor.js that works
      const result = await updateOpportunity({
        opportunityId: this.opportunityId,
        name: this.opportunityName,
        stageName: this.opportunityStageName,
        amount: this.opportunityAmount,
        closeDate: this.opportunityCloseDate,
        description: this.opportunityDescription,
        type: this.opportunityTypeApiValue,
        probabilidade: this.opportunityProbability || ''
      });

      console.log('Save result:', result);

      // Handle response like opportunityEditor.js does
      if (result && result.success) {
        this.showToast("Sucesso", "Compromisso e oportunidade salvos com sucesso", "success");

        // Emit save event for parent components
        this.dispatchEvent(new CustomEvent("save", {
          detail: {
            eventId: this.eventId,
            opportunityId: this.opportunityId,
            leadId: this.leadId,
            action: "update"
          }
        }));

        this.closeModal();
      } else {
        throw new Error(result.error || "Erro ao atualizar oportunidade");
      }

    } catch (error) {
      console.error('Save error:', error);
      this.showToast("Erro", "Erro ao salvar: " + this.reduceErrors(error), "error");
    } finally {
      this.isLoading = false;
    }
  }
}

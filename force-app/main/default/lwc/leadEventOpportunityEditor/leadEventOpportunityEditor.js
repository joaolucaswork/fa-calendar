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

// Apex methods from opportunityEditor
import getOpportunityDetails from "@salesforce/apex/OpportunityManager.getOpportunityDetails";
import updateOpportunity from "@salesforce/apex/OpportunityManager.updateOpportunity";

// Apex methods for Lead Event system
import updateLeadOpportunityFields from "@salesforce/apex/LeadEventController.updateLeadOpportunityFields";
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
      return `${this.leadInfo.Name} - Compromisso e Oportunidade`;
    }
    return "Editar Compromisso e Oportunidade";
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
    // Set active class on event tab by default
    const eventTab = this.template.querySelector('[data-tab="event"]');
    const eventContent = this.template.querySelector('#event-tab');

    if (eventTab) {
      eventTab.classList.add('active');
    }
    if (eventContent) {
      eventContent.classList.add('show');
    }
  }

  // Initialize component data
  async initializeComponent() {
    try {
      this.isLoading = true;
      
      // Initialize event data with defaults
      this.initializeEventData();
      
      // Load users and picklist options
      await Promise.all([
        this.loadAllUsers(),
        this.loadStatusOptions(),
        this.loadOpportunityPicklists()
      ]);

      // Load existing data if IDs are provided
      if (this.eventId || this.leadId) {
        await this.loadEventData();
      }
      
      if (this.opportunityId) {
        await this.loadOpportunityData();
      }

    } catch (error) {
      this.error = "Erro ao inicializar componente: " + this.reduceErrors(error);
    } finally {
      this.isLoading = false;
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
    // Set stage options (from appointmentEditor logic)
    this.stageOptions = [
      { label: "Primeira Reunião", value: "Primeira Reunião" },
      { label: "Devolutiva", value: "Devolutiva" },
      { label: "Negociação", value: "Negociação" },
      { label: "Cliente", value: "Cliente" }
    ];

    // Set type options (from opportunityEditor)
    this.typeOptions = [
      { label: "Liquidação Otimizada", value: "Liquidação Otimizada" },
      { label: "Consultoria Societária", value: "Consultoria Societária" },
      { label: "Gestão de Patrimônio", value: "Gestão de Patrimônio" }
    ];
  }

  // Load event data
  async loadEventData() {
    if (!this.eventId && !this.leadId) return;

    try {
      this.isLoadingEvent = true;
      
      let result;
      if (this.eventId) {
        // Load existing event
        result = await getAppointmentDetails({ eventId: this.eventId });
      } else if (this.leadId) {
        // Load lead event details (for automation-created events)
        result = await getLeadEventDetails({ leadId: this.leadId });
        if (result.eventId) {
          this._eventId = result.eventId;
          this.opportunityId = result.opportunityId;
        }
      }

      if (result && result.success) {
        this.populateEventData(result);
      }

    } catch (error) {
      this.error = "Erro ao carregar dados do evento: " + this.reduceErrors(error);
    } finally {
      this.isLoadingEvent = false;
    }
  }

  // Load opportunity data
  async loadOpportunityData() {
    if (!this.opportunityId) return;

    try {
      this.isLoadingOpportunity = true;
      
      const result = await getOpportunityDetails({ opportunityId: this.opportunityId });
      
      if (result) {
        this.populateOpportunityData(result);
      }

    } catch (error) {
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
    this.opportunityDetails = result;
    this.opportunityName = result.Name || "";
    this.opportunityAmount = result.Amount || null;
    this.opportunityCloseDate = result.CloseDate || null;
    this.opportunityStageName = result.StageName || "Primeira Reunião";
    this.opportunityDescription = result.Description || "";
    this.opportunityType = result.Tipo_de_produto__c || "";
    this.opportunityTypeApiValue = result.Tipo_de_produto__c || "";
    this.opportunityProbability = result.Probabilidade_da_Oportunidade__c || "";
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
    this.activeTab = event.target.dataset.tab;

    // Update active class on tabs
    const tabs = this.template.querySelectorAll('.slds-tabs_default__link');
    tabs.forEach(tab => {
      tab.classList.remove('active');
    });
    event.target.classList.add('active');

    // Update tab content visibility
    const tabContents = this.template.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
      content.classList.remove('show');
    });

    const activeContent = this.template.querySelector(`#${this.activeTab}-tab`);
    if (activeContent) {
      activeContent.classList.add('show');
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

  // Opportunity form handlers
  handleOpportunityFieldChange(event) {
    const field = event.target.name;
    const value = event.target.value;

    switch (field) {
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

      const opportunityData = {
        opportunityId: this.opportunityId,
        name: this.opportunityName,
        stageName: this.opportunityStageName,
        amount: this.opportunityAmount,
        closeDate: this.opportunityCloseDate,
        description: this.opportunityDescription,
        type: this.opportunityTypeApiValue,
        probabilidade: this.opportunityProbability
      };

      const result = await updateOpportunity(opportunityData);

      if (result) {
        this.showToast("Sucesso", "Oportunidade salva com sucesso", "success");
        return true;
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

  // Save methods - using existing Lead Event Management system
  async handleSave() {
    try {
      this.isLoading = true;

      // Use the existing Lead Event Management system
      // Update lead opportunity fields with the form data
      const leadOpportunityData = {
        leadId: this.leadId,
        opportunityAmount: this.opportunityAmount,
        opportunityCloseDate: this.opportunityCloseDate,
        opportunityStageName: this.opportunityStageName,
        opportunityDescription: this.opportunityDescription,
        opportunityType: this.opportunityTypeApiValue,
        opportunityProbability: this.opportunityProbability,
        eventSubject: this.eventData.subject,
        eventStartDateTime: this.eventData.startDateTime,
        eventEndDateTime: this.eventData.endDateTime,
        eventDescription: this.eventData.description,
        appointmentType: this.appointmentType,
        salaReuniao: this.salaReuniao,
        linkReuniao: this.linkReuniao,
        statusReuniao: this.statusReuniao,
        gestorName: this.selectedGestorName,
        liderComercialName: this.selectedLiderComercialName,
        sdrName: this.selectedSdrName
      };

      const result = await updateLeadOpportunityFields(leadOpportunityData);

      if (result.success) {
        this.showToast("Sucesso", "Compromisso e oportunidade salvos com sucesso", "success");

        // Emit save event for parent components
        this.dispatchEvent(new CustomEvent("save", {
          detail: {
            eventId: result.eventId || this.eventId,
            opportunityId: result.opportunityId || this.opportunityId,
            leadId: this.leadId,
            action: "update"
          }
        }));

        this.closeModal();
      } else {
        throw new Error(result.error || "Erro ao salvar dados");
      }

    } catch (error) {
      this.showToast("Erro", "Erro ao salvar: " + this.reduceErrors(error), "error");
    } finally {
      this.isLoading = false;
    }
  }
}

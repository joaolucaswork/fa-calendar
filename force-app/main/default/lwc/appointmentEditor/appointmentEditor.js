import { LightningElement, api, track, wire } from "lwc";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import { NavigationMixin } from "lightning/navigation";
import { getObjectInfo, getPicklistValues } from "lightning/uiObjectInfoApi";
import { FlowNavigationNextEvent } from "lightning/flowSupport";

// Schema imports for Event object
import EVENT_OBJECT from "@salesforce/schema/Event";
import TYPE_FIELD from "@salesforce/schema/Event.Type";

// Apex methods
import getAppointmentDetails from "@salesforce/apex/AppointmentController.getAppointmentDetails";
import createAppointment from "@salesforce/apex/AppointmentController.createAppointment";
import updateAppointment from "@salesforce/apex/AppointmentController.updateAppointment";
import searchUsers from "@salesforce/apex/AppointmentController.searchUsers";
import searchContacts from "@salesforce/apex/AppointmentController.searchContacts";
import searchOpportunities from "@salesforce/apex/AppointmentController.searchOpportunities";
import updateLeadOpportunityFields from "@salesforce/apex/LeadEventController.updateLeadOpportunityFields";
import getLeadEventDetails from "@salesforce/apex/LeadEventController.getLeadEventDetails";
import validarDisponibilidadeSala from "@salesforce/apex/ReuniaoController.validarDisponibilidadeSala";
import getStatusPicklistValues from "@salesforce/apex/CalendarioReinoController.getStatusPicklistValues";

/**
 * Componente modal para edição ou criação de compromissos futuros
 * Permite a criação de compromissos com diferentes tipos e opção de reunião online
 * @author Reino Capital
 * @last-modified 2025-05-14
 */
export default class AppointmentEditor extends NavigationMixin(
  LightningElement
) {
  @api recordId; // ID do registro associado (lead, contato, etc)
  @api whoId; // ID de quem (lead, contato) para pré-preencher
  @api whatId; // ID do que (oportunidade, conta) para pré-preencher
  @api suggestionData; // AI suggestion data from calendar

  @track eventData = {};
  @track isLoading = false;
  @track error = null;
  @track appointmentType = ""; // Start with no type selected
  @track salaReuniao = "salaPrincipal"; // Valor padrão: Sala Principal
  @track linkReuniao = ""; // Link da reunião (apenas para reuniões online) - from reuniaoModal
  @track isAutomatedEvent = false; // Indicates if event was created by automation

  // Optional participants - storing names as text
  @track selectedGestorName = "";
  @track selectedLiderComercialName = "";
  @track selectedSdrName = "";
  @track participantsValidationError = ""; // Kept for backward compatibility

  // Meeting status picklist - stores the actual picklist value
  @track statusReuniao = null;

  // User options for dropdowns
  @track userOptions = [];
  @track isLoadingUsers = false;

  // Status picklist options
  @track statusOptions = [];

  // Availability dashboard
  @track showAvailabilityDashboard = false;
  @track selectedParticipants = [];

  // Contact, Opportunity, and Lead information - similar to reuniaoModal
  @track contactInfo = {};
  @track opportunityInfo = {};
  @track leadInfo = {};
  @track hasContactInfo = false;
  @track hasOpportunityInfo = false;
  @track hasLeadInfo = false;

  // Lookup field display names
  @track selectedContactName = "";
  @track selectedOpportunityName = "";

  // Store previous values for cancel functionality
  @track previousContactName = "";
  @track previousWhoId = "";

  // Search results and dropdown management
  @track contactSearchResults = [];
  @track opportunitySearchResults = [];
  @track showContactDropdown = false;
  @track showOpportunityDropdown = false;
  @track isSearchingContacts = false;
  @track isSearchingOpportunities = false;
  @track searchLeadsOnly = false; // Sempre false - opção de buscar apenas leads foi removida

  // Edit state management for contact/lead selection
  @track isEditingContact = false;

  // Lead opportunity management properties (internal storage like leadEventEditor)
  _leadOpportunityStage = "Primeira Reunião";
  _leadOpportunityProbability = "";
  _leadOpportunityCloseDate = "";
  _leadOpportunityType = "";
  _leadOpportunityAmount = "";
  @track leadOpportunityId = ""; // Store the opportunity ID for updates

  // Force re-render control (like leadEventEditor)
  @track renderKey = 0;

  // Tab management properties
  @track activeTab = "event"; // "event" or "opportunity"

  // Lead opportunity picklist options (exactly like leadEventEditor)
  stageOptions = [
    { label: "Primeira Reunião", value: "Primeira Reunião" },
    { label: "Devolutiva", value: "Devolutiva" },
    { label: "Negociação", value: "Negociação" },
    { label: "Cliente", value: "Cliente" }
  ];

  probabilityOptions = [
    { label: "0%", value: "zero" },
    { label: "13%", value: "treze" },
    { label: "34%", value: "trintaequatro" },
    { label: "55%", value: "cinquentaecinco" },
    { label: "89%", value: "oitentaenove" },
    { label: "100%", value: "cem" }
  ];

  productOptions = [
    { label: "Liquidação Otimizada", value: "Liquidação Otimizada" },
    { label: "Consultoria Societária", value: "Consultoria Societária" },
    { label: "Gestão de Patrimônio", value: "Gestão de Patrimônio" }
  ];

  // Options for Lead opportunity management (from leadEventEditor)
  stageOptions = [
    { label: "Reunião Agendada", value: "Reunião Agendada" },
    { label: "Primeira Reunião", value: "Primeira Reunião" },
    { label: "Devolutiva", value: "Devolutiva" },
    { label: "Análise Contratual", value: "Análise Contratual" },
    { label: "Convertido", value: "Convertido" },
    { label: "Não evoluiu", value: "Não evoluiu" }
  ];

  probabilityOptions = [
    { label: "0%", value: "zero" },
    { label: "13%", value: "treze" },
    { label: "34%", value: "trintaequatro" },
    { label: "55%", value: "cinquentaecinco" },
    { label: "89%", value: "oitentaenove" },
    { label: "100%", value: "cem" }
  ];

  productOptions = [
    { label: "Liquidação Otimizada", value: "Liquidação Otimizada" },
    { label: "Consultoria Societária", value: "Consultoria Societária" },
    { label: "Gestão de Patrimônio", value: "Gestão de Patrimônio" }
  ];

  // Para o objeto Event
  @wire(getObjectInfo, { objectApiName: EVENT_OBJECT })
  eventObjectInfo;

  // Para os valores do campo Type
  @wire(getPicklistValues, {
    recordTypeId: "$eventObjectInfo.data.defaultRecordTypeId",
    fieldApiName: TYPE_FIELD
  })
  typePicklistValues;

  // Options for Fase Evento (updated to match current picklist values)
  faseEventoOptions = [
    { label: "Primeira Reunião", value: "Primeira Reunião" },
    { label: "Devolutiva", value: "Devolutiva" },
    { label: "Negociação", value: "Negociação" },
    { label: "Cliente", value: "Cliente" }
  ];

  // Options for Produto Evento (based on leadEventEditor productOptions)
  produtoEventoOptions = [
    { label: "Liquidação Otimizada", value: "Liquidação Otimizada" },
    { label: "Consultoria Societária", value: "Consultoria Societária" },
    { label: "Gestão de Patrimônio", value: "Gestão de Patrimônio" }
  ];

  // Helper method to validate and convert old product values to new ones
  validateAndConvertProductValue(value) {
    if (!value) return "";

    // Map old values to new valid values
    const productValueMapping = {
      "Lead em prospecção": "Liquidação Otimizada", // Convert old value to default
      "Primeiro Contato": "", // Clear invalid values
      "Análise Contratual": "",
      Convertido: "",
      "Não evoluiu": ""
    };

    // If it's an old invalid value, convert it
    if (productValueMapping.hasOwnProperty(value)) {
      console.log(
        `Converting old product value "${value}" to "${productValueMapping[value]}"`
      );
      return productValueMapping[value];
    }

    // Check if it's a valid current value
    const validValues = this.produtoEventoOptions.map((option) => option.value);
    if (validValues.includes(value)) {
      return value;
    }

    // If it's not a valid value, clear it
    console.log(`Clearing invalid product value: "${value}"`);
    return "";
  }

  // Getter para título do modal
  get modalTitle() {
    return this.eventId ? "Editar Compromisso" : "Novo Compromisso";
  }

  // Getter para subtítulo do modal
  get modalSubtitle() {
    return this.eventId
      ? "Edite os detalhes do compromisso"
      : "Preencha os detalhes para o novo compromisso";
  }

  // Getters for formatted opportunity information
  get formattedOpportunityAmount() {
    if (!this.opportunityInfo.amount) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(this.opportunityInfo.amount);
  }

  get formattedOpportunityProbability() {
    const probabilityMap = {
      zero: 0,
      treze: 13,
      trintaequatro: 34,
      cinquentaecinco: 55,
      oitentaenove: 89,
      cem: 100
    };
    return probabilityMap[this.opportunityInfo.probability] || 0;
  }

  // Getters para as classes dos cards de tipo - baseado no reuniaoModal
  get reuniaoPresencialClass() {
    return this.appointmentType === "Reunião Presencial"
      ? "card-item card-selected"
      : "card-item";
  }

  get reuniaoOnlineClass() {
    return this.appointmentType === "Reunião Online"
      ? "card-item card-selected"
      : "card-item";
  }

  get ligacaoTelefonicaClass() {
    return this.appointmentType === "Ligação Telefônica"
      ? "card-item card-selected"
      : "card-item";
  }

  // Getters para as classes dos cards de sala de reunião - baseado no reuniaoModal
  get salaPrincipalCardClass() {
    return this.salaReuniao === "salaPrincipal"
      ? "card-item card-selected"
      : "card-item";
  }

  get salaGabrielCardClass() {
    return this.salaReuniao === "salaGabriel"
      ? "card-item card-selected"
      : "card-item";
  }

  get outraSalaCardClass() {
    return this.salaReuniao === "Outra"
      ? "card-item card-selected"
      : "card-item";
  }

  // Retorna verdadeiro se a sala selecionada for "Outra"
  get isOutraSala() {
    return this.salaReuniao === "Outra";
  }

  // Show date/time fields when appointment type is selected OR when we have pre-selected dates from calendar OR suggestion data
  get showDateTimeFields() {
    const hasAppointmentType = this.appointmentType !== "";
    const hasSelectedDates = this.selectedStartDate && this.selectedEndDate;
    const hasSuggestionData =
      this.suggestionData && this.suggestionData.intelligentSubject;
    const shouldShow =
      hasAppointmentType || hasSelectedDates || hasSuggestionData;

    // console.log("📝 AppointmentEditor: showDateTimeFields getter called");
    // console.log("   appointmentType:", this.appointmentType);
    // console.log("   hasAppointmentType:", hasAppointmentType);
    // console.log("   selectedStartDate:", this.selectedStartDate);
    // console.log("   selectedEndDate:", this.selectedEndDate);
    // console.log("   hasSelectedDates:", hasSelectedDates);
    // console.log("   hasSuggestionData:", hasSuggestionData);
    // console.log("   shouldShow:", shouldShow);

    return shouldShow;
  }

  // Getter para mostrar campos de lookup - sempre visível para novos eventos
  get showLookupFields() {
    return true; // Always show lookup fields for WhatId and WhoId
  }

  // Getters for edit workflow control
  get showContactSearchField() {
    // For automated events, only show search if explicitly editing and not restricted
    if (this.isAutomatedEvent && this.hasLeadInfo) {
      return this.isEditingContact && !this.isLeadEditingRestricted;
    }
    // For manual events, show search when no contact/lead selected OR actively editing
    return !this.hasContactOrLeadSelected || this.isEditingContact;
  }

  get showContactLeadInfo() {
    // Show info when: contact/lead is selected AND not actively editing
    return this.hasContactOrLeadSelected && !this.isEditingContact;
  }

  get hasContactOrLeadSelected() {
    // Check if we have any contact, lead, or opportunity selected
    return this.hasContactInfo || this.hasLeadInfo || this.hasOpportunityInfo;
  }



  // Getters for selected contact/lead display
  get selectedContactIcon() {
    if (this.hasLeadInfo) {
      return "standard:lead";
    } else if (this.hasContactInfo) {
      return "standard:contact";
    }
    return "standard:contact"; // Default
  }

  get selectedContactType() {
    if (this.hasLeadInfo) {
      return this.isAutomatedEvent ? "Lead Associado" : "Lead";
    } else if (this.hasContactInfo) {
      return "Contato";
    }
    return ""; // Default
  }

  // Check if event was created by automation
  get isAutomatedEvent() {
    if (!this.eventData || !this.eventData.subject) return false;

    // Check for automation markers
    const hasAutomatedSubject = this.eventData.subject.includes('Lead:') &&
                               this.eventData.subject.includes('- Primeiro Contato');
    const hasAutomatedDescription = this.eventData.description &&
                                   (this.eventData.description.includes('[OPPORTUNITY_LINKED:true]') ||
                                    this.eventData.description.includes('[DUAL_RELATIONSHIP:Lead+Opportunity]'));

    return hasAutomatedSubject || hasAutomatedDescription;
  }

  // Control if lead editing is restricted for automated events
  get isLeadEditingRestricted() {
    return this.isAutomatedEvent && this.hasLeadInfo;
  }

  get contactFieldLabel() {
    if (this.isAutomatedEvent && this.hasLeadInfo) {
      return "Lead Associado";
    } else if (this.hasLeadInfo) {
      return "Lead";
    }
    return "Contato/Lead";
  }

  get contactFieldPlaceholder() {
    if (this.isAutomatedEvent && this.hasLeadInfo) {
      return "Lead associado pela automação";
    } else if (this.hasLeadInfo) {
      return "Digite para buscar leads...";
    }
    return "Digite para buscar contatos ou leads...";
  }

  // CSS class for selected contact display
  get selectedContactDisplayClass() {
    let baseClass = "selected-contact-display";
    if (this.isAutomatedEvent) {
      baseClass += " selected-contact-display--automated";
    }
    return baseClass;
  }

  // Edit button title based on automation context
  get editButtonTitle() {
    if (this.isAutomatedEvent && this.hasLeadInfo) {
      return "Alterar lead associado (criado automaticamente)";
    }
    return "Editar seleção";
  }

  // Edit button alt text
  get editButtonAltText() {
    if (this.isAutomatedEvent && this.hasLeadInfo) {
      return "Alterar";
    }
    return "Editar";
  }

  // Unified section properties
  get unifiedSectionIcon() {
    if (this.hasLeadInfo) {
      return "standard:lead";
    } else if (this.hasContactInfo) {
      return "standard:contact";
    }
    return "standard:contact";
  }

  get unifiedSectionTitle() {
    if (this.hasLeadInfo) {
      return this.isAutomatedEvent ? "Lead Associado" : "Lead";
    } else if (this.hasContactInfo) {
      return "Contato";
    }
    return "Contato/Lead";
  }

  // Unified contact card class
  get unifiedContactCardClass() {
    let baseClass = "unified-contact-card";
    if (this.isAutomatedEvent) {
      baseClass += " unified-contact-card--automated";
    }
    if (this.hasLeadInfo) {
      baseClass += " unified-contact-card--lead";
    } else if (this.hasContactInfo) {
      baseClass += " unified-contact-card--contact";
    }
    return baseClass;
  }

  // Debug getters
  get debugContactDropdown() {
    // console.log("Debug: showContactDropdown =", this.showContactDropdown);
    // console.log("Debug: contactSearchResults =", this.contactSearchResults);
    // console.log(
    //   "Debug: contactSearchResults.length =",
    //   this.contactSearchResults?.length
    // );
    return this.showContactDropdown;
  }

  get debugOpportunityDropdown() {
    // console.log(
    //   "Debug: showOpportunityDropdown =",
    //   this.showOpportunityDropdown
    // );
    // console.log(
    //   "Debug: opportunitySearchResults =",
    //   this.opportunitySearchResults
    // );
    // console.log(
    //   "Debug: opportunitySearchResults.length =",
    //   this.opportunitySearchResults?.length
    // );
    return "";
  }

  // Check if meeting type is online - copied from reuniaoModal
  get isOnlineMeeting() {
    return this.appointmentType === "Reunião Online";
  }

  // Decide se mostra as opções de reunião online (keeping for backward compatibility)
  get showMeetingOptions() {
    return (
      this.appointmentType === "Reunião Online" && !this.eventData.reuniaoCriada
    );
  }

  // Getters for validation and display
  get hasSelectedParticipants() {
    return (
      this.selectedGestorName ||
      this.selectedLiderComercialName ||
      this.selectedSdrName
    );
  }

  get participantCount() {
    let count = 0;
    if (this.selectedGestorName) count++;
    if (this.selectedLiderComercialName) count++;
    if (this.selectedSdrName) count++;
    return count;
  }

  // Dynamic CSS classes for dropdown visual feedback
  get gestorDropdownClass() {
    let baseClass = "participant-picker enhanced-dropdown";
    if (this.selectedGestorName) {
      baseClass += " has-selection";
    }
    return baseClass;
  }

  get liderComercialDropdownClass() {
    let baseClass = "participant-picker enhanced-dropdown";
    if (this.selectedLiderComercialName) {
      baseClass += " has-selection";
    }
    return baseClass;
  }

  get sdrDropdownClass() {
    let baseClass = "participant-picker enhanced-dropdown";
    if (this.selectedSdrName) {
      baseClass += " has-selection";
    }
    return baseClass;
  }



  // leadCardClass removed - Lead card now uses direct CSS classes for full width

  // Getters for contact information display - similar to reuniaoModal
  get contactName() {
    return this.contactInfo.name || "";
  }

  get contactTitle() {
    return this.contactInfo.title || "";
  }

  get contactEmail() {
    return this.contactInfo.email || "";
  }

  get contactPhone() {
    return this.contactInfo.phone || "";
  }

  get contactCompany() {
    return this.contactInfo.company || this.contactInfo.accountName || "";
  }

  // Getters for opportunity information display - similar to reuniaoModal
  get opportunityName() {
    return this.opportunityInfo.name || "";
  }

  get opportunityAmount() {
    if (this.opportunityInfo.amount) {
      return this.formatCurrency(this.opportunityInfo.amount);
    }
    return "";
  }

  get opportunityType() {
    if (this.opportunityInfo.Tipo_de_produto__c) {
      return this.getOpportunityTypeLabel(this.opportunityInfo.Tipo_de_produto__c);
    }
    return "";
  }

  get opportunityProbability() {
    if (this.opportunityInfo.probability) {
      return this.getProbabilityPercentage(this.opportunityInfo.probability);
    }
    return "";
  }

  get opportunityStage() {
    return this.opportunityInfo.stageName || "";
  }

  get opportunityCloseDate() {
    if (this.opportunityInfo.closeDate) {
      return new Date(this.opportunityInfo.closeDate).toLocaleDateString(
        "pt-BR"
      );
    }
    return "";
  }

  get accountName() {
    return this.opportunityInfo.accountName || "";
  }

  // Getters for lead information display
  get leadName() {
    return this.leadInfo.name || "";
  }

  get leadCompany() {
    return this.leadInfo.company || "";
  }

  get leadEmail() {
    return this.leadInfo.email || "";
  }

  get leadPhone() {
    return this.leadInfo.phone || "";
  }

  get leadStatus() {
    return this.leadInfo.status || "";
  }

  // Getter to show Lead opportunity management section
  get showLeadOpportunitySection() {
    return this.hasLeadInfo && this.eventId; // Only show for existing events with Lead
  }

  // Tab management getters
  get isEventTabActive() {
    return this.activeTab === "event";
  }

  get isOpportunityTabActive() {
    return this.activeTab === "opportunity";
  }

  get eventTabClass() {
    return this.activeTab === "event"
      ? "slds-tabs_default__link slds-is-active"
      : "slds-tabs_default__link";
  }

  get opportunityTabClass() {
    return this.activeTab === "opportunity"
      ? "slds-tabs_default__link slds-is-active"
      : "slds-tabs_default__link";
  }

  get eventTabContentClass() {
    return this.activeTab === "event"
      ? "slds-tabs_default__content slds-show"
      : "slds-tabs_default__content slds-hide";
  }

  get opportunityTabContentClass() {
    return this.activeTab === "opportunity"
      ? "slds-tabs_default__content slds-show"
      : "slds-tabs_default__content slds-hide";
  }

  // Getter to show Lead opportunity data
  get hasLeadOpportunityData() {
    return (
      this.hasLeadInfo ||
      this._leadOpportunityStage ||
      this._leadOpportunityProbability ||
      this._leadOpportunityCloseDate ||
      this._leadOpportunityType ||
      this._leadOpportunityAmount
    );
  }

  // Lead information getters for HTML display (removed duplicates)

  // Lead opportunity getters for reactive properties (like leadEventEditor)
  get leadOpportunityStage() {
    return this._leadOpportunityStage;
  }

  get leadOpportunityProbability() {
    return this._leadOpportunityProbability;
  }

  get leadOpportunityCloseDate() {
    return this._leadOpportunityCloseDate;
  }

  get leadOpportunityType() {
    return this._leadOpportunityType;
  }

  get leadOpportunityAmount() {
    return this._leadOpportunityAmount;
  }

  // Getter for probability color class - similar to reuniaoModal
  get probabilityColorClass() {
    const apiValue = this.opportunityInfo.probability;
    if (!apiValue) return "";

    const probabilityMap = {
      zero: 0,
      treze: 13,
      trintaequatro: 34,
      cinquentaecinco: 55,
      oitentaenove: 89,
      cem: 100
    };

    const numericValue = probabilityMap[apiValue] || 0;

    if (numericValue <= 0) return "probability-0";
    if (numericValue <= 13) return "probability-13";
    if (numericValue <= 34) return "probability-34";
    if (numericValue <= 55) return "probability-55";
    if (numericValue <= 89) return "probability-89";
    return "probability-100";
  }

  // Hook do ciclo de vida
  connectedCallback() {
    /*
    console.log("AppointmentEditor: connectedCallback called", {
      whoId: this.whoId,
      whatId: this.whatId,
      eventId: this.eventId
    });
    */

    // Inicializar os dados do evento com valores padrão
    this.initializeEventData();

    // Load users for dropdowns
    this.loadAllUsers();

    // Load status picklist options
    this.loadStatusOptions();

    // Load event data based on current properties
    this.loadEventData();
  }

  // Watch for changes in eventId property
  @api
  get eventId() {
    return this._eventId;
  }
  set eventId(value) {
    const oldValue = this._eventId;
    this._eventId = value;

    // If component is already connected and eventId changed, reload data
    if (this.isConnected && oldValue !== value) {
      this.loadEventData();
    }
  }
  _eventId;

  // Watch for changes in selectedEventData property
  @api
  get selectedEventData() {
    return this._selectedEventData;
  }
  set selectedEventData(value) {
    const oldValue = this._selectedEventData;
    this._selectedEventData = value;

    // If component is already connected and selectedEventData changed, reload data
    if (this.isConnected && oldValue !== value) {
      this.loadEventData();
    }
  }
  _selectedEventData;

  // Watch for changes in suggestionData property
  get suggestionData() {
    return this._suggestionData;
  }
  set suggestionData(value) {
    const oldValue = this._suggestionData;
    this._suggestionData = value;

    // If component is already connected and suggestionData changed, process it
    if (this.isConnected && oldValue !== value && value) {
      this.processSuggestionData();
    }
  }
  _suggestionData;

  // Watch for changes in selectedStartDate property
  @api
  get selectedStartDate() {
    return this._selectedStartDate;
  }
  set selectedStartDate(value) {
    const oldValue = this._selectedStartDate;
    this._selectedStartDate = value;

    // console.log("📝 AppointmentEditor: selectedStartDate changed");
    // console.log("   Old Value:", oldValue);
    // console.log("   New Value:", value);

    // If component is already connected and selectedStartDate changed, reload data
    // Only reload if we have both start and end dates to avoid multiple reloads
    if (
      this.isConnected &&
      oldValue !== value &&
      this.selectedStartDate &&
      this.selectedEndDate
    ) {
      this.loadEventData();
    }
  }
  _selectedStartDate;

  // Watch for changes in selectedEndDate property
  @api
  get selectedEndDate() {
    return this._selectedEndDate;
  }
  set selectedEndDate(value) {
    const oldValue = this._selectedEndDate;
    this._selectedEndDate = value;

    // console.log("📝 AppointmentEditor: selectedEndDate changed");
    // console.log("   Old Value:", oldValue);
    // console.log("   New Value:", value);

    // If component is already connected and selectedEndDate changed, reload data
    // Only reload if we have both start and end dates to avoid multiple reloads
    if (
      this.isConnected &&
      oldValue !== value &&
      this.selectedStartDate &&
      this.selectedEndDate
    ) {
      this.loadEventData();
    }
  }
  _selectedEndDate;

  // Watch for changes in showModal property to reset state when modal opens
  @api
  get showModal() {
    return this._showModal;
  }
  set showModal(value) {
    const oldValue = this._showModal;
    this._showModal = value;

    // console.log("📝 AppointmentEditor: showModal changed");
    // console.log("   Old Value:", oldValue);
    // console.log("   New Value:", value);
    // console.log("   selectedStartDate:", this.selectedStartDate);
    // console.log("   selectedEndDate:", this.selectedEndDate);
    // console.log("   isConnected:", this.isConnected);

    // If modal is being opened, ensure we load the correct data
    if (this.isConnected && !oldValue && value) {
      // Only reset state for new events, not when editing existing events
      if (!this.eventId && !this.selectedEventData) {
        this.resetComponentState();
      }
      this.loadEventData();
    }
  }
  _showModal = false;

  // Reset component state when opening modal
  resetComponentState() {
    // console.log("📝 AppointmentEditor: resetComponentState called");
    // console.log("   selectedStartDate before reset:", this.selectedStartDate);
    // console.log("   selectedEndDate before reset:", this.selectedEndDate);

    this.error = null;
    this.isLoading = false;
    this.participantsValidationError = "";
    this.selectedGestorName = "";
    this.selectedLiderComercialName = "";
    this.selectedSdrName = "";
    this.selectedParticipants = [];
    this.showAvailabilityDashboard = false;
    this.salaReuniao = "salaPrincipal"; // Reset to default room
    this.linkReuniao = ""; // Reset meeting link

    // Always reset appointment type to force user selection
    this.appointmentType = ""; // Reset appointment type to force selection

    // Reset contact and opportunity information
    this.contactInfo = {};
    this.opportunityInfo = {};
    this.hasContactInfo = false;
    this.hasOpportunityInfo = false;
    this.selectedContactName = "";
    this.selectedOpportunityName = "";

    // Reset search results and dropdowns
    this.contactSearchResults = [];
    this.opportunitySearchResults = [];
    this.showContactDropdown = false;
    this.showOpportunityDropdown = false;
    this.isSearchingContacts = false;
    this.isSearchingOpportunities = false;

    // console.log("📝 AppointmentEditor: resetComponentState completed");
    // console.log("   Final appointmentType:", this.appointmentType);

    // Note: Don't reset suggestionData here as it's passed from parent
    // and should persist during modal lifecycle
  }

  // Load all users for dropdown options
  loadAllUsers() {
    this.isLoadingUsers = true;

    // Load all active users (no search term needed)
    searchUsers({ searchTerm: "", maxResults: 100 })
      .then((result) => {
        this.userOptions = result.map((user) => ({
          label: `${user.name} (${user.email})`,
          value: user.name
        }));
      })
      .catch((error) => {
        console.error("Error loading users:", error);
        this.showToast("Erro", "Erro ao carregar usuários", "error");
        this.userOptions = [];
      })
      .finally(() => {
        this.isLoadingUsers = false;
      });
  }

  // Load status picklist options
  loadStatusOptions() {
    getStatusPicklistValues()
      .then((result) => {
        // Add a "Não definido" option at the beginning
        this.statusOptions = [
          { label: "Não definido", value: null },
          ...result
        ];
        // console.log("Status options loaded:", this.statusOptions);
      })
      .catch((error) => {
        console.error("Error loading status options:", error);
        // Fallback to basic options if API fails
        this.statusOptions = [
          { label: "Não definido", value: null },
          { label: "Reunião aconteceu", value: "reuniaoAconteceu" },
          { label: "Reunião não aconteceu", value: "reuniaoNAconteceu" },
          { label: "Cancelado", value: "Cancelado" },
          { label: "Adiado", value: "Adiado" },
          { label: "Reagendado", value: "Reagendado" }
        ];
      });
  }

  // Centralized method to load event data
  loadEventData() {
    // console.log("📝 AppointmentEditor: loadEventData called");
    // console.log("   eventId:", this.eventId);
    // console.log("   selectedStartDate:", this.selectedStartDate);
    // console.log("   selectedEndDate:", this.selectedEndDate);
    // console.log("   suggestionData:", this.suggestionData);
    // console.log("   appointmentType:", this.appointmentType);

    // Se temos um ID de evento, carregar os dados existentes
    if (this.eventId) {
      // console.log("📝 AppointmentEditor: Loading existing event data");
      // Reset state first for existing events
      this.initializeEventData();

      // Check if we have selectedEventData for faster loading
      if (this.selectedEventData) {
        this.loadEventDataFromCalendar();
      } else {
        this.fetchEventDetails();
      }
    } else {
      // console.log("📝 AppointmentEditor: Creating new event");
      // For new events, preserve selected dates if available
      if (this.selectedStartDate && this.selectedEndDate) {
        // console.log(
        //   "📝 AppointmentEditor: Pre-selected dates found - using initializeEventDataWithSelectedDates"
        // );
        // Initialize with default data but preserve selected dates
        this.initializeEventDataWithSelectedDates();
      } else {
        // console.log(
        //   "📝 AppointmentEditor: No pre-selected dates - using initializeEventData"
        // );
        // Reset state first for new events without pre-selected dates
        this.initializeEventData();
      }

      // Process suggestion data if available (this will override dates and add subject)
      if (this.suggestionData) {
        // console.log("📝 AppointmentEditor: Processing suggestion data");
        this.processSuggestionData();
      }

      // Preencher valores padrão para um novo evento
      // console.log("📝 AppointmentEditor: Setting up new event");
      this.setupNewEvent();
    }

    // console.log("📝 AppointmentEditor: loadEventData completed");
    // console.log("   Final eventData:", this.eventData);
    // console.log("   Final appointmentType:", this.appointmentType);
  }

  // Inicializar dados do evento
  initializeEventData() {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

    this.eventData = {
      subject: "",
      location: "Sala Principal - Reino Capital", // Default location for default room
      startDateTime: now.toISOString(),
      endDateTime: oneHourLater.toISOString(),
      isAllDayEvent: false,
      type: "", // No default type - user must select
      description: "",
      whoId: this.whoId || null,
      whatId: this.whatId || null,
      reuniaoCriada: false,
      statusReuniao: null, // Don't default to false - let user explicitly choose
      gestorName: "",
      liderComercialName: "",
      sdrName: "",
      faseEvento: "", // Event phase for subject generation
      produtoEvento: "" // Product selection for subject generation
    };

    // console.log("AppointmentEditor: initializeEventData completed", {
    //   eventData: this.eventData,
    //   whoId: this.whoId,
    //   whatId: this.whatId
    // });
  }

  // Initialize event data with pre-selected dates from calendar day click
  initializeEventDataWithSelectedDates() {
    // console.log(
    //   "📝 AppointmentEditor: initializeEventDataWithSelectedDates called",
    //   {
    //     selectedStartDate: this.selectedStartDate,
    //     selectedEndDate: this.selectedEndDate,
    //     selectedStartDateType: typeof this.selectedStartDate,
    //     selectedEndDateType: typeof this.selectedEndDate
    //   }
    // );

    // Set default appointment type when dates are pre-selected to ensure fields are visible
    this.appointmentType = "Reunião Presencial";

    // Format dates for lightning-input datetime compatibility
    const formattedStartDate = this.formatDateForLightningInput(
      this.selectedStartDate
    );
    const formattedEndDate = this.formatDateForLightningInput(
      this.selectedEndDate
    );

    // console.log("📝 AppointmentEditor: Date formatting results", {
    //   originalStart: this.selectedStartDate,
    //   originalEnd: this.selectedEndDate,
    //   formattedStart: formattedStartDate,
    //   formattedEnd: formattedEndDate
    // });

    this.eventData = {
      subject: "",
      location: "Sala Principal - Reino Capital", // Default location for default room
      startDateTime: formattedStartDate,
      endDateTime: formattedEndDate,
      isAllDayEvent: false,
      type: "", // Don't force default type - let user select
      description: "",
      whoId: this.whoId || null,
      whatId: this.whatId || null,
      reuniaoCriada: false,
      statusReuniao: null, // Don't default to false - let user explicitly choose
      gestorName: "",
      liderComercialName: "",
      sdrName: "",
      faseEvento: "", // Event phase for subject generation
      produtoEvento: "" // Product selection for subject generation
    };

    // console.log(
    //   "📝 AppointmentEditor: eventData initialized with selected dates",
    //   {
    //     finalEventData: this.eventData,
    //     startDateTimeValue: this.eventData.startDateTime,
    //     endDateTimeValue: this.eventData.endDateTime
    //   }
    // );

    // Force a re-render to ensure the UI updates
    // This is needed because of the property watcher timing
    // console.log(
    //   "📝 AppointmentEditor: Forcing UI update after date initialization"
    // );
    // console.log("   eventData.startDateTime:", this.eventData.startDateTime);
    // console.log("   eventData.endDateTime:", this.eventData.endDateTime);
    // console.log("   appointmentType:", this.appointmentType);

    // Force update the lightning-input fields with multiple attempts
    setTimeout(() => this.updateDateTimeInputs(), 100);
    setTimeout(() => this.updateDateTimeInputs(), 300);
    setTimeout(() => this.updateDateTimeInputs(), 500);
  }

  // Configurar um novo evento com valores pré-preenchidos
  setupNewEvent() {
    // console.log("AppointmentEditor: setupNewEvent called", {
    //   selectedStartDate: this.selectedStartDate,
    //   selectedEndDate: this.selectedEndDate,
    //   currentEventData: this.eventData
    // });

    // Use selected dates from calendar day click if available
    if (this.selectedStartDate && this.selectedEndDate) {
      this.eventData.startDateTime = this.formatDateForLightningInput(
        this.selectedStartDate
      );
      this.eventData.endDateTime = this.formatDateForLightningInput(
        this.selectedEndDate
      );
      // console.log(
      //   "AppointmentEditor: Using pre-selected dates in setupNewEvent",
      //   {
      //     originalStart: this.selectedStartDate,
      //     originalEnd: this.selectedEndDate,
      //     formattedStart: this.eventData.startDateTime,
      //     formattedEnd: this.eventData.endDateTime,
      //     updatedEventData: this.eventData
      //   }
      // );
    }

    // Se temos IDs relacionados, pré-preencher
    if (this.whoId) {
      this.eventData.whoId = this.whoId;
    }

    if (this.whatId) {
      this.eventData.whatId = this.whatId;
    }

    if (this.recordId) {
      // Verificar que tipo de registro é para pré-preencher o campo adequado
      const prefix = this.recordId.substring(0, 3);

      // Lead ou Contato (começando com 00Q, 003)
      if (prefix === "00Q" || prefix === "003") {
        this.eventData.whoId = this.recordId;
      }
      // Conta ou Oportunidade (começando com 001, 006)
      else if (prefix === "001" || prefix === "006") {
        this.eventData.whatId = this.recordId;
      }
    }

    // console.log("AppointmentEditor: setupNewEvent completed", {
    //   finalEventData: this.eventData
    // });
  }

  // Helper method to update event data with selected dates
  updateEventDataWithSelectedDates() {
    if (this.selectedStartDate && this.selectedEndDate && !this.eventId) {
      this.eventData = {
        ...this.eventData,
        startDateTime: this.formatDateForLightningInput(this.selectedStartDate),
        endDateTime: this.formatDateForLightningInput(this.selectedEndDate)
      };
      // console.log("AppointmentEditor: Updated event data with selected dates", {
      //   start: this.selectedStartDate,
      //   end: this.selectedEndDate
      // });
    }
  }

  // Force update lightning-input datetime fields
  updateDateTimeInputs() {
    // console.log("📝 AppointmentEditor: updateDateTimeInputs called");

    try {
      // console.log("📝 AppointmentEditor: Searching for input fields in DOM...");

      // Find all lightning-input elements first
      const allInputs = this.template.querySelectorAll("lightning-input");
      // console.log(
      //   "📝 AppointmentEditor: Found lightning-input elements:",
      //   allInputs.length
      // );

      // Log all input names and types for debugging
      allInputs.forEach((input, index) => {
        // console.log(
        //   `   Input ${index}: name="${input.name}", type="${input.type}"`
        // );
      });

      // Find the datetime input fields specifically
      let startDateTimeInput = this.template.querySelector(
        'lightning-input[name="startDateTime"]'
      );
      let endDateTimeInput = this.template.querySelector(
        'lightning-input[name="endDateTime"]'
      );

      // If querySelector fails, try accessing by index since we know the positions
      if (!startDateTimeInput && allInputs.length >= 5) {
        // We know from logs that Input 4 is startDateTime
        startDateTimeInput = allInputs[4];
        // console.log(
        //   "📝 AppointmentEditor: Using index-based access for startDateTime:",
        //   !!startDateTimeInput,
        //   startDateTimeInput?.name,
        //   startDateTimeInput?.type
        // );
      }

      if (!endDateTimeInput && allInputs.length >= 6) {
        // We know from logs that Input 5 is endDateTime
        endDateTimeInput = allInputs[5];
        // console.log(
        //   "📝 AppointmentEditor: Using index-based access for endDateTime:",
        //   !!endDateTimeInput,
        //   endDateTimeInput?.name,
        //   endDateTimeInput?.type
        // );
      }

      // console.log("📝 AppointmentEditor: Found datetime input fields");
      // console.log("   startInput found:", !!startDateTimeInput);
      // console.log("   endInput found:", !!endDateTimeInput);
      // console.log("   eventData exists:", !!this.eventData);

      if (this.eventData) {
        // console.log("   startValue:", this.eventData.startDateTime);
        // console.log("   endValue:", this.eventData.endDateTime);
      }

      if (
        startDateTimeInput &&
        this.eventData &&
        this.eventData.startDateTime
      ) {
        // console.log(
        //   "📝 AppointmentEditor: Setting startDateTime value:",
        //   this.eventData.startDateTime
        // );

        // Convert ISO string to datetime-local format
        const localStartValue = this.convertToDatetimeLocal(
          this.eventData.startDateTime
        );
        // console.log(
        //   "📝 AppointmentEditor: Converted to datetime-local format:",
        //   localStartValue
        // );

        if (localStartValue) {
          startDateTimeInput.value = localStartValue;
          // console.log(
          //   "📝 AppointmentEditor: startDateTime input value after setting:",
          //   startDateTimeInput.value
          // );
        }
      } else {
        // console.log("📝 AppointmentEditor: Could not update startDateTime");
        // console.log("   hasInput:", !!startDateTimeInput);
        // console.log("   hasEventData:", !!this.eventData);
        // console.log(
        //   "   hasStartDateTime:",
        //   !!(this.eventData && this.eventData.startDateTime)
        // );
      }

      if (endDateTimeInput && this.eventData && this.eventData.endDateTime) {
        // console.log(
        //   "📝 AppointmentEditor: Setting endDateTime value:",
        //   this.eventData.endDateTime
        // );

        // Convert ISO string to datetime-local format
        const localEndValue = this.convertToDatetimeLocal(
          this.eventData.endDateTime
        );
        // console.log(
        //   "📝 AppointmentEditor: Converted to datetime-local format:",
        //   localEndValue
        // );

        if (localEndValue) {
          endDateTimeInput.value = localEndValue;
          // console.log(
          //   "📝 AppointmentEditor: endDateTime input value after setting:",
          //   endDateTimeInput.value
          // );
        }
      } else {
        // console.log("📝 AppointmentEditor: Could not update endDateTime");
        // console.log("   hasInput:", !!endDateTimeInput);
        // console.log("   hasEventData:", !!this.eventData);
        // console.log(
        //   "   hasEndDateTime:",
        //   !!(this.eventData && this.eventData.endDateTime)
        // );
      }
    } catch (error) {
      console.error(
        "📝 AppointmentEditor: Error updating datetime inputs:",
        error
      );
    }
  }

  // Convert ISO string to datetime-local format for lightning-input type="datetime-local"
  convertToDatetimeLocal(isoString) {
    if (!isoString) return null;

    try {
      // Create a Date object from the ISO string
      const date = new Date(isoString);

      // Get local date components
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");

      // Format as YYYY-MM-DDTHH:MM (datetime-local format)
      const datetimeLocal = `${year}-${month}-${day}T${hours}:${minutes}`;

      // console.log("📝 AppointmentEditor: convertToDatetimeLocal", {
      //   input: isoString,
      //   output: datetimeLocal,
      //   dateObject: date.toString()
      // });

      return datetimeLocal;
    } catch (error) {
      console.error(
        "📝 AppointmentEditor: Error converting to datetime-local:",
        error
      );
      return null;
    }
  }

  // Format date for lightning-input datetime compatibility
  formatDateForLightningInput(dateString) {
    // console.log(
    //   "📝 AppointmentEditor: formatDateForLightningInput called with:",
    //   {
    //     input: dateString,
    //     inputType: typeof dateString,
    //     inputLength: dateString ? dateString.length : 0
    //   }
    // );

    if (!dateString) {
      // console.log(
      //   "📝 AppointmentEditor: Input is null/undefined, returning null"
      // );
      return null;
    }

    try {
      // If the input is already an ISO string, return it directly to avoid double conversion
      if (
        typeof dateString === "string" &&
        dateString.includes("T") &&
        dateString.includes("Z")
      ) {
        // console.log(
        //   "📝 AppointmentEditor: Input is already ISO string, returning directly:",
        //   dateString
        // );
        return dateString;
      }

      // Parse the date and ensure it's in the correct format for lightning-input
      const date = new Date(dateString);

      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.error("AppointmentEditor: Invalid date string:", dateString);
        return null;
      }

      // Return ISO string which lightning-input datetime expects
      const isoString = date.toISOString();
      // console.log("AppointmentEditor: Converted date to ISO:", {
      //   input: dateString,
      //   output: isoString,
      //   inputType: typeof dateString
      // });
      return isoString;
    } catch (error) {
      console.error(
        "AppointmentEditor: Error formatting date:",
        error,
        dateString
      );
      return null;
    }
  }

  // Process AI suggestion data and populate fields
  processSuggestionData() {
    if (!this.suggestionData) return;

    // console.log(
    //   "AppointmentEditor: Processing suggestion data",
    //   this.suggestionData
    // );

    try {
      // Set intelligent subject if available
      if (this.suggestionData.intelligentSubject) {
        this.eventData.subject = this.suggestionData.intelligentSubject;
        // console.log(
        //   "AppointmentEditor: Set intelligent subject",
        //   this.suggestionData.intelligentSubject
        // );
      }

      // Ensure date/time fields are properly set from selected dates
      if (this.selectedStartDate && this.selectedEndDate) {
        this.eventData.startDateTime = this.formatDateForLightningInput(
          this.selectedStartDate
        );
        this.eventData.endDateTime = this.formatDateForLightningInput(
          this.selectedEndDate
        );
        // console.log("AppointmentEditor: Set suggestion dates", {
        //   originalStart: this.selectedStartDate,
        //   originalEnd: this.selectedEndDate,
        //   formattedStart: this.eventData.startDateTime,
        //   formattedEnd: this.eventData.endDateTime
        // });
      }

      // Set room selection based on suggestion
      if (this.suggestionData.roomValue) {
        this.salaReuniao = this.suggestionData.roomValue;

        // Update location based on room selection
        if (this.suggestionData.roomValue === "salaPrincipal") {
          this.eventData.location = "Sala Principal - Reino Capital";
        } else if (this.suggestionData.roomValue === "salaGabriel") {
          this.eventData.location = "Sala do Gabriel - Reino Capital";
        }
      }

      // Set participants based on suggestion
      if (this.suggestionData.participants) {
        const participants = this.suggestionData.participants;

        if (participants.gestor && participants.gestor.name) {
          this.selectedGestorName = participants.gestor.name;
          this.eventData.gestorName = participants.gestor.name;
        }

        if (participants.liderComercial && participants.liderComercial.name) {
          this.selectedLiderComercialName = participants.liderComercial.name;
          this.eventData.liderComercialName = participants.liderComercial.name;
        }

        if (participants.sdr && participants.sdr.name) {
          this.selectedSdrName = participants.sdr.name;
          this.eventData.sdrName = participants.sdr.name;
        }

        // Update selected participants array for availability dashboard
        this.updateSelectedParticipants();
      }

      // Set appointment type from suggestion data or default
      const suggestedMeetingType =
        this.suggestionData.meetingType || "Reunião Presencial";
      this.appointmentType = suggestedMeetingType;
      this.eventData.type = suggestedMeetingType;

      // console.log("AppointmentEditor: Suggestion data processed successfully", {
      //   subject: this.eventData.subject,
      //   startDateTime: this.eventData.startDateTime,
      //   endDateTime: this.eventData.endDateTime,
      //   room: this.salaReuniao,
      //   participants: {
      //     gestor: this.selectedGestorName,
      //     liderComercial: this.selectedLiderComercialName,
      //     sdr: this.selectedSdrName
      //   },
      //   appointmentType: this.appointmentType
      // });
    } catch (error) {
      console.error(
        "AppointmentEditor: Error processing suggestion data",
        error
      );
    }
  }

  // Load event data from calendar component (faster than Apex call)
  loadEventDataFromCalendar() {
    if (!this.selectedEventData) {
      // Fallback to Apex call if no data provided
      this.fetchEventDetails();
      return;
    }

    this.isLoading = true;

    try {
      // Convert moment objects to ISO strings if needed
      const startDateTime = this.selectedEventData.start
        ? this.selectedEventData.start.toISOString
          ? this.selectedEventData.start.toISOString()
          : this.selectedEventData.start
        : new Date().toISOString();

      const endDateTime = this.selectedEventData.end
        ? this.selectedEventData.end.toISOString
          ? this.selectedEventData.end.toISOString()
          : this.selectedEventData.end
        : new Date(Date.now() + 3600000).toISOString();

      // Map calendar event data to our eventData structure
      const meetingType = this.selectedEventData.type || this.selectedEventData.tipoReuniao || "";

      this.eventData = {
        subject: this.selectedEventData.title || "",
        location: this.selectedEventData.location || "",
        startDateTime: startDateTime,
        endDateTime: endDateTime,
        isAllDayEvent: this.selectedEventData.allDay || false,
        type: meetingType, // Use actual meeting type from event data
        description: this.selectedEventData.description || "",
        whoId: this.selectedEventData.whoId || null,
        whatId: this.selectedEventData.whatId || null,
        reuniaoCriada: false, // Will be updated by Apex call
        statusReuniao:
          this.selectedEventData.statusReuniao !== undefined
            ? this.selectedEventData.statusReuniao
            : null,
        gestorName: "",
        liderComercialName: "",
        sdrName: ""
      };

      // Set appointment type from calendar data
      if (meetingType) {
        this.appointmentType = meetingType;
      }

      // Still need to fetch full details from Salesforce for custom fields
      // but we can show the basic data immediately
      this.isLoading = false;

      // Fetch additional details in background
      this.fetchEventDetailsBackground();
    } catch (error) {
      console.error("Error loading event data from calendar:", error);
      // Fallback to Apex call
      this.fetchEventDetails();
    }
  }

  // Fetch additional event details in background
  fetchEventDetailsBackground() {
    getAppointmentDetails({ eventId: this.eventId, whoId: null, whatId: null })
      .then((result) => {
        if (result.success) {


          // Update only the fields not available from calendar data
          this.eventData.type = result.type || "";
          this.eventData.reuniaoCriada = result.reuniaoCriada || false;
          this.eventData.statusReuniao =
            result.statusReuniao !== undefined ? result.statusReuniao : null;
          this.eventData.gestorName = result.gestorName || "";
          this.eventData.liderComercialName = result.liderComercialName || "";
          this.eventData.sdrName = result.sdrName || "";
          this.eventData.faseEvento = result.faseEvento || ""; // Event phase for subject generation
          this.eventData.produtoEvento = this.validateAndConvertProductValue(
            result.produtoEvento
          ); // Product selection for subject generation with validation

          // Update the toggle state - preserve null values
          this.statusReuniao =
            result.statusReuniao !== undefined ? result.statusReuniao : null;

          // Update appointment type - preserve actual meeting type from database
          // Only update if we don't already have a type from calendar data
          if (!this.appointmentType && result.type) {
            this.appointmentType = result.type;
          }

          // Update meeting link
          this.linkReuniao = result.linkReuniao || "";

          // Update participant selections with existing data
          this.updateParticipantSelectionsFromEventData(result);
        }
      })
      .catch((error) => {
        console.error("Error fetching background event details:", error);
        // Don't show error to user since basic data is already loaded
      });
  }

  // Buscar detalhes do evento existente
  fetchEventDetails() {
    if (!this.eventId) return;

    this.isLoading = true;

    getAppointmentDetails({ eventId: this.eventId, whoId: null, whatId: null })
      .then((result) => {
        if (result.success) {
          // Mapear os dados do registro para o nosso objeto eventData
          this.eventData = {
            subject: result.subject || "",
            location: result.location || "",
            startDateTime: result.startDateTime || new Date().toISOString(),
            endDateTime:
              result.endDateTime ||
              new Date(Date.now() + 3600000).toISOString(),
            isAllDayEvent: result.isAllDay || false,
            type: result.type || "",
            description: result.description || "",
            whoId: result.whoId || null,
            whatId: result.whatId || null,
            reuniaoCriada: result.reuniaoCriada || false,
            statusReuniao:
              result.statusReuniao !== undefined ? result.statusReuniao : null,
            gestorName: result.gestorName || "",
            liderComercialName: result.liderComercialName || "",
            sdrName: result.sdrName || "",
            faseEvento: result.faseEvento || "", // Event phase for subject generation
            produtoEvento: this.validateAndConvertProductValue(
              result.produtoEvento
            ) // Product selection for subject generation with validation
          };

          // Check if event was created by automation
          this.isAutomatedEvent = result.criadoPorAutomacao || false;

          // Update the toggle state - preserve null values
          this.statusReuniao =
            result.statusReuniao !== undefined ? result.statusReuniao : null;

          // Atualizar o tipo de compromisso - preserve actual meeting type from database
          // Only update if we don't already have a type from calendar data
          if (!this.appointmentType && result.type) {
            this.appointmentType = result.type;
          }

          // Update meeting link
          this.linkReuniao = result.linkReuniao || "";

          // Atualizar a sala de reunião selecionada
          if (result.salaReuniao) {
            this.salaReuniao = result.salaReuniao;
          }

          // Update participant selections with existing data
          this.updateParticipantSelectionsFromEventData(result);

          // Process contact and opportunity information
          this.processContactAndOpportunityInfo(result);

          this.isLoading = false;
        } else {
          this.error =
            result.errorMessage ||
            "Erro desconhecido ao carregar o compromisso";
          this.isLoading = false;
        }
      })
      .catch((error) => {
        this.error =
          "Erro ao carregar detalhes do compromisso: " +
          this.reduceErrors(error);
        this.isLoading = false;
      });
  }

  // Manipular mudanças nos campos
  handleFieldChange(event) {
    const field = event.target.name;
    const value =
      event.target.type === "checkbox" || event.target.type === "toggle"
        ? event.target.checked
        : event.target.value;

    this.eventData[field] = value;

    // Handle specific field changes
    if (field === "statusReuniao") {
      this.statusReuniao = value;
      this.eventData.statusReuniao = value;
    }

    // Handle phase and product selection and trigger subject generation
    if (field === "faseEvento" || field === "produtoEvento") {
      this.generateSubject();
    }

    // Se estamos alterando as datas/horas, garantir que a data final seja posterior à inicial
    if (field === "startDateTime" && this.eventData.endDateTime) {
      const start = new Date(value);
      const end = new Date(this.eventData.endDateTime);

      if (start >= end) {
        // Definir hora final como início + 1 hora
        const newEnd = new Date(start.getTime() + 60 * 60 * 1000);
        this.eventData.endDateTime = newEnd.toISOString();
      }
    }
  }

  // Handle WhoId (Contact) field changes
  handleWhoIdChange(event) {
    this.eventData.whoId = event.target.value;

    // Load contact information if WhoId is provided
    if (this.eventData.whoId) {
      this.loadContactInformation(this.eventData.whoId);
    } else {
      this.hasContactInfo = false;
      this.contactInfo = {};
    }
  }

  // Handle WhatId (Opportunity/Account) field changes
  handleWhatIdChange(event) {
    this.eventData.whatId = event.target.value;

    // Load opportunity/account information if WhatId is provided
    if (this.eventData.whatId) {
      this.loadOpportunityInformation(this.eventData.whatId);
    } else {
      this.hasOpportunityInfo = false;
      this.opportunityInfo = {};
    }
  }

  // Load contact information based on WhoId
  loadContactInformation(whoId) {
    if (!whoId) return;

    // console.log("AppointmentEditor: Loading contact information for", whoId);

    // Use the existing AppointmentController method to get contact details
    getAppointmentDetails({ eventId: null, whoId: whoId, whatId: null })
      .then((result) => {
        if (result.success && result.contactInfo) {
          this.contactInfo = result.contactInfo;
          this.hasContactInfo = true;
          // console.log(
          //   "AppointmentEditor: Contact info loaded",
          //   this.contactInfo
          // );
        } else {
          this.contactInfo = {};
          this.hasContactInfo = false;
        }
      })
      .catch((error) => {
        console.error("Error loading contact information:", error);
        this.contactInfo = {};
        this.hasContactInfo = false;
      });
  }

  // Load opportunity information based on WhatId
  loadOpportunityInformation(whatId) {
    if (!whatId) return;

    // console.log(
    //   "AppointmentEditor: Loading opportunity information for",
    //   whatId
    // );

    // Use the existing AppointmentController method to get opportunity details
    getAppointmentDetails({ eventId: null, whoId: null, whatId: whatId })
      .then((result) => {
        if (result.success && result.opportunityInfo) {
          this.opportunityInfo = result.opportunityInfo;
          this.hasOpportunityInfo = true;
          // console.log(
          //   "AppointmentEditor: Opportunity info loaded",
          //   this.opportunityInfo
          // );
        } else {
          this.opportunityInfo = {};
          this.hasOpportunityInfo = false;
        }
      })
      .catch((error) => {
        console.error("Error loading opportunity information:", error);
        this.opportunityInfo = {};
        this.hasOpportunityInfo = false;
      });
  }

  // Manipular mudanças nos campos de lookup
  handleLookupChange(event) {
    const field = event.target.fieldName || event.target.dataset.field;
    const value = event.detail.value;

    // console.log("AppointmentEditor: handleLookupChange", {
    //   field,
    //   value,
    //   fieldName: event.target.fieldName,
    //   dataField: event.target.dataset.field,
    //   eventDetail: event.detail
    // });

    if (field === "WhoId") {
      this.eventData = { ...this.eventData, whoId: value };
      // Load contact information when WhoId changes
      if (value) {
        this.loadContactInformation(value);
      } else {
        this.contactInfo = {};
        this.hasContactInfo = false;
      }
    } else if (field === "WhatId") {
      this.eventData = { ...this.eventData, whatId: value };
      // Load opportunity information when WhatId changes
      if (value) {
        this.loadOpportunityInformation(value);
      } else {
        this.opportunityInfo = {};
        this.hasOpportunityInfo = false;
      }
    }
  }

  // Handle contact search
  handleContactSearch(event) {
    const searchTerm = event.target.value;
    this.selectedContactName = searchTerm;

    // console.log("AppointmentEditor: handleContactSearch", { searchTerm });

    // Mostrar o dropdown se tiver pelo menos 1 caractere
    if (!searchTerm || searchTerm.length < 1) {
      this.contactSearchResults = [];
      this.showContactDropdown = false;
      return;
    }

    // Sempre mostrar o dropdown com o estado de carregamento
    this.showContactDropdown = true;
    this.isSearchingContacts = true;

    // Debounce para limitar chamadas de API
    clearTimeout(this.contactSearchTimeout);
    this.contactSearchTimeout = setTimeout(() => {
      this.performContactSearch(searchTerm);
    }, 300);
  }



  // Handle opportunity search
  handleOpportunitySearch(event) {
    const searchTerm = event.target.value;
    this.selectedOpportunityName = searchTerm;

    // console.log("AppointmentEditor: handleOpportunitySearch", { searchTerm });

    // Mostrar o dropdown se tiver pelo menos 1 caractere
    if (!searchTerm || searchTerm.length < 1) {
      this.opportunitySearchResults = [];
      this.showOpportunityDropdown = false;
      return;
    }

    // Sempre mostrar o dropdown com o estado de carregamento
    this.showOpportunityDropdown = true;
    this.isSearchingOpportunities = true;

    // Debounce search to avoid too many API calls
    clearTimeout(this.opportunitySearchTimeout);
    this.opportunitySearchTimeout = setTimeout(() => {
      this.performOpportunitySearch(searchTerm);
    }, 300);
  }

  // Process and enhance search results for better display
  processSearchResults(results) {
    return results.map(result => {
      // Create a new object to avoid modifying read-only Proxy objects
      const processedResult = { ...result };

      // Ensure IconName is set based on Type if not already present
      if (!processedResult.IconName) {
        processedResult.IconName = processedResult.Type === 'Lead' ? 'standard:lead' : 'standard:contact';
      }

      // Enhance DisplayName for better context
      if (processedResult.Type === 'Lead' && processedResult.Company) {
        processedResult.DisplayName = `${processedResult.Name} (${processedResult.Company}) - Lead`;
      } else if (processedResult.Type === 'Contact' && processedResult.AccountName) {
        processedResult.DisplayName = `${processedResult.Name} (${processedResult.AccountName}) - Contato`;
      } else {
        processedResult.DisplayName = `${processedResult.Name} - ${processedResult.Type}`;
      }

      return processedResult;
    });
  }

  // Perform actual contact search via Apex
  performContactSearch(searchTerm) {
    console.log(
      "AppointmentEditor: performContactSearch called with:",
      searchTerm
    );

    searchContacts({
      searchTerm: searchTerm,
      maxResults: 10,
      leadsOnly: false // Always search both contacts and leads for now
    })
      .then((results) => {
        console.log(
          "AppointmentEditor: Contact search results received:",
          results
        );
        console.log("AppointmentEditor: Results length:", results.length);

        // Process and enhance search results
        this.contactSearchResults = this.processSearchResults(results);
        this.showContactDropdown = this.contactSearchResults.length > 0;
        this.isSearchingContacts = false;

        console.log(
          "AppointmentEditor: showContactDropdown set to:",
          this.showContactDropdown
        );
        console.log(
          "AppointmentEditor: contactSearchResults set to:",
          this.contactSearchResults
        );
        // Dropdown positioning is now handled by CSS
      })
      .catch((error) => {
        console.error("Error searching contacts:", error);
        this.contactSearchResults = [];
        this.showContactDropdown = false;
        this.isSearchingContacts = false;
      });
  }

  // Perform actual opportunity search via Apex
  performOpportunitySearch(searchTerm) {
    // console.log(
    //   "AppointmentEditor: performOpportunitySearch called with:",
    //   searchTerm
    // );

    searchOpportunities({ searchTerm: searchTerm, maxResults: 10 })
      .then((results) => {
        // console.log(
        //   "AppointmentEditor: Opportunity search results received:",
        //   results
        // );
        // console.log("AppointmentEditor: Results length:", results.length);

        this.opportunitySearchResults = [...results]; // Force reactivity
        this.showOpportunityDropdown = results.length > 0;
        this.isSearchingOpportunities = false;

        // console.log(
        //   "AppointmentEditor: showOpportunityDropdown set to:",
        //   this.showOpportunityDropdown
        // );
        // console.log(
        //   "AppointmentEditor: opportunitySearchResults set to:",
        //   this.opportunitySearchResults
        // );
      })
      .catch((error) => {
        console.error("Error searching opportunities:", error);
        this.opportunitySearchResults = [];
        this.showOpportunityDropdown = false;
        this.isSearchingOpportunities = false;
      });
  }

  // Handle contact selection from dropdown
  handleContactSelect(event) {
    const selectedId = event.currentTarget.dataset.id;
    const selectedName = event.currentTarget.dataset.name;

    console.log("AppointmentEditor: Valid contact selected from dropdown", {
      selectedId,
      selectedName
    });

    // Only accept valid selections with both ID and name
    if (!selectedId || !selectedName) {
      console.error("AppointmentEditor: Invalid contact selection - missing ID or name");
      return;
    }

    // Update event data with valid selection
    this.eventData = { ...this.eventData, whoId: selectedId };
    this.selectedContactName = selectedName;

    // Update previous values to reflect new selection
    this.previousContactName = selectedName;
    this.previousWhoId = selectedId;

    // Clear dropdown and exit edit mode
    this.showContactDropdown = false;
    this.contactSearchResults = [];
    this.isEditingContact = false;

    // Load contact information
    if (selectedId) {
      this.loadContactInformation(selectedId);
    }

    // Generate subject when contact is selected
    this.generateSubject();

    console.log("AppointmentEditor: Contact selection complete", {
      whoId: this.eventData.whoId,
      selectedContactName: this.selectedContactName
    });
  }

  // Handle edit contact/lead button click
  handleEditContact() {
    // Store current values before entering edit mode
    this.previousContactName = this.selectedContactName;
    this.previousWhoId = this.eventData.whoId || "";

    this.isEditingContact = true;
    // Clear search results when entering edit mode
    this.contactSearchResults = [];
    this.showContactDropdown = false;

    console.log("AppointmentEditor: Entering edit mode", {
      previousContactName: this.previousContactName,
      previousWhoId: this.previousWhoId
    });
  }

  // Handle cancel edit button click
  handleCancelEdit() {
    console.log("AppointmentEditor: Canceling edit, restoring previous values", {
      previousContactName: this.previousContactName,
      previousWhoId: this.previousWhoId,
      currentContactName: this.selectedContactName,
      currentWhoId: this.eventData.whoId
    });

    // Restore previous values
    this.selectedContactName = this.previousContactName;
    this.eventData = { ...this.eventData, whoId: this.previousWhoId };

    // Exit edit mode
    this.isEditingContact = false;

    // Clear any search results
    this.contactSearchResults = [];
    this.showContactDropdown = false;

    // If we had a valid whoId, reload the contact information
    if (this.previousWhoId) {
      this.loadContactInformation(this.previousWhoId);
    } else {
      // Clear contact info if no previous selection
      this.contactInfo = {};
      this.hasContactInfo = false;
      this.leadInfo = {};
      this.hasLeadInfo = false;
    }

    console.log("AppointmentEditor: Cancel edit complete", {
      restoredContactName: this.selectedContactName,
      restoredWhoId: this.eventData.whoId
    });
  }

  // Handle cancel edit (if needed)
  handleCancelEditContact() {
    this.isEditingContact = false;
    this.contactSearchResults = [];
    this.showContactDropdown = false;
  }

  // Handle opportunity selection from dropdown
  handleOpportunitySelect(event) {
    const selectedId = event.currentTarget.dataset.id;
    const selectedName = event.currentTarget.dataset.name;

    // console.log("AppointmentEditor: Opportunity selected", {
    //   selectedId,
    //   selectedName
    // });

    this.eventData = { ...this.eventData, whatId: selectedId };
    this.selectedOpportunityName = selectedName;
    this.showOpportunityDropdown = false;
    this.opportunitySearchResults = [];

    // Load opportunity information
    if (selectedId) {
      this.loadOpportunityInformation(selectedId);
    }

    // Generate subject when opportunity is selected
    this.generateSubject();
  }

  // Manipular cliques no card de tipo
  handleTypeCardClick(event) {
    const selectedType = event.currentTarget.dataset.type;
    this.appointmentType = selectedType;
    this.eventData.type = selectedType;

    // Generate subject when appointment type changes
    this.generateSubject();
  }

  // Manipular seleção da sala de reunião - baseado no reuniaoModal
  handleSalaSelect(event) {
    const selectedSala = event.currentTarget.dataset.value;
    this.salaReuniao = selectedSala;

    // Se selecionar "Outra", limpar o campo de localização
    if (selectedSala === "Outra") {
      this.eventData.location = "";
    } else if (selectedSala === "salaPrincipal") {
      this.eventData.location = "Sala Principal - Reino Capital";
    } else if (selectedSala === "salaGabriel") {
      this.eventData.location = "Sala do Gabriel - Reino Capital";
    }
  }

  // Handle meeting link change - copied from reuniaoModal
  handleLinkChange(event) {
    this.linkReuniao = event.target.value;
  }

  // Handle participant selection from combobox
  handleParticipantSelect(event) {
    const selectedValue = event.detail.value;
    const fieldName = event.target.name;

    switch (fieldName) {
      case "gestor":
        this.selectedGestorName = selectedValue;
        this.eventData.gestorName = selectedValue;
        break;
      case "liderComercial":
        this.selectedLiderComercialName = selectedValue;
        this.eventData.liderComercialName = selectedValue;
        break;
      case "sdr":
        this.selectedSdrName = selectedValue;
        this.eventData.sdrName = selectedValue;
        break;
    }

    this.updateSelectedParticipants();
    this.updateAvailabilityDashboard();
    this.clearParticipantsValidationError();
  }

  // Update selected participants array for availability dashboard
  updateSelectedParticipants() {
    this.selectedParticipants = [];

    if (this.selectedGestorName) {
      this.selectedParticipants.push({
        name: this.selectedGestorName,
        role: "Gestor"
      });
    }

    if (this.selectedLiderComercialName) {
      this.selectedParticipants.push({
        name: this.selectedLiderComercialName,
        role: "Líder Comercial"
      });
    }

    if (this.selectedSdrName) {
      this.selectedParticipants.push({
        name: this.selectedSdrName,
        role: "SDR"
      });
    }
  }

  // Update participant selections with data from Salesforce
  updateParticipantSelectionsFromEventData(result) {
    // Set selected participant names based on event data
    if (result.gestorName) {
      this.selectedGestorName = result.gestorName;
    }

    if (result.liderComercialName) {
      this.selectedLiderComercialName = result.liderComercialName;
    }

    if (result.sdrName) {
      this.selectedSdrName = result.sdrName;
    }

    // Update participants array and availability dashboard
    this.updateSelectedParticipants();
    this.updateAvailabilityDashboard();
  }

  // Update availability dashboard
  updateAvailabilityDashboard() {
    this.showAvailabilityDashboard =
      this.selectedParticipants.length > 0 && this.eventData.startDateTime;

    if (this.showAvailabilityDashboard) {
      // Refresh availability dashboard
      const dashboard = this.template.querySelector("c-availability-dashboard");
      if (dashboard) {
        dashboard.refreshAvailability();
      }
    }
  }

  // Handle time slot selection from availability dashboard
  handleTimeSlotSelect(event) {
    const { startDateTime, endDateTime } = event.detail;

    this.eventData.startDateTime = startDateTime;
    this.eventData.endDateTime = endDateTime;

    // Update the datetime inputs
    this.template
      .querySelectorAll(
        'lightning-input[name="startDateTime"], lightning-input[name="endDateTime"]'
      )
      .forEach((input) => {
        if (input.name === "startDateTime") {
          input.value = startDateTime;
        } else if (input.name === "endDateTime") {
          input.value = endDateTime;
        }
      });
  }

  // Clear participants validation error (kept for backward compatibility)
  clearParticipantsValidationError() {
    this.participantsValidationError = "";
  }

  // Generate subject automatically in format: "Fase - Cliente - Produto"
  generateSubject() {
    let subjectParts = [];

    // 1. Add phase (Fase)
    if (this.eventData.faseEvento) {
      subjectParts.push(this.eventData.faseEvento);
    }

    // 2. Add client name (Cliente)
    let clientName = "";
    if (this.selectedContactName) {
      clientName = this.selectedContactName;
    } else if (this.selectedOpportunityName) {
      clientName = this.selectedOpportunityName;
    }

    if (clientName) {
      subjectParts.push(clientName);
    }

    // 3. Add product (Produto)
    if (this.eventData.produtoEvento) {
      subjectParts.push(this.eventData.produtoEvento);
    }

    // Join with " - " separator
    if (subjectParts.length > 0) {
      this.eventData.subject = subjectParts.join(" - ");
    }
  }

  // Handle add note button click
  handleAddNote() {
    // Placeholder for note functionality - can be implemented later
    this.showToast(
      "Informação",
      "Funcionalidade de notas será implementada em breve",
      "info"
    );
  }

  // Salvar compromisso
  saveAppointment() {
    if (!this.validateFields()) {
      return;
    }

    this.isLoading = true;

    // Preparar dados do evento para enviar ao Apex
    const eventDataToSave = {
      subject: this.eventData.subject,
      location: this.eventData.location,
      startDateTime: this.eventData.startDateTime,
      endDateTime: this.eventData.endDateTime,
      isAllDayEvent: this.eventData.isAllDayEvent,
      tipoReuniao: this.appointmentType, // Use tipoReuniao field name expected by Apex controller
      description: this.eventData.description,
      reuniaoCriada: this.eventData.reuniaoCriada,
      statusReuniao: this.statusReuniao,
      whoId: this.eventData.whoId || null,
      whatId: this.eventData.whatId || null,
      gestorName: this.selectedGestorName,
      liderComercialName: this.selectedLiderComercialName,
      sdrName: this.selectedSdrName,
      linkReuniao: this.linkReuniao, // Include meeting link for online meetings
      salaReuniao: this.salaReuniao, // Include selected meeting room
      faseEvento: this.eventData.faseEvento, // Event phase for subject generation
      produtoEvento: this.eventData.produtoEvento // Product selection for subject generation
    };



    // console.log("AppointmentEditor: eventDataToSave", eventDataToSave);

    // Validar disponibilidade da sala antes de salvar (para reuniões presenciais)
    if (
      this.appointmentType === "Reunião Presencial" &&
      this.salaReuniao !== "Outra"
    ) {
      this.validateRoomAvailabilityAndSave(eventDataToSave);
    } else {
      // Se não for presencial ou for "Outra" sala, prosseguir sem validar
      this.proceedWithSave(eventDataToSave);
    }
  }

  // Validar disponibilidade da sala e prosseguir com salvamento
  validateRoomAvailabilityAndSave(eventDataToSave) {
    validarDisponibilidadeSala({
      salaReuniao: this.salaReuniao,
      dataInicioStr: this.eventData.startDateTime,
      dataFimStr: this.eventData.endDateTime,
      eventoAtualId: this.eventId || ""
    })
      .then((result) => {
        if (result.valido) {
          // Se a sala está disponível, prosseguir com o salvamento
          this.proceedWithSave(eventDataToSave);
        } else {
          // Se há conflito, mostrar mensagem de erro e parar o processo
          this.isLoading = false;
          this.showToast("Sala Indisponível", result.mensagem, "error");
        }
      })
      .catch((error) => {
        this.isLoading = false;
        this.error =
          "Erro ao validar disponibilidade da sala: " +
          this.reduceErrors(error);
      });
  }

  // Prosseguir com o salvamento do evento
  proceedWithSave(eventDataToSave) {
    // Se temos um ID, atualizar o registro existente
    if (this.eventId) {
      eventDataToSave.eventId = this.eventId;

      updateAppointment({ eventData: eventDataToSave })
        .then((result) => {
          if (result.success) {
            // Save Lead opportunity data if available
            return this.saveLeadOpportunityDataIfNeeded();
          } else {
            this.error =
              result.errorMessage ||
              "Erro desconhecido ao atualizar o compromisso";
            this.isLoading = false;
          }
        })
        .then(() => {
          this.showToast(
            "Sucesso",
            "Compromisso atualizado com sucesso",
            "success"
          );
          this.closeModal();

          // Enhanced event dispatching with debugging
          // console.log(
          //   "📝 AppointmentEditor: Dispatching appointmentsaved event for update"
          // );
          this.dispatchEvent(
            new CustomEvent("appointmentsaved", {
              detail: {
                id: this.eventId,
                action: "update",
                updatedData: {
                  salaReuniao: this.salaReuniao,
                  statusReuniao: eventDataToSave.statusReuniao,
                  customColor: eventDataToSave.customColor
                }
              },
              bubbles: true,
              composed: true
            })
          );
        })
        .catch((error) => {
          this.error =
            "Erro ao atualizar compromisso: " + this.reduceErrors(error);
          this.isLoading = false;
        });
    }
    // Caso contrário, criar um novo registro
    else {
      createAppointment({ eventData: eventDataToSave })
        .then((result) => {
          if (result.success) {
            this.eventId = result.eventId; // Store the new event ID
            // Save Lead opportunity data if available
            return this.saveLeadOpportunityDataIfNeeded();
          } else {
            this.error =
              result.errorMessage || "Erro desconhecido ao criar o compromisso";
            this.isLoading = false;
          }
        })
        .then(() => {
          this.showToast(
            "Sucesso",
            "Compromisso criado com sucesso",
            "success"
          );
          this.closeModal();

          // Enhanced event dispatching with debugging
          // console.log(
          //   "📝 AppointmentEditor: Dispatching appointmentsaved event for create",
          //   {
          //     eventId: this.eventId
          //   }
          // );
          this.dispatchEvent(
            new CustomEvent("appointmentsaved", {
              detail: {
                id: this.eventId,
                action: "create",
                updatedData: {
                  salaReuniao: this.salaReuniao,
                  statusReuniao: eventDataToSave.statusReuniao,
                  customColor: eventDataToSave.customColor
                }
              },
              bubbles: true,
              composed: true
            })
          );
        })
        .catch((error) => {
          this.error = "Erro ao criar compromisso: " + this.reduceErrors(error);
          this.isLoading = false;
        });
    }
  }

  // Validar campos do formulário
  validateFields() {
    // Validate appointment type is selected
    if (!this.appointmentType) {
      this.showToast("Erro", "Selecione um tipo de compromisso", "error");
      return false;
    }

    // Coletar todos os inputs marcados como obrigatórios
    const allValidInputs = [
      ...this.template.querySelectorAll("lightning-input, lightning-textarea")
    ]
      .filter((input) => input.required)
      .reduce((validSoFar, input) => {
        input.reportValidity();
        return validSoFar && input.checkValidity();
      }, true);

    if (!allValidInputs) {
      this.showToast("Erro", "Preencha todos os campos obrigatórios", "error");
      return false;
    }

    // Note: Participant validation removed - participants are now optional

    // Note: Meeting link validation removed - link is now optional for online meetings

    // Verificar se a data final é posterior à data inicial
    const start = new Date(this.eventData.startDateTime);
    const end = new Date(this.eventData.endDateTime);

    if (end <= start) {
      this.showToast(
        "Erro",
        "A data e hora de término deve ser posterior à data e hora de início",
        "error"
      );
      return false;
    }

    return true;
  }

  // Validate required participants (now optional - always returns true)
  validateRequiredParticipants() {
    // Participants are now optional - clear any existing validation errors
    this.participantsValidationError = "";
    return true;
  }

  // Fechar o modal
  closeModal() {
    this.showModal = false;
    // Reset all data when closing modal
    this.resetModalData();
    this.dispatchEvent(new CustomEvent("close"));
  }

  // Reset all modal data to initial state
  resetModalData() {
    console.log("AppointmentEditor: Resetting modal data");

    // Reset event data
    this.eventData = {
      subject: "",
      location: "",
      startDateTime: "",
      endDateTime: "",
      isAllDayEvent: false,
      description: "",
      reuniaoCriada: false,
      faseEvento: "",
      produtoEvento: ""
    };

    // Reset IDs
    this.eventId = null;
    this.leadOpportunityId = "";

    // Reset contact/lead information
    this.contactInfo = {};
    this.hasContactInfo = false;
    this.leadInfo = {};
    this.hasLeadInfo = false;
    this.opportunityInfo = {};
    this.hasOpportunityInfo = false;

    // Reset selected names
    this.selectedContactName = "";
    this.selectedOpportunityName = "";

    // Reset previous values
    this.previousContactName = "";
    this.previousWhoId = "";

    // Reset search states
    this.contactSearchResults = [];
    this.opportunitySearchResults = [];
    this.showContactDropdown = false;
    this.showOpportunityDropdown = false;
    this.isSearchingContacts = false;
    this.isSearchingOpportunities = false;
    this.isEditingContact = false;

    // Reset appointment type and meeting details
    this.appointmentType = "";
    this.salaReuniao = "";
    this.linkReuniao = "";
    this.statusReuniao = "Agendada";

    // Reset participant selections
    this.selectedGestorName = "";
    this.selectedLiderComercialName = "";
    this.selectedSdrName = "";
    this.selectedParticipants = [];

    // Reset lead opportunity fields
    this._leadOpportunityStage = "Primeira Reunião";
    this._leadOpportunityProbability = "";
    this._leadOpportunityCloseDate = "";
    this._leadOpportunityType = "";
    this._leadOpportunityAmount = "";

    // Reset UI states
    this.activeTab = "event";
    this.showAvailabilityDashboard = false;
    this.isLoading = false;
    this.error = "";
    this.participantsValidationError = "";

    // Reset render key to force re-render
    this.renderKey++;

    console.log("AppointmentEditor: Modal data reset complete");
  }

  // Exibir toast de notificação
  // Suppresses success notifications to reduce visual pollution
  showToast(title, message, variant) {
    // Suppress success notifications - users get immediate visual feedback from calendar updates
    if (variant === "success") {
      // console.log(
      //   `🔇 AppointmentEditor: Suppressed success toast: ${title} - ${message}`
      // );
      return;
    }

    // Allow error, warning, and info notifications to display
    this.dispatchEvent(
      new ShowToastEvent({
        title,
        message,
        variant
      })
    );
  }

  // Process contact, opportunity, and lead information - similar to reuniaoModal
  processContactAndOpportunityInfo(result) {
    // Process lead information first to determine if we should show contact info
    const hasLeadData = result.leadInfo && Object.keys(result.leadInfo).length > 0;

    // Process contact information - only show if there's no Lead
    if (result.contactInfo && Object.keys(result.contactInfo).length > 0 && !hasLeadData) {
      this.contactInfo = result.contactInfo;
      this.hasContactInfo = true;

      // Set the selectedContactName for the lookup field display
      if (this.contactInfo.name) {
        this.selectedContactName = this.contactInfo.name;
        // console.log(
        //   "AppointmentEditor: Set selectedContactName to",
        //   this.selectedContactName
        // );
      }
    } else {
      this.contactInfo = {};
      this.hasContactInfo = false;
    }

    // Process lead information first - check if we have a Lead associated with this event
    console.log("Processing lead information from result:", result.leadInfo);

    if (hasLeadData) {
      this.leadInfo = result.leadInfo;
      this.hasLeadInfo = true;

      console.log("Lead info found, setting hasLeadInfo to true:", {
        leadInfo: this.leadInfo,
        leadId: result.leadInfo.id
      });

      // Set the selectedContactName for the lookup field display when we have lead info
      if (this.leadInfo.name) {
        this.selectedContactName = this.leadInfo.name;
        console.log(
          "AppointmentEditor: Set selectedContactName to lead name:",
          this.selectedContactName
        );
      }

      // Load lead opportunity management data using the correct method
      this.loadLeadOpportunityData(result.leadInfo.id);
    } else {
      console.log("No lead info found, resetting lead opportunity fields");
      this.leadInfo = {};
      this.hasLeadInfo = false;
      // Reset lead opportunity fields (using internal properties)
      this._leadOpportunityStage = "Primeira Reunião";
      this._leadOpportunityProbability = "";
      this._leadOpportunityCloseDate = "";
      this._leadOpportunityType = "";
      this._leadOpportunityAmount = "";
      this.leadOpportunityId = "";
    }

    // Process opportunity information - only show if there's no Lead (to avoid duplication)
    if (
      result.opportunityInfo &&
      Object.keys(result.opportunityInfo).length > 0 &&
      !hasLeadData
    ) {
      this.opportunityInfo = result.opportunityInfo;
      this.hasOpportunityInfo = true;

      // Set the selectedOpportunityName for the lookup field display
      if (this.opportunityInfo.name) {
        this.selectedOpportunityName = this.opportunityInfo.name;
        // console.log(
        //   "AppointmentEditor: Set selectedOpportunityName to",
        //   this.selectedOpportunityName
        // );
      }
    } else {
      this.opportunityInfo = {};
      this.hasOpportunityInfo = false;
    }
  }

  // Navigation methods - similar to reuniaoModal
  navigateToContact() {
    if (this.contactInfo.id) {
      this[NavigationMixin.Navigate]({
        type: "standard__recordPage",
        attributes: {
          recordId: this.contactInfo.id,
          objectApiName: "Contact",
          actionName: "view"
        }
      });
    }
  }

  navigateToOpportunity() {
    if (this.opportunityInfo.id) {
      this[NavigationMixin.Navigate]({
        type: "standard__recordPage",
        attributes: {
          recordId: this.opportunityInfo.id,
          objectApiName: "Opportunity",
          actionName: "view"
        }
      });
    }
  }

  navigateToLead() {
    if (this.leadInfo.id) {
      this[NavigationMixin.Navigate]({
        type: "standard__recordPage",
        attributes: {
          recordId: this.leadInfo.id,
          objectApiName: "Lead",
          actionName: "view"
        }
      });
    }
  }

  // Handle Lead opportunity field changes (like leadEventEditor)
  handleLeadOpportunityFieldChange(event) {
    const field = event.target.dataset.field;
    const value = event.target.value;

    console.log("Lead opportunity field change detected:", { field, value });

    switch (field) {
      case "opportunityStage":
        this._leadOpportunityStage = value;
        console.log(
          "Updated _leadOpportunityStage to:",
          this._leadOpportunityStage
        );
        break;
      case "opportunityProbability":
        this._leadOpportunityProbability = value;
        console.log(
          "Updated _leadOpportunityProbability to:",
          this._leadOpportunityProbability
        );
        break;
      case "opportunityCloseDate":
        this._leadOpportunityCloseDate = value;
        console.log(
          "Updated _leadOpportunityCloseDate to:",
          this._leadOpportunityCloseDate
        );
        break;
      case "opportunityType":
        this._leadOpportunityType = value;
        console.log(
          "Updated _leadOpportunityType to:",
          this._leadOpportunityType
        );
        break;
      case "opportunityAmount":
        this._leadOpportunityAmount = value;
        console.log(
          "Updated _leadOpportunityAmount to:",
          this._leadOpportunityAmount
        );
        break;
    }
  }

  // Tab navigation handlers
  handleEventTabClick(event) {
    event.preventDefault();
    this.activeTab = "event";
  }

  handleOpportunityTabClick(event) {
    event.preventDefault();
    this.activeTab = "opportunity";
  }

  // Load Lead opportunity data using the same method as leadEventEditor
  loadLeadOpportunityData(leadId) {
    console.log("loadLeadOpportunityData called with leadId:", leadId);

    if (!leadId) {
      console.log("No leadId provided, skipping opportunity data load");
      return;
    }

    console.log("Calling getLeadEventDetails with leadId:", leadId);
    getLeadEventDetails({ leadId: leadId })
      .then((data) => {
        console.log("Lead event details loaded:", data);
        this.processLeadEventData(data);
      })
      .catch((error) => {
        console.error("Error loading Lead event details:", error);
        // Don't show error toast - this is optional data
      });
  }

  // Process Lead event data exactly like leadEventEditor
  processLeadEventData(data) {
    try {
      console.log("processLeadEventData called with data:", data);

      // Process opportunities - use the first one (same as leadEventEditor)
      const opportunities = data.opportunities || [];
      console.log("Found opportunities:", opportunities.length, opportunities);

      if (opportunities.length > 0) {
        const opportunityData = opportunities[0];
        console.log("Processing opportunity data:", opportunityData);

        // Populate opportunity fields exactly like leadEventEditor (using internal properties)
        this._leadOpportunityStage =
          opportunityData.StageName || "Primeira Reunião";
        this._leadOpportunityProbability =
          opportunityData.Probabilidade_da_Oportunidade__c || "";
        this._leadOpportunityType = opportunityData.Tipo_de_produto__c || "";
        this._leadOpportunityAmount = opportunityData.Amount || "";
        this.leadOpportunityId = opportunityData.Id || "";

        console.log("Set leadOpportunityId to:", this.leadOpportunityId);

        // Format close date for date input (same as leadEventEditor)
        if (opportunityData.CloseDate) {
          this._leadOpportunityCloseDate = this.formatDateForInput(
            opportunityData.CloseDate
          );
        } else {
          this._leadOpportunityCloseDate = "";
        }

        // Force re-render by incrementing renderKey (like leadEventEditor)
        this.renderKey++;

        // Force visual update after population (multiple attempts like leadEventEditor)
        setTimeout(() => {
          this.forceLeadOpportunityFieldUpdates();

          // Second attempt
          setTimeout(() => {
            this.forceLeadOpportunityFieldUpdates();

            // Third attempt
            setTimeout(() => {
              this.forceLeadOpportunityFieldUpdates();
            }, 300);
          }, 200);
        }, 100);

        console.log("Lead opportunity data populated:", {
          stage: this.leadOpportunityStage,
          probability: this.leadOpportunityProbability,
          type: this.leadOpportunityType,
          amount: this.leadOpportunityAmount,
          closeDate: this.leadOpportunityCloseDate,
          id: this.leadOpportunityId
        });
      } else {
        console.log("No opportunities found for this Lead");
      }
    } catch (error) {
      console.error("Error processing Lead event data:", error);
    }
  }

  // Format date for input (same as leadEventEditor)
  formatDateForInput(dateString) {
    try {
      const date = new Date(dateString);
      // Format as YYYY-MM-DD for date input
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");

      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error("Error formatting date:", error);
      return "";
    }
  }

  // Force Lead opportunity field updates (like leadEventEditor)
  forceLeadOpportunityFieldUpdates() {
    try {
      // Strategy 1: Direct value assignment using data-field attributes
      this.updateLeadOpportunityFieldValue(
        "opportunityStage",
        this.leadOpportunityStage
      );
      this.updateLeadOpportunityFieldValue(
        "opportunityProbability",
        this.leadOpportunityProbability
      );
      this.updateLeadOpportunityFieldValue(
        "opportunityType",
        this.leadOpportunityType
      );
      this.updateLeadOpportunityFieldValue(
        "opportunityCloseDate",
        this.leadOpportunityCloseDate
      );
      this.updateLeadOpportunityFieldValue(
        "opportunityAmount",
        this.leadOpportunityAmount
      );

      // Strategy 2: Force validation on all fields
      this.template
        .querySelectorAll("lightning-combobox, lightning-input")
        .forEach((field) => {
          if (field.reportValidity) {
            field.reportValidity();
          }
        });
    } catch (error) {
      console.error("Error in forceLeadOpportunityFieldUpdates:", error);
    }
  }

  // Update a specific Lead opportunity field value in the DOM (like leadEventEditor)
  updateLeadOpportunityFieldValue(fieldName, value) {
    try {
      const field = this.template.querySelector(`[data-field="${fieldName}"]`);
      if (field) {
        // For lightning-combobox, set value directly
        if (field.tagName.toLowerCase() === "lightning-combobox") {
          field.value = value;
          // Force refresh of the combobox
          field.reportValidity();
        }
        // For lightning-input, set value directly
        else if (field.tagName.toLowerCase() === "lightning-input") {
          field.value = value;
          // Force refresh of the input
          field.reportValidity();
        }

        // Dispatch a custom event to trigger any listeners
        field.dispatchEvent(
          new CustomEvent("fieldupdate", {
            detail: { fieldName, value },
            bubbles: true
          })
        );
      }
    } catch (error) {
      console.error(
        `Error updating Lead opportunity field ${fieldName}:`,
        error
      );
    }
  }

  // Save Lead opportunity data if needed
  saveLeadOpportunityDataIfNeeded() {
    console.log("saveLeadOpportunityDataIfNeeded called with:", {
      hasLeadInfo: this.hasLeadInfo,
      hasLeadOpportunityData: this.hasLeadOpportunityData,
      leadOpportunityId: this.leadOpportunityId,
      leadInfo: this.leadInfo,
      _leadOpportunityStage: this._leadOpportunityStage,
      _leadOpportunityType: this._leadOpportunityType
    });

    // Only save if we have Lead info, opportunity data to save, and an opportunity ID
    if (
      this.hasLeadInfo &&
      this.hasLeadOpportunityData &&
      this.leadOpportunityId
    ) {
      // Capture current edited values from internal properties (like leadEventEditor)
      const opportunityData = {
        stageName: this._leadOpportunityStage,
        probability: this._leadOpportunityProbability,
        closeDate: this._leadOpportunityCloseDate,
        type: this._leadOpportunityType,
        amount: this._leadOpportunityAmount
      };

      console.log("Attempting to save Lead opportunity data:", {
        opportunityId: this.leadOpportunityId,
        opportunityData: opportunityData
      });

      return updateLeadOpportunityFields({
        opportunityId: this.leadOpportunityId,
        opportunityData: opportunityData
      })
        .then((result) => {
          console.log("Lead opportunity data saved successfully:", result);

          // Update visual fields after successful save (like leadEventEditor)
          setTimeout(() => {
            this.forceLeadOpportunityFieldUpdates();
            // Second attempt after a short delay
            setTimeout(() => {
              this.forceLeadOpportunityFieldUpdates();
            }, 200);
          }, 100);
        })
        .catch((error) => {
          console.error("Error saving Lead opportunity data:", error);
          // Don't throw error - just log it, as the main event was saved successfully
        });
    } else {
      console.log("Skipping Lead opportunity save - conditions not met:", {
        hasLeadInfo: this.hasLeadInfo,
        hasLeadOpportunityData: this.hasLeadOpportunityData,
        leadOpportunityId: this.leadOpportunityId
      });
    }

    // Return resolved promise if no Lead opportunity data to save
    return Promise.resolve();
  }

  // Utility methods - similar to reuniaoModal
  formatCurrency(amount) {
    if (!amount) return "";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(amount);
  }

  getProbabilityLabel(probability) {
    if (!probability) return "";

    const probabilityMap = {
      10: "10% - Qualificação",
      20: "20% - Necessidades Identificadas",
      40: "40% - Proposta Apresentada",
      60: "60% - Negociação",
      80: "80% - Fechamento",
      90: "90% - Fechamento Iminente",
      100: "100% - Fechado Ganho"
    };

    return probabilityMap[probability.toString()] || `${probability}%`;
  }

  // New method to convert API probability values to percentage format
  getProbabilityPercentage(apiValue) {
    if (!apiValue) return "";

    const probabilityMap = {
      zero: "0%",
      treze: "13%",
      trintaequatro: "34%",
      cinquentaecinco: "55%",
      oitentaenove: "89%",
      cem: "100%"
    };

    return probabilityMap[apiValue] || `${apiValue}%`;
  }

  // New method to convert API opportunity type values to display labels
  getOpportunityTypeLabel(apiValue) {
    if (!apiValue) return "";

    const typeMap = {
      liquidacaoOtimizada: "Liquidação Otimizada",
      consultoriaSocietaria: "Consultoria Societária",
      gestaoPatrimonio: "Gestão de Patrimônio"
    };

    return typeMap[apiValue] || apiValue;
  }

  // Função de utilidade para reduzir mensagens de erro
  reduceErrors(errors) {
    if (!Array.isArray(errors)) {
      errors = [errors];
    }

    return errors
      .filter((error) => !!error)
      .map((error) => {
        if (typeof error === "string") {
          return error;
        }
        // UI API read/delete errors
        else if (error.body && typeof error.body.message === "string") {
          return error.body.message;
        }
        // Create/Update errors
        else if (error.body && Array.isArray(error.body.output?.errors)) {
          return error.body.output.errors.map((e) => e.message).join(", ");
        }
        // Single message error
        else if (error.body && error.body.message) {
          return error.body.message;
        }
        // DML errors
        else if (error.body && Array.isArray(error.body.message)) {
          return error.body.message.join(", ");
        }
        // Unknown error shape
        return "Erro desconhecido";
      })
      .filter((message) => !!message)
      .join(", ");
  }

  /**
   * Get current user info for Teams component
   */
  get currentUserInfo() {
    // Return default user info - Teams component will handle real user data
    return {
      name: "Reino Capital User",
      email: "user@reinocapital.com.br"
    };
  }

  /**
   * Handle Teams link generated event from Teams component
   */
  handleTeamsLinkGenerated(event) {
    console.log("Teams link generated event received in appointmentEditor");

    // Get the link from the event detail
    if (event && event.detail && event.detail.link) {
      this.linkReuniao = event.detail.link;
      console.log("Teams link captured from event detail:", this.linkReuniao);

      // Show success message
      this.showToast(
        "Sucesso",
        "Link do Microsoft Teams gerado automaticamente",
        "success"
      );
    } else {
      console.warn("Teams link event received but no link in event detail");
    }
  }

  /**
   * Handle Teams link cleared event from Teams component
   */
  handleTeamsLinkCleared(event) {
    this.linkReuniao = "";
    console.log("Teams link cleared in appointmentEditor");
  }
}
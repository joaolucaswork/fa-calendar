import { LightningElement, api, track } from "lwc";
import { NavigationMixin } from "lightning/navigation";
import { loadScript, loadStyle } from "lightning/platformResourceLoader";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import fullCalendar from "@salesforce/resourceUrl/fullCalendar";
import floatingUI from "@salesforce/resourceUrl/floatingUI";
import getEvents from "@salesforce/apex/CalendarioReinoController.getEvents";
import saveEvent from "@salesforce/apex/CalendarioReinoController.saveEvent";
import deleteEvent from "@salesforce/apex/CalendarioReinoController.deleteEvent";
// Color-related Apex methods are now handled by eventColorManager component
import saveEventMeetingRoom from "@salesforce/apex/CalendarioReinoController.saveEventMeetingRoom";
import getRoomAvailability from "@salesforce/apex/CalendarioReinoController.getRoomAvailability";
import getStatusPicklistValues from "@salesforce/apex/CalendarioReinoController.getStatusPicklistValues";
import searchUsers from "@salesforce/apex/AppointmentController.searchUsers";
// Lead Event integration
import getLeadEvents from "@salesforce/apex/LeadEventController.getLeadEvents";

// Resource paths for FullCalendar v3
const FC_SCRIPT_URL = fullCalendar + "/fullcalendar.min.js";
const MOMENT_SCRIPT_URL = fullCalendar + "/lib/moment.min.js";
const FC_CSS_URL = fullCalendar + "/fullcalendar.min.css";
const JQUERY_URL = fullCalendar + "/lib/jquery.min.js";
const JQUERY_UI_URL = fullCalendar + "/lib/jquery-ui.min.js";
const LOCALE_URL = fullCalendar + "/locale/pt-br.js";

// Floating UI static resource
const FLOATING_UI_SCRIPT_URL = floatingUI;

// Nomes dos meses para a barra lateral
const monthNames = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Maio",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez"
];

export default class CalendarioReino extends NavigationMixin(LightningElement) {
  @track isCalendarInitialized = false;
  @track isLoading = true;
  @track error;
  @track events = [];
  @track startDate;
  @track endDate;

  // Propriedades para a barra lateral estilo Teams
  @track currentYear = new Date().getFullYear();
  @track currentMonth = new Date().getMonth();
  @track currentMonthYear = ""; // Texto do mês e ano atual para o cabeçalho
  @track currentDateRangeText = ""; // Texto formatado para o botão de data
  @track isMonthSectionExpanded = false; // Changed: Start with days view (false = show days, true = show months)
  @track isCalendarsSectionExpanded = false; // User calendar selection - collapsed by default
  @track isFiltersSectionExpanded = true;
  @track isRoomsSectionExpanded = true;
  @track isMeetingSuggestionsExpanded = true; // Meeting suggestions section - expanded by default
  @track isColorLegendExpanded = false; // Color legend section - collapsed by default
  @track monthSectionIcon = "utility:chevronright"; // Changed: Start collapsed to show days
  @track calendarsSectionIcon = "utility:chevronright"; // User calendar selection - collapsed by default
  @track filtersSectionIcon = "utility:chevrondown";
  @track roomsSectionIcon = "utility:chevrondown";
  @track meetingSuggestionsIcon = "utility:chevrondown"; // Meeting suggestions icon - expanded by default
  @track colorLegendIcon = "utility:chevronright"; // Color legend icon - collapsed by default
  @track monthsInYear = [];
  @track sidebarDays = []; // New: Array for sidebar days display
  @track selectedSidebarDate = null; // Track the currently selected day in sidebar
  @track currentViewLabel = "Mês"; // Label para o dropdown de visualização - changed to "Mês" for monthly default view

  // Propriedades para o popup de calendário
  @track isDatePickerVisible = false;
  @track isMonthTabActive = true;
  @track isYearTabActive = false;
  @track monthTabClass = "active";
  @track yearTabClass = "";
  @track pickerYear = new Date().getFullYear();
  @track pickerMonth = new Date().getMonth();
  @track pickerMonthYear = "";
  @track calendarDays = [];
  @track pickerMonths = [];
  @track selectedDate = null;
  @track rangeStartDate = null;
  @track rangeEndDate = null;

  // Appointment Editor properties
  @track showAppointmentEditor = false;
  @track selectedEventId = null;
  @track prefilledWhoId = null;
  @track prefilledWhatId = null;
  @track selectedStartDate = null;
  @track selectedEndDate = null;
  @track selectedEventData = null;

  // Search and Filter properties
  @track searchTerm = "";
  @track activeFilter = "all";
  @track isFilterSelected = {
    all: true,
    presencial: false,
    online: false,
    telefonica: false
  };
  @track allEvents = []; // Store all events for filtering

  // Meeting room filter properties
  @track meetingRooms = [
    {
      value: "salaPrincipal",
      label: "Sala Principal",
      selected: true,
      availabilityClass: "room-availability available",
      availabilityIcon: "utility:success",
      availabilityText: "Disponível",
      showOccupiedSlots: false,
      occupiedSlots: []
    },
    {
      value: "salaGabriel",
      label: "Sala do Gabriel",
      selected: true,
      availabilityClass: "room-availability available",
      availabilityIcon: "utility:success",
      availabilityText: "Disponível",
      showOccupiedSlots: false,
      occupiedSlots: []
    },
    {
      value: "Outra",
      label: "Outra Localização",
      selected: true,
      availabilityClass: "room-availability neutral",
      availabilityIcon: "utility:info",
      availabilityText: "Localização variável",
      showOccupiedSlots: false,
      occupiedSlots: []
    },
    {
      value: "online",
      label: "Online",
      selected: true,
      availabilityClass: "room-availability available",
      availabilityIcon: "utility:success",
      availabilityText: "Sempre disponível",
      showOccupiedSlots: false,
      occupiedSlots: []
    }
  ];

  // User calendar properties
  @track availableUsers = [];
  @track selectedUserId = null;
  @track selectedUserName = "";
  @track selectedUserPhotoUrl = "";
  @track isDefaultCalendarSelected = true;
  @track isLoadingUsers = false;
  @track showUserCalendarIndicator = false;

  // Color legend and filter properties - simplified to only show custom colors and uncategorized
  @track colorLegend = [];
  @track activeColorFilters = [];

  // Meeting suggestions properties
  @track meetingSuggestions = [];
  @track showMeetingSuggestions = true;
  @track isLoadingSuggestions = false;
  @track suggestionData = null;

  // Fuzzy search properties - Enhanced Integration - COMMENTED OUT
  // @track showFuzzySearchDebug = false; // Set to true to see debug information
  // @track enableFuzzySearch = true; // Feature flag for fuzzy search
  // @track isFuzzySearchVisible = true; // Control visibility state - always visible by default

  // Position persistence for draggable popups
  @track savedPopupPositions = {
    suggestions: null,
    colors: null,
    calendars: null
  };

  // Pin state management for popups
  @track popupPinStates = {
    suggestions: false,
    colors: false,
    calendars: false
  };

  // Debug mode for detailed logging (set to false for production)
  debugMode = false;

  // Sidebar collapse state
  @track isSidebarCollapsed = false;

  // Color picker properties
  @track showColorPicker = false;
  @track colorPickerEventId = null;
  @track selectedColor = null;
  @track colorPickerMeetingStatus = null; // Track meeting status for the selected event (picklist value)
  @track colorPickerEventData = null; // Store complete event data for display
  @track colorPickerLinkReuniao = ""; // Track meeting link URL for the selected event
  @track colorPickerEventType = ""; // Track event type to determine URL field visibility
  @track showUrlCard = false; // Track whether to show URL card or input field
  urlSaveTimeout = null; // Timeout for debounced URL saving
  urlCardTimeout = null; // Timeout for debounced URL card conversion

  // Floating UI positioning
  colorPickerTriggerElement = null;
  floatingUICleanup = null;
  highlightedEventElement = null; // Track highlighted event

  // Meeting outcome interface properties
  @track colorPickerMeetingOutcome = null; // Track meeting outcome (reuniaoAconteceu__c checkbox)
  @track showStatusCombobox = false; // Control visibility of status combobox
  @track statusPicklistOptions = []; // Options for statusReuniao__c combobox

  // Lead Event properties
  @track showLeadEventEditor = false;
  @track selectedLeadId = null;
  @track selectedLeadEventId = null;
  @track leadEvents = [];
  @track showLeadEvents = true; // Toggle to show/hide Lead events in calendar

  // API properties for customization
  @api defaultView = "month"; // Changed back to "month" for monthly default view
  @api height = "auto"; // Usar 'auto' para permitir que o calendário se expanda conforme necessário
  @api header = {
    left: "",
    center: "title",
    right: ""
  };
  @api buttonText = {
    today: "Hoje",
    month: "Mês",
    week: "Semana",
    day: "Dia"
  };
  @api themeColor = "#6264a7"; // Cor tema do Teams
  @api allowCreate = false;
  @api allowEdit = false;
  @api allowDelete = false;

  calendar;

  // Inicializar quando o componente é conectado
  // Computed properties for dynamic classes and states
  get teamsLayoutClass() {
    return `teams-layout ${this.isSidebarCollapsed ? "sidebar-collapsed" : ""}`.trim();
  }

  get calendarContainerClass() {
    return `calendar-container-wrapper ${this.isSidebarCollapsed ? "sidebar-collapsed" : ""}`.trim();
  }

  get sidebarToggleTitle() {
    return this.isSidebarCollapsed
      ? "Expandir barra lateral"
      : "Recolher barra lateral";
  }

  connectedCallback() {
    // Enable calendar interactions by default
    this.allowCreate = true;
    this.allowEdit = true;
    this.allowDelete = true;

    // Load sidebar state from session storage
    this.loadSidebarState();

    // Initialize selected day to today
    const today = new Date();
    this.selectedSidebarDate = today.toISOString().split("T")[0];

    // Inicializar array de meses para a barra lateral
    this.initMonthsArray();

    // Initialize sidebar days array
    this.initSidebarDays();

    // Configurar o texto do mês e ano atual
    this.updateCurrentMonthYearText();

    // Set initial date range text for monthly view
    this.setInitialDateRangeForMonthView();

    // Initialize room availability
    this.initializeRoomAvailability();

    // Load available users for calendar selection
    this.loadAvailableUsers();

    // Initialize color legend
    this.initializeColorLegend();

    // Generate initial meeting suggestions
    this.generateMeetingSuggestions();

    // Load status picklist options for meeting outcome interface
    this.loadStatusPicklistOptions();
  }

  // ========================================
  // EVENT COLOR MANAGER EVENT HANDLERS
  // ========================================

  /**
   * Handle color update events from eventColorManager
   */
  handleColorUpdate(event) {
    const { eventId, customColor } = event.detail;
    // console.log("🎨 CalendarioReino: Color updated", { eventId, customColor });

    // Update local cache
    this.updateEventColorInCache(eventId, customColor);

    // Refresh calendar to show new color
    this.refreshCalendarAfterColorChange();
  }

  /**
   * Handle color clear events from eventColorManager
   */
  handleColorClear(event) {
    const { eventId } = event.detail;
    // console.log("🎨 CalendarioReino: Color cleared", { eventId });

    // Update local cache to clear custom color
    this.updateEventColorInCache(eventId, null);

    // Refresh calendar to show status/room-based color
    this.refreshCalendarAfterColorChange();
  }

  /**
   * Handle status update events from eventColorManager
   */
  handleStatusUpdate(event) {
    const { eventId, statusReuniao } = event.detail;
    // console.log("🎯 CalendarioReino: Status updated", { eventId, statusReuniao });

    // Update local cache
    this.updateEventStatusInCache(eventId, statusReuniao);

    // Refresh calendar to show new status-based color
    this.refreshCalendarAfterStatusChange();
  }

  /**
   * Handle outcome update events from eventColorManager
   */
  handleOutcomeUpdate(event) {
    const { eventId, reuniaoAconteceu } = event.detail;
    // console.log("🎯 CalendarioReino: Outcome updated", { eventId, reuniaoAconteceu });

    // Update local cache
    this.updateEventMeetingOutcomeInCache(eventId, reuniaoAconteceu);

    // Refresh calendar to show new outcome-based color
    this.refreshCalendarAfterStatusChange();
  }

  /**
   * Handle room update events from eventColorManager
   */
  handleRoomUpdate(event) {
    const { eventId, salaReuniao } = event.detail;
    // console.log("🏢 CalendarioReino: Room updated", { eventId, salaReuniao });

    // Update local cache
    this.updateEventRoomInCache(eventId, salaReuniao);

    // Refresh calendar to show new room-based color
    this.refreshCalendarAfterRoomChange();
  }

  /**
   * Clean up resources when component is disconnected
   */
  disconnectedCallback() {
    try {
      // Mutation observer cleanup removed - using default FullCalendar behavior

      // Clean up window resize listener
      if (this.handleResize) {
        window.removeEventListener("resize", this.handleResize.bind(this));
      }

      // Custom popover cleanup removed - using default FullCalendar behavior

      // Clean up color picker positioning listeners
      this.removeColorPickerPositionListeners();

      // Clean up calendar if it exists
      if (this.calendar) {
        try {
          this.calendar.fullCalendar("destroy");
          this.calendar = null;
          // console.log("🔧 CalendarioReino: Calendar destroyed");
        } catch (error) {
          // console.warn("Error destroying calendar:", error);
        }
      }

      // Clean up optimized event listeners
      this.cleanupOptimizedListeners();

      // console.log("🔧 CalendarioReino: Component cleanup completed");
    } catch (error) {
      console.error("Error during component cleanup:", error);
    }
  }

  // Inicializar quando o DOM está pronto
  renderedCallback() {
    // Get reference to eventColorManager component
    if (!this.eventColorManager) {
      this.eventColorManager = this.template.querySelector(
        "c-event-color-manager"
      );
    }

    // Initialize drag functionality for any open popups (fallback for first load)
    if (this.isMeetingSuggestionsExpanded) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        const popupHeaders = this.template.querySelectorAll(".popup-header");
        if (popupHeaders.length > 0) {
          popupHeaders.forEach((header) => {
            // Only initialize if not already draggable
            if (!header.hasAttribute('data-draggable-initialized')) {
              this.makeDraggable(header);
              header.setAttribute('data-draggable-initialized', 'true');
            }
          });
        }
      }, 50);
    }

    if (this.isCalendarInitialized) {
      return;
    }

    // Load dependencies sequentially to avoid race conditions
    this.loadDependenciesSequentially()
      .then(() => {
        this.isCalendarInitialized = true;
        this.initializeCalendarWithRetry();
      })
      .catch((error) => {
        this.error = error;
        this.isLoading = false;
        console.error("Error loading FullCalendar resources", error);
        this.showToast(
          "Erro",
          "Erro ao carregar recursos do calendário: " +
            this.extractErrorMessage(error),
          "error"
        );
      });
  }

  /**
   * Load dependencies in the correct order to prevent race conditions
   */
  async loadDependenciesSequentially() {
    try {
      // Step 1: Load CSS first (non-blocking)
      await loadStyle(this, FC_CSS_URL);

      // Step 2: Load jQuery first (required by FullCalendar)
      await loadScript(this, JQUERY_URL);
      await this.waitForGlobal("$", "jQuery");

      // Step 3: Load jQuery UI (depends on jQuery)
      await loadScript(this, JQUERY_UI_URL);

      // Step 4: Load Moment.js (required by FullCalendar)
      await loadScript(this, MOMENT_SCRIPT_URL);
      await this.waitForGlobal("moment");

      // Step 5: Load FullCalendar (depends on jQuery and Moment)
      await loadScript(this, FC_SCRIPT_URL);
      await this.waitForjQueryPlugin("fullCalendar");

      // Step 6: Load Portuguese locale (depends on FullCalendar)
      await loadScript(this, LOCALE_URL);

      // Step 7: Load Floating UI for smart positioning
      await loadScript(this, FLOATING_UI_SCRIPT_URL);
      await this.waitForGlobal("FloatingUIDOM");

      // console.log("All FullCalendar dependencies loaded successfully");
    } catch (error) {
      console.error("Error in sequential dependency loading:", error);
      throw error;
    }
  }

  /**
   * Wait for a global variable to be available
   */
  waitForGlobal(globalName, alternativeName = null, maxAttempts = 50) {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const checkGlobal = () => {
        attempts++;
        if (
          window[globalName] ||
          (alternativeName && window[alternativeName])
        ) {
          resolve();
        } else if (attempts >= maxAttempts) {
          reject(
            new Error(
              `Global variable ${globalName} not available after ${maxAttempts} attempts`
            )
          );
        } else {
          setTimeout(checkGlobal, 100);
        }
      };
      checkGlobal();
    });
  }

  /**
   * Wait for jQuery plugin to be available
   */
  waitForjQueryPlugin(pluginName, maxAttempts = 50) {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const checkPlugin = () => {
        attempts++;
        if (window.$ && typeof window.$.fn[pluginName] === "function") {
          resolve();
        } else if (attempts >= maxAttempts) {
          reject(
            new Error(
              `jQuery plugin ${pluginName} not available after ${maxAttempts} attempts`
            )
          );
        } else {
          setTimeout(checkPlugin, 100);
        }
      };
      checkPlugin();
    });
  }

  /**
   * Initialize calendar with retry mechanism
   */
  async initializeCalendarWithRetry(maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Ensure DOM element is available
        await this.waitForDOMElement(".calendar-container");

        // Validate all dependencies are loaded
        this.validateDependencies();

        // Initialize the calendar
        this.initializeCalendar();
        return; // Success, exit retry loop
      } catch (error) {
        console.error(
          `Calendar initialization attempt ${attempt} failed:`,
          error
        );

        if (attempt === maxRetries) {
          // Final attempt failed
          this.error = error;
          this.isLoading = false;
          this.showToast(
            "Erro",
            "Erro ao inicializar o calendário após múltiplas tentativas: " +
              this.extractErrorMessage(error),
            "error"
          );
          throw error;
        } else {
          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
        }
      }
    }
  }

  /**
   * Wait for DOM element to be available
   */
  waitForDOMElement(selector, maxAttempts = 20) {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const checkElement = () => {
        attempts++;
        const element = this.template.querySelector(selector);
        if (element) {
          resolve(element);
        } else if (attempts >= maxAttempts) {
          reject(
            new Error(
              `DOM element ${selector} not found after ${maxAttempts} attempts`
            )
          );
        } else {
          setTimeout(checkElement, 100);
        }
      };
      checkElement();
    });
  }

  /**
   * Validate that all required dependencies are loaded
   */
  validateDependencies() {
    if (!window.$) {
      throw new Error("jQuery ($) is not available");
    }
    if (!window.moment) {
      throw new Error("Moment.js is not available");
    }
    if (typeof window.$.fn.fullCalendar !== "function") {
      throw new Error("FullCalendar jQuery plugin is not available");
    }
    // console.log("All dependencies validated successfully");
  }

  /**
   * Inicializa o array de meses para exibição na barra lateral
   */
  initMonthsArray() {
    this.monthsInYear = monthNames.map((name, index) => {
      return {
        label: name,
        value: index,
        class:
          index === this.currentMonth ? "month-item selected" : "month-item"
      };
    });
  }

  /**
   * Set initial date range text for monthly view before calendar is initialized
   */
  setInitialDateRangeForMonthView() {
    if (this.defaultView === "month") {
      // Set current month and year text
      const today = new Date();
      const monthIndex = today.getMonth();
      const year = today.getFullYear();

      const monthNames = [
        "Janeiro",
        "Fevereiro",
        "Março",
        "Abril",
        "Maio",
        "Junho",
        "Julho",
        "Agosto",
        "Setembro",
        "Outubro",
        "Novembro",
        "Dezembro"
      ];

      // Format: "Maio de 2025"
      this.currentDateRangeText = `${monthNames[monthIndex]} de ${year}`;
    }
  }

  /**
   * Initialize sidebar days array for the current month
   */
  initSidebarDays() {
    this.generateSidebarDays();
  }

  /**
   * Generate days for the sidebar calendar view
   */
  generateSidebarDays() {
    const year = this.currentYear;
    const month = this.currentMonth;
    const today = new Date();
    const currentDate = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Get first day of the month and calculate starting point
    const firstDay = new Date(year, month, 1);
    const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday

    // Get last day of the month
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Get previous month info for padding
    const prevMonth = new Date(year, month, 0);
    const daysInPrevMonth = prevMonth.getDate();

    const days = [];

    // Add previous month's trailing days
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const date = new Date(year, month - 1, day);
      const dateStr = date.toISOString().split("T")[0];
      const isSelected = this.selectedSidebarDate === dateStr;

      let dayClass = "sidebar-day other-month";
      if (isSelected) dayClass += " selected";

      days.push({
        key: `prev-${day}`,
        label: day.toString(),
        date: dateStr,
        class: dayClass
      });
    }

    // Add current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split("T")[0];
      const isToday =
        day === currentDate && month === currentMonth && year === currentYear;
      const isSelected = this.selectedSidebarDate === dateStr;

      let dayClass = "sidebar-day";
      if (isToday) dayClass += " today";
      if (isSelected) dayClass += " selected";

      days.push({
        key: `current-${day}`,
        label: day.toString(),
        date: dateStr,
        class: dayClass
      });
    }

    // Add next month's leading days to complete the grid (6 weeks = 42 days)
    const totalCells = 42;
    const remainingCells = totalCells - days.length;
    for (let day = 1; day <= remainingCells; day++) {
      const date = new Date(year, month + 1, day);
      const dateStr = date.toISOString().split("T")[0];
      const isSelected = this.selectedSidebarDate === dateStr;

      let dayClass = "sidebar-day other-month";
      if (isSelected) dayClass += " selected";

      days.push({
        key: `next-${day}`,
        label: day.toString(),
        date: dateStr,
        class: dayClass
      });
    }

    this.sidebarDays = days;
  }

  /**
   * Atualizar o mês selecionado na UI
   */
  updateSelectedMonth(selectedMonth) {
    this.currentMonth = selectedMonth;
    this.monthsInYear = this.monthsInYear.map((month) => {
      return {
        ...month,
        class:
          month.value === selectedMonth ? "month-item selected" : "month-item"
      };
    });

    // Atualizar o texto do mês e ano no cabeçalho
    this.updateCurrentMonthYearText();
  }

  /**
   * Manipula a mudança de visualização do calendário (apenas Mês)
   */
  handleViewChange(event) {
    const selectedView = event.detail.value;
    if (this.calendar) {
      // Alterar a visualização do calendário
      this.calendar.fullCalendar("changeView", selectedView);

      // Atualizar o label do botão de visualização
      switch (selectedView) {
        case "month":
          this.currentViewLabel = "Mês";
          break;
        default:
          this.currentViewLabel = "Mês"; // Default to month view since it's the only option
      }

      // Atualizar o texto de data para refletir a nova visualização
      this.updateCurrentMonthYearText();
    }
  }

  /**
   * Formata os cabeçalhos da visualização de semana no estilo Teams
   * com o número do dia acima do nome do dia
   */
  formatWeekViewHeaders() {
    // Nomes curtos dos dias da semana
    const dayNames = [
      "Domingo",
      "Segunda-feira",
      "Terça-feira",
      "Quarta-feira",
      "Quinta-feira",
      "Sexta-feira",
      "Sábado"
    ];

    try {
      // Selecionar os cabeçalhos da visualização de semana
      const headerCells = this.template.querySelectorAll(
        ".fc-agendaWeek-view .fc-day-header"
      );
      if (!headerCells || headerCells.length === 0) {
        // console.log("Cabeçalhos da semana não encontrados");
        return;
      }

      headerCells.forEach((cell, index) => {
        const cellText = cell.textContent.trim();
        // Extrair o número do dia do texto do cabeçalho (formato DD/MM)
        const dayMatch = cellText.match(/(\d+)/);
        if (!dayMatch) {
          // console.log("Formato de data não reconhecido:", cellText);
          return;
        }

        const dayNumber = dayMatch[1];
        const dayName = dayNames[index % 7];

        // Limpar o conteúdo atual
        cell.innerHTML = "";

        // Criar elemento para o número do dia
        const dayNumberEl = document.createElement("div");
        dayNumberEl.className = "fc-header-day-number";
        dayNumberEl.textContent = dayNumber;

        // Criar elemento para o nome do dia
        const dayNameEl = document.createElement("div");
        dayNameEl.className = "fc-header-day-name";
        dayNameEl.textContent = dayName;

        // Adicionar elementos ao cabeçalho
        cell.appendChild(dayNumberEl);
        cell.appendChild(dayNameEl);
      });
    } catch (error) {
      console.error("Erro ao formatar cabeçalhos da semana:", error);
    }
  }

  // Inicializar o calendário FullCalendar
  initializeCalendar() {
    try {
      const calendarEl = this.template.querySelector(".calendar-container");

      // Validate that the calendar container exists
      if (!calendarEl) {
        throw new Error("Calendar container element not found");
      }

      // Validate that all dependencies are available
      if (!window.$) {
        throw new Error("jQuery is not loaded");
      }

      if (typeof window.$.fn.fullCalendar !== "function") {
        throw new Error("FullCalendar plugin is not available");
      }

      if (!window.moment) {
        throw new Error("Moment.js is not loaded");
      }

      // console.log("Initializing FullCalendar with validated dependencies");

      // Initialize the calendar
      this.calendar = $(calendarEl).fullCalendar({
        header: this.header,
        defaultView: this.defaultView,
        height: this.height,
        contentHeight: "auto", // Permitir que o conteúdo ajuste automaticamente
        aspectRatio: 1.8, // Proporção ajustada para permitir células maiores
        locale: "pt-br",
        timezone: "local", // Use browser's local timezone as per FullCalendar v3 docs
        navLinks: true,
        editable: this.allowEdit,
        selectable: this.allowCreate, // Enable selection for creating events
        selectConstraint: {
          // Allow selection in week and day views only
          start: "00:00",
          end: "24:00"
        },
        eventLimit: false, // Remove event display limit - show all events
        buttonText: this.buttonText, // Tradução dos botões
        timeFormat: "HH:mm", // Formato 24h para horários
        slotLabelFormat: "HH:mm", // Formato dos horários na visualização de agenda
        firstDay: 0, // Domingo como primeiro dia da semana
        weekNumbers: false, // Não mostrar números das semanas
        weekNumberTitle: "S", // Título para a coluna de números de semana (se habilitada)
        fixedWeekCount: false, // Não forçar sempre 6 semanas no mês
        slotEventOverlap: false, // Não sobrepor eventos na visualização de agenda (como no Teams)
        slotDuration: "01:00:00", // Define intervalos de 1 hora na visualização de agenda
        minTime: "07:00:00", // Inicia a visualização às 7h da manhã (removido 6:00 AM)
        maxTime: "22:00:00", // Termina a visualização às 22h
        scrollTime: "08:00:00", // Inicia o scroll às 8h da manhã
        slotLabelInterval: "01:00:00", // Mostra os rótulos de hora a cada 1 hora
        displayEventEnd: true, // Mostra horário de término dos eventos

        // Performance optimizations
        lazyFetching: true, // Only fetch events when needed
        eventRenderWait: 50, // Batch event rendering for better performance

        // Use custom events fetching method to integrate with Salesforce
        events: (start, end, timezone, callback) => {
          // Save the current view's date range - using moment since it's available in FullCalendar
          this.startDate = start.format("YYYY-MM-DD");
          this.endDate = end.format("YYYY-MM-DD");

          // Load events from Salesforce
          this.loadEventsFromSalesforce(start, end, callback);
        },

        // Handle timezone correctly when events are received
        eventDataTransform: (event) => {
          // If event has ISO strings, use moment to parse them properly
          if (event.start && typeof event.start === "string") {
            // Use moment to parse ISO strings with timezone info
            // This avoids the 3-hour shift issue mentioned in memories
            event.start = moment(event.start);
          }
          if (event.end && typeof event.end === "string") {
            event.end = moment(event.end);
          }
          return event;
        },

        // Custom event rendering to show enhanced information
        eventRender: (event, element) => {
          return this.renderEnhancedEvent(event, element);
        },

        // Handle events after they are rendered
        eventAfterAllRender: (view) => {
          // Apply any post-render styling or setup
          // console.log("Events rendered for view:", view.name);
        },

        // Disable event resizing and dragging
        editable: false,
        eventResizable: false,
        eventDurationEditable: false,
        eventStartEditable: false,
        disableDragging: true,

        // Handlers for user interactions
        eventClick: (calEvent) => {
          if (this.allowEdit || this.allowDelete) {
            this.handleEventClick(calEvent);
          }
        },
        eventDrop: (event) => {
          if (this.allowEdit) {
            this.handleEventChange(event);
          }
        },
        eventResize: (event) => {
          if (this.allowEdit) {
            this.handleEventChange(event);
          }
        },
        select: (start, end) => {
          // Desabilita a seleção na visualização de mês
          const view = this.calendar.fullCalendar("getView");
          if (view.name !== "month" && this.allowCreate) {
            this.handleDateSelect(start, end);
          }
        },
        dayClick: (date, jsEvent, view) => {
          // Handle day clicks in month view to create new appointments
          if (view.name === "month" && this.allowCreate) {
            // Check if the click was on a day number element - if so, ignore it
            const target = jsEvent.target;
            const isDayNumber =
              target.classList.contains("fc-day-number") ||
              target.closest(".fc-day-number");

            if (!isDayNumber) {
              this.handleDayClick(date);
            }
          }
        },
        viewRender: (view) => {
          // Atualizar a visualização e o texto do mês
          this.updateCurrentMonthYearText();

          // For month view, highlight selected day header
          setTimeout(() => this.highlightSelectedDayHeader(), 50);

          // Force refresh happening now indicators when view changes
          setTimeout(() => this.refreshAllHappeningNowIndicators(), 100);

          // Remover a classe de loading
          this.isLoading = false;
        }
      });

      // Após inicialização, atualizar a UI da barra lateral para refletir a data atual
      this.updateSidebarFromCalendar();

      // Configurar listener para redimensionamento da janela com passive option
      window.addEventListener("resize", this.handleResize.bind(this), {
        passive: true
      });

      this.isLoading = false;
      // console.log("FullCalendar initialized successfully");

      // Optimize event listeners for better performance
      this.optimizeEventListeners();

      // Custom popover setup methods removed - using default FullCalendar behavior
    } catch (error) {
      console.error("Error initializing calendar:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        jQueryAvailable: !!window.$,
        momentAvailable: !!window.moment,
        fullCalendarAvailable: !!(
          window.$ &&
          window.$.fn &&
          window.$.fn.fullCalendar
        ),
        calendarElement: !!this.template.querySelector(".calendar-container")
      });

      this.error = error;
      this.isLoading = false;

      // Provide more specific error messages
      let errorMessage = "Erro ao inicializar o calendário";
      if (error.message.includes("jQuery")) {
        errorMessage = "Erro: jQuery não foi carregado corretamente";
      } else if (error.message.includes("fullCalendar")) {
        errorMessage = "Erro: FullCalendar não foi carregado corretamente";
      } else if (error.message.includes("moment")) {
        errorMessage = "Erro: Moment.js não foi carregado corretamente";
      } else if (error.message.includes("container")) {
        errorMessage = "Erro: Elemento do calendário não encontrado";
      } else {
        errorMessage =
          "Erro ao inicializar o calendário: " +
          this.extractErrorMessage(error);
      }

      this.showToast("Erro", errorMessage, "error");

      // Re-throw error to be caught by retry mechanism
      throw error;
    }
  }
  /**
   * Optimize event listeners to reduce browser warnings about non-passive listeners
   */
  optimizeEventListeners() {
    try {
      // Add passive listeners to calendar container for better scroll performance
      const calendarContainer = this.template.querySelector(
        ".calendar-container"
      );
      if (calendarContainer) {
        // Store original addEventListener for cleanup
        this.originalAddEventListener = calendarContainer.addEventListener;

        // Override FullCalendar's wheel event listeners with passive ones where possible
        calendarContainer.addEventListener = function (
          type,
          listener,
          options
        ) {
          if (
            type === "wheel" ||
            type === "mousewheel" ||
            type === "touchmove" ||
            type === "touchstart"
          ) {
            // Make scroll-related events passive for better performance
            const passiveOptions =
              typeof options === "object"
                ? { ...options, passive: true }
                : { passive: true };
            return this.originalAddEventListener.call(
              this,
              type,
              listener,
              passiveOptions
            );
          }
          return this.originalAddEventListener.call(
            this,
            type,
            listener,
            options
          );
        }.bind(this);
      }

      // Debounce resize events to reduce performance impact
      this.optimizedResize = () => {
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
          if (this.calendar) {
            this.calendar.fullCalendar("render");
          }
        }, 150); // Debounce resize events
      };

      // Replace the existing resize listener with optimized version
      window.removeEventListener("resize", this.handleResize.bind(this));
      window.addEventListener("resize", this.optimizedResize, {
        passive: true
      });
    } catch (error) {
      // Silently handle optimization errors - calendar will still work
      // console.warn("Event listener optimization failed:", error);
    }
  }

  /**
   * Clean up optimized event listeners
   */
  cleanupOptimizedListeners() {
    try {
      // Remove optimized resize listener
      if (this.optimizedResize) {
        window.removeEventListener("resize", this.optimizedResize);
      }

      // Clear resize timeout
      if (this.resizeTimeout) {
        clearTimeout(this.resizeTimeout);
      }

      // Restore original addEventListener if it was overridden
      const calendarContainer = this.template.querySelector(
        ".calendar-container"
      );
      if (calendarContainer && this.originalAddEventListener) {
        calendarContainer.addEventListener = this.originalAddEventListener;
      }
    } catch (error) {
      // Silently handle cleanup errors
      // console.warn("Event listener cleanup failed:", error);
    }
  }

  /**
   * Atualiza a barra lateral com base na data atual do calendário
   */
  updateSidebarFromCalendar() {
    if (this.calendar) {
      const currentDate = this.calendar.fullCalendar("getDate");
      this.currentYear = currentDate.year();
      this.updateSelectedMonth(currentDate.month());
      this.updateCurrentMonthYearText();
    }
  }

  /**
   * Atualiza o texto do mês e ano atual para o cabeçalho
   */
  updateCurrentMonthYearText() {
    const monthNames = [
      "Janeiro",
      "Fevereiro",
      "Março",
      "Abril",
      "Maio",
      "Junho",
      "Julho",
      "Agosto",
      "Setembro",
      "Outubro",
      "Novembro",
      "Dezembro"
    ];
    const shortMonthNames = [
      "Jan",
      "Fev",
      "Mar",
      "Abr",
      "Mai",
      "Jun",
      "Jul",
      "Ago",
      "Set",
      "Out",
      "Nov",
      "Dez"
    ];

    this.currentMonthYear = `${monthNames[this.currentMonth]} de ${this.currentYear}`;

    // Atualizar o texto do botão de data para visualização de mês
    if (this.calendar) {
      // Formato para visualização de mês: "Maio de 2025"
      this.currentDateRangeText = `${monthNames[this.currentMonth]} de ${this.currentYear}`;

      // Também atualizar as variáveis do seletor de data
      this.pickerYear = this.currentYear;
      this.pickerMonth = this.currentMonth;
      this.updatePickerMonthYearText();
    }
  }

  /**
   * Atualiza o texto do mês e ano no popup de calendário
   */
  updatePickerMonthYearText() {
    const shortMonthNames = [
      "Jan",
      "Fev",
      "Mar",
      "Abr",
      "Mai",
      "Jun",
      "Jul",
      "Ago",
      "Set",
      "Out",
      "Nov",
      "Dez"
    ];
    this.pickerMonthYear = `${shortMonthNames[this.pickerMonth]} ${this.pickerYear}`;
  }

  // Navigation methods for the buttons
  navigateToToday() {
    if (this.calendar) {
      this.calendar.fullCalendar("today");

      // Highlight selected day header for month view
      setTimeout(() => this.highlightSelectedDayHeader(), 50);

      // Atualizar o texto da data
      this.updateCurrentMonthYearText();

      // Atualizar a UI da barra lateral para o dia atual
      const today = new Date();
      this.currentYear = today.getFullYear();
      this.currentMonth = today.getMonth();

      // Update selected day to today
      this.selectedSidebarDate = today.toISOString().split("T")[0];

      this.updateSelectedMonth(today.getMonth());
      this.generateSidebarDays(); // Regenerate to show selection

      this.showToast("Calendário", "Navegando para o dia atual", "success");
    }
  }

  navigateToPrev() {
    if (this.calendar) {
      this.calendar.fullCalendar("prev");
      this.updateSidebarFromCalendar();

      // Atualizar o texto da data
      this.updateCurrentMonthYearText();

      // Highlight selected day header for month view
      setTimeout(() => this.highlightSelectedDayHeader(), 50);

      // Force refresh happening now indicators after navigation
      setTimeout(() => this.refreshAllHappeningNowIndicators(), 100);
    }
  }

  navigateToNext() {
    if (this.calendar) {
      this.calendar.fullCalendar("next");
      this.updateSidebarFromCalendar();

      // Atualizar o texto da data
      this.updateCurrentMonthYearText();

      // Highlight selected day header for month view
      setTimeout(() => this.highlightSelectedDayHeader(), 50);

      // Force refresh happening now indicators after navigation
      setTimeout(() => this.refreshAllHappeningNowIndicators(), 100);
    }
  }

  /**
   * Toggle sidebar collapsed/expanded state with premium animations
   */
  toggleSidebar() {
    // Add closing animation class before state change
    if (!this.isSidebarCollapsed) {
      const sidebar = this.template.querySelector(".teams-sidebar");
      if (sidebar) {
        sidebar.style.animation =
          "slideOutLeft 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards";
      }

      // Delay state change to allow closing animation
      setTimeout(() => {
        this.isSidebarCollapsed = true;
        this.saveSidebarState();
        this.handleCalendarResize();
        this.manageFocusDuringTransition();
      }, 200); // Half of animation duration for smooth transition
    } else {
      // Immediate state change for opening (animation handled by CSS)
      this.isSidebarCollapsed = false;
      this.saveSidebarState();

      // Slight delay for calendar resize to ensure sidebar is rendered
      setTimeout(() => {
        this.handleCalendarResize();
        this.manageFocusDuringTransition();
      }, 100);
    }
  }

  /**
   * Handle calendar resize with improved timing
   */
  handleCalendarResize() {
    // Force calendar to re-render after sidebar state change
    setTimeout(() => {
      if (this.calendar) {
        this.calendar.fullCalendar("render");
      }
    }, 400); // Wait for full animation to complete
  }

  /**
   * Handle focus management during sidebar transitions
   */
  manageFocusDuringTransition() {
    const toggleButton = this.template.querySelector(
      ".teams-sidebar-toggle-button-custom"
    );
    if (toggleButton) {
      // Maintain focus on toggle button during transition
      toggleButton.focus();

      // Announce state change to screen readers
      const announcement = this.isSidebarCollapsed
        ? "Barra lateral recolhida"
        : "Barra lateral expandida";

      // Create temporary announcement for screen readers
      const announcer = document.createElement("div");
      announcer.setAttribute("aria-live", "polite");
      announcer.setAttribute("aria-atomic", "true");
      announcer.style.position = "absolute";
      announcer.style.left = "-10000px";
      announcer.textContent = announcement;

      document.body.appendChild(announcer);
      setTimeout(() => {
        document.body.removeChild(announcer);
      }, 1000);
    }
  }

  /**
   * Load sidebar state from session storage
   */
  loadSidebarState() {
    try {
      const savedState = sessionStorage.getItem(
        "calendarioReino_sidebarCollapsed"
      );
      if (savedState !== null) {
        this.isSidebarCollapsed = JSON.parse(savedState);
      }
    } catch (error) {
      console.warn("Error loading sidebar state:", error);
      this.isSidebarCollapsed = false; // Default to expanded
    }
  }

  /**
   * Save sidebar state to session storage
   */
  saveSidebarState() {
    try {
      sessionStorage.setItem(
        "calendarioReino_sidebarCollapsed",
        JSON.stringify(this.isSidebarCollapsed)
      );
    } catch (error) {
      console.warn("Error saving sidebar state:", error);
    }
  }

  // Método para atualizar a visualização quando o tamanho da janela muda
  handleResize() {
    if (this.calendar) {
      // Recalcular o tamanho do calendário
      this.calendar.fullCalendar("render");
    }
  }

  // Métodos para controle da barra lateral

  /**
   * Toggle between days view and months view in sidebar
   */
  toggleMonthSection() {
    this.isMonthSectionExpanded = !this.isMonthSectionExpanded;
    this.monthSectionIcon = this.isMonthSectionExpanded
      ? "utility:chevrondown"
      : "utility:chevronright";
  }

  /**
   * Alternar a exibição da seção de calendários
   */
  toggleCalendarsSection() {
    this.isCalendarsSectionExpanded = !this.isCalendarsSectionExpanded;
    this.calendarsSectionIcon = this.isCalendarsSectionExpanded
      ? "utility:chevrondown"
      : "utility:chevronright";
  }

  /**
   * Navigate to previous month in sidebar
   */
  navigateToPrevMonth(event) {
    event.stopPropagation();
    if (this.currentMonth === 0) {
      this.currentMonth = 11;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }
    this.updateCalendarMonth();
    this.generateSidebarDays();
    this.updateCurrentMonthYearText();

    // Highlight selected day header after month change
    setTimeout(() => this.highlightSelectedDayHeader(), 100);

    // Force refresh happening now indicators after month navigation
    setTimeout(() => this.refreshAllHappeningNowIndicators(), 150);
  }

  /**
   * Navigate to next month in sidebar
   */
  navigateToNextMonth(event) {
    event.stopPropagation();
    if (this.currentMonth === 11) {
      this.currentMonth = 0;
      this.currentYear++;
    } else {
      this.currentMonth++;
    }
    this.updateCalendarMonth();
    this.generateSidebarDays();
    this.updateCurrentMonthYearText();

    // Highlight selected day header after month change
    setTimeout(() => this.highlightSelectedDayHeader(), 100);

    // Force refresh happening now indicators after month navigation
    setTimeout(() => this.refreshAllHappeningNowIndicators(), 150);
  }

  /**
   * Update calendar to show the current month/year
   */
  updateCalendarMonth() {
    if (this.calendar) {
      const newDate = new Date(this.currentYear, this.currentMonth, 1);
      this.calendar.fullCalendar("gotoDate", newDate);
      this.updateSelectedMonth(this.currentMonth);
    }
  }

  /**
   * Atualizar o calendário para o ano atual
   */
  updateCalendarYear() {
    if (this.calendar) {
      // Obter a data atual do calendário
      const currentDate = this.calendar.fullCalendar("getDate");
      // Criar uma nova data com o ano modificado, mantendo mês e dia
      const newDate = moment(currentDate).year(this.currentYear).toDate();
      // Ir para a nova data
      this.calendar.fullCalendar("gotoDate", newDate);
      // Atualizar a matriz de meses
      this.updateSelectedMonth(newDate.getMonth());
    }
  }

  /**
   * Handle sidebar day selection
   */
  handleSidebarDaySelect(event) {
    const dateStr = event.currentTarget.dataset.date;
    if (!dateStr) return;

    // Update selected day state
    this.selectedSidebarDate = dateStr;

    const parts = dateStr.split("-");
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);

    // Navigate calendar to selected date
    if (this.calendar) {
      this.calendar.fullCalendar("gotoDate", new Date(year, month, day));

      // Update sidebar state if date is in different month
      if (month !== this.currentMonth || year !== this.currentYear) {
        this.currentMonth = month;
        this.currentYear = year;
        this.generateSidebarDays();
        this.updateSelectedMonth(month);
      } else {
        // If staying in the same month, just regenerate days to update selection highlighting
        this.generateSidebarDays();
      }

      this.updateCurrentMonthYearText();

      // For month view, highlight selected day header
      setTimeout(() => this.highlightSelectedDayHeader(), 50);
    }
  }

  /**
   * Highlight the selected day header in the main calendar view
   */
  highlightSelectedDayHeader() {
    if (!this.selectedSidebarDate || !this.calendar) return;

    try {
      // Remove previous selection highlighting
      const previousSelected = this.template.querySelectorAll(
        ".fc-day-header.selected-day"
      );
      previousSelected.forEach((header) => {
        header.classList.remove("selected-day");
      });

      // Parse the selected date using moment for consistency
      const selectedMoment = moment(this.selectedSidebarDate);

      // Get current calendar view
      const view = this.calendar.fullCalendar("getView");

      // In month view, find day header by matching the day of week
      const selectedDayOfWeek = selectedMoment.day(); // 0 = Sunday, 1 = Monday, etc.
      const dayHeaders = this.template.querySelectorAll(".fc-day-header");

      // Month view headers represent days of the week, not specific dates
      // We need to check if the selected date falls within the current month view
      const viewStart = moment(view.start);
      const viewEnd = moment(view.end);

      if (selectedMoment.isBetween(viewStart, viewEnd, "day", "[]")) {
        // Find the header that corresponds to the day of week of our selected date
        dayHeaders.forEach((header, index) => {
          if (index === selectedDayOfWeek) {
            header.classList.add("selected-day");
          }
        });
      }
    } catch (error) {
      console.error("Error highlighting selected day header:", error);
    }
  }

  /**
   * Manipular a seleção de um mês
   */
  handleMonthSelect(event) {
    const selectedMonth = parseInt(event.currentTarget.dataset.month, 10);
    this.updateSelectedMonth(selectedMonth);

    if (this.calendar) {
      // Obter a data atual do calendário
      const currentDate = this.calendar.fullCalendar("getDate");
      // Criar uma nova data com o mês selecionado, mantendo o ano e definindo o dia como 1
      const newDate = moment(currentDate).month(selectedMonth).date(1).toDate();
      // Ir para a nova data
      this.calendar.fullCalendar("gotoDate", newDate);
    }

    // Update sidebar days for the new month
    this.generateSidebarDays();

    // Collapse back to days view
    this.isMonthSectionExpanded = false;
    this.monthSectionIcon = "utility:chevronright";

    // Highlight selected day header after month change
    setTimeout(() => this.highlightSelectedDayHeader(), 100);
  }

  /**
   * Manipular clique no link "Exibir tudo"
   */
  handleViewAllCalendars() {
    // Implementação futura - por enquanto apenas um placeholder
    this.showToast(
      "Calendários",
      "Função para exibir todos os calendários será implementada em breve",
      "info"
    );
  }

  /**
   * Manipulador para o botão de criar novo evento
   */
  handleCreateEvent() {
    // Reset appointment editor properties
    this.selectedEventId = null;
    this.prefilledWhoId = null;
    this.prefilledWhatId = null;
    this.selectedEventData = null; // Clear any existing event data

    // Open the appointment editor modal
    this.showAppointmentEditor = true;
  }

  /**
   * Handle appointment editor close event
   */
  handleAppointmentEditorClose() {
    this.showAppointmentEditor = false;
    this.selectedEventId = null;
    this.prefilledWhoId = null;
    this.prefilledWhatId = null;
    this.selectedEventData = null;
    this.selectedStartDate = null;
    this.selectedEndDate = null;
    this.suggestionData = null;
  }

  /**
   * Handle Lead Event Editor close event - COMMENTED OUT - PAUSED LEAD EVENT SYSTEM
   */
  /*
  handleLeadEventEditorClose() {
    this.showLeadEventEditor = false;
    this.selectedLeadId = null;
    this.selectedLeadEventId = null;
  }

  /**
   * Handle Lead Event Editor save event - COMMENTED OUT - PAUSED LEAD EVENT SYSTEM
   */
  /*
  handleLeadEventEditorSave(event) {
    // Refresh calendar after Lead event is saved
    this.refreshCalendar();

    // Show success message
    this.showToast("Sucesso", "Lead Event atualizado com sucesso", "success");

    // Close the editor
    this.handleLeadEventEditorClose();
  }
  */

  /**
   * Handle Lead Events toggle in sidebar - COMMENTED OUT - PAUSED LEAD EVENT SYSTEM
   */
  /*
  handleLeadEventsToggle(event) {
    this.showLeadEvents = event.target.checked;

    // Refresh calendar to show/hide Lead events
    this.refreshCalendar();

    // Show feedback message
    const message = this.showLeadEvents
      ? "Eventos de Leads habilitados"
      : "Eventos de Leads desabilitados";
    this.showToast("Info", message, "info");
  }
  */

  /**
   * Handle participant click events from eventParticipantDisplay components
   */
  handleParticipantClick(event) {
    // console.log("👥 CalendarioReino: Participant clicked", event.detail);

    const { participantName, triggerElement } = event.detail;

    if (participantName && triggerElement) {
      // Get reference to the participant details modal
      const participantModal = this.template.querySelector(
        "c-participant-details-modal"
      );

      if (participantModal) {
        participantModal.showModal(participantName, triggerElement);
      } else {
        console.error(
          "👥 CalendarioReino: Participant details modal not found"
        );
      }
    }
  }

  /**
   * Handle participant details modal close
   */
  handleParticipantModalClose() {
    // console.log("👥 CalendarioReino: Participant modal closed");
    // Modal handles its own visibility, no action needed here
  }

  /**
   * Handle event click from participant details modal
   */
  handleParticipantModalEventClick(event) {
    // console.log(
    //   "👥 CalendarioReino: Event clicked from participant modal",
    //   event.detail
    // );

    const { eventId } = event.detail;

    if (eventId) {
      // Close the participant modal first
      const participantModal = this.template.querySelector(
        "c-participant-details-modal"
      );
      if (participantModal) {
        participantModal.hideModal();
      }

      // Open the appointment editor for the selected event
      this.selectedEventId = eventId;
      this.showAppointmentEditor = true;

      // Clear other prefilled data since we're editing an existing event
      this.prefilledWhoId = null;
      this.prefilledWhatId = null;
      this.selectedStartDate = null;
      this.selectedEndDate = null;
      this.suggestionData = null;
    }
  }

  /**
   * Handle appointment saved event
   */
  handleAppointmentSaved(event) {
    // console.log("🔄 CalendarioReino: handleAppointmentSaved called", event);

    // Extract event details for cache updates
    const eventDetail = event.detail || {};
    const eventId = eventDetail.id;
    const action = eventDetail.action;
    const updatedData = eventDetail.updatedData || {};

    // console.log("🔄 CalendarioReino: Event details", {
    //   eventId,
    //   action,
    //   updatedData
    // });

    // Update local cache with new data if available (for updates)
    if (action === "update" && eventId && updatedData) {
      // Update room assignment if changed
      if (updatedData.salaReuniao !== undefined) {
        // console.log(
        //     `🏢 CalendarioReino: Updating room for event ${eventId} to "${updatedData.salaReuniao}"`
        // );
        this.updateEventRoomInCache(eventId, updatedData.salaReuniao);
      }

      // Update status if changed
      if (updatedData.statusReuniao !== undefined) {
        // console.log(
        //   `🎯 CalendarioReino: Updating status for event ${eventId} to "${updatedData.statusReuniao}"`
        // );
        this.updateEventMeetingStatusInCache(
          eventId,
          updatedData.statusReuniao
        );
      }

      // Update custom color if changed
      if (updatedData.customColor !== undefined) {
        // console.log(
        //   `🎨 CalendarioReino: Updating color for event ${eventId} to "${updatedData.customColor}"`
        // );
        this.updateEventColorInCache(eventId, updatedData.customColor);
      }

      // Force calendar re-render to apply color changes
      this.forceCalendarColorRefresh();
    }

    // Check if this appointment was created from a meeting suggestion
    const wasFromSuggestion = this.suggestionData !== null;
    const usedSuggestionData = this.suggestionData;

    this.showAppointmentEditor = false;
    this.selectedEventId = null;
    this.prefilledWhoId = null;
    this.prefilledWhatId = null;
    this.selectedEventData = null;
    this.selectedStartDate = null;
    this.selectedEndDate = null;
    this.suggestionData = null;

    // Enhanced calendar refresh with multiple strategies
    this.refreshCalendarAfterSave();

    // If appointment was created from a suggestion, provide specific feedback
    if (wasFromSuggestion && usedSuggestionData) {
      // console.log(
      //   "🔄 CalendarioReino: Appointment created from meeting suggestion",
      //   usedSuggestionData
      // );
      this.showToast(
        "Sucesso",
        "Compromisso criado com sucesso! As sugestões serão atualizadas automaticamente.",
        "success"
      );
    } else {
      this.showToast("Sucesso", "Compromisso salvo com sucesso!", "success");
    }
  }

  /**
   * Enhanced calendar refresh method with multiple strategies
   */
  refreshCalendarAfterSave() {
    // console.log("🔄 CalendarioReino: refreshCalendarAfterSave called");

    if (!this.calendar) {
      console.warn(
        "🔄 CalendarioReino: Calendar not initialized, cannot refresh"
      );
      return;
    }

    try {
      // Strategy 1: Clear event cache and force complete refresh
      // console.log(
      //   "🔄 CalendarioReino: Clearing event cache and forcing complete refresh"
      // );

      // Clear the local events cache to ensure fresh data
      this.events = [];
      this.allEvents = [];

      // Remove all events from FullCalendar
      this.calendar.fullCalendar("removeEvents");

      // Force refetch events from Salesforce
      this.calendar.fullCalendar("refetchEvents");

      // Strategy 2: Force complete re-render of calendar after data loads
      setTimeout(() => {
        // console.log("🔄 CalendarioReino: Force re-rendering calendar view");
        if (this.calendar) {
          // Force a complete re-render of the calendar
          this.calendar.fullCalendar("render");

          // Also trigger a view refresh to ensure event cards are re-rendered
          const currentView = this.calendar.fullCalendar("getView");
          if (currentView) {
            this.calendar.fullCalendar("changeView", currentView.name);
          }

          // Calendar re-rendered successfully
          // console.log("Calendar re-rendered after filter change");
        }
      }, 800);

      // Strategy 3: Update related components and verify refresh
      setTimeout(() => {
        // console.log(
        //   "🔄 CalendarioReino: Updating related components and verifying refresh"
        // );

        // Update color legend in case new events with custom colors were added
        this.updateColorLegendCounts();

        // Update room availability after saving an appointment
        this.updateRoomAvailability();

        // Refresh all participant displays in sidebar cards
        this.refreshAllParticipantDisplays();

        // Verify that events were actually refreshed
        this.verifyEventRefresh();
      }, 1200);

      // Strategy 4: Force refresh meeting suggestions with fresh data
      setTimeout(() => {
        // console.log(
        //   "🔄 CalendarioReino: Force refreshing meeting suggestions with fresh data"
        // );
        this.forceRefreshMeetingSuggestions();
      }, 1500);
    } catch (error) {
      console.error(
        "🔄 CalendarioReino: Error during calendar refresh:",
        error
      );

      // Fallback: Show a message to user about manual refresh
      this.showToast(
        "Aviso",
        "Evento salvo com sucesso. Se não aparecer, clique no botão Atualizar.",
        "warning"
      );
    }
  }

  /**
   * Verify that the event refresh was successful
   */
  verifyEventRefresh() {
    try {
      if (this.calendar) {
        const clientEvents = this.calendar.fullCalendar("clientEvents");
        // console.log(
        `🔄 CalendarioReino: Verification - ${clientEvents.length} events currently displayed`;

        // Log a few event details to verify they have current data
        if (clientEvents.length > 0) {
          // console.log("CalendarioReino: Sample event data:", {
          // id: clientEvents[0].id,
          // title: clientEvents[0].title,
          // start: clientEvents[0].start,
          // end: clientEvents[0].end,
          // color: clientEvents[0].color
          // });
        }

        // Force re-render of all event elements to ensure visual updates
        this.forceEventElementsRefresh();
      }
    } catch (error) {
      console.error(
        "🔄 CalendarioReino: Error during event refresh verification:",
        error
      );
    }
  }

  /**
   * Force refresh of event DOM elements to ensure visual updates
   */
  forceEventElementsRefresh() {
    try {
      // console.log("🔄 CalendarioReino: Force refreshing event DOM elements");

      // Get all event elements in the calendar
      const calendarContainer = this.template.querySelector(
        ".calendar-container"
      );
      if (calendarContainer) {
        const eventElements = calendarContainer.querySelectorAll(".fc-event");
        // console.log(
        //   `🔄 CalendarioReino: Found ${eventElements.length} event elements to refresh`
        // );

        // Force a repaint by temporarily hiding and showing elements
        eventElements.forEach((element, index) => {
          setTimeout(() => {
            if (element && element.style) {
              element.style.visibility = "hidden";
              setTimeout(() => {
                if (element && element.style) {
                  element.style.visibility = "visible";
                }
              }, 10);
            }
          }, index * 5); // Stagger the refresh to avoid performance issues
        });
      }
    } catch (error) {
      console.error(
        "🔄 CalendarioReino: Error during event elements refresh:",
        error
      );
    }
  }

  /**
   * Force refresh meeting suggestions with fresh event data
   */
  forceRefreshMeetingSuggestions() {
    try {
      // console.log("🔄 CalendarioReino: Force refreshing meeting suggestions");

      // Clear current suggestions to show loading state
      this.isLoadingSuggestions = true;
      this.meetingSuggestions = [];

      // Get fresh event data from FullCalendar
      if (this.calendar) {
        const clientEvents = this.calendar.fullCalendar("clientEvents");
        // console.log(
        //   `🔄 CalendarioReino: Using ${clientEvents.length} fresh events for suggestions`
        // );

        // Update allEvents with fresh data from FullCalendar
        this.allEvents = clientEvents.map((event) => ({
          id: event.id,
          title: event.title,
          start: event.start ? event.start.format() : event.start,
          end: event.end ? event.end.format() : event.end,
          description: event.description,
          location: event.location,
          allDay: event.allDay,
          whoId: event.whoId,
          whatId: event.whatId,
          type: event.type,
          salaReuniao: event.salaReuniao,
          gestorName: event.gestorName,
          liderComercialName: event.liderComercialName,
          sdrName: event.sdrName,
          customColor: event.customColor,
          statusReuniao: event.statusReuniao,
          reuniaoAconteceu: event.reuniaoAconteceu, // Meeting outcome field
          ownerId: event.ownerId,
          ownerName: event.ownerName,
          hasContact: event.hasContact,
          hasLead: event.hasLead,
          hasOpportunity: event.hasOpportunity,
          hasAccount: event.hasAccount,
          attachmentType: event.attachmentType
        }));
      }

      // Force regenerate suggestions with fresh data
      setTimeout(() => {
        // console.log(
        //   "🔄 CalendarioReino: Regenerating suggestions with updated event data"
        // );
        this.generateMeetingSuggestions();

        // Force UI refresh of suggestions section
        setTimeout(() => {
          this.forceSuggestionsUIRefresh();
        }, 200);
      }, 100);
    } catch (error) {
      console.error(
        "🔄 CalendarioReino: Error during meeting suggestions refresh:",
        error
      );
      this.isLoadingSuggestions = false;
    }
  }

  /**
   * Force UI refresh of the meeting suggestions section
   */
  forceSuggestionsUIRefresh() {
    try {
      // console.log("🔄 CalendarioReino: Force refreshing suggestions UI");

      // Find the suggestions container and force a repaint
      const suggestionsContainer = this.template.querySelector(
        ".meeting-suggestions-content"
      );
      if (suggestionsContainer) {
        // Temporarily hide and show to force re-render
        suggestionsContainer.style.visibility = "hidden";
        setTimeout(() => {
          if (suggestionsContainer) {
            suggestionsContainer.style.visibility = "visible";
          }
        }, 50);
      }

      // Log the final state
      // console.log(
      //   `🔄 CalendarioReino: Suggestions refresh complete - ${this.meetingSuggestions.length} suggestions available`
      // );
    } catch (error) {
      console.error(
        "🔄 CalendarioReino: Error during suggestions UI refresh:",
        error
      );
    }
  }

  /**
   * Normalize text by removing diacritical marks (accents, tildes, cedillas, etc.)
   * Supports comprehensive Portuguese diacritics for accent-insensitive search
   *
   * Examples:
   * - "João" → "joao"
   * - "Reunião" → "reuniao"
   * - "Descrição" → "descricao"
   * - "Localização" → "localizacao"
   *
   * Supported diacritics:
   * - Acute accents: á, é, í, ó, ú → a, e, i, o, u
   * - Circumflex accents: â, ê, ô → a, e, o
   * - Tilde: ã, õ, ñ → a, o, n
   * - Cedilla: ç → c
   * - Grave accents: à → a
   *
   * @param {string} text - The text to normalize
   * @returns {string} - Normalized text without diacritics and in lowercase
   */
  normalizeText(text) {
    if (!text || typeof text !== "string") return "";

    // Use Unicode normalization to decompose characters, then remove combining marks
    return text
      .normalize("NFD") // Decompose characters into base + combining marks
      .replace(/[\u0300-\u036f]/g, "") // Remove combining diacritical marks
      .toLowerCase(); // Convert to lowercase for case-insensitive comparison
  }

  /**
   * Handle search input change
   */
  handleSearchChange(event) {
    this.searchTerm = event.target.value;
    this.applyFilters();
  }

  /**
   * Handle fuzzy search suggestion selection - COMMENTED OUT
   */
  // handleFuzzySuggestionSelected(event) {
  //   const { suggestion } = event.detail;

  //   // Update the main search term with the selected suggestion
  //   this.searchTerm = suggestion;

  //   // Apply filters with the corrected search term
  //   this.applyFilters();
  // }

  /**
   * Handle fuzzy search input cleared - COMMENTED OUT
   */
  // handleFuzzySearchCleared(event) {
  //   // Clear the main search term
  //   this.searchTerm = "";

  //   // Reset calendar to show all events (unfiltered state)
  //   this.applyFilters();
  // }

  /**
   * Hide fuzzy search interface - COMMENTED OUT
   */
  // hideFuzzySearch() {
  //   this.isFuzzySearchVisible = false;
  // }

  /**
   * Show fuzzy search interface - COMMENTED OUT
   */
  // showFuzzySearch() {
  //   this.isFuzzySearchVisible = true;
  // }

  /**
   * Toggle fuzzy search visibility (for backward compatibility) - COMMENTED OUT
   */
  // toggleFuzzySearchExpanded() {
  //   this.isFuzzySearchVisible = !this.isFuzzySearchVisible;
  // }

  /**
   * Clear fuzzy search programmatically - COMMENTED OUT
   */
  // clearFuzzySearch() {
  //   // Clear the main search term
  //   this.searchTerm = "";

  //   // Get reference to fuzzy search component and clear it
  //   const fuzzySearchComponent = this.template.querySelector(
  //     "c-fuzzy-search-suggestions"
  //   );
  //   if (fuzzySearchComponent) {
  //     fuzzySearchComponent.clearSearch();
  //   }

  //   // Reset calendar to show all events
  //   this.applyFilters();
  // }

  /**
   * Toggle filters section in sidebar
   */
  toggleFiltersSection() {
    this.isFiltersSectionExpanded = !this.isFiltersSectionExpanded;
    this.filtersSectionIcon = this.isFiltersSectionExpanded
      ? "utility:chevrondown"
      : "utility:chevronright";
  }

  /**
   * Handle filter checkbox change in sidebar
   */
  handleFilterCheckboxChange(event) {
    const filterName = event.target.name;
    const isChecked = event.target.checked;

    // Handle "Todos os eventos" logic
    if (filterName === "all") {
      if (isChecked) {
        // If "All" is checked, uncheck all other filters and set active filter to "all"
        this.isFilterSelected = {
          all: true,
          presencial: false,
          online: false,
          telefonica: false
        };
        this.activeFilter = "all";
      } else {
        // If "All" is unchecked, keep it checked (at least one filter must be active)
        this.isFilterSelected.all = true;
        return;
      }
    } else {
      // Handle individual filter checkboxes
      this.isFilterSelected[filterName] = isChecked;

      // If any specific filter is checked, uncheck "All"
      if (isChecked) {
        this.isFilterSelected.all = false;
        // For checkbox-based filtering, we'll handle multiple selections in applyFilters
        // Set activeFilter to the first checked filter for backward compatibility
        const filterMap = {
          presencial: "Reunião Presencial",
          online: "Reunião Online",
          telefonica: "Ligação Telefônica"
        };
        this.activeFilter = filterMap[filterName];
      } else {
        // If unchecking and no other specific filters are checked, check "All"
        const hasActiveFilter =
          this.isFilterSelected.presencial ||
          this.isFilterSelected.online ||
          this.isFilterSelected.telefonica;
        if (!hasActiveFilter) {
          this.isFilterSelected.all = true;
          this.activeFilter = "all";
        }
      }
    }

    this.applyFilters();
  }

  /**
   * Handle filter selection change (legacy method for backward compatibility)
   */
  handleFilterChange(event) {
    const selectedFilter = event.detail.value;
    this.activeFilter = selectedFilter;

    // Update filter selection state
    this.isFilterSelected = {
      all: selectedFilter === "all",
      presencial: selectedFilter === "Reunião Presencial",
      online: selectedFilter === "Reunião Online",
      telefonica: selectedFilter === "Ligação Telefônica"
    };

    this.applyFilters();
  }

  /**
   * Apply search and filter to events
   */
  applyFilters() {
    if (!this.calendar || !this.allEvents) return;

    let filteredEvents = [...this.allEvents];

    // Apply type filter - support multiple checkbox selections
    if (!this.isFilterSelected.all) {
      const selectedTypes = [];

      if (this.isFilterSelected.presencial) {
        selectedTypes.push("Reunião Presencial");
      }
      if (this.isFilterSelected.online) {
        selectedTypes.push("Reunião Online");
      }
      if (this.isFilterSelected.telefonica) {
        selectedTypes.push("Ligação Telefônica");
      }

      if (selectedTypes.length > 0) {
        filteredEvents = filteredEvents.filter((event) =>
          selectedTypes.includes(event.type)
        );
      }
    }

    // Apply user calendar filter - show only events where user is a participant
    if (this.selectedUserId) {
      filteredEvents = filteredEvents.filter((event) => {
        // Check if the selected user is a PARTICIPANT in the event (not just creator)
        return (
          event.gestorName === this.selectedUserName ||
          event.liderComercialName === this.selectedUserName ||
          event.sdrName === this.selectedUserName
        );
      });
    }

    // Apply color filters - show only events matching selected color categories
    if (this.activeColorFilters.length > 0) {
      filteredEvents = filteredEvents.filter((event) => {
        const eventColorCategory = this.getEventColorCategory(event);
        return this.activeColorFilters.includes(eventColorCategory);
      });
    }

    // Apply room filter - support multiple room selections
    const selectedRooms = this.meetingRooms
      .filter((room) => room.selected)
      .map((room) => room.value);

    if (
      selectedRooms.length > 0 &&
      selectedRooms.length < this.meetingRooms.length
    ) {
      filteredEvents = filteredEvents.filter((event) => {
        // Handle different room value formats
        const eventRoom = event.salaReuniao || "";

        // Check if event room matches any selected room (using proper mapping)
        const matchesSelectedRoom = selectedRooms.some((selectedRoom) => {
          const salesforceRoomValue =
            this.mapRoomValueToSalesforce(selectedRoom);
          return eventRoom === salesforceRoomValue;
        });

        // Additional logic for online meetings and other locations
        const matchesOnlineType =
          selectedRooms.includes("online") && event.type === "Reunião Online";
        const matchesOtherLocation =
          selectedRooms.includes("Outra") &&
          (!eventRoom || eventRoom === "Outra");

        return matchesSelectedRoom || matchesOnlineType || matchesOtherLocation;
      });
    }

    // Apply search filter with accent-insensitive matching
    if (this.searchTerm && this.searchTerm.length > 0) {
      // Normalize search term once for performance
      const normalizedSearchTerm = this.normalizeText(this.searchTerm);

      filteredEvents = filteredEvents.filter((event) => {
        // Check each searchable field with normalized comparison
        const titleMatch =
          event.title &&
          this.normalizeText(event.title).includes(normalizedSearchTerm);

        const descriptionMatch =
          event.description &&
          this.normalizeText(event.description).includes(normalizedSearchTerm);

        const locationMatch =
          event.location &&
          this.normalizeText(event.location).includes(normalizedSearchTerm);

        const typeMatch =
          event.type &&
          this.normalizeText(event.type).includes(normalizedSearchTerm);

        const roomMatch =
          event.salaReuniao &&
          this.normalizeText(event.salaReuniao).includes(normalizedSearchTerm);

        const gestorMatch =
          event.gestorName &&
          this.normalizeText(event.gestorName).includes(normalizedSearchTerm);

        const liderComercialMatch =
          event.liderComercialName &&
          this.normalizeText(event.liderComercialName).includes(
            normalizedSearchTerm
          );

        const sdrMatch =
          event.sdrName &&
          this.normalizeText(event.sdrName).includes(normalizedSearchTerm);

        // Return true if any field matches
        return (
          titleMatch ||
          descriptionMatch ||
          locationMatch ||
          typeMatch ||
          roomMatch ||
          gestorMatch ||
          liderComercialMatch ||
          sdrMatch
        );
      });
    }

    // Remove all events and add filtered ones
    this.calendar.fullCalendar("removeEvents");
    this.calendar.fullCalendar("addEventSource", filteredEvents);
  }

  /**
   * Toggle rooms section in sidebar
   */
  toggleRoomsSection() {
    this.isRoomsSectionExpanded = !this.isRoomsSectionExpanded;
    this.roomsSectionIcon = this.isRoomsSectionExpanded
      ? "utility:chevrondown"
      : "utility:chevronright";
  }

  /**
   * Toggle meeting suggestions section in sidebar
   */
  toggleMeetingSuggestionsSection() {
    this.isMeetingSuggestionsExpanded = !this.isMeetingSuggestionsExpanded;
    this.meetingSuggestionsIcon = this.isMeetingSuggestionsExpanded
      ? "utility:chevrondown"
      : "utility:chevronright";
  }

  /**
   * Handle room filter checkbox change in sidebar
   */
  handleRoomFilterChange(event) {
    const roomValue = event.target.name;
    const isChecked = event.target.checked;

    // Update the room selection
    this.meetingRooms = this.meetingRooms.map((room) => {
      if (room.value === roomValue) {
        return { ...room, selected: isChecked };
      }
      return room;
    });

    // Apply filters to update calendar display
    this.applyFilters();

    // Update room availability after filter change
    this.updateRoomAvailability();
  }

  /**
   * Initialize room availability
   */
  initializeRoomAvailability() {
    // Initial load of room availability
    this.updateRoomAvailability();
  }

  /**
   * Update room availability indicators
   */
  updateRoomAvailability() {
    if (!this.startDate || !this.endDate) {
      return; // Wait for calendar to be initialized with date range
    }

    // Get room availability from Apex controller
    getRoomAvailability({
      startDate: this.startDate,
      endDate: this.endDate
    })
      .then((result) => {
        if (result && result.success) {
          this.processRoomAvailabilityData(result.roomAvailability);

          // Force refresh all happening now indicators after room data update
          this.refreshAllHappeningNowIndicators();
        } else {
          console.error(
            "Error getting room availability:",
            result?.errorMessage
          );
        }
      })
      .catch((error) => {
        console.error("Error calling getRoomAvailability:", error);
      });
  }

  /**
   * Force refresh all happening now indicators in the sidebar
   */
  refreshAllHappeningNowIndicators() {
    try {
      // console.log("CalendarioReino: Refreshing all happening now indicators");

      // Query all happening now indicator components in the template
      const happeningNowComponents = this.template.querySelectorAll(
        "c-happening-now-indicator"
      );

      if (happeningNowComponents && happeningNowComponents.length > 0) {
        // console.log(
        //   `CalendarioReino: Found ${happeningNowComponents.length} happening now indicators to refresh`
        // );

        happeningNowComponents.forEach((component, index) => {
          try {
            if (component && typeof component.refresh === "function") {
              component.refresh();
              // console.log(
              //   `CalendarioReino: Refreshed happening now indicator ${index + 1}`
              // );
            }
          } catch (error) {
            console.error(
              `CalendarioReino: Error refreshing happening now indicator ${index + 1}:`,
              error
            );
          }
        });
      } else {
        // console.log(
        //   "CalendarioReino: No happening now indicators found to refresh"
        // );
      }
    } catch (error) {
      console.error(
        "CalendarioReino: Error refreshing happening now indicators:",
        error
      );
    }
  }

  /**
   * Force refresh all participant display components in sidebar cards
   */
  refreshAllParticipantDisplays() {
    try {
      // console.log(
      //   "👥 CalendarioReino: Refreshing all participant display components"
      // );

      // Query all participant display components in the template
      const participantComponents = this.template.querySelectorAll(
        "c-event-participant-display"
      );

      // console.log(
      //   `👥 CalendarioReino: Found ${participantComponents.length} participant display components`
      // );

      // Call refresh method on each component
      participantComponents.forEach((component, index) => {
        try {
          if (
            component &&
            typeof component.refreshParticipants === "function"
          ) {
            component.refreshParticipants();
            // console.log(
            //   `👥 CalendarioReino: Refreshed participant display ${index + 1}`
            // );
          }
        } catch (error) {
          console.error(
            `👥 CalendarioReino: Error refreshing participant display ${index + 1}:`,
            error
          );
        }
      });
    } catch (error) {
      console.error(
        "👥 CalendarioReino: Error in refreshAllParticipantDisplays:",
        error
      );
    }
  }

  /**
   * Process room availability data and update UI
   */
  processRoomAvailabilityData(roomAvailabilityData) {
    // console.log(
    //   "CalendarioReino: Processing room availability data",
    //   roomAvailabilityData
    // );

    this.meetingRooms = this.meetingRooms.map((room) => {
      const roomData = roomAvailabilityData[room.value];
      // console.log(`CalendarioReino: Processing room ${room.value}`, roomData);

      if (room.value === "online") {
        // Online meetings are always available
        return {
          ...room,
          availabilityClass: "room-availability available",
          availabilityIcon: "utility:success",
          availabilityText: "Sempre disponível",
          showOccupiedSlots: false,
          occupiedSlots: []
        };
      } else if (room.value === "Outra") {
        // Other locations are variable
        return {
          ...room,
          availabilityClass: "room-availability neutral",
          availabilityIcon: "utility:info",
          availabilityText: "Localização variável",
          showOccupiedSlots: false,
          occupiedSlots: []
        };
      } else if (roomData) {
        // Physical rooms with availability data
        // Filter conflicts to only include current/future events for availability determination
        const now = new Date();
        const currentAndFutureConflicts = roomData.conflicts
          ? roomData.conflicts.filter((conflict) => {
              try {
                const endDateTime = new Date(conflict.endDateTime);
                return endDateTime >= now;
              } catch (error) {
                console.error(
                  `CalendarioReino: Error filtering conflict for availability:`,
                  error
                );
                return true; // Include events with invalid dates to be safe
              }
            })
          : [];

        const hasCurrentOrFutureConflicts =
          currentAndFutureConflicts.length > 0;

        // console.log(
        //   `CalendarioReino: Room ${room.value} - Total conflicts: ${roomData.conflicts?.length || 0}, Current/Future conflicts: ${currentAndFutureConflicts.length}`
        // );

        const processedRoom = {
          ...room,
          availabilityClass: hasCurrentOrFutureConflicts
            ? "room-availability occupied"
            : "room-availability available",
          availabilityIcon: hasCurrentOrFutureConflicts
            ? "utility:error"
            : "utility:success",
          availabilityText: hasCurrentOrFutureConflicts
            ? `${currentAndFutureConflicts.length} conflito(s)`
            : "Disponível",
          showOccupiedSlots: hasCurrentOrFutureConflicts,
          occupiedSlots: hasCurrentOrFutureConflicts
            ? this.processOccupiedSlots(roomData.conflicts, room.value)
            : []
        };

        // console.log(
        //   `CalendarioReino: Processed room ${room.value}:`,
        //   processedRoom
        // );
        return processedRoom;
      } else {
        // Default available state
        return {
          ...room,
          availabilityClass: "room-availability available",
          availabilityIcon: "utility:success",
          availabilityText: "Disponível",
          showOccupiedSlots: false,
          occupiedSlots: []
        };
      }
    });
  }

  /**
   * Process occupied slots with sorting and error handling
   * Now filters out past events to show only current and future meetings
   */
  processOccupiedSlots(conflicts, roomValue) {
    try {
      if (!conflicts || !Array.isArray(conflicts)) {
        console.warn(
          `CalendarioReino: Invalid conflicts data for room ${roomValue}:`,
          conflicts
        );
        return [];
      }

      // console.log(
      //   `CalendarioReino: Processing ${conflicts.length} conflicts for room ${roomValue}`
      // );

      // Filter out past events - only show current and future meetings
      const now = new Date();
      const currentAndFutureConflicts = conflicts.filter((conflict) => {
        try {
          const endDateTime = new Date(conflict.endDateTime);
          const isCurrentOrFuture = endDateTime >= now;

          if (!isCurrentOrFuture) {
            // console.log(
            //   `CalendarioReino: Filtering out past event: ${conflict.subject} (ended: ${conflict.endDateTime})`
            // );
          }

          return isCurrentOrFuture;
        } catch (error) {
          console.error(
            `CalendarioReino: Error checking event time for ${conflict.subject}:`,
            error
          );
          // Include events with invalid dates to be safe
          return true;
        }
      });

      // console.log(
      //   `CalendarioReino: Filtered ${conflicts.length} total conflicts to ${currentAndFutureConflicts.length} current/future conflicts for room ${roomValue}`
      // );

      // Log filtered conflicts for debugging
      // console.log(
      //   `CalendarioReino: Current time for filtering: ${now.toISOString()}`
      // );
      // console.log(
      //   `CalendarioReino: Current/Future conflicts for room ${roomValue}:`,
      //   currentAndFutureConflicts.map((c) => ({
      //     subject: c.subject,
      //     startDateTime: c.startDateTime,
      //     endDateTime: c.endDateTime,
      //     isUpcoming: new Date(c.startDateTime) >= now
      //   }))
      // );

      // Create a copy to avoid mutating filtered array and sort chronologically
      // Since we've already filtered to only current/future events, we just need chronological sorting
      const sortedConflicts = [...currentAndFutureConflicts].sort((a, b) => {
        try {
          const dateA = new Date(a.startDateTime);
          const dateB = new Date(b.startDateTime);

          // Validate dates
          if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
            console.warn(`CalendarioReino: Invalid date in conflict:`, {
              a,
              b
            });
            return 0;
          }

          // Sort chronologically: earliest appointment first
          return dateA - dateB;
        } catch (error) {
          console.error(`CalendarioReino: Error sorting conflicts:`, error);
          return 0;
        }
      });

      // Log sorted conflicts for debugging
      // console.log(
      //   `CalendarioReino: Sorted conflicts for room ${roomValue}:`,
      //   sortedConflicts.map((c) => ({
      //     subject: c.subject,
      //     startDateTime: c.startDateTime,
      //     isUpcoming: new Date(c.startDateTime) >= now
      //   }))
      // );

      // Map conflicts to slot objects
      const occupiedSlots = sortedConflicts
        .map((conflict, index) => {
          try {
            const startDateTime = new Date(conflict.startDateTime);
            const isUpcoming = startDateTime >= now;

            // Note: isHappeningNow logic now handled by happeningNowIndicator component

            // Determine category color for this slot
            const categoryColor = this.getCategoryColorForSlot(conflict);
            const borderColor = this.getBorderColorForBackground(categoryColor);

            return {
              id: `${roomValue}-${index}`,
              eventId: conflict.eventId,
              timeRange: this.formatTimeRange(
                conflict.startDateTime,
                conflict.endDateTime
              ),
              dateInfo: this.formatDateInfo(conflict.startDateTime),
              subject: conflict.subject || "Reunião sem título",
              organizer: conflict.organizer || "Organizador desconhecido",
              isUpcoming: isUpcoming,
              isFirstItem: index === 0, // Mark the first (most recent) item
              slotCardClass: this.getSlotCardClass(isUpcoming, index === 0),
              categoryColor: `background-color: ${categoryColor}; border: 1px solid ${borderColor};`,
              // Store complete event data for modal
              eventData: {
                id: conflict.eventId,
                title: conflict.subject,
                description: conflict.description,
                startDateTime: conflict.startDateTime,
                endDateTime: conflict.endDateTime,
                location: conflict.location,
                type: conflict.type,
                salaReuniao: conflict.salaReuniao,
                gestorName: conflict.gestorName,
                liderComercialName: conflict.liderComercialName,
                sdrName: conflict.sdrName,
                whoId: conflict.whoId,
                whatId: conflict.whatId,
                ownerId: conflict.ownerId,
                customColor: conflict.customColor,
                statusReuniao: conflict.statusReuniao,
                reuniaoAconteceu: conflict.reuniaoAconteceu
              }
            };
          } catch (error) {
            console.error(
              `CalendarioReino: Error processing conflict ${index}:`,
              error,
              conflict
            );
            return null;
          }
        })
        .filter((slot) => slot !== null); // Remove any failed mappings

      // console.log(
      //   `CalendarioReino: Successfully processed ${occupiedSlots.length} occupied slots for room ${roomValue}`
      // );
      return occupiedSlots;
    } catch (error) {
      console.error(
        `CalendarioReino: Error processing occupied slots for room ${roomValue}:`,
        error
      );
      return [];
    }
  }

  /**
   * Get CSS class for slot card based on upcoming/past status and position
   * Since we now only show current/future events, all cards use the upcoming style
   */
  getSlotCardClass(isUpcoming, isFirstItem = false) {
    const baseClass = "occupied-slot-card";
    let classes = `${baseClass} upcoming-appointment`;

    // Add opacity class based on position
    if (isFirstItem) {
      classes += " first-event-full-opacity";
    } else {
      classes += " other-events-dimmed";
    }

    return classes;
  }

  /**
   * Get category color for an occupied slot based on event data (delegated to eventColorManager)
   */
  getCategoryColorForSlot(conflict) {
    return (
      this.eventColorManager?.getCategoryColorForSlot(conflict) ||
      this.eventColorManager?.getColorForCategory("sem-categoria") ||
      "#8a8886"
    );
  }

  // Note: isEventHappeningNow method removed - now handled by happeningNowIndicator component

  /**
   * Format time range for display
   */
  formatTimeRange(startDateTime, endDateTime) {
    try {
      const start = new Date(startDateTime);
      const end = new Date(endDateTime);

      const formatTime = (date) => {
        return date.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false
        });
      };

      return `${formatTime(start)} - ${formatTime(end)}`;
    } catch (error) {
      console.error("Error formatting time range:", error);
      return "Horário indisponível";
    }
  }

  /**
   * Format date information for display
   */
  formatDateInfo(dateTime) {
    try {
      const date = new Date(dateTime);
      const today = new Date();

      // Check if it's today
      if (date.toDateString() === today.toDateString()) {
        return "Hoje";
      }

      // Check if it's tomorrow
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (date.toDateString() === tomorrow.toDateString()) {
        return "Amanhã";
      }

      // Check if it's yesterday
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      if (date.toDateString() === yesterday.toDateString()) {
        return "Ontem";
      }

      // Format as DD/MM/YYYY for other dates
      return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      });
    } catch (error) {
      console.error("Error formatting date info:", error);
      return "Data indisponível";
    }
  }

  /**
   * Handle click on entire slot card
   */
  handleSlotCardClick(event) {
    // console.log("CalendarioReino: Slot card clicked", event);
    event.stopPropagation(); // Prevent checkbox toggle

    const eventId = event.currentTarget.dataset.eventId;
    // console.log("CalendarioReino: Looking for event ID:", eventId);

    if (!eventId) {
      console.error("CalendarioReino: No event ID found for slot card");
      return;
    }

    // Find the slot data with the matching event ID
    let slotData = null;
    // console.log(
    //   "CalendarioReino: Searching through meeting rooms:",
    //   this.meetingRooms
    // );

    for (const room of this.meetingRooms) {
      // console.log(
      //   `CalendarioReino: Checking room ${room.value}:`,
      //   room.occupiedSlots
      // );
      if (room.occupiedSlots) {
        const slot = room.occupiedSlots.find(
          (slot) => slot.eventId === eventId
        );
        if (slot) {
          slotData = slot;
          // console.log("CalendarioReino: Found slot data:", slotData);
          break;
        }
      }
    }

    if (!slotData || !slotData.eventData) {
      console.error(
        "CalendarioReino: No slot data found for event ID:",
        eventId
      );
      this.showToast("Erro", "Dados do evento não encontrados", "error");
      return;
    }

    // Set up the appointment editor with the event data
    this.selectedEventId = eventId;
    this.selectedEventData = {
      id: slotData.eventData.id,
      title: slotData.eventData.title,
      description: slotData.eventData.description,
      startDateTime: slotData.eventData.startDateTime,
      endDateTime: slotData.eventData.endDateTime,
      location: slotData.eventData.location,
      type: slotData.eventData.type,
      salaReuniao: slotData.eventData.salaReuniao,
      gestorName: slotData.eventData.gestorName,
      liderComercialName: slotData.eventData.liderComercialName,
      sdrName: slotData.eventData.sdrName,
      whoId: slotData.eventData.whoId,
      whatId: slotData.eventData.whatId,
      ownerId: slotData.eventData.ownerId,
      customColor: slotData.eventData.customColor,
      statusReuniao: slotData.eventData.statusReuniao,
      reuniaoAconteceu: slotData.eventData.reuniaoAconteceu
    };

    // Clear prefilled data since we're editing an existing event
    this.prefilledWhoId = slotData.eventData.whoId;
    this.prefilledWhatId = slotData.eventData.whatId;
    this.selectedStartDate = null;
    this.selectedEndDate = null;

    // Open the appointment editor modal
    this.showAppointmentEditor = true;
  }

  /**
   * Load available users for calendar selection
   */
  loadAvailableUsers() {
    this.isLoadingUsers = true;

    searchUsers({ searchTerm: "", maxResults: 50 })
      .then((result) => {
        this.availableUsers = result.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          photoUrl:
            user.photoUrl || "/img/userprofile/default_profile_45_v2.png",
          selected: false,
          cardClass: this.getUserCardClass(false),
          cardTooltip: `Visualizar calendário de ${user.name}`
        }));
      })
      .catch((error) => {
        console.error("Error loading users:", error);
        this.showToast("Erro", "Erro ao carregar usuários", "error");
        this.availableUsers = [];
      })
      .finally(() => {
        this.isLoadingUsers = false;
      });
  }

  /**
   * Handle calendar selection change (radio button behavior) - Legacy method
   */
  handleCalendarSelectionChange(event) {
    const selectedValue = event.target.value;
    const isChecked = event.target.checked;

    if (!isChecked) return; // Only handle when selecting, not deselecting

    if (selectedValue === "default") {
      // Return to default calendar view
      this.handleReturnToDefaultCalendar();
    } else {
      // Select specific user calendar
      this.selectUserCalendar(selectedValue);
    }
  }

  /**
   * Handle default calendar card click
   */
  handleDefaultCalendarClick(event) {
    event.preventDefault();
    event.stopPropagation();
    this.handleReturnToDefaultCalendar();
  }

  /**
   * Handle user calendar card click
   */
  handleUserCalendarClick(event) {
    event.preventDefault();
    event.stopPropagation();
    const userId = event.currentTarget.dataset.userId;
    if (userId) {
      this.selectUserCalendar(userId);
    }
  }

  /**
   * Handle user card photo error
   */
  handleUserCardPhotoError(event) {
    event.target.src = "/img/userprofile/default_profile_45_v2.png";
  }

  /**
   * Get CSS class for default calendar card
   */
  get defaultCalendarCardClass() {
    const baseClass = "calendar-card default-calendar-card";
    return this.isDefaultCalendarSelected
      ? `${baseClass} calendar-card-selected`
      : baseClass;
  }

  /**
   * Select a specific user's calendar with toggle behavior
   */
  selectUserCalendar(userId) {
    // Check if this user is already selected (toggle behavior)
    if (this.selectedUserId === userId) {
      // User is already selected, deselect and return to all calendars view
      this.handleReturnToDefaultCalendar();
      return;
    }

    // Update user selection state and add card-specific properties
    this.availableUsers = this.availableUsers.map((user) => ({
      ...user,
      selected: user.id === userId,
      cardClass: this.getUserCardClass(user.id === userId),
      cardTooltip: `Visualizar calendário de ${user.name}`,
      photoUrl: user.photoUrl || "/img/userprofile/default_profile_45_v2.png"
    }));

    // Find selected user
    const selectedUser = this.availableUsers.find((user) => user.id === userId);
    if (selectedUser) {
      this.selectedUserId = userId;
      this.selectedUserName = selectedUser.name;
      this.selectedUserPhotoUrl =
        selectedUser.photoUrl || "/img/userprofile/default_profile_45_v2.png";
      this.isDefaultCalendarSelected = false;
      this.showUserCalendarIndicator = true;

      // Apply filters to show only this user's events
      this.applyFilters();

      this.showToast(
        "Calendário Selecionado",
        `Visualizando calendário de ${selectedUser.name}`,
        "success"
      );
    }
  }

  /**
   * Get CSS class for user calendar card
   */
  getUserCardClass(isSelected) {
    const baseClass = "calendar-card user-calendar-card";
    return isSelected ? `${baseClass} calendar-card-selected` : baseClass;
  }

  /**
   * Return to default calendar view
   */
  handleReturnToDefaultCalendar() {
    // Reset user selection and update card properties
    this.availableUsers = this.availableUsers.map((user) => ({
      ...user,
      selected: false,
      cardClass: this.getUserCardClass(false),
      cardTooltip: `Visualizar calendário de ${user.name}`,
      photoUrl: user.photoUrl || "/img/userprofile/default_profile_45_v2.png"
    }));

    this.selectedUserId = null;
    this.selectedUserName = "";
    this.selectedUserPhotoUrl = "";
    this.isDefaultCalendarSelected = true;
    this.showUserCalendarIndicator = false;

    // Apply filters to show all events
    this.applyFilters();

    this.showToast(
      "Calendário Padrão",
      "Visualizando todos os calendários",
      "success"
    );
  }

  /**
   * Handle clear calendar selections button click
   */
  handleClearCalendarSelections() {
    // Clear all user calendar selections
    this.availableUsers = this.availableUsers.map((user) => ({
      ...user,
      selected: false,
      cardClass: this.getUserCardClass(false),
      cardTooltip: `Visualizar calendário de ${user.name}`,
      photoUrl: user.photoUrl || "/img/userprofile/default_profile_45_v2.png"
    }));

    // Reset calendar state to default
    this.selectedUserId = null;
    this.selectedUserName = "";
    this.selectedUserPhotoUrl = "";
    this.isDefaultCalendarSelected = true;
    this.showUserCalendarIndicator = false;

    // Apply filters to show all events
    this.applyFilters();

    this.showToast(
      "Seleções Limpas",
      "Todas as seleções de calendário foram removidas",
      "success"
    );
  }

  /**
   * Get CSS class for calendar container based on user selection
   */
  get calendarContainerClass() {
    const baseClass = "section-container";
    return this.showUserCalendarIndicator
      ? `${baseClass} user-calendar-active`
      : baseClass;
  }

  /**
   * Get CSS class for teams layout with focus effect
   */
  get teamsLayoutClass() {
    const baseClass = "teams-layout";
    return this.showUserCalendarIndicator
      ? `${baseClass} user-calendar-focus-mode`
      : baseClass;
  }

  /**
   * Handle user photo error - fallback to default avatar
   */
  handleUserPhotoError(event) {
    event.target.src = "/img/userprofile/default_profile_45_v2.png";
  }

  /**
   * Initialize color legend with computed properties
   */
  initializeColorLegend() {
    this.updateColorLegendCounts();
  }

  /**
   * Update color legend with computed CSS classes and styles
   */
  updateColorLegendCounts() {
    // Get predefined color legend items (always shown)
    const predefinedColorItems = this.getPredefinedColorLegendItems();

    // Get custom color legend items
    const customColorItems = this.getCustomColorLegendItems();

    // Get uncategorized events count
    const uncategorizedCount = this.countEventsByColorCategory("sem-categoria");

    // Create uncategorized legend item
    const uncategorizedColor =
      this.eventColorManager?.getColorForCategory("sem-categoria") || "#8a8886";
    const uncategorizedItem = {
      id: "sem-categoria",
      color: uncategorizedColor,
      label: "Sem Categoria",
      description: "Eventos sem cor personalizada",
      active: this.activeColorFilters.includes("sem-categoria"),
      count: uncategorizedCount,
      cssClass: this.getColorItemCssClass({
        id: "sem-categoria",
        active: this.activeColorFilters.includes("sem-categoria"),
        count: uncategorizedCount
      }),
      colorStyle: `background-color: ${uncategorizedColor};`,
      isUncategorized: true
    };

    // Combine all color items: predefined + custom + uncategorized
    this.colorLegend = [
      ...predefinedColorItems,
      ...customColorItems,
      uncategorizedItem
    ];
  }

  /**
   * Get predefined color legend items (always shown regardless of event presence)
   */
  getPredefinedColorLegendItems() {
    const predefinedColors = [
      // Meeting Room Colors
      {
        id: "sala-principal",
        color: "#F6E3D6", // Light peach (pastel orange)
        label: "Sala Principal",
        description: "Eventos na Sala Principal",
        isPredefined: true,
        category: "room"
      },
      {
        id: "sala-gabriel",
        color: "#E3E7FB", // Light lavender (pastel blue)
        label: "Sala do Gabriel",
        description: "Eventos na Sala do Gabriel",
        isPredefined: true,
        category: "room"
      },
      // Event Status Colors
      {
        id: "aconteceu",
        color: "#D6F3E4", // Light mint (pastel green)
        label: "Aconteceu",
        description: "Eventos que aconteceram",
        isPredefined: true,
        category: "status"
      },
      {
        id: "nao-aconteceu",
        color: "#F9D6D4", // Light pink (pastel red)
        label: "Não Aconteceu/Cancelado",
        description: "Eventos que não aconteceram ou foram cancelados",
        isPredefined: true,
        category: "status"
      },
      {
        id: "adiado",
        color: "#F8EEC6", // Light cream (pastel gold/yellow)
        label: "Adiado",
        description: "Eventos adiados",
        isPredefined: true,
        category: "status"
      },
      {
        id: "reagendado",
        color: "#E6D7F0", // Purple pastel
        label: "Reagendado",
        description: "Eventos reagendados",
        isPredefined: true,
        category: "status"
      }
    ];

    return predefinedColors.map((colorDef) => {
      const count = this.countEventsByColorCategory(colorDef.id);
      const isActive = this.activeColorFilters.includes(colorDef.id);

      return {
        id: colorDef.id,
        color: colorDef.color,
        label: colorDef.label,
        description: colorDef.description,
        active: isActive,
        count: count,
        cssClass: this.getColorItemCssClass({
          id: colorDef.id,
          active: isActive,
          count: count
        }),
        colorStyle: `background-color: ${colorDef.color}; border: 1px solid ${this.getBorderColorForBackground(colorDef.color)};`,
        isPredefined: true,
        category: colorDef.category
      };
    });
  }

  /**
   * Get custom color legend items from events (delegated to eventColorManager)
   */
  getCustomColorLegendItems() {
    return (
      this.eventColorManager?.getCustomColorLegendItems(
        this.allEvents,
        this.activeColorFilters,
        this.getColorItemCssClass.bind(this),
        this.getBorderColorForBackground.bind(this)
      ) || []
    );
  }

  /**
   * Count events by color category
   */
  countEventsByColorCategory(categoryId) {
    if (!this.allEvents) return 0;

    return this.allEvents.filter((event) => {
      return this.getEventColorCategory(event) === categoryId;
    }).length;
  }

  /**
   * Determine color category for an event (delegated to eventColorManager)
   */
  getEventColorCategory(event) {
    return (
      this.eventColorManager?.getEventColorCategory(event) || "sem-categoria"
    );
  }

  /**
   * Get predefined color mappings (delegated to eventColorManager)
   */
  getPredefinedColorMappings() {
    return this.eventColorManager?.getPredefinedColorMappings() || {};
  }

  /**
   * Get descriptive name for a color hex value (delegated to eventColorManager)
   */
  getColorDescriptiveName(hexColor) {
    return (
      this.eventColorManager?.getColorDescriptiveName(hexColor) || hexColor
    );
  }

  /**
   * Get border color for a given background color (delegated to eventColorManager)
   */
  getBorderColorForBackground(backgroundColor) {
    return (
      this.eventColorManager?.getBorderColorForBackground(backgroundColor) ||
      this.eventColorManager?.getColorForCategory("sem-categoria") ||
      "#8a8886"
    );
  }

  /**
   * Get CSS class for color item based on state
   */
  getColorItemCssClass(colorItem) {
    const baseClass = "color-legend-item";
    const activeClass = colorItem.active ? " color-legend-item-active" : "";
    const disabledClass =
      colorItem.count === 0 ? " color-legend-item-disabled" : "";

    return `${baseClass}${activeClass}${disabledClass}`;
  }

  /**
   * Handle color filter click
   */
  handleColorFilterClick(event) {
    const colorId = event.currentTarget.dataset.colorId;
    if (!colorId) return;

    // Find the color item
    const colorItem = this.colorLegend.find((item) => item.id === colorId);
    if (!colorItem) return;

    // For predefined colors, allow filtering even with zero count
    // For custom/uncategorized colors, require count > 0
    if (!colorItem.isPredefined && colorItem.count === 0) return;

    // Toggle the color filter
    const isCurrentlyActive = this.activeColorFilters.includes(colorId);

    if (isCurrentlyActive) {
      // Remove from active filters
      this.activeColorFilters = this.activeColorFilters.filter(
        (id) => id !== colorId
      );
    } else {
      // Add to active filters
      this.activeColorFilters = [...this.activeColorFilters, colorId];
    }

    // Update color legend state
    this.colorLegend = this.colorLegend.map((item) => ({
      ...item,
      active: this.activeColorFilters.includes(item.id),
      cssClass: this.getColorItemCssClass({
        ...item,
        active: this.activeColorFilters.includes(item.id)
      })
    }));

    // Apply filters
    this.applyFilters();

    // Show feedback
    const action = isCurrentlyActive ? "removido" : "aplicado";
    const countText =
      colorItem.count > 0
        ? ` (${colorItem.count} eventos)`
        : " (nenhum evento)";
    this.showToast(
      "Filtro de Cor",
      `Filtro "${colorItem.label}" ${action}${countText}`,
      "success"
    );
  }

  /**
   * Clear all color filters
   */
  handleClearColorFilters() {
    this.activeColorFilters = [];

    // Update color legend state
    this.colorLegend = this.colorLegend.map((item) => ({
      ...item,
      active: false,
      cssClass: this.getColorItemCssClass({
        ...item,
        active: false
      })
    }));

    // Apply filters
    this.applyFilters();

    this.showToast(
      "Filtros Limpos",
      "Todos os filtros de cor foram removidos",
      "success"
    );
  }

  /**
   * Toggle color legend accordion section
   */
  toggleColorLegendSection() {
    this.isColorLegendExpanded = !this.isColorLegendExpanded;
    this.colorLegendIcon = this.isColorLegendExpanded
      ? "utility:chevrondown"
      : "utility:chevronright";
  }

  /**
   * Handle exclusive accordion toggle for Meeting Suggestions
   */
  handleToggleMeetingSuggestions() {
    if (this.isMeetingSuggestionsExpanded) {
      // Save position before closing (only if popup exists and is not being dragged)
      const popup = this.template.querySelector(
        ".accordion-popup.suggestions-popup"
      );
      if (popup && !popup.classList.contains("dragging")) {
        this.savePopupPosition("suggestions");
      }
      // If already expanded, collapse it
      this.isMeetingSuggestionsExpanded = false;
      this.meetingSuggestionsIcon = "utility:chevronright";
    } else {
      // Collapse other sections first
      this.collapseAllFunctionalSections();
      // Then expand this section
      this.isMeetingSuggestionsExpanded = true;
      this.meetingSuggestionsIcon = "utility:chevrondown";

      // Initialize drag functionality when popup opens with retry logic
      this.initializeDragFunctionalityWithRetry();
    }
  }

  /**
   * Dedicated close handler for Meeting Suggestions popup
   */
  handleCloseMeetingSuggestions() {
    // Save position before closing (only if popup exists and is not being dragged)
    const popup = this.template.querySelector(
      ".accordion-popup.suggestions-popup"
    );
    if (popup && !popup.classList.contains("dragging")) {
      this.savePopupPosition("suggestions");
    }
    // Close the popup
    this.isMeetingSuggestionsExpanded = false;
    this.meetingSuggestionsIcon = "utility:chevronright";
  }

  /**
   * Handle exclusive accordion toggle for Color Legend
   */
  handleToggleColorLegend() {
    if (this.isColorLegendExpanded) {
      // Save position before closing
      this.savePopupPosition("colors");
      // If already expanded, collapse it
      this.isColorLegendExpanded = false;
      this.colorLegendIcon = "utility:chevronright";
    } else {
      // Collapse other sections first
      this.collapseAllFunctionalSections();
      // Then expand this section
      this.isColorLegendExpanded = true;
      this.colorLegendIcon = "utility:chevrondown";

      // Initialize drag functionality when popup opens
      this.initializeDragFunctionality();
    }
  }

  /**
   * Handle exclusive accordion toggle for Calendars
   */
  handleToggleCalendars() {
    if (this.isCalendarsSectionExpanded) {
      // Save position before closing
      this.savePopupPosition("calendars");
      // If already expanded, collapse it
      this.isCalendarsSectionExpanded = false;
      this.calendarsSectionIcon = "utility:chevronright";
    } else {
      // Collapse other sections first
      this.collapseAllFunctionalSections();
      // Then expand this section
      this.isCalendarsSectionExpanded = true;
      this.calendarsSectionIcon = "utility:chevrondown";

      // Initialize drag functionality when popup opens
      this.initializeDragFunctionality();
    }
  }

  /**
   * Collapse all functional sections for exclusive accordion behavior
   * Respects pinned popups - only collapses unpinned popups
   */
  collapseAllFunctionalSections() {
    // Save positions before collapsing (only for unpinned popups that will be collapsed)
    if (this.isMeetingSuggestionsExpanded && !this.popupPinStates.suggestions) {
      this.savePopupPosition("suggestions");
    }
    if (this.isColorLegendExpanded && !this.popupPinStates.colors) {
      this.savePopupPosition("colors");
    }
    if (this.isCalendarsSectionExpanded && !this.popupPinStates.calendars) {
      this.savePopupPosition("calendars");
    }

    // Collapse Meeting Suggestions (only if not pinned)
    if (!this.popupPinStates.suggestions) {
      this.isMeetingSuggestionsExpanded = false;
      this.meetingSuggestionsIcon = "utility:chevronright";
    }

    // Collapse Color Legend (only if not pinned)
    if (!this.popupPinStates.colors) {
      this.isColorLegendExpanded = false;
      this.colorLegendIcon = "utility:chevronright";
    }

    // Collapse Calendars (only if not pinned)
    if (!this.popupPinStates.calendars) {
      this.isCalendarsSectionExpanded = false;
      this.calendarsSectionIcon = "utility:chevronright";
    }
  }

  /**
   * Get dynamic style for suggestions popup positioning
   */
  get suggestionsPopupStyle() {
    return this.getPopupStyle("suggestions");
  }

  /**
   * Get dynamic style for colors popup positioning
   */
  get colorsPopupStyle() {
    return this.getPopupStyle("colors");
  }

  /**
   * Get dynamic style for calendars popup positioning
   */
  get calendarsPopupStyle() {
    return this.getPopupStyle("calendars");
  }

  /**
   * Calculate popup positioning style based on section type
   */
  getPopupStyle(sectionType) {
    // Check if popup is currently being dragged - if so, don't override position
    const popup = this.template.querySelector(
      `.accordion-popup.${sectionType}-popup`
    );
    if (popup && popup.classList.contains("dragging")) {
      return ""; // Return empty style to avoid overriding drag position
    }

    // Check if there's a saved position for this popup
    const savedPosition = this.savedPopupPositions[sectionType];

    if (savedPosition && savedPosition.top > 0 && savedPosition.left > 0) {
      // Use saved position if available and valid (not 0,0)
      return `
        position: fixed;
        top: ${savedPosition.top}px;
        left: ${savedPosition.left}px;
        right: auto;
        width: fit-content;
        max-width: 500px;
        max-height: 500px;
        z-index: 1000;
      `;
    }

    // Base positioning for integrated right sidebar popups (default)
    const baseTop = 80; // Header height
    const iconHeight = 48; // Height of each sidebar icon
    const sidebarWidth = 48; // Width of integrated right sidebar

    let topOffset = baseTop;

    // Calculate vertical position based on section type
    switch (sectionType) {
      case "suggestions":
        topOffset = baseTop + (this.showMeetingSuggestions ? 0 : iconHeight);
        break;
      case "colors":
        topOffset =
          baseTop + (this.showMeetingSuggestions ? iconHeight : 0) + iconHeight;
        break;
      case "calendars":
        topOffset =
          baseTop +
          (this.showMeetingSuggestions ? iconHeight : 0) +
          iconHeight * 2;
        break;
    }

    // Ensure we never return a position that could result in (0,0)
    const defaultLeft = Math.max(
      window.innerWidth - sidebarWidth - 8 - 400,
      50
    );
    const defaultTop = Math.max(topOffset, 50);

    return `
      position: fixed;
      top: ${defaultTop}px;
      left: ${defaultLeft}px;
      right: auto;
      width: fit-content;
      max-width: 500px;
      max-height: 500px;
      z-index: 1000;
    `;
  }

  /**
   * Check if color filters are empty
   */
  get isColorFiltersEmpty() {
    return this.activeColorFilters.length === 0;
  }

  /* isCalendarSelectionsEmpty getter removed - no longer needed without clear button */

  /**
   * Delete an event with confirmation
   */
  async handleDeleteEvent(eventId) {
    try {
      const result = await deleteEvent({ eventId });
      if (result) {
        this.showToast("Sucesso", "Evento excluído com sucesso!", "success");
        // Refresh calendar
        if (this.calendar) {
          this.calendar.fullCalendar("refetchEvents");
        }
        // Update color legend in case deleted event had custom colors
        this.updateColorLegendCounts();
      }
    } catch (error) {
      console.error("Error deleting event:", error);
      this.showToast(
        "Erro",
        "Erro ao excluir evento: " + this.extractErrorMessage(error),
        "error"
      );
    }
  }

  // Event handlers
  handleEventClick(calEvent) {
    // Enhanced event click handler to open appropriate editor based on event type
    // console.log("Event clicked:", calEvent);

    // Check if this is a Lead event - COMMENTED OUT - PAUSED LEAD EVENT SYSTEM
    /*
    if (calEvent.isLeadEvent) {
      // Handle Lead event click - open Lead Event Editor
      this.selectedLeadId = calEvent.whoId; // Lead ID is in whoId for Lead events
      this.selectedLeadEventId = calEvent.id;
      this.showLeadEventEditor = true;

      // Wait for DOM to update, then call openModal on the component
      setTimeout(() => {
        const leadEventEditor = this.template.querySelector(
          "c-lead-event-editor"
        );
        if (leadEventEditor) {
          leadEventEditor.openModal(
            this.selectedLeadId,
            this.selectedLeadEventId
          );
        }
      }, 100);
      return;
    }
    */

    // Handle regular event click - open Appointment Editor
    // Set the event ID for editing mode
    this.selectedEventId = calEvent.id;

    // Pass additional event data to pre-populate the editor
    this.prefilledWhoId = calEvent.whoId || null;
    this.prefilledWhatId = calEvent.whatId || null;

    // Store additional event data for the appointment editor
    this.selectedEventData = {
      id: calEvent.id,
      title: calEvent.title,
      start: calEvent.start,
      end: calEvent.end,
      description: calEvent.description || "",
      location: calEvent.location || "",
      allDay: calEvent.allDay || false,
      whoId: calEvent.whoId || null,
      whatId: calEvent.whatId || null,
      // Enhanced fields
      type: calEvent.type || "",
      salaReuniao: calEvent.salaReuniao || "",
      gestorName: calEvent.gestorName || "",
      liderComercialName: calEvent.liderComercialName || "",
      sdrName: calEvent.sdrName || "",
      customColor: calEvent.customColor || "",
      statusReuniao: calEvent.statusReuniao,
      // Attachment information
      hasContact: calEvent.hasContact || false,
      hasLead: calEvent.hasLead || false,
      hasOpportunity: calEvent.hasOpportunity || false,
      hasAccount: calEvent.hasAccount || false,
      attachmentType: calEvent.attachmentType || ""
    };

    // Open the appointment editor modal
    this.showAppointmentEditor = true;
  }

  handleEventChange(event) {
    // Handle drag and drop or resize events
    // Update the event in Salesforce
    const eventData = {
      id: event.id,
      title: event.title,
      start: event.start.toISOString(),
      end: event.end ? event.end.toISOString() : null,
      allDay: event.allDay || false,
      description: event.description || "",
      location: event.location || "",
      whoId: event.whoId || null,
      whatId: event.whatId || null
    };

    saveEvent({ eventData })
      .then(() => {
        this.showToast("Sucesso", "Evento atualizado com sucesso!", "success");
      })
      .catch((error) => {
        console.error("Error updating event:", error);
        this.showToast(
          "Erro",
          "Erro ao atualizar evento: " + this.extractErrorMessage(error),
          "error"
        );
        // Revert the event to its original position
        event.revert();
      });
  }

  handleDateSelect(start, end) {
    // Open appointment editor for creating new event with pre-filled dates
    this.selectedEventId = null;
    this.prefilledWhoId = null;
    this.prefilledWhatId = null;
    this.selectedEventData = null; // Clear any existing event data

    // Store the selected date range for the appointment editor
    this.selectedStartDate = start.toISOString();
    this.selectedEndDate = end.toISOString();

    this.showAppointmentEditor = true;
  }

  handleDayClick(date) {
    // Handle day clicks in month view to create new appointments
    // console.log("🗓️ CalendarioReino: Day clicked in month view");

    // Clear any existing event data for new appointment
    this.selectedEventId = null;
    this.prefilledWhoId = null;
    this.prefilledWhatId = null;
    this.selectedEventData = null;

    try {
      // FullCalendar v3 date objects are often Moment objects
      // Ensure we're working with a proper Date or Moment object
      let dateMoment;
      if (moment.isMoment(date)) {
        // If it's already a moment object, clone it to avoid mutations
        dateMoment = moment(date);
        // console.log("🗓️ CalendarioReino: Using provided moment object");
      } else if (date && typeof date.toDate === "function") {
        // If it's a moment-like object with toDate method
        dateMoment = moment(date.toDate());
        // console.log(
        //   "🗓️ CalendarioReino: Converted object with toDate() to moment"
        // );
      } else {
        // Create a moment from whatever we received
        dateMoment = moment(date);
        // console.log("🗓️ CalendarioReino: Created new moment from date object");
      }

      // Log for debugging
      // console.log(
      //   "🗓️ CalendarioReino: Date clicked:",
      //   dateMoment.format("YYYY-MM-DD")
      // );
      // console.log(
      //   "🗓️ CalendarioReino: Browser timezone offset (minutes):",
      //   new Date().getTimezoneOffset()
      // );
      // console.log("🗓️ CalendarioReino: Original date object:", date);
      // console.log(
      //   "🗓️ CalendarioReino: Moment date object:",
      //   dateMoment.toString()
      // );

      // Create start date at 9:00 AM on the SAME DAY that was clicked
      // Critical fix: use the dateMoment object directly, preserving the correct date
      const startDate = moment(dateMoment)
        .hour(9)
        .minute(0)
        .second(0)
        .millisecond(0);

      // Create end date 1 hour later (10:00 AM)
      const endDate = moment(startDate).add(1, "hour");

      // Store the selected date range for the appointment editor
      // For proper timezone handling, use ISO format for lightning-input datetime compatibility
      // Ensure we're generating proper ISO 8601 strings with the format YYYY-MM-DDTHH:mm:ss.sssZ
      this.selectedStartDate = startDate.toISOString();
      this.selectedEndDate = endDate.toISOString();

      // Validate that we have proper ISO strings with time component
      if (
        !this.selectedStartDate.includes("T") ||
        !this.selectedEndDate.includes("T")
      ) {
        console.error("🗓️ CalendarioReino: Invalid ISO string format detected");
        // Force proper ISO format if missing
        this.selectedStartDate = `${startDate.format("YYYY-MM-DD")}T${startDate.format("HH:mm:ss")}.000Z`;
        this.selectedEndDate = `${endDate.format("YYYY-MM-DD")}T${endDate.format("HH:mm:ss")}.000Z`;
      }

      // Log the processed dates for debugging
      // console.log(
      //   "🗓️ CalendarioReino: Selected Date (YYYY-MM-DD):",
      //   startDate.format("YYYY-MM-DD")
      // );
      // console.log(
      //   "🗓️ CalendarioReino: Start DateTime:",
      //   startDate.format("YYYY-MM-DD HH:mm:ss")
      // );
      // console.log(
      //   "🗓️ CalendarioReino: End DateTime:",
      //   endDate.format("YYYY-MM-DD HH:mm:ss")
      // );
      // console.log("🗓️ CalendarioReino: ISO Start:", this.selectedStartDate);
      // console.log("🗓️ CalendarioReino: ISO End:", this.selectedEndDate);
    } catch (error) {
      console.error("🗓️ CalendarioReino: Error processing day click:", error);

      // Fallback: try to open modal without pre-selected dates
      this.selectedStartDate = null;
      this.selectedEndDate = null;

      this.showToast(
        "Aviso",
        "Erro ao processar a data selecionada. O modal foi aberto sem data pré-selecionada.",
        "warning"
      );
    }

    // Ensure we have a small delay before opening the modal to allow the DOM to update
    setTimeout(() => {
      // Open the appointment editor modal
      this.showAppointmentEditor = true;

      // Log modal state for debugging
      // console.log("🗓️ CalendarioReino: Opening appointment editor modal");
      // console.log("   showAppointmentEditor:", this.showAppointmentEditor);
      // console.log("   selectedStartDate:", this.selectedStartDate);
      // console.log("   selectedEndDate:", this.selectedEndDate);
    }, 100);
  }

  /**
   * Initialize drag functionality with retry logic for first load
   */
  initializeDragFunctionalityWithRetry() {
    let attempts = 0;
    const maxAttempts = 5;

    const tryInitialize = () => {
      attempts++;

      // Wait for DOM to be ready
      setTimeout(() => {
        const popupHeaders = this.template.querySelectorAll(".popup-header");

        if (popupHeaders.length > 0) {
          // Success - initialize dragging
          popupHeaders.forEach((header) => {
            this.makeDraggable(header);
          });
          console.log(`🎯 Drag functionality initialized on attempt ${attempts}`);
        } else if (attempts < maxAttempts) {
          // Retry with longer delay
          console.log(`🔄 Retrying drag initialization (attempt ${attempts}/${maxAttempts})`);
          tryInitialize();
        } else {
          console.warn('❌ Failed to initialize drag functionality after max attempts');
        }
      }, attempts === 1 ? 100 : 200 * attempts); // Increasing delay for retries
    };

    tryInitialize();
  }

  /**
   * Initialize drag functionality for popup headers (legacy method)
   */
  initializeDragFunctionality() {
    // Wait for DOM to be ready
    setTimeout(() => {
      const popupHeaders = this.template.querySelectorAll(".popup-header");
      popupHeaders.forEach((header) => {
        this.makeDraggable(header);
      });
    }, 100);
  }

  /**
   * Make an element draggable by its header
   */
  makeDraggable(headerElement) {
    if (!headerElement) return;

    const popup = headerElement.closest(".accordion-popup");
    if (!popup) return;

    // Mark as initialized to prevent duplicate initialization
    headerElement.setAttribute('data-draggable-initialized', 'true');

    let isDragging = false;
    let offsetX = 0; // Mouse offset from popup's top-left corner
    let offsetY = 0; // Mouse offset from popup's top-left corner
    let popupWidth = 0;
    let popupHeight = 0;
    let animationFrameId = null;

    // Mouse events
    const handleMouseDown = (e) => {
      // Only start drag if clicking on header, not on buttons or close button
      if (
        e.target.closest("lightning-button") ||
        e.target.closest(".popup-header-actions") ||
        e.target.closest(".popup-close-button") ||
        e.target.classList.contains("popup-close-button")
      ) {
        return;
      }

      isDragging = true;

      // Get current position and dimensions at start of drag
      const rect = popup.getBoundingClientRect();
      popupWidth = rect.width;
      popupHeight = rect.height;

      // Calculate offset from mouse position to popup's top-left corner
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;

      // Add visual feedback and disable layout interference
      popup.style.cursor = "grabbing";
      popup.style.userSelect = "none";
      popup.style.transition = "none";

      // Set current position in CSS custom properties BEFORE adding dragging class
      // This prevents the popup from jumping to (0,0) when dragging class is applied
      popup.style.setProperty("--drag-top", `${rect.top}px`);
      popup.style.setProperty("--drag-left", `${rect.left}px`);

      // Add dragging classes to prevent layout interference
      popup.classList.add("dragging");
      const teamsLayout = this.template.querySelector(".teams-layout");
      if (teamsLayout) {
        teamsLayout.classList.add("dragging-active");
      }

      // Add host-level class to ensure overflow is visible
      const hostElement = this.template.host;
      if (hostElement) {
        hostElement.classList.add("popup-dragging");
      }

      // Add global listeners
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);

      e.preventDefault();
    };

    const handleMouseMove = (e) => {
      if (!isDragging) return;

      // Cancel any pending animation frame
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }

      // Use requestAnimationFrame for smooth movement
      animationFrameId = requestAnimationFrame(() => {
        // Calculate new position based on mouse position minus offset
        let newX = e.clientX - offsetX;
        let newY = e.clientY - offsetY;

        // Constrain to viewport using stored dimensions
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Prevent dragging outside viewport
        newX = Math.max(0, Math.min(newX, viewportWidth - popupWidth));
        newY = Math.max(0, Math.min(newY, viewportHeight - popupHeight));

        // Update position using CSS custom properties for maximum reliability
        popup.style.setProperty("--drag-top", `${newY}px`);
        popup.style.setProperty("--drag-left", `${newX}px`);
        popup.style.position = "fixed";
        popup.style.left = `${newX}px`;
        popup.style.top = `${newY}px`;
        popup.style.right = "auto"; // Override right positioning
      });

      e.preventDefault();
    };

    const handleMouseUp = () => {
      if (!isDragging) return;

      isDragging = false;

      // Cancel any pending animation frame
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }

      // Remove dragging classes and restore normal behavior
      popup.classList.remove("dragging");
      const teamsLayout = this.template.querySelector(".teams-layout");
      if (teamsLayout) {
        teamsLayout.classList.remove("dragging-active");
      }

      // Remove host-level class
      const hostElement = this.template.host;
      if (hostElement) {
        hostElement.classList.remove("popup-dragging");
      }

      popup.style.cursor = "";
      popup.style.userSelect = "";
      popup.style.transition = "";

      // Clear CSS custom properties
      popup.style.removeProperty("--drag-top");
      popup.style.removeProperty("--drag-left");

      // Remove global listeners
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    // Touch events for mobile support
    const handleTouchStart = (e) => {
      if (
        e.target.closest("lightning-button") ||
        e.target.closest(".popup-header-actions") ||
        e.target.closest(".popup-close-button") ||
        e.target.classList.contains("popup-close-button")
      ) {
        return;
      }

      const touch = e.touches[0];
      isDragging = true;

      // Get current position and dimensions at start of drag
      const rect = popup.getBoundingClientRect();
      popupWidth = rect.width;
      popupHeight = rect.height;

      // Calculate offset from touch position to popup's top-left corner
      offsetX = touch.clientX - rect.left;
      offsetY = touch.clientY - rect.top;

      popup.style.cursor = "grabbing";
      popup.style.userSelect = "none";
      popup.style.transition = "none";

      // Set current position in CSS custom properties BEFORE adding dragging class
      // This prevents the popup from jumping to (0,0) when dragging class is applied
      popup.style.setProperty("--drag-top", `${rect.top}px`);
      popup.style.setProperty("--drag-left", `${rect.left}px`);

      // Add dragging classes to prevent layout interference
      popup.classList.add("dragging");
      const teamsLayout = this.template.querySelector(".teams-layout");
      if (teamsLayout) {
        teamsLayout.classList.add("dragging-active");
      }

      // Add host-level class to ensure overflow is visible
      const hostElement = this.template.host;
      if (hostElement) {
        hostElement.classList.add("popup-dragging");
      }

      document.addEventListener("touchmove", handleTouchMove, {
        passive: false
      });
      document.addEventListener("touchend", handleTouchEnd);

      e.preventDefault();
    };

    const handleTouchMove = (e) => {
      if (!isDragging) return;

      // Cancel any pending animation frame
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }

      // Use requestAnimationFrame for smooth movement
      animationFrameId = requestAnimationFrame(() => {
        const touch = e.touches[0];

        // Calculate new position based on touch position minus offset
        let newX = touch.clientX - offsetX;
        let newY = touch.clientY - offsetY;

        // Constrain to viewport using stored dimensions
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        newX = Math.max(0, Math.min(newX, viewportWidth - popupWidth));
        newY = Math.max(0, Math.min(newY, viewportHeight - popupHeight));

        // Update position using CSS custom properties for maximum reliability
        popup.style.setProperty("--drag-top", `${newY}px`);
        popup.style.setProperty("--drag-left", `${newX}px`);
        popup.style.position = "fixed";
        popup.style.left = `${newX}px`;
        popup.style.top = `${newY}px`;
        popup.style.right = "auto";
      });

      e.preventDefault();
    };

    const handleTouchEnd = () => {
      if (!isDragging) return;

      isDragging = false;

      // Cancel any pending animation frame
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }

      // Remove dragging classes and restore normal behavior
      popup.classList.remove("dragging");
      const teamsLayout = this.template.querySelector(".teams-layout");
      if (teamsLayout) {
        teamsLayout.classList.remove("dragging-active");
      }

      // Remove host-level class
      const hostElement = this.template.host;
      if (hostElement) {
        hostElement.classList.remove("popup-dragging");
      }

      popup.style.cursor = "";
      popup.style.userSelect = "";
      popup.style.transition = "";

      // Clear CSS custom properties
      popup.style.removeProperty("--drag-top");
      popup.style.removeProperty("--drag-left");

      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };

    // Add event listeners
    headerElement.addEventListener("mousedown", handleMouseDown);
    headerElement.addEventListener("touchstart", handleTouchStart);

    // Store references for cleanup
    if (!this.dragEventListeners) {
      this.dragEventListeners = [];
    }
    this.dragEventListeners.push({
      element: headerElement,
      mousedown: handleMouseDown,
      touchstart: handleTouchStart
    });
  }

  /**
   * Clean up drag event listeners
   */
  cleanupDragListeners() {
    if (this.dragEventListeners) {
      this.dragEventListeners.forEach(({ element, mousedown, touchstart }) => {
        if (element) {
          element.removeEventListener("mousedown", mousedown);
          element.removeEventListener("touchstart", touchstart);
        }
      });
      this.dragEventListeners = [];
    }
  }

  /**
   * Save popup position when it's closed
   */
  savePopupPosition(sectionType) {
    const popup = this.template.querySelector(
      `.accordion-popup.${sectionType}-popup`
    );
    if (popup && !popup.classList.contains("dragging")) {
      const rect = popup.getBoundingClientRect();

      // Only save valid positions (not 0,0 or negative values)
      if (rect.top > 0 && rect.left > 0 && rect.width > 0 && rect.height > 0) {
        this.savedPopupPositions = {
          ...this.savedPopupPositions,
          [sectionType]: {
            top: rect.top,
            left: rect.left
          }
        };
        // console.log(
        //   `💾 Saved position for ${sectionType} popup:`,
        //   this.savedPopupPositions[sectionType]
        // );
      } else {
        // console.log(
        //   `⚠️ Skipped saving invalid position for ${sectionType} popup:`,
        //   {
        //     top: rect.top,
        //     left: rect.left,
        //     width: rect.width,
        //     height: rect.height
        //   }
        // );
      }
    }
  }

  /**
   * Clear saved position for a specific popup
   */
  clearPopupPosition(sectionType) {
    this.savedPopupPositions = {
      ...this.savedPopupPositions,
      [sectionType]: null
    };
    // console.log(`🗑️ Cleared saved position for ${sectionType} popup`);
  }

  /**
   * Get popup section type from popup element
   */
  getPopupSectionType(popup) {
    if (popup.classList.contains("suggestions-popup")) return "suggestions";
    if (popup.classList.contains("colors-popup")) return "colors";
    if (popup.classList.contains("calendars-popup")) return "calendars";
    return null;
  }

  /**
   * Pin state getters for each popup
   */
  get isSuggestionsPinned() {
    return this.popupPinStates.suggestions;
  }

  get isColorsPinned() {
    return this.popupPinStates.colors;
  }

  get isCalendarsPinned() {
    return this.popupPinStates.calendars;
  }

  /**
   * Pin icon getters for each popup
   */
  get suggestionsPinIcon() {
    return this.popupPinStates.suggestions ? "utility:pinned" : "utility:pin";
  }

  get colorsPinIcon() {
    return this.popupPinStates.colors ? "utility:pinned" : "utility:pin";
  }

  get calendarsPinIcon() {
    return this.popupPinStates.calendars ? "utility:pinned" : "utility:pin";
  }

  /**
   * Pin button title getters for accessibility
   */
  get suggestionsPinTitle() {
    return this.popupPinStates.suggestions
      ? "Desafixar Sugestões de Reunião"
      : "Fixar Sugestões de Reunião";
  }

  get colorsPinTitle() {
    return this.popupPinStates.colors
      ? "Desafixar Filtros de Cor"
      : "Fixar Filtros de Cor";
  }

  get calendarsPinTitle() {
    return this.popupPinStates.calendars
      ? "Desafixar Seleção de Calendários"
      : "Fixar Seleção de Calendários";
  }

  /**
   * CSS class getters for popup containers
   */
  get suggestionsPopupClass() {
    return this.popupPinStates.suggestions
      ? "accordion-popup suggestions-popup pinned-popup positioned"
      : "accordion-popup suggestions-popup positioned";
  }

  get colorsPopupClass() {
    return this.popupPinStates.colors
      ? "accordion-popup colors-popup pinned-popup positioned"
      : "accordion-popup colors-popup positioned";
  }

  get calendarsPopupClass() {
    return this.popupPinStates.calendars
      ? "accordion-popup calendars-popup pinned-popup positioned"
      : "accordion-popup calendars-popup positioned";
  }

  /**
   * CSS class getters for pin buttons
   */
  get suggestionsPinButtonClass() {
    return this.popupPinStates.suggestions ? "pin-button pinned" : "pin-button";
  }

  get colorsPinButtonClass() {
    return this.popupPinStates.colors ? "pin-button pinned" : "pin-button";
  }

  get calendarsPinButtonClass() {
    return this.popupPinStates.calendars ? "pin-button pinned" : "pin-button";
  }

  /* Sidebar icon getters removed - using static icons in template */

  /**
   * Pin toggle methods for each popup
   */
  handleToggleSuggestionsPin() {
    this.popupPinStates = {
      ...this.popupPinStates,
      suggestions: !this.popupPinStates.suggestions
    };
    // console.log(
    //   `📌 Suggestions popup ${this.popupPinStates.suggestions ? "pinned" : "unpinned"}`
    // );
  }

  handleToggleColorsPin() {
    this.popupPinStates = {
      ...this.popupPinStates,
      colors: !this.popupPinStates.colors
    };
    // console.log(
    //   `📌 Colors popup ${this.popupPinStates.colors ? "pinned" : "unpinned"}`
    // );
  }

  handleToggleCalendarsPin() {
    this.popupPinStates = {
      ...this.popupPinStates,
      calendars: !this.popupPinStates.calendars
    };
    // console.log(
    //   `📌 Calendars popup ${this.popupPinStates.calendars ? "pinned" : "unpinned"}`
    // );
  }

  // Load events from Salesforce using the Apex controller
  loadEventsFromSalesforce(start, end, callback) {
    this.isLoading = true;

    // Format dates for Apex query - just need the date part, not time
    // Using YYYY-MM-DD format which Apex can parse to Date object
    const startDate = start.format("YYYY-MM-DD");
    const endDate = end.format("YYYY-MM-DD");

    // Load both regular events and Lead events
    const eventPromises = [getEvents({ startDate, endDate })];

    // Add Lead events if enabled - COMMENTED OUT - PAUSED LEAD EVENT SYSTEM
    /*
    if (this.showLeadEvents) {
      eventPromises.push(getLeadEvents({ startDate, endDate }));
    }
    */

    Promise.all(eventPromises)
      .then((results) => {
        const [regularEvents, leadEvents] = results;
        let allEvents = [];

        // Process regular events
        if (regularEvents) {
          const formattedEvents = regularEvents.map((event) => {
            return {
              id: event.id,
              title: event.title,
              // The Apex controller returns DateTime fields as ISO strings
              // eventDataTransform will convert them to moment objects
              start: event.start,
              end: event.end,
              description: event.description,
              location: event.location,
              allDay: event.allDay,
              whoId: event.whoId,
              whatId: event.whatId,
              // Enhanced fields for display
              type: event.type,
              salaReuniao: event.salaReuniao,
              gestorName: event.gestorName,
              liderComercialName: event.liderComercialName,
              sdrName: event.sdrName,
              customColor: event.customColor,
              statusReuniao: event.statusReuniao,
              reuniaoAconteceu: event.reuniaoAconteceu, // Meeting outcome field
              linkReuniao: event.linkReuniao, // Meeting link URL field
              // Creator/Owner information
              ownerId: event.ownerId,
              ownerName: event.ownerName,
              // Attachment information
              hasContact: event.hasContact,
              hasLead: event.hasLead,
              hasOpportunity: event.hasOpportunity,
              hasAccount: event.hasAccount,
              attachmentType: event.attachmentType
            };
          });
          allEvents = [...formattedEvents];
        }

        // Process Lead events - COMMENTED OUT - PAUSED LEAD EVENT SYSTEM
        /*
        if (leadEvents && this.showLeadEvents) {
          const formattedLeadEvents = leadEvents.map((event) => {
            return {
              id: event.id,
              title: event.title,
              start: event.start,
              end: event.end,
              description: event.description,
              location: event.location,
              allDay: event.allDay || false,
              whoId: event.whoId,
              whatId: event.whatId,
              // Lead-specific fields
              type: event.type || "Lead Event",
              isLeadEvent: true,
              leadName: event.leadName,
              ownerId: event.ownerId,
              ownerName: event.ownerName,
              // Visual styling for Lead events
              className: "lead-event",
              color: "#ff6b35", // Orange color for Lead events
              textColor: "#ffffff"
            };
          });
          allEvents = [...allEvents, ...formattedLeadEvents];
          this.leadEvents = formattedLeadEvents;
        }
        */

        // Update local events cache
        this.events = allEvents;
        this.allEvents = allEvents; // Store all events for filtering

        // console.log("📊 CalendarioReino: Events loaded from Salesforce");
        // console.log(`   Total Events: ${allEvents.length}`);
        // console.log(
        //   `   Events With Rooms: ${allEvents.filter((e) => e.salaReuniao).length}`
        // );
        // console.log(
        //   `   Events With Status: ${allEvents.filter((e) => e.statusReuniao !== null && e.statusReuniao !== undefined).length}`
        // );

        // Debug meeting status values
        allEvents.forEach((event, index) => {
          if (
            event.statusReuniao !== null &&
            event.statusReuniao !== undefined
          ) {
            // console.log(
            //   `   Event ${index + 1} Status: ${event.title} - statusReuniao: ${event.statusReuniao} (${typeof event.statusReuniao})`
            // );
            const category = this.getEventColorCategory(event);
            const mappings = this.getPredefinedColorMappings();
            const color = mappings.categoryToColor[category];
            // console.log(`     Category: ${category}, Color: ${color}`);
          }
        });

        allEvents.forEach((event, index) => {
          // console.log(`   Event ${index + 1}:`);
          // console.log(`     ID: ${event.id}`);
          // console.log(`     Title: ${event.title}`);
          // console.log(`     Room (salaReuniao): "${event.salaReuniao}"`);
          // console.log(`     Start: ${event.start} (${typeof event.start})`);
          // console.log(`     End: ${event.end} (${typeof event.end})`);
        });

        // Update room availability after loading events
        this.updateRoomAvailability();

        // Update color legend counts after loading events
        this.updateColorLegendCounts();

        // Generate meeting suggestions after loading events
        this.generateMeetingSuggestions();

        // Pass all events to FullCalendar
        callback(allEvents);

        // Events loaded successfully
        // console.log("Events loaded and passed to FullCalendar");
      })
      .catch((error) => {
        console.error("Error loading events:", error);
        this.showToast(
          "Erro",
          "Erro ao carregar eventos: " + this.extractErrorMessage(error),
          "error"
        );
        callback([]); // Return empty array to FullCalendar
      })
      .finally(() => {
        this.isLoading = false;
      });
  }

  // Method to refresh the calendar view
  @api
  refreshCalendar() {
    if (this.calendar) {
      this.calendar.fullCalendar("render");
      // Also update the color legend when refreshing
      this.updateColorLegendCounts();
      // Regenerate meeting suggestions when refreshing
      this.generateMeetingSuggestions();
      // Calendar refreshed successfully
      // console.log("Calendar refreshed and components updated");
    }
  }

  /**
   * Generate intelligent meeting suggestions with enhanced room conflict resolution
   */
  generateMeetingSuggestions() {
    // console.log("🚀 CalendarioReino: generateMeetingSuggestions called");
    // console.log(
    //   `   All Events Count: ${this.allEvents ? this.allEvents.length : 0}`
    // );

    if (this.allEvents && this.allEvents.length > 0) {
      // console.log("   All Events:");
      this.allEvents.forEach((event, index) => {
        // console.log(`     Event ${index + 1}:`);
        // console.log(`       ID: ${event.id}`);
        // console.log(`       Title: ${event.title}`);
        // console.log(`       Room: "${event.salaReuniao}"`);
        // console.log(`       Start: ${event.start}`);
        // console.log(`       End: ${event.end}`);
      });
    }

    this.isLoadingSuggestions = true;

    try {
      const suggestions = [];
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Business hours: 9:00 AM to 5:00 PM
      const businessHours = {
        start: 9,
        end: 17
      };

      // Time slots to check (every hour)
      const timeSlots = [];
      for (let hour = businessHours.start; hour < businessHours.end; hour++) {
        timeSlots.push(hour);
      }

      // Check availability for today and tomorrow
      const daysToCheck = [
        { date: today, label: "Hoje" },
        { date: tomorrow, label: "Amanhã" }
      ];

      daysToCheck.forEach((day) => {
        timeSlots.forEach((hour) => {
          // Try to create suggestions with different meeting types
          const suggestions_for_slot = this.createDiverseMeetingSuggestions(
            day.date,
            hour,
            day.label
          );
          suggestions.push(...suggestions_for_slot);
        });
      });

      // Remove duplicates and prioritize diverse options
      const uniqueSuggestions =
        this.prioritizeAndDeduplicateSuggestions(suggestions);

      // Limit to 5 suggestions and sort by time, then by meeting type priority
      this.meetingSuggestions = uniqueSuggestions
        .sort((a, b) => {
          const timeComparison =
            new Date(a.startDateTime) - new Date(b.startDateTime);
          if (timeComparison !== 0) return timeComparison;

          // If same time, prioritize physical rooms over online
          const aPriority = a.meetingType === "Reunião Presencial" ? 1 : 2;
          const bPriority = b.meetingType === "Reunião Presencial" ? 1 : 2;
          return aPriority - bPriority;
        })
        .slice(0, 5);
    } catch (error) {
      console.error("Error generating meeting suggestions:", error);
      this.meetingSuggestions = [];
    } finally {
      this.isLoadingSuggestions = false;
    }
  }

  /**
   * Create diverse meeting suggestions for a specific time slot
   */
  createDiverseMeetingSuggestions(date, hour, dateLabel) {
    const suggestions = [];
    const startTime = new Date(date);
    startTime.setHours(hour, 0, 0, 0);
    const endTime = new Date(startTime);
    endTime.setHours(hour + 1, 0, 0, 0);

    // Skip past time slots
    if (startTime < new Date()) {
      return suggestions;
    }

    // Check participant availability first
    const availableParticipants = this.findAvailableParticipants(
      startTime,
      endTime
    );
    // Only require at least a gestor for a valid suggestion
    if (!availableParticipants.gestor) {
      return suggestions;
    }

    // Get all room alternatives for this time slot
    const roomAlternatives = this.findAlternativeRooms(startTime, endTime);

    // Create suggestions for each available room type
    roomAlternatives.forEach((alternative, index) => {
      // Limit to 2 suggestions per time slot to avoid overwhelming the user
      if (index < 2) {
        const suggestion = this.createSingleMeetingSuggestion(
          date,
          hour,
          dateLabel,
          alternative.room,
          alternative.meetingType,
          availableParticipants
        );
        if (suggestion) {
          suggestions.push(suggestion);
        }
      }
    });

    return suggestions;
  }

  /**
   * Create a single meeting suggestion with specific room and type
   */
  createSingleMeetingSuggestion(
    date,
    hour,
    dateLabel,
    room,
    meetingType,
    participants
  ) {
    const startTime = new Date(date);
    startTime.setHours(hour, 0, 0, 0);
    const endTime = new Date(startTime);
    endTime.setHours(hour + 1, 0, 0, 0);

    // Generate intelligent subject for the meeting
    const intelligentSubject = this.generateIntelligentSubject(
      participants,
      room,
      startTime
    );

    // Format time slot
    const timeSlot = `${hour.toString().padStart(2, "0")}:00 - ${(hour + 1).toString().padStart(2, "0")}:00`;

    // Create meeting type indicator
    const meetingTypeIndicator = meetingType === "Reunião Online" ? "🌐" : "🏢";
    const meetingTypeText =
      meetingType === "Reunião Online" ? "Online" : "Presencial";

    // Create suggestion object
    return {
      id: `suggestion-${date.getTime()}-${hour}-${room.value}`,
      startDateTime: startTime.toISOString(),
      endDateTime: endTime.toISOString(),
      timeSlot: timeSlot,
      dateLabel: dateLabel,
      roomName: room.label,
      roomValue: room.value,
      meetingType: meetingType,
      meetingTypeIndicator: meetingTypeIndicator,
      meetingTypeText: meetingTypeText,
      participantsText: this.formatParticipantsText(participants),
      participants: participants,
      intelligentSubject: intelligentSubject,
      tooltip: `${meetingTypeText} - ${dateLabel} das ${timeSlot} na ${room.label}`
    };
  }

  /**
   * Prioritize and deduplicate suggestions to ensure diversity
   */
  prioritizeAndDeduplicateSuggestions(suggestions) {
    // Group suggestions by time slot
    const suggestionsByTime = {};

    suggestions.forEach((suggestion) => {
      const timeKey = suggestion.startDateTime;
      if (!suggestionsByTime[timeKey]) {
        suggestionsByTime[timeKey] = [];
      }
      suggestionsByTime[timeKey].push(suggestion);
    });

    const finalSuggestions = [];

    // For each time slot, prioritize diverse meeting types
    Object.keys(suggestionsByTime).forEach((timeKey) => {
      const timeSuggestions = suggestionsByTime[timeKey];

      // Sort by priority: Physical rooms first, then online
      timeSuggestions.sort((a, b) => {
        const aPriority = a.meetingType === "Reunião Presencial" ? 1 : 2;
        const bPriority = b.meetingType === "Reunião Presencial" ? 1 : 2;
        return aPriority - bPriority;
      });

      // Add the best suggestion for this time slot
      if (timeSuggestions.length > 0) {
        finalSuggestions.push(timeSuggestions[0]);
      }
    });

    return finalSuggestions;
  }

  /**
   * Create a meeting suggestion for a specific date and time (legacy method)
   */
  createMeetingSuggestion(date, hour, dateLabel) {
    const startTime = new Date(date);
    startTime.setHours(hour, 0, 0, 0);
    const endTime = new Date(startTime);
    endTime.setHours(hour + 1, 0, 0, 0);

    // Skip past time slots
    if (startTime < new Date()) {
      return null;
    }

    // Find available participants first
    const availableParticipants = this.findAvailableParticipants(
      startTime,
      endTime
    );
    // Only require at least a gestor for a valid suggestion
    if (!availableParticipants.gestor) {
      return null;
    }

    // Find available room with meeting type consideration
    const roomResult = this.findAvailableRoom(
      startTime,
      endTime,
      "Reunião Presencial"
    );
    if (!roomResult) {
      return null;
    }

    // Generate intelligent subject for the meeting
    const intelligentSubject = this.generateIntelligentSubject(
      availableParticipants,
      roomResult.room,
      startTime
    );

    // Format time slot
    const timeSlot = `${hour.toString().padStart(2, "0")}:00 - ${(hour + 1).toString().padStart(2, "0")}:00`;

    // Create meeting type indicator
    const meetingTypeIndicator =
      roomResult.meetingType === "Reunião Online" ? "🌐" : "🏢";
    const meetingTypeText =
      roomResult.meetingType === "Reunião Online" ? "Online" : "Presencial";

    // Create suggestion object
    return {
      id: `suggestion-${date.getTime()}-${hour}`,
      startDateTime: startTime.toISOString(),
      endDateTime: endTime.toISOString(),
      timeSlot: timeSlot,
      dateLabel: dateLabel,
      roomName: roomResult.room.label,
      roomValue: roomResult.room.value,
      meetingType: roomResult.meetingType,
      meetingTypeIndicator: meetingTypeIndicator,
      meetingTypeText: meetingTypeText,
      participantsText: this.formatParticipantsText(availableParticipants),
      participants: availableParticipants,
      intelligentSubject: intelligentSubject,
      tooltip: `${meetingTypeText} - ${dateLabel} das ${timeSlot} na ${roomResult.room.label}`
    };
  }

  /**
   * Generate intelligent meeting subject based on contextual data
   */
  generateIntelligentSubject(participants, room, startTime) {
    // console.log("🧠 CalendarioReino: generateIntelligentSubject called");
    // console.log(`   Participants:`, participants);
    // console.log(`   Room:`, room);
    // console.log(`   Start Time:`, startTime);

    try {
      // Get current user name (from available users or default)
      const currentUser = this.getCurrentUserInfo();
      // console.log(`   Current User:`, currentUser);

      // Base subject patterns in Portuguese
      const subjectPatterns = [
        "Reunião de Negócios",
        "Reunião Comercial",
        "Apresentação de Proposta",
        "Reunião de Alinhamento",
        "Discussão de Oportunidades",
        "Reunião Estratégica",
        "Reunião de Planejamento"
      ];

      // Get time-based context
      const hour = startTime.getHours();
      const isAfternoon = hour >= 12;
      const timeContext = isAfternoon ? "Tarde" : "Manhã";

      // Analyze recent meeting patterns for intelligent suggestions
      const recentMeetingContext = this.analyzeRecentMeetingPatterns();
      // console.log(`   Recent Meeting Context:`, recentMeetingContext);

      // Generate subject based on available context
      let subject = "";

      // Priority 1: Use opportunity context if available
      if (recentMeetingContext.hasOpportunityPattern) {
        subject = `Reunião - ${recentMeetingContext.commonOpportunityType}`;
      }
      // Priority 2: Use contact/client context if available
      else if (recentMeetingContext.hasClientPattern) {
        subject = `Reunião com Cliente - ${participants.gestor.name}`;
      }
      // Priority 3: Use participant-based context
      else if (participants.gestor && participants.liderComercial) {
        subject = `Reunião Comercial - ${participants.gestor.name}`;
      }
      // Priority 4: Use room-based context
      else if (room.value === "salaPrincipal") {
        subject = "Reunião Estratégica - Sala Principal";
      } else if (room.value === "salaGabriel") {
        subject = "Reunião de Negócios - Sala Gabriel";
      }
      // Priority 5: Default pattern with time context
      else {
        const randomPattern =
          subjectPatterns[Math.floor(Math.random() * subjectPatterns.length)];
        subject = `${randomPattern} - ${timeContext}`;
      }

      // Add current user context if available
      if (currentUser && currentUser.name) {
        subject += ` - ${currentUser.name}`;
      }

      // console.log(`   Generated Subject: "${subject}"`);
      return subject;
    } catch (error) {
      console.error(
        "❌ CalendarioReino: Error generating intelligent subject:",
        error
      );
      console.error("   Error details:", error.message);
      console.error("   Stack trace:", error.stack);
      const fallbackSubject = "Reunião de Negócios";
      // console.log(`   Using fallback subject: "${fallbackSubject}"`);
      return fallbackSubject; // Fallback subject
    }
  }

  /**
   * Get current user information
   */
  getCurrentUserInfo() {
    // Try to get current user from available users or use a default
    if (this.selectedUserId && this.selectedUserName) {
      return { id: this.selectedUserId, name: this.selectedUserName };
    }

    // Fallback to first available user or default
    if (this.availableUsers && this.availableUsers.length > 0) {
      return this.availableUsers[0];
    }

    return { name: "Reino Capital" }; // Company fallback
  }

  /**
   * Analyze recent meeting patterns for intelligent context
   */
  analyzeRecentMeetingPatterns() {
    const context = {
      hasOpportunityPattern: false,
      hasClientPattern: false,
      commonOpportunityType: "",
      commonClientType: ""
    };

    if (!this.allEvents || this.allEvents.length === 0) {
      return context;
    }

    // Analyze recent events (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentEvents = this.allEvents.filter((event) => {
      const eventDate = new Date(event.start);
      return eventDate >= thirtyDaysAgo;
    });

    // Look for opportunity patterns
    const opportunityEvents = recentEvents.filter(
      (event) =>
        event.hasOpportunity ||
        (event.title && event.title.toLowerCase().includes("oportunidade"))
    );

    if (opportunityEvents.length > 0) {
      context.hasOpportunityPattern = true;
      context.commonOpportunityType = "Oportunidade de Negócio";
    }

    // Look for client patterns
    const clientEvents = recentEvents.filter(
      (event) =>
        event.hasContact ||
        (event.title && event.title.toLowerCase().includes("cliente"))
    );

    if (clientEvents.length > 0) {
      context.hasClientPattern = true;
      context.commonClientType = "Cliente";
    }

    return context;
  }

  /**
   * Find available room for the given time slot with meeting type consideration
   */
  findAvailableRoom(
    startTime,
    endTime,
    preferredMeetingType = "Reunião Presencial"
  ) {
    // If requesting online meeting, return online room directly
    if (preferredMeetingType === "Reunião Online") {
      const onlineRoom = this.meetingRooms.find(
        (room) => room.value === "online"
      );
      return onlineRoom
        ? { room: onlineRoom, meetingType: "Reunião Online" }
        : null;
    }

    // For presential meetings, check physical rooms first
    const physicalRooms = this.meetingRooms.filter(
      (room) => room.value !== "online" && room.value !== "Outra"
    );

    // Try to find an available physical room
    for (const room of physicalRooms) {
      if (this.isRoomAvailable(room, startTime, endTime)) {
        return { room: room, meetingType: "Reunião Presencial" };
      }
    }

    // If no physical room available, suggest online as alternative
    const onlineRoom = this.meetingRooms.find(
      (room) => room.value === "online"
    );
    return onlineRoom
      ? { room: onlineRoom, meetingType: "Reunião Online" }
      : null;
  }

  /**
   * Find multiple room alternatives for the given time slot
   */
  findAlternativeRooms(startTime, endTime) {
    const alternatives = [];

    // Check all physical rooms
    const physicalRooms = this.meetingRooms.filter(
      (room) => room.value !== "online" && room.value !== "Outra"
    );

    physicalRooms.forEach((room) => {
      if (this.isRoomAvailable(room, startTime, endTime)) {
        alternatives.push({
          room: room,
          meetingType: "Reunião Presencial",
          priority: 1 // High priority for available physical rooms
        });
      }
    });

    // Always include online as an alternative
    const onlineRoom = this.meetingRooms.find(
      (room) => room.value === "online"
    );
    if (onlineRoom) {
      alternatives.push({
        room: onlineRoom,
        meetingType: "Reunião Online",
        priority: alternatives.length > 0 ? 2 : 1 // Lower priority if physical rooms available
      });
    }

    // Include "Outra" as hybrid option
    const outraRoom = this.meetingRooms.find((room) => room.value === "Outra");
    if (outraRoom) {
      alternatives.push({
        room: outraRoom,
        meetingType: "Reunião Presencial",
        priority: 3 // Lowest priority
      });
    }

    // Sort by priority
    return alternatives.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Check if a room is available for the given time slot
   */
  isRoomAvailable(room, startTime, endTime) {
    // Reduced logging - only log when debugging is needed
    if (this.debugMode) {
      // console.log("🔍 CalendarioReino: isRoomAvailable called");
      // console.log("   Room Value:", room.value);
      // console.log("   Room Label:", room.label);
      // console.log("   Start Time:", startTime.toISOString());
      // console.log("   End Time:", endTime.toISOString());
      // console.log(
      //   "   All Events Count:",
      //   this.allEvents ? this.allEvents.length : 0
      // );
    }

    if (!this.allEvents) {
      // console.log("⚠️ CalendarioReino: No allEvents available, returning true");
      return true;
    }

    // Online rooms are always available
    if (room.value === "online") {
      // console.log("✅ CalendarioReino: Online room, always available");
      return true;
    }

    // Map internal room value to Salesforce field value
    const salesforceRoomValue = this.mapRoomValueToSalesforce(room.value);
    // console.log("🗺️ CalendarioReino: Room mapping");
    // console.log("   Internal Value:", room.value);
    // console.log("   Salesforce Value:", salesforceRoomValue);

    // Log all events with room assignments for debugging
    const eventsWithRooms = this.allEvents.filter((event) => event.salaReuniao);
    // console.log("📅 CalendarioReino: Events with room assignments");
    // console.log("   Total Events:", this.allEvents.length);
    // console.log("   Events With Rooms:", eventsWithRooms.length);

    eventsWithRooms.forEach((event, index) => {
      // console.log(`   Event ${index + 1}:`);
      // console.log(`     ID: ${event.id}`);
      // console.log(`     Title: ${event.title}`);
      // console.log(`     Room (salaReuniao): "${event.salaReuniao}"`);
      // console.log(`     Start: ${event.start}`);
      // console.log(`     End: ${event.end}`);
    });

    // Check for conflicts with existing events
    const conflicts = this.allEvents.filter((event) => {
      // Log each event being checked
      // console.log("🔍 CalendarioReino: Checking event");
      // console.log(`   Event ID: ${event.id}`);
      // console.log(`   Event Title: ${event.title}`);
      // console.log(`   Event Room: "${event.salaReuniao}"`);
      // console.log(`   Expected Room: "${salesforceRoomValue}"`);
      // console.log(
      //   `   Room Match: ${event.salaReuniao === salesforceRoomValue}`
      // );
      // console.log(`   Event Start: ${event.start}`);
      // console.log(`   Event End: ${event.end}`);

      // Compare against the Salesforce field value
      if (event.salaReuniao !== salesforceRoomValue) {
        // console.log("❌ CalendarioReino: Room mismatch");
        // console.log(`   Event Room: "${event.salaReuniao}"`);
        // console.log(`   Expected Room: "${salesforceRoomValue}"`);
        // console.log(
        //   `   Room comparison result: "${event.salaReuniao}" !== "${salesforceRoomValue}"`
        // );
        return false;
      }

      // console.log(
      //   "✅ CalendarioReino: Room match found, checking time overlap"
      // );

      // Handle both moment objects and date strings/objects
      let eventStart, eventEnd;

      if (event.start && typeof event.start.toDate === "function") {
        // It's a moment object
        eventStart = event.start.toDate();
      } else if (event.start) {
        // It's a string or Date object
        eventStart = new Date(event.start);
      } else {
        console.error("❌ CalendarioReino: Event has no start time", event);
        return false;
      }

      if (event.end && typeof event.end.toDate === "function") {
        // It's a moment object
        eventEnd = event.end.toDate();
      } else if (event.end) {
        // It's a string or Date object
        eventEnd = new Date(event.end);
      } else {
        console.error("❌ CalendarioReino: Event has no end time", event);
        return false;
      }

      // console.log("⏰ CalendarioReino: Time comparison");
      // console.log(`   Suggestion Start: ${startTime.toISOString()}`);
      // console.log(`   Suggestion End: ${endTime.toISOString()}`);
      // console.log(`   Event Start: ${eventStart.toISOString()}`);
      // console.log(`   Event End: ${eventEnd.toISOString()}`);
      // console.log(
      //   `   Overlap Condition 1 (${startTime.toISOString()} < ${eventEnd.toISOString()}): ${startTime < eventEnd}`
      // );
      // console.log(
      //   `   Overlap Condition 2 (${endTime.toISOString()} > ${eventStart.toISOString()}): ${endTime > eventStart}`
      // );
      // console.log(
      //   `   Has Overlap: ${startTime < eventEnd && endTime > eventStart}`
      // );

      // Check for time overlap
      const hasOverlap = startTime < eventEnd && endTime > eventStart;
      if (hasOverlap) {
        // console.log("🚫 CalendarioReino: Time overlap detected!");
      }
      return hasOverlap;
    });

    const isAvailable = conflicts.length === 0;
    // console.log("📊 CalendarioReino: Room availability result");
    // console.log(`   Room: ${room.label}`);
    // console.log(`   Salesforce Value: "${salesforceRoomValue}"`);
    // console.log(`   Conflicts Found: ${conflicts.length}`);
    // console.log(`   Is Available: ${isAvailable}`);

    if (conflicts.length > 0) {
      // console.log("   Conflicting Events:");
      conflicts.forEach((conflict, index) => {
        // console.log(`     Conflict ${index + 1}:`);
        // console.log(`       ID: ${conflict.id}`);
        // console.log(`       Title: ${conflict.title}`);
        // console.log(`       Start: ${conflict.start}`);
        // console.log(`       End: ${conflict.end}`);
      });
    }

    return isAvailable;
  }

  /**
   * Get room value mapping from internal values to Salesforce field values
   * Updated based on actual Salesforce data - the database stores internal values, not display names
   */
  getRoomValueMap() {
    return {
      salaPrincipal: "salaPrincipal",
      salaGabriel: "salaGabriel",
      Outra: "Outra",
      online: "online"
    };
  }

  /**
   * Convert internal room value to Salesforce field value
   */
  mapRoomValueToSalesforce(internalValue) {
    const roomValueMap = this.getRoomValueMap();
    const mappedValue = roomValueMap[internalValue] || internalValue;

    // console.log("🗺️ CalendarioReino: Room value mapping");
    // console.log(`   Input: "${internalValue}"`);
    // console.log(`   Output: "${mappedValue}"`);
    // console.log("   Available Mappings:");
    Object.keys(roomValueMap).forEach((key) => {
      // console.log(`     "${key}" → "${roomValueMap[key]}"`);
    });

    return mappedValue;
  }

  /**
   * Format participants text for display, handling null values
   * Updated to remove role titles for cleaner display
   */
  formatParticipantsText(participants) {
    const participantNames = [];

    if (participants.sdr && participants.sdr.name) {
      participantNames.push(participants.sdr.name);
    }

    if (participants.gestor && participants.gestor.name) {
      participantNames.push(participants.gestor.name);
    }

    if (participants.liderComercial && participants.liderComercial.name) {
      participantNames.push(participants.liderComercial.name);
    }

    return participantNames.length > 0
      ? participantNames.join(", ")
      : "Participantes a definir";
  }

  /**
   * Find available participants for the given time slot with improved distribution
   */
  findAvailableParticipants(startTime, endTime) {
    if (!this.availableUsers || this.availableUsers.length === 0) {
      return { sdr: null, gestor: null, liderComercial: null };
    }

    const availableUsers = this.availableUsers.filter((user) =>
      this.isUserAvailable(user, startTime, endTime)
    );

    if (availableUsers.length === 0) {
      return { sdr: null, gestor: null, liderComercial: null };
    }

    // Improved participant assignment to avoid duplication
    const result = {
      sdr: null,
      gestor: null,
      liderComercial: null
    };

    // Shuffle available users to create variety in suggestions
    const shuffledUsers = [...availableUsers].sort(() => Math.random() - 0.5);

    if (shuffledUsers.length >= 3) {
      // If we have 3 or more users, assign different users to each role
      result.sdr = shuffledUsers[0];
      result.gestor = shuffledUsers[1];
      result.liderComercial = shuffledUsers[2];
    } else if (shuffledUsers.length === 2) {
      // If we have 2 users, assign them to different roles and leave one role empty
      result.sdr = shuffledUsers[0];
      result.gestor = shuffledUsers[1];
      result.liderComercial = null; // Leave this role empty to avoid duplication
    } else if (shuffledUsers.length === 1) {
      // If we have only 1 user, assign to the most important role (gestor)
      result.sdr = null;
      result.gestor = shuffledUsers[0];
      result.liderComercial = null;
    }

    // Only return valid suggestions if we have at least a gestor
    if (!result.gestor) {
      return { sdr: null, gestor: null, liderComercial: null };
    }

    return result;
  }

  /**
   * Check if a user is available for the given time slot
   */
  isUserAvailable(user, startTime, endTime) {
    if (!this.allEvents) return true;

    // Check for conflicts with existing events where user is involved
    const conflicts = this.allEvents.filter((event) => {
      // Check if user is involved in the event
      const isInvolved =
        event.ownerId === user.id ||
        event.gestorName === user.name ||
        event.liderComercialName === user.name ||
        event.sdrName === user.name;

      if (!isInvolved) return false;

      // Handle both moment objects and date strings/objects
      let eventStart, eventEnd;

      if (event.start && typeof event.start.toDate === "function") {
        eventStart = event.start.toDate();
      } else if (event.start) {
        eventStart = new Date(event.start);
      } else {
        return false;
      }

      if (event.end && typeof event.end.toDate === "function") {
        eventEnd = event.end.toDate();
      } else if (event.end) {
        eventEnd = new Date(event.end);
      } else {
        return false;
      }

      // Check for time overlap
      return startTime < eventEnd && endTime > eventStart;
    });

    return conflicts.length === 0;
  }

  /**
   * Handle suggestion card click
   */
  handleSuggestionClick(event) {
    const suggestionId = event.currentTarget.dataset.suggestionId;
    const suggestion = this.meetingSuggestions.find(
      (s) => s.id === suggestionId
    );

    if (!suggestion) return;

    // Clear any existing event data
    this.selectedEventId = null;
    this.prefilledWhoId = null;
    this.prefilledWhatId = null;
    this.selectedEventData = null;

    // Set up pre-populated data for appointment editor
    this.selectedStartDate = suggestion.startDateTime;
    this.selectedEndDate = suggestion.endDateTime;

    // Store suggestion data for the appointment editor
    this.suggestionData = {
      roomValue: suggestion.roomValue,
      meetingType: suggestion.meetingType,
      participants: suggestion.participants,
      intelligentSubject: suggestion.intelligentSubject
    };

    // Open appointment editor
    this.showAppointmentEditor = true;

    this.showToast(
      "Sugestão Selecionada",
      `Abrindo editor com horário ${suggestion.timeSlot} na ${suggestion.roomName}`,
      "success"
    );
  }

  /**
   * Custom event rendering to show enhanced information
   * @param {Object} event - The event object from FullCalendar
   * @param {jQuery} element - The jQuery element for the event
   * @returns {jQuery} - The modified element
   */
  renderEnhancedEvent(event, element) {
    try {
      // Get the current view to determine layout
      const view = this.calendar ? this.calendar.fullCalendar("getView") : null;
      const isMonthView = view && view.name === "month";

      // Apply custom color if available
      if (event.customColor) {
        // console.log(
        //   `🎨 Applying custom color to event ${event.id}: ${event.customColor}`
        // );
        const borderColor = this.getBorderColorForBackground(event.customColor);
        element.css("background-color", event.customColor);
        element.css("border-color", borderColor);
        element.css("border-width", "1px");
        element.css("border-style", "solid");
      } else {
        // Apply predefined colors based on event category
        const colorCategory = this.getEventColorCategory(event);
        const mappings = this.getPredefinedColorMappings();
        const predefinedColor = mappings.categoryToColor[colorCategory];

        // console.log(
        //   `🎨 Event ${event.id} (${event.title}): category=${colorCategory}, color=${predefinedColor}, statusReuniao=${event.statusReuniao}`
        // );

        if (predefinedColor) {
          // console.log(
          //   `🎨 Applying predefined color to event ${event.id}: ${predefinedColor}`
          // );
          const borderColor = this.getBorderColorForBackground(predefinedColor);
          element.css("background-color", predefinedColor);
          element.css("border-color", borderColor);
          element.css("border-width", "1px");
          element.css("border-style", "solid");
        } else {
          // Fallback to CSS classes based on event type for default colors
          // console.log(
          //   `🎨 No predefined color for event ${event.id}, using CSS class fallback`
          // );
          if (event.type) {
            element.addClass(
              `reino-event-type-${event.type.toLowerCase().replace(/\s+/g, "-")}`
            );
          }
        }
      }

      // Create enhanced content structure with three-dot menu
      const enhancedContent = this.createEnhancedEventContent(
        event,
        isMonthView
      );

      // Replace the default content with enhanced content
      element.find(".fc-content").html(enhancedContent);

      // Add event listeners for the three-dot menu
      this.addEventMenuListeners(element, event);

      return element;
    } catch (error) {
      console.error("Error rendering enhanced event:", error);
      return element; // Return original element if there's an error
    }
  }

  /**
   * Create enhanced event content HTML
   * @param {Object} event - The event object
   * @param {Boolean} isMonthView - Whether we're in month view
   * @returns {String} - HTML content for the event
   */
  createEnhancedEventContent(event, isMonthView) {
    const title = event.title || "Sem título";
    const type = event.type || "";
    const room = this.formatMeetingRoom(event.salaReuniao);
    const participants = this.formatParticipants(event);
    const attachment = this.formatAttachment(event);

    // Format time for display
    const timeDisplay = this.formatEventTime(event);

    // Note: "Acontecendo Agora" functionality now handled by happeningNowIndicator component

    if (isMonthView) {
      // Compact layout for month view - show title and time only
      return `
        <div class="teams-event-content">
          <div class="event-header">
            <div class="fc-title">${title}</div>
            <button class="event-menu-button" data-event-id="${event.id}" aria-label="Event options" title="Opções do evento">
              <span class="event-menu-dots">⋯</span>
            </button>
          </div>
          ${timeDisplay ? `<div class="fc-time">${timeDisplay}</div>` : ""}
          ${type ? `<div class="event-type">${type}</div>` : ""}
          ${room ? `<div class="event-room">${room}</div>` : ""}
          ${participants ? `<div class="event-participants">👥 ${participants}</div>` : ""}
          ${attachment ? `<div class="event-attachment">${attachment}</div>` : ""}
        </div>
      `;
    } else {
      // Detailed layout for week/day view
      return `
        <div class="teams-event-content">
          <div class="event-header">
            <div class="fc-title">${title}</div>
            <button class="event-menu-button" data-event-id="${event.id}" aria-label="Event options" title="Opções do evento">
              <span class="event-menu-dots">⋯</span>
            </button>
          </div>
          ${timeDisplay ? `<div class="fc-time">${timeDisplay}</div>` : ""}
          ${type ? `<div class="event-type">${type}</div>` : ""}
          ${room ? `<div class="event-room">${room}</div>` : ""}
          ${participants ? `<div class="event-participants">👥 ${participants}</div>` : ""}
          ${attachment ? `<div class="event-attachment">${attachment}</div>` : ""}
        </div>
      `;
    }
  }

  /**
   * Format event time for display
   * @param {Object} event - The event object
   * @returns {String} - Formatted time string
   */
  formatEventTime(event) {
    try {
      if (!event.start) return "";

      // Handle both moment objects and date strings
      const startTime = moment.isMoment(event.start)
        ? event.start
        : moment(event.start);
      const endTime = event.end
        ? moment.isMoment(event.end)
          ? event.end
          : moment(event.end)
        : null;

      if (event.allDay) {
        return "Todo o dia";
      }

      const startFormatted = startTime.format("HH:mm");

      if (endTime) {
        const endFormatted = endTime.format("HH:mm");
        return `${startFormatted} - ${endFormatted}`;
      }

      return startFormatted;
    } catch (error) {
      console.error("Error formatting event time:", error);
      return "";
    }
  }

  /**
   * Format meeting room for display
   * @param {String} salaReuniao - The meeting room value (internal value from database)
   * @returns {String} - Formatted room name for display
   */
  formatMeetingRoom(salaReuniao) {
    if (!salaReuniao) return "";

    // Updated mapping: Database stores internal values, this method converts to display names for UI
    const roomMap = {
      salaPrincipal: "Sala Principal",
      salaGabriel: "Sala do Gabriel",
      Outra: "Outra Localização",
      online: "Online"
    };

    return roomMap[salaReuniao] || salaReuniao;
  }

  /**
   * Format participants for display
   * @param {Object} event - The event object
   * @returns {String} - Formatted participants string
   */
  formatParticipants(event) {
    const participants = [];

    if (event.gestorName) {
      participants.push(event.gestorName);
    }
    if (event.liderComercialName) {
      participants.push(event.liderComercialName);
    }
    if (event.sdrName) {
      participants.push(event.sdrName);
    }

    if (participants.length === 0) return "";

    // Show first participant and count if there are more
    if (participants.length === 1) {
      return participants[0];
    } else if (participants.length === 2) {
      return `${participants[0]}, ${participants[1]}`;
    } else {
      return `${participants[0]} +${participants.length - 1}`;
    }
  }

  /**
   * Format attachment information for display
   * @param {Object} event - The event object
   * @returns {String} - Formatted attachment string
   */
  formatAttachment(event) {
    if (!event.attachmentType) return "";

    const attachmentMap = {
      Contact: "Contato",
      Lead: "Lead",
      Opportunity: "Oportunidade",
      Account: "Conta"
    };

    const attachmentLabel =
      attachmentMap[event.attachmentType] || event.attachmentType;
    return `<span class="attachment-indicator"></span>${attachmentLabel}`;
  }

  /**
   * Add event listeners for the three-dot menu
   * @param {jQuery} element - The event element
   * @param {Object} event - The event data
   */
  addEventMenuListeners(element, event) {
    // Find the menu button and add click listener
    const menuButton = element.find(".event-menu-button");

    if (menuButton.length > 0) {
      menuButton.on("click", (e) => {
        e.stopPropagation(); // Prevent event click from firing
        this.handleEventMenuClick(e, event);
      });
    }
  }

  // Custom popover methods removed - using default FullCalendar behavior

  // Event delegation method removed - using default FullCalendar behavior

  // Mutation observer method removed - using default FullCalendar behavior

  // Custom popover creation method removed - using default FullCalendar behavior

  // Custom event element creation method removed - using default FullCalendar behavior

  // Custom event content rendering method removed - using default FullCalendar behavior

  // Utility methods for custom popover removed - using default FullCalendar behavior

  // Custom popover positioning method removed - using default FullCalendar behavior

  // Custom popover listeners method removed - using default FullCalendar behavior

  // Custom popover cleanup methods removed - using default FullCalendar behavior

  /**
   * Handle three-dot menu click
   * @param {Event} clickEvent - The click event
   * @param {Object} calendarEvent - The calendar event data
   */
  handleEventMenuClick(clickEvent, calendarEvent) {
    const button = clickEvent.currentTarget;

    // Find the event element for highlighting and positioning
    const eventElement = this.findEventElement(button);

    // Use the event element as trigger for better positioning
    this.colorPickerTriggerElement = eventElement || button;

    // Find and highlight the event element
    this.highlightEventElement(button, calendarEvent);

    // Calculate initial position
    this.calculateColorPickerPosition();

    this.colorPickerEventId = calendarEvent.id;
    // Set initial color based on priority hierarchy: Custom → Status → Room → Default
    if (calendarEvent.customColor) {
      // Priority 1: Custom color exists
      this.selectedColor = calendarEvent.customColor;
    } else {
      // Priority 2-4: Determine color based on status/room using existing logic
      const colorCategory = this.getEventColorCategory(calendarEvent);
      const mappings = this.getPredefinedColorMappings();
      const determinedColor = mappings.categoryToColor[colorCategory];
      this.selectedColor = determinedColor || null;
    }

    // Store complete event data for display
    this.colorPickerEventData = {
      id: calendarEvent.id,
      title: calendarEvent.title,
      start: calendarEvent.start,
      end: calendarEvent.end,
      gestorName: calendarEvent.gestorName,
      liderComercialName: calendarEvent.liderComercialName,
      sdrName: calendarEvent.sdrName
    };

    // Load meeting status for the selected event - use picklist value directly
    this.colorPickerMeetingStatus = calendarEvent.statusReuniao || null;

    // Load meeting outcome for the selected event
    this.colorPickerMeetingOutcome = calendarEvent.reuniaoAconteceu;

    // Load event type to determine URL field visibility
    this.colorPickerEventType = calendarEvent.type || "";
    // Find the complete event data in our cache instead of using FullCalendar event
    const completeEvent = this.allEvents.find(
      (event) => event.id === calendarEvent.id
    );

    // Extract linkReuniao from Description field (primary storage)
    let extractedLink = "";
    if (completeEvent) {
      try {
        // Use the extractLinkFromEvent method for consistent extraction
        extractedLink = this.extractLinkFromEvent(completeEvent) || "";
      } catch (error) {
        console.error("Error accessing event properties:", error);
        extractedLink = "";
      }
    }

    // Load existing meeting link URL from the complete event data
    this.colorPickerLinkReuniao = extractedLink;

    // If no link was found in cache but this is an online meeting, try to refresh from Salesforce
    if (
      !this.colorPickerLinkReuniao &&
      this.colorPickerEventType === "Reunião Online"
    ) {
      // Use setTimeout to refresh after modal opens, preventing blocking
      setTimeout(() => {
        this.refreshEventDataFromSalesforce(calendarEvent.id);
      }, 500);
    }

    // Initialize URL card state based on existing URL (only if valid)
    this.showUrlCard = !!(
      this.colorPickerLinkReuniao &&
      this.colorPickerLinkReuniao.trim() &&
      this.isValidUrl(this.colorPickerLinkReuniao)
    );

    // Set initial state of status combobox based on meeting outcome
    // Show combobox only if meeting outcome is false (Não)
    this.showStatusCombobox = this.colorPickerMeetingOutcome === false;

    this.showColorPicker = true;

    // Calculate position with Floating UI
    this.calculateColorPickerPosition();
  }

  /**
   * Calculate position using ONLY Floating UI
   */
  async calculateColorPickerPosition() {
    // Wait for modal to be rendered
    await new Promise(resolve => setTimeout(resolve, 10));

    const modal = this.template.querySelector('.color-picker-modal');
    if (!modal || !this.colorPickerTriggerElement) return;

    // Use ONLY Floating UI - no custom positioning fallback
    if (window.FloatingUIDOM) {
      this.setupFloatingUI(modal);
    } else {
      console.error('❌ Floating UI not available - cannot position modal');
    }
  }

  /**
   * Set up Floating UI positioning with smart placement (no arrow)
   */
  setupFloatingUI(modal) {
    const { computePosition, flip, shift, offset, autoUpdate, hide } = window.FloatingUIDOM;

    // Clean up any existing auto-update
    if (this.floatingUICleanup) {
      this.floatingUICleanup();
    }

    // Set up auto-updating position with smart placement
    this.floatingUICleanup = autoUpdate(
      this.colorPickerTriggerElement,
      modal,
      async () => {
        const { x, y, placement } = await computePosition(
          this.colorPickerTriggerElement,
          modal,
          {
            placement: 'right-start', // Start with right to avoid covering event
            middleware: [
              offset(40), // Very large offset to ensure no covering
              flip({
                // Comprehensive fallback placements - prioritize sides over top/bottom
                fallbackPlacements: [
                  'left-start',    // Try left side first
                  'right-end',     // Try right-bottom
                  'left-end',      // Try left-bottom
                  'bottom-start',  // Try below
                  'bottom-end',    // Try below-right
                  'top-start',     // Try above (last resort)
                  'top-end'        // Try above-right (last resort)
                ]
              }),
              shift({
                padding: 40,     // Large padding from viewport edges
                crossAxis: true, // Allow shifting on cross axis
                limiter: 'auto'  // Auto limit shifting
              }),
              hide() // Hide if no good position is available
            ]
          }
        );

        // Apply modal position
        Object.assign(modal.style, {
          left: `${x}px`,
          top: `${y}px`,
          visibility: 'visible'
        });

        // Debug: Log placement for troubleshooting
        console.log('🎨 Modal placement:', placement, 'Position:', { x, y });
        console.log('🎯 Trigger element:', this.colorPickerTriggerElement.getBoundingClientRect());
        console.log('🎯 Modal element:', modal.getBoundingClientRect());

        // Check if modal is covering the trigger
        const triggerRect = this.colorPickerTriggerElement.getBoundingClientRect();
        const modalRect = modal.getBoundingClientRect();
        const isOverlapping = !(modalRect.right < triggerRect.left ||
                               modalRect.left > triggerRect.right ||
                               modalRect.bottom < triggerRect.top ||
                               modalRect.top > triggerRect.bottom);

        if (isOverlapping) {
          console.log('⚠️ Modal is still overlapping trigger element!');
        } else {
          console.log('✅ Modal positioned correctly, no overlap');
        }
      }
    );
  }

  // Custom positioning removed - using ONLY Floating UI

  /**
   * Find the event element from the button
   */
  findEventElement(button) {
    // Find the event element - try multiple selectors
    let eventElement = button.closest('.fc-event') ||
                      button.closest('.reino-event') ||
                      button.closest('[data-event-id]') ||
                      button.closest('.fc-day-grid-event') ||
                      button.closest('.fc-time-grid-event');

    // If still not found, try going up the DOM tree
    if (!eventElement) {
      let parent = button.parentElement;
      while (parent && !parent.classList.contains('fc-view')) {
        if (parent.classList.contains('fc-event') ||
            parent.classList.contains('reino-event') ||
            parent.hasAttribute('data-event-id')) {
          eventElement = parent;
          break;
        }
        parent = parent.parentElement;
      }
    }

    return eventElement;
  }

  /**
   * Highlight the event element when color picker opens
   */
  highlightEventElement(button, calendarEvent) {
    // Remove any existing highlight
    this.removeEventHighlight();

    // Find the event element using the helper method
    const eventElement = this.findEventElement(button);

    if (eventElement) {
      this.highlightedEventElement = eventElement;

      // Get the event's actual color
      const eventColor = this.getEventHighlightColor(calendarEvent);

      // Apply dynamic highlight based on event color
      this.applyDynamicHighlight(eventElement, eventColor);

      // Force a reflow to ensure the animation triggers
      eventElement.offsetHeight;

      console.log('🎯 Event highlighted:', {
        eventElement: eventElement.getBoundingClientRect(),
        eventColor,
        className: eventElement.className
      });
    } else {
      console.log('❌ Could not find event element to highlight');
    }
  }

  /**
   * Get the appropriate highlight color for an event
   */
  getEventHighlightColor(calendarEvent) {
    // Priority 1: Custom color
    if (calendarEvent.customColor) {
      return calendarEvent.customColor;
    }

    // Priority 2-4: Use eventColorManager to determine color
    if (this.eventColorManager) {
      const colorCategory = this.eventColorManager.getEventColorCategory(calendarEvent);
      const color = this.eventColorManager.getColorForCategory(colorCategory);
      if (color) {
        return color;
      }
    }

    // Fallback: Default gray
    return '#8A8886';
  }

  /**
   * Apply dynamic highlight with event's color
   */
  applyDynamicHighlight(eventElement, eventColor) {
    eventElement.classList.add('event-highlighted');

    // Convert hex to RGB for alpha manipulation
    const rgb = this.hexToRgb(eventColor);
    if (rgb) {
      // Create CSS custom properties for the highlight color
      eventElement.style.setProperty('--highlight-color', eventColor);
      eventElement.style.setProperty('--highlight-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
    }
  }

  /**
   * Convert hex color to RGB
   */
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  /**
   * Remove event highlight with smooth animation
   */
  removeEventHighlight() {
    if (this.highlightedEventElement) {
      // Add fade-out class for smooth transition
      this.highlightedEventElement.classList.add('event-highlight-fadeout');

      // Remove highlight after animation
      setTimeout(() => {
        if (this.highlightedEventElement) {
          this.highlightedEventElement.classList.remove('event-highlighted', 'event-highlight-fadeout');

          // Clean up custom properties
          this.highlightedEventElement.style.removeProperty('--highlight-color');
          this.highlightedEventElement.style.removeProperty('--highlight-rgb');

          this.highlightedEventElement = null;
        }
      }, 300);
    }
  }

  /**
   * Clean up Floating UI
   */
  removeColorPickerPositionListeners() {
    if (this.floatingUICleanup) {
      this.floatingUICleanup();
      this.floatingUICleanup = null;
    }
  }



  /**
   * Handle color selection with auto-save functionality
   * @param {Event} event - The click event
   */
  handleColorSelect(event) {
    const selectedColor = event.currentTarget.dataset.color;
    this.selectedColor = selectedColor;

    // Auto-save the selected color and URL immediately (only for online meetings)
    if (this.colorPickerEventId && selectedColor) {
      if (this.showUrlInputField) {
        // For online meetings, save color and URL but don't close modal
        this.autoSaveSelectedColorAndLink(
          selectedColor,
          this.colorPickerLinkReuniao
        );
      } else {
        // For non-online meetings, save color and close modal as before
        this.autoSaveSelectedColor(selectedColor);
      }
    }
  }

  /**
   * Handle URL input change with debouncing
   * @param {Event} event - The input change event
   */
  handleLinkReuniaoChange(event) {
    this.colorPickerLinkReuniao = event.target.value;

    // Clear any existing timeouts
    if (this.urlSaveTimeout) {
      clearTimeout(this.urlSaveTimeout);
    }
    if (this.urlCardTimeout) {
      clearTimeout(this.urlCardTimeout);
    }

    // Reset card state when typing
    this.showUrlCard = false;

    // Auto-save after 1 second of no typing (debouncing)
    if (
      this.colorPickerEventId &&
      this.selectedColor &&
      this.showUrlInputField
    ) {
      this.urlSaveTimeout = setTimeout(() => {
        this.autoSaveSelectedColorAndLink(
          this.selectedColor,
          this.colorPickerLinkReuniao
        );
      }, 1000);
    }

    // Convert to card after 2 seconds of no typing (only if URL is valid)
    if (this.colorPickerLinkReuniao && this.colorPickerLinkReuniao.trim()) {
      this.urlCardTimeout = setTimeout(() => {
        // Only convert if URL is valid
        if (this.isValidUrl(this.colorPickerLinkReuniao)) {
          this.convertToUrlCard();
        }
      }, 2000);
    }
  }

  /**
   * Handle URL input blur event
   * @param {Event} event - The blur event
   */
  handleLinkReuniaoBlur(event) {
    // Convert to card immediately on blur if URL exists and is valid
    const url =
      this.colorPickerLinkReuniao && this.colorPickerLinkReuniao.trim();
    if (url && this.isValidUrl(url)) {
      // Clear any pending timeout
      if (this.urlCardTimeout) {
        clearTimeout(this.urlCardTimeout);
      }

      // Convert to card after a short delay to allow for click events
      setTimeout(() => {
        this.convertToUrlCard();
      }, 200);
    }
  }

  /**
   * Validate if URL is properly formatted
   * @param {String} url - The URL to validate
   * @returns {Boolean} - True if URL is valid
   */
  isValidUrl(url) {
    if (!url || !url.trim()) {
      return false;
    }

    try {
      // Try to create URL object - this will throw if invalid
      let testUrl = url.trim();

      // Add protocol if missing
      if (!testUrl.startsWith("http://") && !testUrl.startsWith("https://")) {
        testUrl = "https://" + testUrl;
      }

      const urlObj = new URL(testUrl);

      // Additional validation checks
      const validProtocols = ["http:", "https:"];
      if (!validProtocols.includes(urlObj.protocol)) {
        return false;
      }

      // Must have a valid hostname
      if (!urlObj.hostname || urlObj.hostname.length < 3) {
        return false;
      }

      // Must contain at least one dot (for domain)
      if (!urlObj.hostname.includes(".")) {
        return false;
      }

      // Check for common invalid patterns
      const invalidPatterns = [
        /^https?:\/\/\s*$/, // Just protocol
        /^https?:\/\/\.$/, // Just protocol and dot
        /^https?:\/\/localhost$/, // Localhost without port (usually not meeting links)
        /^https?:\/\/\d+\.\d+\.\d+\.\d+$/ // Raw IP addresses (usually not meeting links)
      ];

      for (const pattern of invalidPatterns) {
        if (pattern.test(testUrl)) {
          return false;
        }
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Convert URL input to card display (only for valid URLs)
   */
  convertToUrlCard() {
    const url =
      this.colorPickerLinkReuniao && this.colorPickerLinkReuniao.trim();
    if (url && this.isValidUrl(url)) {
      this.showUrlCard = true;
    }
  }

  /**
   * Handle URL card click - open URL in new tab
   * @param {Event} event - The click event
   */
  handleUrlCardClick(event) {
    event.preventDefault();
    event.stopPropagation();

    if (this.colorPickerLinkReuniao) {
      // Ensure URL has protocol
      let url = this.colorPickerLinkReuniao;
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        url = "https://" + url;
      }

      try {
        window.open(url, "_blank", "noopener,noreferrer");
      } catch (error) {
        console.error("Error opening URL:", error);
        this.showToast("Erro", "Não foi possível abrir o link", "error");
      }
    }
  }

  /**
   * Handle URL card keyboard navigation
   * @param {Event} event - The keydown event
   */
  handleUrlCardKeydown(event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      this.handleUrlCardClick(event);
    } else if (event.key === "Tab" && !event.shiftKey) {
      // Tab to edit button - let default behavior handle this
      return;
    }
  }

  /**
   * Handle edit button click - convert back to input field
   * @param {Event} event - The click event
   */
  handleUrlEditClick(event) {
    event.preventDefault();
    event.stopPropagation();

    this.showUrlCard = false;

    // Focus the input field after it's rendered
    setTimeout(() => {
      const urlInput = this.template.querySelector(".url-input-field input");
      if (urlInput) {
        urlInput.focus();
      }
    }, 100);
  }

  /**
   * Handle edit button keyboard navigation
   * @param {Event} event - The keydown event
   */
  handleUrlEditKeydown(event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      this.handleUrlEditClick(event);
    }
  }

  /**
   * Auto-save the selected color and close the modal (delegated to eventColorManager)
   * @param {String} selectedColor - The selected color hex code
   */
  autoSaveSelectedColor(selectedColor) {
    if (!this.eventColorManager) {
      console.error("🎨 EventColorManager not available");
      return;
    }

    // Set loading state for better UX
    this.isLoading = true;

    // console.log("🎨 CalendarioReino: Auto-saving color", {
    //   eventId: this.colorPickerEventId,
    //   color: selectedColor
    // });

    this.eventColorManager.saveCustomColor(
      this.colorPickerEventId,
      selectedColor,
      (result) => {
        // Success callback
        this.showToast(
          "Sucesso",
          "Cor do evento atualizada com sucesso!",
          "success"
        );
      },
      (error) => {
        // Error callback
        this.showToast("Erro", "Erro ao salvar cor do evento", "error");
      }
    );

    // Always close the modal and clear loading state
    this.isLoading = false;
    this.closeColorPicker();
  }

  /**
   * Auto-save the selected color and URL without closing the modal (delegated to eventColorManager)
   * @param {String} selectedColor - The selected color hex code
   * @param {String} linkReuniao - The meeting link URL
   */
  autoSaveSelectedColorAndLink(selectedColor, linkReuniao) {
    if (!this.eventColorManager) {
      console.error("🎨 EventColorManager not available");
      return;
    }

    // Set loading state for better UX
    this.isLoading = true;

    // console.log("🎨 CalendarioReino: Auto-saving color and link", {
    //   eventId: this.colorPickerEventId,
    //   color: selectedColor,
    //   link: linkReuniao
    // });

    this.eventColorManager.saveCustomColorAndLink(
      this.colorPickerEventId,
      selectedColor,
      linkReuniao,
      (result) => {
        // Success callback - don't show toast for auto-save to avoid spam
        // this.showToast(
        //   "Sucesso",
        //   "Cor e link do evento atualizados com sucesso!",
        //   "success"
        // );
        this.isLoading = false;
      },
      (error) => {
        // Error callback
        this.showToast("Erro", "Erro ao salvar cor e link do evento", "error");
        this.isLoading = false;
      }
    );

    // Don't close the modal automatically - let user continue editing
  }

  /**
   * Handle meeting status radio button change in color picker
   * @param {Event} event - The radio button change event
   */
  handleColorPickerMeetingStatusChange(event) {
    const selectedValue = event.target.value;

    // Use picklist value directly - no conversion needed
    const newStatus = selectedValue === "null" ? null : selectedValue;

    // console.log("🎯 Meeting status radio change:", {
    //   selectedValue,
    //   newStatus,
    //   eventId: this.colorPickerEventId
    // });

    this.colorPickerMeetingStatus = newStatus;

    // Automatically set the corresponding color based on status
    if (newStatus) {
      const statusBasedColor = this.getColorForStatus(newStatus);
      if (statusBasedColor) {
        this.selectedColor = statusBasedColor;
        // console.log("🎯 Auto-selected color for status:", {
        //   status: newStatus,
        //   color: statusBasedColor
        // });
      }
    } else {
      // If status is null/undefined, clear the selected color
      this.selectedColor = null;
    }

    // Save the status immediately to Salesforce
    if (this.colorPickerEventId) {
      this.saveMeetingStatusToSalesforce(this.colorPickerEventId, newStatus);
    }
  }

  /**
   * Get the corresponding color for a meeting status (delegated to eventColorManager)
   * @param {String} status - The meeting status value
   * @returns {String} - The hex color code or null
   */
  getColorForStatus(status) {
    return this.eventColorManager?.getColorForStatus(status) || null;
  }

  /**
   * Handle "Sim" (Yes) button click - meeting happened
   */
  handleMeetingOutcomeYes() {
    this.colorPickerMeetingOutcome = true;
    this.showStatusCombobox = false; // Hide combobox when meeting happened
    this.colorPickerMeetingStatus = null; // Clear status when meeting happened

    // Automatically set green color for "Aconteceu" status
    this.selectedColor =
      this.eventColorManager?.getAconteceuColor() || "#D6F3E4";

    // console.log(
    //   "🎯 Meeting outcome set to Yes (happened), auto-selected green color"
    // );

    // Clear custom color to allow status-based color to take effect
    if (this.colorPickerEventId) {
      this.clearCustomColorAndSaveOutcome(this.colorPickerEventId, true);
    }
  }

  /**
   * Handle "Não" (No) button click - meeting didn't happen
   */
  handleMeetingOutcomeNo() {
    this.colorPickerMeetingOutcome = false;
    this.showStatusCombobox = true; // Show combobox to select reason

    // console.log("🎯 Meeting outcome set to No (didn't happen)");

    // Clear custom color to allow status-based color to take effect
    if (this.colorPickerEventId) {
      this.clearCustomColorAndSaveOutcome(this.colorPickerEventId, false);
    }
  }

  /**
   * Handle status combobox change (for reasons when meeting didn't happen)
   */
  handleStatusComboboxChange(event) {
    const selectedStatus = event.target.value;
    this.colorPickerMeetingStatus = selectedStatus;

    // console.log("🎯 Status reason selected:", selectedStatus);

    // Automatically set the corresponding color based on status
    if (selectedStatus) {
      const statusBasedColor = this.getColorForStatus(selectedStatus);
      if (statusBasedColor) {
        this.selectedColor = statusBasedColor;
        // console.log("🎯 Auto-selected color for status:", {
        //   status: selectedStatus,
        //   color: statusBasedColor
        // });
      }
    }

    // Clear custom color and save the status to Salesforce
    if (this.colorPickerEventId) {
      this.clearCustomColorAndSaveStatus(
        this.colorPickerEventId,
        selectedStatus
      );
    }
  }

  /**
   * Clear custom color and save meeting outcome to Salesforce (delegated to eventColorManager)
   * @param {String} eventId - The event ID
   * @param {Boolean} meetingOutcome - The meeting outcome
   */
  clearCustomColorAndSaveOutcome(eventId, meetingOutcome) {
    if (!this.eventColorManager) {
      console.error("🎯 EventColorManager not available");
      return;
    }

    this.eventColorManager.clearCustomColorAndSaveOutcome(
      eventId,
      meetingOutcome,
      (result) => {
        // Success callback
        this.showToast(
          "Sucesso",
          "Resultado da reunião atualizado com sucesso!",
          "success"
        );
      },
      (error) => {
        // Error callback
        this.showToast("Erro", "Erro ao salvar resultado da reunião", "error");
        // Revert the outcome selection on error
        const originalEvent = this.allEvents.find((e) => e.id === eventId);
        if (originalEvent) {
          this.colorPickerMeetingOutcome = originalEvent.reuniaoAconteceu;
        }
      }
    );
  }

  /**
   * Clear custom color and save meeting status to Salesforce (delegated to eventColorManager)
   * @param {String} eventId - The event ID
   * @param {String} statusValue - The meeting status
   */
  clearCustomColorAndSaveStatus(eventId, statusValue) {
    if (!this.eventColorManager) {
      console.error("🎯 EventColorManager not available");
      return;
    }

    this.eventColorManager.clearCustomColorAndSaveStatus(
      eventId,
      statusValue,
      (result) => {
        // Success callback
        this.showToast(
          "Sucesso",
          "Status da reunião atualizado com sucesso!",
          "success"
        );
      },
      (error) => {
        // Error callback
        this.showToast("Erro", "Erro ao salvar status da reunião", "error");
        // Revert the status selection on error
        const originalEvent = this.allEvents.find((e) => e.id === eventId);
        if (originalEvent) {
          this.colorPickerMeetingStatus = originalEvent.statusReuniao;
        }
      }
    );
  }

  /**
   * Save meeting outcome to Salesforce
   * @param {String} eventId - The event ID
   * @param {Boolean} meetingOutcome - The meeting outcome
   */
  saveMeetingOutcomeToSalesforce(eventId, meetingOutcome) {
    // console.log("🎯 CalendarioReino: Saving meeting outcome", {
    //   eventId: eventId,
    //   outcome: meetingOutcome
    // });

    saveEventMeetingOutcome({
      eventId: eventId,
      reuniaoAconteceu: meetingOutcome
    })
      .then((result) => {
        if (result.success) {
          // console.log("🎯 Meeting outcome saved successfully");

          // Update the event in local cache
          this.updateEventMeetingOutcomeInCache(eventId, meetingOutcome);

          // Refresh calendar to reflect changes
          this.refreshCalendarAfterColorChange();
        } else {
          console.error("🎯 Error saving meeting outcome:", result.error);
          this.showToast(
            "Erro",
            result.error || "Erro ao salvar resultado da reunião",
            "error"
          );

          // Revert the button state on error
          const originalEvent = this.allEvents.find((e) => e.id === eventId);
          if (originalEvent) {
            this.colorPickerMeetingOutcome = originalEvent.reuniaoAconteceu;
            this.showStatusCombobox = this.colorPickerMeetingOutcome === false;
          }
        }
      })
      .catch((error) => {
        console.error("🎯 Error saving meeting outcome:", error);
        this.showToast("Erro", "Erro ao salvar resultado da reunião", "error");

        // Revert the button state on error
        const originalEvent = this.allEvents.find((e) => e.id === eventId);
        if (originalEvent) {
          this.colorPickerMeetingOutcome = originalEvent.reuniaoAconteceu;
          this.showStatusCombobox = this.colorPickerMeetingOutcome === false;
        }
      });
  }

  /**
   * Update event meeting status in local cache
   * @param {String} eventId - The event ID
   * @param {String} statusValue - The new meeting status
   */
  updateEventStatusInCache(eventId, statusValue) {
    // Update in events array
    this.events = this.events.map((event) => {
      if (event.id === eventId) {
        return { ...event, statusReuniao: statusValue };
      }
      return event;
    });

    // Update in allEvents array
    this.allEvents = this.allEvents.map((event) => {
      if (event.id === eventId) {
        return { ...event, statusReuniao: statusValue };
      }
      return event;
    });

    // Update color legend to reflect any changes
    this.updateColorLegendCounts();
  }

  /**
   * Update event meeting outcome in local cache
   * @param {String} eventId - The event ID
   * @param {Boolean} meetingOutcome - The new meeting outcome
   */
  updateEventMeetingOutcomeInCache(eventId, meetingOutcome) {
    // Update in events array
    this.events = this.events.map((event) => {
      if (event.id === eventId) {
        return { ...event, reuniaoAconteceu: meetingOutcome };
      }
      return event;
    });

    // Update in allEvents array
    this.allEvents = this.allEvents.map((event) => {
      if (event.id === eventId) {
        return { ...event, reuniaoAconteceu: meetingOutcome };
      }
      return event;
    });

    // Update color legend to reflect any changes
    this.updateColorLegendCounts();
  }

  /**
   * Apply the selected color to the event (delegated to eventColorManager)
   */
  handleApplyColor() {
    if (!this.colorPickerEventId || !this.selectedColor) {
      this.showToast("Erro", "Selecione uma cor primeiro", "error");
      return;
    }

    if (!this.eventColorManager) {
      console.error("🎨 EventColorManager not available");
      return;
    }

    // Set loading state for better UX
    this.isLoading = true;

    // console.log("🎨 CalendarioReino: Applying color", {
    //   eventId: this.colorPickerEventId,
    //   color: this.selectedColor
    // });

    this.eventColorManager.saveCustomColor(
      this.colorPickerEventId,
      this.selectedColor,
      (result) => {
        // Success callback
        this.showToast(
          "Sucesso",
          "Cor do evento atualizada com sucesso!",
          "success"
        );
        this.isLoading = false;
        this.closeColorPicker();
      },
      (error) => {
        // Error callback
        this.showToast("Erro", "Erro ao salvar cor do evento", "error");
        this.isLoading = false;
        this.closeColorPicker();
      }
    );
  }

  /**
   * Enhanced calendar refresh method specifically for color changes
   * Uses the same comprehensive strategy as appointment operations
   */
  refreshCalendarAfterColorChange() {
    // console.log("🎨 CalendarioReino: refreshCalendarAfterColorChange called");

    if (!this.calendar) {
      console.warn(
        "🎨 CalendarioReino: Calendar not initialized, cannot refresh"
      );
      return;
    }

    try {
      // Strategy 1: Immediate cache clear and event refetch
      // console.log("🎨 CalendarioReino: Clearing event cache and refetching");

      // Clear the local events cache to ensure fresh data
      this.events = [];
      this.allEvents = [];

      // Remove all events from FullCalendar
      this.calendar.fullCalendar("removeEvents");

      // Force refetch events from Salesforce
      this.calendar.fullCalendar("refetchEvents");

      // Strategy 2: Force complete re-render of calendar after data loads
      setTimeout(() => {
        // console.log("🎨 CalendarioReino: Force re-rendering calendar view");
        if (this.calendar) {
          // Force a complete re-render of the calendar
          this.calendar.fullCalendar("render");

          // Also trigger a view refresh to ensure event cards are re-rendered
          const currentView = this.calendar.fullCalendar("getView");
          if (currentView) {
            this.calendar.fullCalendar("changeView", currentView.name);
          }

          // Custom popover listeners removed - using default FullCalendar behavior
        }
      }, 800);

      // Strategy 3: Update related components and verify refresh
      setTimeout(() => {
        // console.log(
        //   "🎨 CalendarioReino: Updating related components and verifying refresh"
        // );

        // Update color legend to reflect the new custom color
        this.updateColorLegendCounts();

        // Update room availability indicators
        this.updateRoomAvailability();

        // Verify that events were actually refreshed
        this.verifyEventRefresh();
      }, 1200);

      // Strategy 4: Force refresh meeting suggestions with fresh data
      setTimeout(() => {
        // console.log(
        //   "🎨 CalendarioReino: Force refreshing meeting suggestions with fresh data"
        // );
        this.forceRefreshMeetingSuggestions();
      }, 1500);
    } catch (error) {
      console.error(
        "🎨 CalendarioReino: Error during color change refresh:",
        error
      );
      // Fallback to basic refresh if comprehensive refresh fails
      this.refreshCalendar();
    }
  }

  /**
   * Enhanced calendar refresh method specifically for event deletion
   * Uses the same comprehensive strategy as appointment operations (refreshCalendarAfterSave)
   */
  refreshCalendarAfterDelete(eventId) {
    // console.log(
    //   "🗑️ CalendarioReino: refreshCalendarAfterDelete called for event:",
    //   eventId
    // );

    if (!this.calendar) {
      console.warn(
        "🗑️ CalendarioReino: Calendar not initialized, cannot refresh"
      );
      return;
    }

    try {
      // Strategy 1: Immediate cache clear and event refetch (same as refreshCalendarAfterSave)
      // console.log("🗑️ CalendarioReino: Clearing event cache and refetching");

      // Clear the local events cache to ensure fresh data
      this.events = [];
      this.allEvents = [];

      // Remove all events from FullCalendar
      this.calendar.fullCalendar("removeEvents");

      // Force refetch events from Salesforce
      this.calendar.fullCalendar("refetchEvents");

      // Strategy 2: Force complete re-render of calendar after data loads
      setTimeout(() => {
        // console.log("🗑️ CalendarioReino: Force re-rendering calendar view");
        if (this.calendar) {
          // Force a complete re-render of the calendar
          this.calendar.fullCalendar("render");

          // Also trigger a view refresh to ensure event cards are re-rendered
          const currentView = this.calendar.fullCalendar("getView");
          if (currentView) {
            this.calendar.fullCalendar("changeView", currentView.name);
          }

          // Custom popover listeners removed - using default FullCalendar behavior
        }
      }, 800);

      // Strategy 3: Update related components and verify refresh
      setTimeout(() => {
        // console.log(
        //   "🗑️ CalendarioReino: Updating related components and verifying refresh"
        // );

        // Update color legend in case deleted event had custom colors
        this.updateColorLegendCounts();

        // Update room availability after deletion
        this.updateRoomAvailability();

        // Verify that events were actually refreshed
        this.verifyEventRefresh();
      }, 1200);

      // Strategy 4: Force refresh meeting suggestions with fresh data
      setTimeout(() => {
        // console.log(
        //   "🗑️ CalendarioReino: Force refreshing meeting suggestions with fresh data"
        // );
        this.forceRefreshMeetingSuggestions();
      }, 1500);
    } catch (error) {
      console.error("🗑️ CalendarioReino: Error during delete refresh:", error);
      // Fallback to basic refresh if comprehensive refresh fails
      this.refreshCalendar();
    }
  }

  /**
   * Enhanced calendar refresh method specifically for status changes
   * Uses the same comprehensive strategy as color changes
   */
  refreshCalendarAfterStatusChange() {
    // console.log("🎯 CalendarioReino: refreshCalendarAfterStatusChange called");

    if (!this.calendar) {
      console.warn(
        "🎯 CalendarioReino: Calendar not initialized, cannot refresh"
      );
      return;
    }

    try {
      // Strategy 1: Immediate cache clear and event refetch
      // console.log("🎯 CalendarioReino: Clearing event cache and refetching");

      // Clear the local events cache to ensure fresh data
      this.events = [];
      this.allEvents = [];

      // Remove all events from FullCalendar
      this.calendar.fullCalendar("removeEvents");

      // Force refetch events from Salesforce
      this.calendar.fullCalendar("refetchEvents");

      // Strategy 2: Force complete re-render of calendar after data loads
      setTimeout(() => {
        // console.log("🎯 CalendarioReino: Force re-rendering calendar view");
        if (this.calendar) {
          // Force a complete re-render of the calendar
          this.calendar.fullCalendar("render");

          // Also trigger a view refresh to ensure event cards are re-rendered
          const currentView = this.calendar.fullCalendar("getView");
          if (currentView) {
            this.calendar.fullCalendar("changeView", currentView.name);
          }
        }
      }, 800);

      // Strategy 3: Update related components and verify refresh
      setTimeout(() => {
        // console.log(
        //   "🎯 CalendarioReino: Updating related components and verifying refresh"
        // );

        // Update color legend to reflect the new status-based colors
        this.updateColorLegendCounts();

        // Update room availability indicators
        this.updateRoomAvailability();

        // Verify that events were actually refreshed
        this.verifyEventRefresh();
      }, 1200);

      // Strategy 4: Force refresh meeting suggestions with fresh data
      setTimeout(() => {
        // console.log(
        //   "🎯 CalendarioReino: Force refreshing meeting suggestions with fresh data"
        // );
        this.forceRefreshMeetingSuggestions();
      }, 1500);
    } catch (error) {
      console.error(
        "🎯 CalendarioReino: Error during status change refresh:",
        error
      );
      // Fallback to basic refresh if comprehensive refresh fails
      this.refreshCalendar();
    }
  }

  /**
   * Cancel color selection
   */
  handleCancelColor() {
    this.closeColorPicker();
  }

  /**
   * Handle delete event from the color picker modal
   */
  handleDeleteFromColorPicker() {
    try {
      // Armazenar o ID do evento em uma variável local antes de fechar o modal
      const eventIdToDelete = this.colorPickerEventId;

      // console.log("Valor do ID antes da exclusão:", eventIdToDelete);

      // Verificar explicitamente se o ID é válido antes de prosseguir
      if (
        eventIdToDelete &&
        typeof eventIdToDelete === "string" &&
        eventIdToDelete.trim() !== ""
      ) {
        // Confirmar com o usuário
        if (confirm("Tem certeza que deseja excluir este evento?")) {
          // Fechar o color picker antes de prosseguir
          this.closeColorPicker();

          // Mostrar indicador de carregamento
          this.isLoading = true;

          // Chamar diretamente o método Apex de exclusão
          deleteEvent({ eventId: eventIdToDelete.toString() })
            .then((result) => {
              // console.log("Resultado da exclusão:", result);
              // Resultado positivo
              this.showToast(
                "Sucesso",
                "Evento excluído com sucesso",
                "success"
              );

              // Remover o evento do cache local
              this.events = this.events.filter(
                (event) => event.id !== eventIdToDelete
              );
              this.allEvents = this.allEvents.filter(
                (event) => event.id !== eventIdToDelete
              );

              // Use the same comprehensive refresh strategy as appointment operations
              this.refreshCalendarAfterDelete(eventIdToDelete);
            })
            .catch((error) => {
              console.error("Erro ao excluir evento:", error);
              let errorMessage = "Erro ao excluir evento";

              if (error.body && error.body.message) {
                errorMessage += ": " + error.body.message;
              }

              this.showToast("Erro", errorMessage, "error");
            })
            .finally(() => {
              this.isLoading = false;
            });
        } else {
          // Usuário cancelou a exclusão
          this.closeColorPicker();
        }
      } else {
        console.error("ID de evento inválido:", eventIdToDelete);
        this.showToast(
          "Erro",
          "Não foi possível identificar o evento para exclusão",
          "error"
        );
        this.closeColorPicker();
      }
    } catch (error) {
      console.error("Erro no processo de exclusão:", error);
      this.showToast(
        "Erro",
        "Ocorreu um erro inesperado ao tentar excluir o evento",
        "error"
      );
      this.closeColorPicker();
      this.isLoading = false;
    }
  }

  /**
   * Delete an event with error handling
   * @param {String} eventId - The ID of the event to delete
   */
  handleDeleteEvent(eventId) {
    // Verificar se o ID do evento foi fornecido e é válido
    if (
      !eventId ||
      eventId === "undefined" ||
      eventId === "null" ||
      eventId.trim() === ""
    ) {
      console.error("Tentativa de exclusão com ID inválido:", eventId);
      this.showToast("Erro", "ID do evento não fornecido ou inválido", "error");
      return;
    }

    // Log do ID para debug
    // console.log("Processando exclusão do evento com ID:", eventId);

    // Confirmar antes de excluir
    if (!confirm("Tem certeza que deseja excluir este evento?")) {
      return;
    }

    // Mostrar carregamento
    this.isLoading = true;

    // Chamar o método Apex para excluir o evento
    // Garantir que o parâmetro é enviado exatamente no formato esperado pelo método Apex
    deleteEvent({ eventId: eventId.toString() })
      .then((result) => {
        // Tratamento mais flexível da resposta - alguns métodos Apex podem retornar apenas true/false
        // ou podem retornar um objeto com propriedade success
        const isSuccess =
          result === true ||
          (result && result.success === true) ||
          (result && result.success === "true");

        if (isSuccess) {
          // console.log("Exclusão bem-sucedida, resultado:", result);
          // Exibir mensagem de sucesso
          this.showToast("Sucesso", "Evento excluído com sucesso", "success");

          // Remover o evento do cache local
          this.events = this.events.filter((event) => event.id !== eventId);
          this.allEvents = this.allEvents.filter(
            (event) => event.id !== eventId
          );

          // Atualizar o calendário - Forçar atualização imediata
          try {
            // Tentar atualizar diretamente o calendário com removeEvents se disponível
            if (
              this.calendar &&
              typeof this.calendar.removeEvents === "function"
            ) {
              this.calendar.removeEvents((event) => event.id === eventId);
            }

            // Forçar recarregamento completo em seguida
            this.refreshCalendar();

            // Garantir que a UI seja atualizada
            setTimeout(() => {
              if (this.calendar) {
                this.calendar.rerenderEvents();
              }
            }, 100);
          } catch (e) {
            console.error("Erro ao atualizar o calendário após exclusão:", e);
            // Garantir que a atualização principal ainda é tentada
            this.refreshCalendar();
          }
        } else {
          // Verifique primeiro se o evento realmente foi excluído mesmo com erro de retorno
          // Isso pode acontecer quando o backend exclui o evento mas retorna erro por outras razões
          this.checkIfEventWasDeleted(eventId)
            .then((wasDeleted) => {
              if (wasDeleted) {
                // O evento foi excluído apesar do erro de retorno
                // console.log(
                //   "Evento excluído com sucesso, apesar de erro de retorno"
                // );
                this.showToast(
                  "Sucesso",
                  "Evento excluído com sucesso",
                  "success"
                );

                // Remover do cache local e atualizar calendário
                this.events = this.events.filter(
                  (event) => event.id !== eventId
                );
                this.allEvents = this.allEvents.filter(
                  (event) => event.id !== eventId
                );
                this.refreshCalendarAfterDelete(eventId);
              } else {
                // Exibir mensagem de erro retornada pelo backend
                const errorMsg =
                  result && result.error
                    ? result.error
                    : "Erro ao excluir evento";
                this.showToast("Erro", errorMsg, "error");
                console.error("Error deleting event:", result);
              }
            })
            .catch(() => {
              // Falha na verificação, mostrar erro original
              const errorMsg =
                result && result.error
                  ? result.error
                  : "Erro ao excluir evento";
              this.showToast("Erro", errorMsg, "error");
              console.error("Error deleting event:", result);
            });
        }
      })
      .catch((error) => {
        // Tratamento de erros com mensagem específica
        console.error("Exception when deleting event:", error);
        let errorMessage = "Erro ao excluir evento";

        // Extrair mensagem de erro mais específica se disponível
        if (error.body && error.body.message) {
          errorMessage += ": " + error.body.message;
        } else if (typeof error === "string") {
          errorMessage += ": " + error;
        } else if (error.message) {
          errorMessage += ": " + error.message;
        }

        this.showToast("Erro", errorMessage, "error");
      })
      .finally(() => {
        this.isLoading = false;
      });
  }

  /**
   * Extract meeting link URL from event data (now using Description field only)
   * @param {Object} calendarEvent - The calendar event object
   * @returns {String} - The extracted URL or null
   */
  extractLinkFromEvent(calendarEvent) {
    // Extract from description field (primary storage for meeting links)
    if (calendarEvent.description) {
      const linkMatch = calendarEvent.description.match(
        /Link:\s*(https?:\/\/[^\s\n]+)/i
      );
      if (linkMatch && linkMatch[1]) {
        return linkMatch[1];
      }
    }

    // Legacy fallback: check if linkReuniao field exists (for backward compatibility)
    if (calendarEvent.linkReuniao) {
      return calendarEvent.linkReuniao;
    }

    return null;
  }

  /**
   * Refresh event data from Salesforce to ensure cache is up-to-date
   * @param {String} eventId - The event ID to refresh
   */
  refreshEventDataFromSalesforce(eventId) {
    // Use the existing calendar refresh mechanism
    // This will reload all events from Salesforce and update the cache
    if (this.calendar) {
      this.calendar.fullCalendar("refetchEvents");

      // Wait a bit for the events to be reloaded, then update the color picker
      setTimeout(() => {
        // Find the updated event in the cache
        const updatedEvent = this.allEvents.find(
          (event) => event.id === eventId
        );

        if (updatedEvent && updatedEvent.linkReuniao) {
          console.log(
            "🔄 Found updated linkReuniao:",
            updatedEvent.linkReuniao
          );

          // Update the color picker URL
          this.colorPickerLinkReuniao = updatedEvent.linkReuniao;

          // Re-initialize URL card state
          this.showUrlCard = !!(
            this.colorPickerLinkReuniao &&
            this.colorPickerLinkReuniao.trim() &&
            this.isValidUrl(this.colorPickerLinkReuniao)
          );

          console.log("🔄 URL card updated:", this.showUrlCard);
        } else {
          console.log("🔄 No linkReuniao found after refresh");
        }
      }, 1000);
    }
  }

  /**
   * Update only the link field in local cache
   * @param {String} eventId - The event ID
   * @param {String} linkReuniao - The new meeting link
   */
  updateEventLinkInCache(eventId, linkReuniao) {
    // Update in events array
    this.events = this.events.map((event) => {
      if (event.id === eventId) {
        return { ...event, linkReuniao: linkReuniao };
      }
      return event;
    });

    // Update in allEvents array
    this.allEvents = this.allEvents.map((event) => {
      if (event.id === eventId) {
        return { ...event, linkReuniao: linkReuniao };
      }
      return event;
    });
  }

  /**
   * Computed property to determine if URL input field should be shown
   * Only show for online meetings (Reunião Online type)
   */
  get showUrlInputField() {
    return this.colorPickerEventType === "Reunião Online";
  }

  /**
   * Computed properties for URL card display
   */
  get urlCardTitle() {
    if (!this.colorPickerLinkReuniao) return "";

    try {
      const url = new URL(this.colorPickerLinkReuniao);
      const hostname = url.hostname.replace("www.", "");

      // Common meeting platform titles
      const platformTitles = {
        "teams.microsoft.com": "Microsoft Teams",
        "zoom.us": "Zoom Meeting",
        "meet.google.com": "Google Meet",
        "webex.com": "Cisco Webex",
        "gotomeeting.com": "GoToMeeting",
        "skype.com": "Skype"
      };

      return platformTitles[hostname] || `Reunião - ${hostname}`;
    } catch (error) {
      return "Link da Reunião";
    }
  }

  get urlCardDisplayUrl() {
    if (!this.colorPickerLinkReuniao) return "";

    try {
      const url = new URL(this.colorPickerLinkReuniao);
      const displayUrl = `${url.hostname}${url.pathname}`;

      // Truncate if too long
      return displayUrl.length > 40
        ? `${displayUrl.substring(0, 37)}...`
        : displayUrl;
    } catch (error) {
      // If URL is invalid, show truncated version
      return this.colorPickerLinkReuniao.length > 40
        ? `${this.colorPickerLinkReuniao.substring(0, 37)}...`
        : this.colorPickerLinkReuniao;
    }
  }

  get urlCardAriaLabel() {
    return `Abrir link da reunião: ${this.urlCardTitle}. Pressione Enter para abrir ou Tab para editar.`;
  }

  /**
   * Determine if URL is Microsoft Teams
   */
  get isTeamsUrl() {
    if (!this.colorPickerLinkReuniao) return false;

    try {
      const url = new URL(this.colorPickerLinkReuniao);
      return url.hostname.includes("teams.microsoft.com");
    } catch (error) {
      return false;
    }
  }

  /**
   * Get the appropriate icon for the URL card
   */
  get urlCardIcon() {
    if (this.isTeamsUrl) {
      return "/resource/iconsImages/microsoft-teams-icon.png";
    }
    return "utility:new_window"; // Default Lightning icon
  }

  /**
   * Determine if we should use custom PNG icon or Lightning icon
   */
  get useCustomIcon() {
    return this.isTeamsUrl;
  }

  /**
   * Close the color picker modal
   */
  closeColorPicker() {
    // Clear any pending timeouts
    if (this.urlSaveTimeout) {
      clearTimeout(this.urlSaveTimeout);
      this.urlSaveTimeout = null;
    }
    if (this.urlCardTimeout) {
      clearTimeout(this.urlCardTimeout);
      this.urlCardTimeout = null;
    }

    // Clean up positioning event listeners
    this.removeColorPickerPositionListeners();

    // Remove event highlight
    this.removeEventHighlight();

    // Clear positioning references
    this.colorPickerTriggerElement = null;

    this.showColorPicker = false;
    this.colorPickerEventId = null;
    this.selectedColor = null;
    this.colorPickerEventData = null;
    this.colorPickerMeetingStatus = null;
    this.colorPickerMeetingOutcome = null;
    this.showStatusCombobox = false;
    this.colorPickerLinkReuniao = "";
    this.colorPickerEventType = "";
    this.showUrlCard = false;
  }

  /**
   * Load status picklist options for meeting outcome interface
   */
  loadStatusPicklistOptions() {
    getStatusPicklistValues()
      .then((result) => {
        // Filter to only include the remaining status values (Cancelado, Adiado, Reagendado)
        this.statusPicklistOptions = result.filter((option) =>
          ["Cancelado", "Adiado", "Reagendado"].includes(option.value)
        );
        // console.log(
        //   "Status picklist options loaded:",
        //   this.statusPicklistOptions
        // );
      })
      .catch((error) => {
        console.error("Error loading status picklist options:", error);
        // Fallback to basic options if API fails
        this.statusPicklistOptions = [
          { label: "Cancelado", value: "Cancelado" },
          { label: "Adiado", value: "Adiado" },
          { label: "Reagendado", value: "Reagendado" }
        ];
      });
  }

  /**
   * Save meeting status to Salesforce
   * @param {String} eventId - The event ID
   * @param {String} statusValue - The meeting status value
   */
  saveMeetingStatusToSalesforce(eventId, statusValue) {
    // console.log("🎯 CalendarioReino: Saving meeting status", {
    //   eventId: eventId,
    //   status: statusValue
    // });

    saveEventMeetingStatus({
      eventId: eventId,
      statusReuniao: statusValue
    })
      .then((result) => {
        if (result.success) {
          // console.log("🎯 Meeting status saved successfully");

          // Update the event in local cache
          this.updateEventStatusInCache(eventId, statusValue);

          // Refresh calendar to reflect color changes based on new status
          this.refreshCalendarAfterStatusChange();
        } else {
          console.error("🎯 Error saving meeting status:", result.error);
          this.showToast(
            "Erro",
            result.error || "Erro ao salvar status da reunião",
            "error"
          );

          // Revert the status selection on error
          const originalEvent = this.allEvents.find((e) => e.id === eventId);
          if (originalEvent) {
            this.colorPickerMeetingStatus = originalEvent.statusReuniao;
          }
        }
      })
      .catch((error) => {
        console.error("🎯 Error saving meeting status:", error);
        this.showToast("Erro", "Erro ao salvar status da reunião", "error");

        // Revert the status selection on error
        const originalEvent = this.allEvents.find((e) => e.id === eventId);
        if (originalEvent) {
          this.colorPickerMeetingStatus = originalEvent.statusReuniao;
        }
      });
  }

  /**
   * Save meeting room assignment to Salesforce (using eventColorManager for proper event-driven communication)
   * @param {String} eventId - The event ID
   * @param {String} roomValue - The meeting room value
   */
  saveMeetingRoomToSalesforce(eventId, roomValue) {
    // console.log("🏢 CalendarioReino: Saving meeting room", {
    //   eventId: eventId,
    //   room: roomValue
    // });

    saveEventMeetingRoom({
      eventId: eventId,
      salaReuniao: roomValue
    })
      .then((result) => {
        if (result.success) {
          this.showToast(
            "Sucesso",
            "Sala de reunião atualizada com sucesso!",
            "success"
          );

          // Notify eventColorManager of room update for proper color recalculation
          if (this.eventColorManager) {
            this.eventColorManager.notifyRoomUpdate(eventId, roomValue);
          } else {
            // Fallback: Update cache and refresh directly if eventColorManager not available
            this.updateEventRoomInCache(eventId, roomValue);
            this.refreshCalendarAfterRoomChange();
          }
        } else {
          this.showToast(
            "Erro",
            result.error || "Erro ao salvar sala de reunião",
            "error"
          );
          // Revert the room selection on error
          const originalEvent = this.allEvents.find((e) => e.id === eventId);
          if (originalEvent) {
            // Revert to original room value in UI if needed
            // This would require additional UI state management
          }
        }
      })
      .catch((error) => {
        console.error("🏢 Error saving meeting room:", error);
        this.showToast("Erro", "Erro ao salvar sala de reunião", "error");
        // Revert the room selection on error
        const originalEvent = this.allEvents.find((e) => e.id === eventId);
        if (originalEvent) {
          // Revert to original room value in UI if needed
          // This would require additional UI state management
        }
      });
  }

  /**
   * Update event meeting status in local cache
   * @param {String} eventId - The event ID
   * @param {Boolean} meetingStatus - The new meeting status
   */
  updateEventMeetingStatusInCache(eventId, meetingStatus) {
    // console.log(
    //   `🎯 CalendarioReino: Updating status in cache for event ${eventId} to "${meetingStatus}"`
    // );

    // Update in events array - DO NOT clear customColor, let priority hierarchy handle it
    this.events = this.events.map((event) => {
      if (event.id === eventId) {
        return { ...event, statusReuniao: meetingStatus };
      }
      return event;
    });

    // Update in allEvents array - DO NOT clear customColor, let priority hierarchy handle it
    this.allEvents = this.allEvents.map((event) => {
      if (event.id === eventId) {
        return { ...event, statusReuniao: meetingStatus };
      }
      return event;
    });

    // Update color legend to reflect the new status-based colors
    this.updateColorLegendCounts();
  }

  /**
   * Refresh calendar after meeting status change with comprehensive update strategy
   */
  refreshCalendarAfterStatusChange() {
    try {
      // console.log(
      //   "🎯 CalendarioReino: Starting status change refresh sequence"
      // );

      // Strategy 1: Immediate visual refresh
      setTimeout(() => {
        // console.log("🎯 CalendarioReino: Immediate visual refresh");
        if (this.calendar) {
          this.calendar.fullCalendar("refetchEvents");
        }
      }, 100);

      // Strategy 2: Update color legend and room availability
      setTimeout(() => {
        // console.log(
        //   "🎯 CalendarioReino: Updating color legend and room availability"
        // );
        this.updateColorLegendCounts();
        this.updateRoomAvailability();
      }, 300);

      // Strategy 3: Force calendar re-render to apply new colors
      setTimeout(() => {
        // console.log("🎯 CalendarioReino: Force calendar re-render");
        if (this.calendar) {
          this.calendar.fullCalendar("rerenderEvents");
          // Also force a complete view refresh to ensure colors are applied
          const currentView = this.calendar.fullCalendar("getView");
          if (currentView) {
            this.calendar.fullCalendar("changeView", currentView.name);
          }
        }
      }, 600);

      // Strategy 4: Refresh meeting suggestions with updated data
      setTimeout(() => {
        // console.log("🎯 CalendarioReino: Refreshing meeting suggestions");
        this.forceRefreshMeetingSuggestions();
      }, 900);
    } catch (error) {
      console.error(
        "🎯 CalendarioReino: Error during status change refresh:",
        error
      );
    }
  }

  /**
   * Update event color in local cache
   * @param {String} eventId - The event ID
   * @param {String} color - The new color
   */
  updateEventColorInCache(eventId, color) {
    // Update in events array
    this.events = this.events.map((event) => {
      if (event.id === eventId) {
        return { ...event, customColor: color };
      }
      return event;
    });

    // Update in allEvents array
    this.allEvents = this.allEvents.map((event) => {
      if (event.id === eventId) {
        return { ...event, customColor: color };
      }
      return event;
    });

    // Update color legend to reflect the new custom color
    this.updateColorLegendCounts();
  }

  /**
   * Update event color and link in local cache
   * @param {String} eventId - The event ID
   * @param {String} color - The new color
   * @param {String} linkReuniao - The new meeting link
   */
  updateEventColorAndLinkInCache(eventId, color, linkReuniao) {
    // Update in events array
    this.events = this.events.map((event) => {
      if (event.id === eventId) {
        return { ...event, customColor: color, linkReuniao: linkReuniao };
      }
      return event;
    });

    // Update in allEvents array
    this.allEvents = this.allEvents.map((event) => {
      if (event.id === eventId) {
        return { ...event, customColor: color, linkReuniao: linkReuniao };
      }
      return event;
    });

    // Update color legend to reflect the new custom color
    this.updateColorLegendCounts();
  }

  /**
   * Update event room assignment in local cache
   * @param {String} eventId - The event ID
   * @param {String} roomValue - The new room value
   */
  updateEventRoomInCache(eventId, roomValue) {
    // console.log(
    //   `🏢 CalendarioReino: Updating room in cache for event ${eventId} to "${roomValue}"`
    // );

    // Update in events array - DO NOT clear customColor, let priority hierarchy handle it
    this.events = this.events.map((event) => {
      if (event.id === eventId) {
        return { ...event, salaReuniao: roomValue };
      }
      return event;
    });

    // Update in allEvents array - DO NOT clear customColor, let priority hierarchy handle it
    this.allEvents = this.allEvents.map((event) => {
      if (event.id === eventId) {
        return { ...event, salaReuniao: roomValue };
      }
      return event;
    });

    // Update color legend to reflect potential room-based color changes
    this.updateColorLegendCounts();

    // Update room availability indicators
    this.updateRoomAvailability();

    // Note: Calendar refresh is handled by the calling method or event handler
    // to avoid duplicate refreshes when using event-driven communication
  }

  /**
   * Refresh calendar after room assignment change with comprehensive update strategy
   */
  refreshCalendarAfterRoomChange() {
    try {
      // console.log("🏢 CalendarioReino: Starting room change refresh sequence");

      // Strategy 1: Immediate visual refresh
      setTimeout(() => {
        // console.log("🏢 CalendarioReino: Immediate visual refresh");
        if (this.calendar) {
          this.calendar.fullCalendar("refetchEvents");
        }
      }, 100);

      // Strategy 2: Update color legend and room availability
      setTimeout(() => {
        // console.log(
        //   "🏢 CalendarioReino: Updating color legend and room availability"
        // );
        this.updateColorLegendCounts();
        this.updateRoomAvailability();
      }, 300);

      // Strategy 3: Force calendar re-render to apply new colors
      setTimeout(() => {
        // console.log("🏢 CalendarioReino: Force calendar re-render");
        if (this.calendar) {
          this.calendar.fullCalendar("rerenderEvents");
          // Also force a complete view refresh to ensure colors are applied
          const currentView = this.calendar.fullCalendar("getView");
          if (currentView) {
            this.calendar.fullCalendar("changeView", currentView.name);
          }
        }
      }, 600);

      // Strategy 4: Refresh meeting suggestions with updated data
      setTimeout(() => {
        // console.log("🏢 CalendarioReino: Refreshing meeting suggestions");
        this.forceRefreshMeetingSuggestions();
      }, 900);
    } catch (error) {
      console.error(
        "🏢 CalendarioReino: Error during room change refresh:",
        error
      );
    }
  }

  /**
   * Force calendar color refresh to apply updated colors immediately
   */
  forceCalendarColorRefresh() {
    try {
      // console.log("🎨 CalendarioReino: Forcing calendar color refresh");

      // Strategy 1: Immediate event re-render
      setTimeout(() => {
        if (this.calendar) {
          // console.log("🎨 CalendarioReino: Re-rendering events");
          this.calendar.fullCalendar("rerenderEvents");
        }
      }, 100);

      // Strategy 2: Refetch events from source
      setTimeout(() => {
        if (this.calendar) {
          // console.log("🎨 CalendarioReino: Refetching events");
          this.calendar.fullCalendar("refetchEvents");
        }
      }, 300);

      // Strategy 3: Force view refresh
      setTimeout(() => {
        if (this.calendar) {
          // console.log("🎨 CalendarioReino: Forcing view refresh");
          const currentView = this.calendar.fullCalendar("getView");
          if (currentView) {
            this.calendar.fullCalendar("changeView", currentView.name);
          }
        }
      }, 600);

      // Strategy 4: Update color legend
      setTimeout(() => {
        // console.log("🎨 CalendarioReino: Updating color legend");
        this.updateColorLegendCounts();
      }, 900);
    } catch (error) {
      console.error("🎨 CalendarioReino: Error during color refresh:", error);
    }
  }

  /**
   * Get CSS class for color option based on selection
   * @param {String} color - The color value
   * @returns {String} - CSS class string
   */
  getColorOptionClass(color) {
    const baseClass = "color-option";
    const isSelected = this.selectedColor === color;
    return isSelected ? `${baseClass} selected` : baseClass;
  }

  /**
   * Get the CSS class for the color picker modal - Floating UI handles positioning
   */
  get colorPickerModalClass() {
    return "color-picker-modal";
  }

  /**
   * Computed properties for meeting outcome buttons
   */
  get yesButtonVariant() {
    return this.colorPickerMeetingOutcome === true ? "brand" : "neutral";
  }

  get noButtonVariant() {
    return this.colorPickerMeetingOutcome === false ? "brand" : "neutral";
  }

  /**
   * Computed properties for meeting outcome button classes with opacity effects
   */
  get yesButtonClass() {
    let classes = "outcome-button outcome-button-yes";

    // Add opacity class based on selection state
    if (this.colorPickerMeetingOutcome === false) {
      classes += " outcome-button-dimmed";
    } else {
      classes += " outcome-button-normal";
    }

    return classes;
  }

  get noButtonClass() {
    let classes = "outcome-button outcome-button-no";

    // Add opacity class based on selection state
    if (this.colorPickerMeetingOutcome === true) {
      classes += " outcome-button-dimmed";
    } else {
      classes += " outcome-button-normal";
    }

    return classes;
  }

  /**
   * Computed properties for color picker event information display
   */
  get colorPickerEventTimeRange() {
    if (
      !this.colorPickerEventData ||
      !this.colorPickerEventData.start ||
      !this.colorPickerEventData.end
    ) {
      return "Horário não disponível";
    }
    return this.formatTimeRange(
      this.colorPickerEventData.start,
      this.colorPickerEventData.end
    );
  }

  get colorPickerEventDateInfo() {
    if (!this.colorPickerEventData || !this.colorPickerEventData.start) {
      return "Data não disponível";
    }
    return this.formatDateInfo(this.colorPickerEventData.start);
  }

  get colorPickerEventTimeAndDate() {
    if (
      !this.colorPickerEventData ||
      !this.colorPickerEventData.start ||
      !this.colorPickerEventData.end
    ) {
      return "Horário não disponível";
    }

    const timeRange = this.formatTimeRange(
      this.colorPickerEventData.start,
      this.colorPickerEventData.end
    );
    const dateInfo = this.formatDateInfo(this.colorPickerEventData.start);

    return `${timeRange} • ${dateInfo}`;
  }

  get colorPickerEventSubject() {
    if (!this.colorPickerEventData || !this.colorPickerEventData.title) {
      return "Reunião sem título";
    }
    return this.colorPickerEventData.title;
  }

  get colorPickerEventGestorName() {
    return this.colorPickerEventData?.gestorName || "";
  }

  get colorPickerEventLiderComercialName() {
    return this.colorPickerEventData?.liderComercialName || "";
  }

  get colorPickerEventSdrName() {
    return this.colorPickerEventData?.sdrName || "";
  }

  /**
   * Get available colors with selection state and styles
   * Shows all 7 predefined colors plus previously selected custom colors
   */
  get availableColors() {
    // Predefined colors
    const predefinedColors = [
      {
        label: "Pêssego Claro (Sala Principal)",
        value: "#F6E3D6",
        class: this.getColorOptionClass("#F6E3D6"),
        swatchStyle: "background-color: #F6E3D6; border: 1px solid #D2691E;",
        isSelected: this.selectedColor === "#F6E3D6",
        isPredefined: true
      },
      {
        label: "Lavanda Claro (Sala do Gabriel)",
        value: "#E3E7FB",
        class: this.getColorOptionClass("#E3E7FB"),
        swatchStyle: "background-color: #E3E7FB; border: 1px solid #4F6BED;",
        isSelected: this.selectedColor === "#E3E7FB",
        isPredefined: true
      },
      {
        label: "Verde Menta (Aconteceu)",
        value: "#D6F3E4",
        class: this.getColorOptionClass("#D6F3E4"),
        swatchStyle: "background-color: #D6F3E4; border: 1px solid #4BCA81;",
        isSelected: this.selectedColor === "#D6F3E4",
        isPredefined: true
      },
      {
        label: "Rosa Claro (Não Aconteceu)",
        value: "#F9D6D4",
        class: this.getColorOptionClass("#F9D6D4"),
        swatchStyle: "background-color: #F9D6D4; border: 1px solid #C0392B;",
        isSelected: this.selectedColor === "#F9D6D4",
        isPredefined: true
      },
      {
        label: "Bege Claro (Cancelado)",
        value: "#F0E0D5",
        class: this.getColorOptionClass("#F0E0D5"),
        swatchStyle: "background-color: #F0E0D5; border: 1px solid #8B4513;",
        isSelected: this.selectedColor === "#F0E0D5",
        isPredefined: true
      },
      {
        label: "Creme Dourado (Adiado)",
        value: "#F8EEC6",
        class: this.getColorOptionClass("#F8EEC6"),
        swatchStyle: "background-color: #F8EEC6; border: 1px solid #926F1B;",
        isSelected: this.selectedColor === "#F8EEC6",
        isPredefined: true
      },
      {
        label: "Azul Claro (Reagendado)",
        value: "#D9EEFA",
        class: this.getColorOptionClass("#D9EEFA"),
        swatchStyle: "background-color: #D9EEFA; border: 1px solid #3498DB;",
        isSelected: this.selectedColor === "#D9EEFA",
        isPredefined: true
      }
    ];

    // Get custom colors from events
    const customColors = this.getCustomColorsForPicker();

    // Combine predefined and custom colors
    return [...predefinedColors, ...customColors];
  }

  /**
   * Get custom colors for the color picker (delegated to eventColorManager)
   */
  getCustomColorsForPicker() {
    const customColors =
      this.eventColorManager?.getCustomColorsForPicker(this.allEvents) || [];

    // Convert to color picker format with additional properties
    return customColors.map((color) => {
      const borderColor = this.getBorderColorForBackground(color.value);

      return {
        label: color.label,
        value: color.value,
        class: this.getColorOptionClass(color.value),
        swatchStyle: `background-color: ${color.value}; border: 1px solid ${borderColor};`,
        isSelected: this.selectedColor === color.value,
        isCustom: true
      };
    });
  }

  /**
   * Handle backdrop click with smooth close animation
   * @param {Event} event - The click event
   */
  handleBackdropClick(event) {
    // Only close if clicking directly on backdrop, not on modal
    if (event.target.classList.contains('color-picker-backdrop')) {
      this.closeColorPicker();
    }
  }

  /**
   * Handle color picker modal click to prevent closing when clicking inside
   * @param {Event} event - The click event
   */
  handleColorPickerClick(event) {
    event.stopPropagation();
  }

  /**
   * Public API method to manually retry calendar initialization
   * Useful for debugging or when automatic retry fails
   */
  @api
  retryInitialization() {
    // console.log("Manual calendar initialization retry requested");

    // Reset initialization state
    this.isCalendarInitialized = false;
    this.error = null;
    this.isLoading = true;

    // Destroy existing calendar if it exists
    if (this.calendar) {
      try {
        this.calendar.fullCalendar("destroy");
        this.calendar = null;
      } catch (error) {
        console.warn("Error destroying existing calendar:", error);
      }
    }

    // Retry initialization
    this.loadDependenciesSequentially()
      .then(() => {
        this.isCalendarInitialized = true;
        this.initializeCalendarWithRetry();
      })
      .catch((error) => {
        this.error = error;
        this.isLoading = false;
        console.error("Manual retry failed:", error);
        this.showToast(
          "Erro",
          "Falha na tentativa manual de inicialização: " +
            this.extractErrorMessage(error),
          "error"
        );
      });
  }

  /**
   * Check if calendar is properly initialized and functional
   */
  @api
  isCalendarReady() {
    return !!(
      this.isCalendarInitialized &&
      this.calendar &&
      window.$ &&
      window.moment &&
      typeof window.$.fn.fullCalendar === "function"
    );
  }

  /**
   * Helper method to show toast notifications
   * Suppresses success notifications to reduce visual pollution
   * Only shows error and warning messages that users need to see
   */
  showToast(title, message, variant) {
    // Suppress success notifications - users get immediate visual feedback from calendar updates
    if (variant === "success") {
      // console.log(`🔇 Suppressed success toast: ${title} - ${message}`);
      return;
    }

    // Allow error, warning, and info notifications to display
    const evt = new ShowToastEvent({
      title: title,
      message: message,
      variant: variant || "info"
    });
    this.dispatchEvent(evt);
  }

  /**
   * Extract error message from various error types
   */
  extractErrorMessage(error) {
    if (typeof error === "string") {
      return error;
    }
    if (Array.isArray(error.body)) {
      return error.body.map((e) => e.message).join(", ");
    }
    if (typeof error.body === "object" && error.body !== null) {
      return error.body.message;
    }
    return error.message || "Erro desconhecido";
  }
}
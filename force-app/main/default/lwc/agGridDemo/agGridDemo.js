import { LightningElement, api, wire, track } from "lwc";
import { NavigationMixin } from "lightning/navigation";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import { refreshApex } from "@salesforce/apex";
import { deleteRecord } from "lightning/uiRecordApi";

// Importar utilitários do AG-Grid
import {
  logger,
  loadResource,
  loadStylesheet,
  isAgGridLoaded,
  setupFilterInteraction
} from "c/agGridUtils";

// Importar configurações e traduções
import { getDefaultGridOptions } from "c/agGridConfig";
import { ptBR } from "c/agGridLocale";

// Importar recursos estáticos para AG Grid
import { loadScript, loadStyle } from "lightning/platformResourceLoader";
import agGridJs from "@salesforce/resourceUrl/agGrid";
import agGridCss from "@salesforce/resourceUrl/agGrid";
import agGridThemeAlpine from "@salesforce/resourceUrl/agGrid";

// Importar métodos Apex
import getOpportunities from "@salesforce/apex/AgGridDemoController.getOpportunities";
import getStagePicklistValues from "@salesforce/apex/AgGridDemoController.getStagePicklistValues";
import getProbabilityPicklistValues from "@salesforce/apex/AgGridDemoController.getProbabilityPicklistValues";
import updateOpportunityStatus from "@salesforce/apex/AgGridDemoController.updateOpportunityStatus";

export default class AgGridDemo extends NavigationMixin(LightningElement) {
  @api title = "Oportunidades do Reino Capital";

  // Grid initialization state tracking
  gridInitialized = false;
  gridApi;
  columnApi;
  resourcesLoaded = false;
  renderedOnce = false; // Track if we've already gone through initialization
  debugInfo = false; // Disable debug information in production

  // Wire properties for Apex data
  @track wiredOpportunitiesResult;
  @track opportunities = [];
  @track stageOptions = [];
  @track probabilityOptions = [];
  @track error;
  @track isLoading = true;

  // Stage filtering property
  @track selectedStage = null; // Track which stage is currently selected for filtering

  // Usando a tradução importada do módulo de localização
  localeText = ptBR;

  // Usa o módulo de configuração para obter as opções do grid
  _baseGridOptions = getDefaultGridOptions(this.localeText);

  // Propriedades para as configurações específicas do grid
  _columnDefs;
  _rowData;

  // Wire methods to get data from Apex
  @wire(getOpportunities)
  wiredOpportunities(result) {
    this.wiredOpportunitiesResult = result;
    if (result.data) {


      this.opportunities = this.processOpportunityData(result.data);
      this._rowData = this.opportunities;
      this.error = undefined;

      // Atualiza o grid com os novos dados se já estiver inicializado
      if (this.gridApi) {
        try {
          // Tentar usar setRowData (método mais recente)
          if (typeof this.gridApi.setRowData === "function") {
            this.gridApi.setRowData(this.opportunities);
          }
          // Alternativa: usar updateRowData (em algumas versões)
          else if (typeof this.gridApi.updateRowData === "function") {
            this.gridApi.updateRowData({ add: this.opportunities });
          }
          // Última alternativa: recriar o grid com os novos dados
          else if (typeof this.gridApi.setGridOption === "function") {
            this.gridApi.setGridOption("rowData", this.opportunities);
          } else {
            console.warn(
              "Não foi possível atualizar os dados do grid: métodos de atualização não encontrados"
            );
          }
        } catch (err) {
          console.error("Erro ao atualizar dados do grid:", err);
        }
      }

      this.isLoading = false;
    } else if (result.error) {
      this.opportunities = [];
      this.error = result.error;
      this.showToast(
        "Erro",
        "Erro ao carregar oportunidades: " + result.error.body.message,
        "error"
      );
      this.isLoading = false;
    }
  }

  @wire(getStagePicklistValues)
  wiredStageOptions(result) {
    this.wiredStageOptionsResult = result;
    const { error, data } = result;
    if (data) {
      this.stageOptions = data;
      console.log("Stage options loaded:", data.length);
    } else if (error) {
      console.error("Error loading stage options:", error);
      this.showToast(
        "Erro",
        "Erro ao carregar estágios: " + error.body.message,
        "error"
      );
    }
  }

  @wire(getProbabilityPicklistValues)
  wiredProbabilityOptions({ error, data }) {
    if (data) {
      this.probabilityOptions = data;
    } else if (error) {
      this.showToast(
        "Erro",
        "Erro ao carregar valores de probabilidade: " + error.body.message,
        "error"
      );
    }
  }

  // Process opportunity data into a format suitable for AG Grid
  processOpportunityData(opportunities) {
    return opportunities.map((opp) => {
      // Format currency values with R$ symbol and proper formatting
      let formattedAmount = "N/A";
      if (opp.Amount != null) {
        try {
          // Ensure we're working with a number
          const amount = parseFloat(opp.Amount);
          formattedAmount = `R$ ${amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        } catch (error) {
          console.error("Error formatting amount:", error);
          formattedAmount = `R$ ${opp.Amount}`;
        }
      }

      // Format date values
      const closeDate = opp.CloseDate
        ? new Date(opp.CloseDate).toLocaleDateString("pt-BR")
        : "N/A";

      // Get event info if available - with debug logging
      // Check both possible structures: direct array or records wrapper
      const hasEvent = (opp.Events && Array.isArray(opp.Events) && opp.Events.length > 0) ||
                      (opp.Events && opp.Events.records && opp.Events.records.length > 0);

      let lastEvent = null;
      if (opp.Events && Array.isArray(opp.Events) && opp.Events.length > 0) {
        lastEvent = opp.Events[0]; // Direct array
      } else if (opp.Events && opp.Events.records && opp.Events.records.length > 0) {
        lastEvent = opp.Events.records[0]; // Records wrapper
      }



      const eventInfo = hasEvent
        ? {
            id: lastEvent.Id,
            subject: lastEvent.Subject,
            startDateTime: lastEvent.StartDateTime,
            formattedDateTime: new Date(lastEvent.StartDateTime).toLocaleString(
              "pt-BR"
            ),
            location: lastEvent.Location,
            description: lastEvent.Description
          }
        : null;

      return {
        id: opp.Id,
        name: opp.Name,
        stageName: opp.StageName,
        amount: opp.Amount,
        formattedAmount: formattedAmount,
        closeDate: closeDate,
        rawCloseDate: opp.CloseDate,
        accountName: opp.Account ? opp.Account.Name : "",
        accountId: opp.Account ? opp.Account.Id : "",
        ownerName: opp.Owner ? opp.Owner.Name : "",
        ownerId: opp.Owner ? opp.Owner.Id : "",
        probability: opp.Probability,
        probabilidadeOportunidade: opp.Probabilidade_da_Oportunidade__c,
        lastEvent: eventInfo,
        _opp: opp // Store original record for reference
      };
    });
  }

  // Ensure stage options are available for editors
  ensureStageOptionsAvailable() {
    if (!this.stageOptions || this.stageOptions.length === 0) {
      console.warn("Stage options not available, attempting to reload...");
      // Force refresh of stage options if they're missing
      return refreshApex(this.wiredStageOptionsResult);
    }
    return Promise.resolve();
  }

  // Define the column definitions for opportunities
  getOpportunityColumnDefs() {
    return [
      {
        headerName: "Nome",
        field: "name",
        sortable: true,
        filter: "agTextColumnFilter",
        resizable: true,
        cellRenderer: (params) => this.createNameCellRenderer(params),
        flex: 2,
        minWidth: 200
      },
      {
        headerName: "Conta",
        field: "accountName",
        sortable: true,
        filter: "agTextColumnFilter",
        cellRenderer: (params) => this.createAccountCellRenderer(params),
        resizable: true,
        flex: 1,
        minWidth: 150
      },
      {
        headerName: "Estágio",
        field: "stageName",
        sortable: true,
        filter: "agTextColumnFilter",
        filterParams: {
          filterOptions: ["equals", "contains", "startsWith"],
          suppressAndOrCondition: true,
          defaultOption: "equals"
        },
        // Standard cell renderer - no custom styling
        cellRenderer: (params) => {
          if (!params.data) return "";

          const stageName = params.value || "";
          const stageOption = this.stageOptions.find(
            (option) => option.value === stageName
          );
          const stageLabel = stageOption ? stageOption.label : stageName;

          // Return simple text content like other columns
          return stageLabel;
        },
        editable: true,
        cellEditor: "StageDropdownEditor", // Use custom editor class name
        cellEditorParams: () => ({
          stageOptions: this.stageOptions || [],
          updateCallback: (opportunityId, newStage) =>
            this.handleStageChanged(opportunityId, newStage),
          getStageOptions: () => this.stageOptions || []
        }),
        singleClickEdit: true,
        cellEditorPopup: false,
        resizable: true,
        flex: 1,
        minWidth: 150
      },
      {
        headerName: "Valor",
        field: "amount",
        sortable: true,
        filter: "agNumberColumnFilter",
        filterParams: {
          filterOptions: ["equals", "lessThan", "greaterThan"],
          suppressAndOrCondition: true
        },
        cellRenderer: (params) => {
          if (!params.data) return "";

          let formattedValue = "N/A";
          if (params.value != null) {
            try {
              const numValue = parseFloat(params.value);
              formattedValue = `R$ ${numValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            } catch (error) {
              console.error("Error formatting cell:", error);
              formattedValue = `R$ ${params.value}`;
            }
          }

          const div = document.createElement("div");
          div.classList.add("amount-cell");
          div.innerHTML = `<span class="amount-value">${formattedValue}</span>`;
          return div;
        },
        resizable: true,
        type: "numericColumn",
        comparator: (valueA, valueB) => {
          // Handle null/undefined values
          if (valueA === null || valueA === undefined) return -1;
          if (valueB === null || valueB === undefined) return 1;

          // Simple numeric comparison for sorting
          return valueA - valueB;
        },
        flex: 1,
        minWidth: 120
      },
      {
        headerName: "Probabilidade",
        field: "probabilidadeOportunidade",
        sortable: true,
        filter: "agTextColumnFilter",
        filterParams: {
          filterOptions: ["equals", "contains"],
          suppressAndOrCondition: true,
          defaultOption: "equals"
        },
        cellRenderer: (params) => this.createProbabilityCellRenderer(params),
        resizable: true,
        flex: 1,
        minWidth: 120
      },
      {
        headerName: "Data de Fechamento",
        field: "closeDate",
        sortable: true,
        filter: "agDateColumnFilter",
        filterParams: {
          filterOptions: ["equals", "lessThan", "greaterThan"],
          suppressAndOrCondition: true,
          comparator: this.dateComparator
        },
        cellRenderer: (params) => this.createCloseDateCellRenderer(params),
        valueGetter: (params) =>
          params.data.rawCloseDate ? new Date(params.data.rawCloseDate) : null,
        resizable: true,
        flex: 1,
        minWidth: 150
      },
      {
        headerName: "Proprietário",
        field: "ownerName",
        sortable: true,
        filter: "agTextColumnFilter",
        cellRenderer: (params) => this.createOwnerCellRenderer(params),
        resizable: true,
        flex: 1,
        minWidth: 150
      },
      {
        headerName: "Eventos",
        field: "lastEvent",
        sortable: false,
        filter: "agTextColumnFilter",
        filterParams: {
          filterOptions: ["contains"],
          suppressAndOrCondition: true,
          textCustomComparator: (filter, value, filterText) => {
            if (!value || !value.subject) return false;
            return value.subject
              .toLowerCase()
              .includes(filterText.toLowerCase());
          }
        },
        cellRenderer: (params) => this.createEventCellRenderer(params),
        resizable: true,
        flex: 1,
        minWidth: 150
      },
      {
        headerName: "Ações",
        sortable: false,
        filter: false,
        resizable: false,
        cellRenderer: (params) => this.createActionsCellRenderer(params),
        width: 120,
        pinned: "right"
      }
    ];
  }

  // Date comparator for sorting and filtering
  dateComparator(filterLocalDateAtMidnight, cellValue) {
    if (!cellValue) return -1;

    const cellDate = new Date(cellValue);
    const filterDate = new Date(filterLocalDateAtMidnight);

    if (cellDate < filterDate) return -1;
    if (cellDate > filterDate) return 1;
    return 0;
  }

  // Cell renderers for custom cells
  createNameCellRenderer(params) {
    if (!params.data) return "";

    const div = document.createElement("div");
    div.classList.add("name-cell");
    div.style.cursor = "pointer";
    div.innerHTML = `<span class="slds-truncate">${params.value}</span>`;
    div.addEventListener("click", () =>
      this.navigateToRecordDetail(params.data.id)
    );

    return div;
  }

  createCloseDateCellRenderer(params) {
    if (!params.data) return "";

    const div = document.createElement("div");
    div.classList.add("close-date-cell");

    let formattedDate = "N/A";
    if (params.data.rawCloseDate) {
      try {
        const date = new Date(params.data.rawCloseDate);
        // Format date in Brazilian format (DD/MM/YYYY)
        formattedDate = date.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric"
        });
      } catch (error) {
        console.error("Error formatting close date:", error);
        formattedDate = "Data inválida";
      }
    }

    div.innerHTML = `<span class="slds-truncate">${formattedDate}</span>`;
    return div;
  }

  createAccountCellRenderer(params) {
    if (!params.data) return "";

    const div = document.createElement("div");
    div.classList.add("account-cell");

    if (params.data.accountId && params.data.accountName) {
      div.style.cursor = "pointer";
      div.style.color = "#0176d3"; // Salesforce link color
      div.innerHTML = `<span class="slds-truncate" style="text-decoration: underline;">${params.data.accountName}</span>`;
      div.addEventListener("click", () =>
        this.navigateToAccountDetail(params.data.accountId)
      );
    } else {
      div.innerHTML = `<span class="slds-truncate">${params.data.accountName || "N/A"}</span>`;
    }

    return div;
  }

  createOwnerCellRenderer(params) {
    if (!params.data) return "";

    const div = document.createElement("div");
    div.classList.add("owner-cell");

    if (params.data.ownerId && params.data.ownerName) {
      div.style.cursor = "pointer";
      div.style.color = "#0176d3"; // Salesforce link color
      div.innerHTML = `<span class="slds-truncate" style="text-decoration: underline;">${params.data.ownerName}</span>`;
      div.addEventListener("click", () =>
        this.navigateToUserDetail(params.data.ownerId)
      );
    } else {
      div.innerHTML = `<span class="slds-truncate">${params.data.ownerName || "N/A"}</span>`;
    }

    return div;
  }

  createEventCellRenderer(params) {
    if (!params.data) return "";

    const div = document.createElement("div");
    div.classList.add("event-cell");
    div.style.cssText = `
      padding: 0.25rem 0.5rem;
      display: flex;
      align-items: center;
      height: 100%;
    `;

    // Check for event data in different possible locations
    let event = null;



    // Try different data structures
    if (params.data.lastEvent && (params.data.lastEvent.Subject || params.data.lastEvent.subject)) {
      event = params.data.lastEvent;
    } else if (params.data.Events && params.data.Events.records && params.data.Events.records.length > 0) {
      // Salesforce subquery returns data as Events.records array
      event = params.data.Events.records[0];
    } else if (params.data.events && params.data.events.length > 0) {
      event = params.data.events[0]; // Get the first event
    } else if (
      params.value &&
      typeof params.value === "object" &&
      (params.value.Subject || params.value.subject)
    ) {
      event = params.value;
    }

    if (event && (event.Subject || event.subject)) {
      // Format the event date
      let formattedDate = "N/A";
      let formattedTime = "";

      if (event.StartDateTime || event.startDateTime) {
        try {
          const eventDate = new Date(event.StartDateTime || event.startDateTime);
          if (!isNaN(eventDate.getTime())) {
            formattedDate = eventDate.toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              year: "2-digit"
            });
            formattedTime = eventDate.toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit"
            });
          }
        } catch (error) {
          console.error("Error formatting event date:", error);
        }
      }

      div.style.cursor = "pointer";
      div.innerHTML = `
        <div style="display: flex; align-items: center; width: 100%;">
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 0.875rem; font-weight: 500; color: #181818;
                        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${formattedDate}${formattedTime ? ` às ${formattedTime}` : ""}
            </div>
          </div>
        </div>
      `;

      // Add hover effect
      div.addEventListener("mouseenter", () => {
        div.style.backgroundColor = "#f3f2f2";
      });
      div.addEventListener("mouseleave", () => {
        div.style.backgroundColor = "transparent";
      });

      // Add click handler to navigate to event
      div.addEventListener("click", (clickEvent) => {
        clickEvent.stopPropagation();
        if (event.id) {
          console.log("Navigating to event:", event.id);
          this.navigateToEventDetail(event.id);
        } else {
          console.warn("Event ID not found:", event);
        }
      });
    } else {
      div.innerHTML = `
        <div style="display: flex; align-items: center; color: #706e6b; font-size: 0.875rem;">
          <span>Sem eventos</span>
        </div>
      `;
    }

    return div;
  }

  navigateToEventDetail(eventId) {
    this[NavigationMixin.Navigate]({
      type: "standard__recordPage",
      attributes: {
        recordId: eventId,
        objectApiName: "Event",
        actionName: "view"
      }
    });
  }

  createStageCellRenderer(params) {
    if (!params.data) return "";

    // Find stage label
    const stageOption =
      this.stageOptions.find((option) => option.value === params.value) || {};
    const stageLabel = stageOption.label || params.value;

    const div = document.createElement("div");
    div.classList.add("stage-cell");
    div.innerHTML = `
            <div class="slds-badge slds-badge_lightest stage-badge">
                <span class="slds-truncate">${stageLabel}</span>
            </div>
        `;

    return div;
  }

  createProbabilityCellRenderer(params) {
    if (!params.data) return "";

    // Find probability label
    const probOption =
      this.probabilityOptions.find((option) => option.value === params.value) ||
      {};
    const probLabel = probOption.label || params.value || "N/A";

    // Map probability to color
    let color = "#c23934"; // Default red

    switch (params.value) {
      case "zero":
        color = "#c23934"; // Red
        break;
      case "treze":
        color = "#e57f1e"; // Orange
        break;
      case "trintaequatro":
        color = "#ffb75d"; // Light orange
        break;
      case "cinquentaecinco":
        color = "#afe16b"; // Light green
        break;
      case "oitentaenove":
        color = "#4bca81"; // Green
        break;
      case "cem":
        color = "#058758"; // Dark green
        break;
      default:
        color = "#c23934"; // Default red
    }

    const div = document.createElement("div");
    div.classList.add("probability-cell");
    div.innerHTML = `
            <div class="slds-badge probability-badge" style="background-color: ${color}; color: white;">
                <span class="slds-truncate">${probLabel}</span>
            </div>
        `;

    return div;
  }

  createActionsCellRenderer(params) {
    if (!params.data) return "";

    const div = document.createElement("div");
    div.classList.add("actions-cell");
    div.style.cssText = `
      position: relative;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100%;
    `;

    // Create dropdown menu container with improved styling
    div.innerHTML = `
      <div class="actions-menu-container" style="position: relative;">
        <div class="slds-dropdown-trigger slds-dropdown-trigger_click">
          <button class="slds-button slds-button_icon slds-button_icon-border-filled actions-menu-button"
                  title="Opções de ação"
                  data-record-id="${params.data.id}"
                  style="background: white; border: 1px solid #d8dde6; border-radius: 0.25rem;
                         cursor: pointer; pointer-events: auto; z-index: 1000; position: relative;">
            <span class="slds-button__icon" style="width: 1rem; height: 1rem; fill: #706e6b;">
              ▼
            </span>
            <span class="slds-assistive-text">Mostrar menu</span>
          </button>
          <div class="slds-dropdown slds-dropdown_right actions-dropdown"
               style="display: none !important; position: absolute !important; top: 100% !important; right: 0 !important; z-index: 99999 !important;
                      background: white !important; border: 1px solid #d8dde6 !important; border-radius: 0.25rem !important;
                      box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important; min-width: 150px !important; margin-top: 2px !important;">
            <ul class="slds-dropdown__list" role="menu" style="margin: 0; padding: 0.25rem 0; list-style: none;">
              <li class="slds-dropdown__item" role="presentation">
                <a href="javascript:void(0);" role="menuitem" class="slds-dropdown__link"
                   data-action="view" data-record-id="${params.data.id}"
                   style="display: flex; align-items: center; padding: 0.5rem 0.75rem; text-decoration: none;
                          color: #181818; font-size: 0.875rem; line-height: 1.25rem;">
                  <span class="action-icon" style="margin-right: 0.5rem; width: 1rem; height: 1rem; color: #706e6b;">👁</span>
                  <span class="slds-truncate">Ver Detalhes</span>
                </a>
              </li>
              <li class="slds-dropdown__item" role="presentation">
                <a href="javascript:void(0);" role="menuitem" class="slds-dropdown__link"
                   data-action="edit" data-record-id="${params.data.id}"
                   style="display: flex; align-items: center; padding: 0.5rem 0.75rem; text-decoration: none;
                          color: #181818; font-size: 0.875rem; line-height: 1.25rem;">
                  <span class="action-icon" style="margin-right: 0.5rem; width: 1rem; height: 1rem; color: #706e6b;">✏</span>
                  <span class="slds-truncate">Editar</span>
                </a>
              </li>
              <li class="slds-has-divider_top-space" role="separator" style="border-top: 1px solid #e5e5e5; margin: 0.25rem 0;"></li>
              <li class="slds-dropdown__item" role="presentation">
                <a href="javascript:void(0);" role="menuitem" class="slds-dropdown__link"
                   data-action="task" data-record-id="${params.data.id}"
                   style="display: flex; align-items: center; padding: 0.5rem 0.75rem; text-decoration: none;
                          color: #181818; font-size: 0.875rem; line-height: 1.25rem;">
                  <span class="action-icon" style="margin-right: 0.5rem; width: 1rem; height: 1rem; color: #706e6b;">📋</span>
                  <span class="slds-truncate">Adicionar Tarefa</span>
                </a>
              </li>
              <li class="slds-has-divider_top-space" role="separator" style="border-top: 1px solid #e5e5e5; margin: 0.25rem 0;"></li>
              <li class="slds-dropdown__item" role="presentation">
                <a href="javascript:void(0);" role="menuitem" class="slds-dropdown__link"
                   data-action="delete" data-record-id="${params.data.id}"
                   style="display: flex; align-items: center; padding: 0.5rem 0.75rem; text-decoration: none;
                          color: #c23934; font-size: 0.875rem; line-height: 1.25rem;">
                  <span class="action-icon" style="margin-right: 0.5rem; width: 1rem; height: 1rem; color: #c23934;">🗑</span>
                  <span class="slds-truncate">Excluir</span>
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    `;

    // Add event listeners with improved error handling
    const menuButton = div.querySelector(".actions-menu-button");
    const dropdown = div.querySelector(".actions-dropdown");
    const menuItems = div.querySelectorAll(".slds-dropdown__link");

    console.log("Creating actions cell for record:", params.data.id);
    console.log("Menu button found:", !!menuButton);
    console.log("Dropdown found:", !!dropdown);
    console.log("Menu items found:", menuItems.length);

    if (!menuButton || !dropdown) {
      console.error("Failed to create dropdown elements");
      return div;
    }

    // Add hover effects to menu items
    menuItems.forEach((item) => {
      item.addEventListener("mouseenter", () => {
        item.style.backgroundColor = "#f3f2f2";
      });
      item.addEventListener("mouseleave", () => {
        item.style.backgroundColor = "transparent";
      });
    });

    // Toggle dropdown on button click
    console.log("Adding click listener to menu button for record:", params.data.id);
    menuButton.addEventListener("click", (event) => {
      console.log("=== ACTIONS BUTTON CLICKED ===");
      console.log("Event:", event);
      console.log("Record ID:", params.data.id);

      event.stopPropagation();
      event.preventDefault();

      // Use the template dropdown instead of the grid dropdown
      const templateDropdown = this.template.querySelector('[data-dropdown-menu]');
      const templateContainer = this.template.querySelector('[data-dropdown-container]');

      if (!templateDropdown || !templateContainer) {
        console.log("Template dropdown not found, falling back to grid dropdown");

        const isVisible = dropdown.style.display === "block";
        this.closeAllActionDropdowns();

        if (!isVisible) {
          dropdown.style.setProperty("display", "block", "important");
          dropdown.style.setProperty("visibility", "visible", "important");
          dropdown.style.setProperty("opacity", "1", "important");
          dropdown.style.setProperty("position", "absolute", "important");
          dropdown.style.setProperty("z-index", "99999", "important");
          console.log("Grid dropdown opened");
        }
        return;
      }

      // Close all dropdowns first
      this.closeAllActionDropdowns();

      // Position template dropdown relative to button
      const buttonRect = menuButton.getBoundingClientRect();
      console.log("Button rect:", buttonRect);

      // Calculate better positioning - align dropdown right edge with button right edge
      const dropdownWidth = 150;
      const left = buttonRect.right - dropdownWidth;
      const top = buttonRect.bottom + 2;

      // Position the container at the button location
      templateContainer.style.left = `${left}px`;
      templateContainer.style.top = `${top}px`;

      console.log("Dropdown positioned at:", { left, top });

      // Show template dropdown
      templateDropdown.classList.add('show');
      templateDropdown.style.display = 'block';

      // Store current record ID for action handling
      this.currentActionRecordId = params.data.id;

      // Add event listeners to dropdown actions (fresh listeners each time)
      this.addDropdownActionListeners(templateDropdown);

      console.log("Template dropdown opened for record:", params.data.id);
      console.log("Template dropdown position:", templateDropdown.getBoundingClientRect());
    });

    // Handle menu item clicks
    menuItems.forEach((item) => {
      item.addEventListener("click", (event) => {
        event.stopPropagation();
        event.preventDefault();

        const action = event.currentTarget.dataset.action;
        const recordId = event.currentTarget.dataset.recordId;

        console.log("Menu item clicked:", action, "for record:", recordId);

        // Close dropdown
        dropdown.style.display = "none";

        // Handle action with delay to ensure dropdown closes
        setTimeout(() => {
          this.handleActionMenuSelect(action, recordId);
        }, 100);
      });
    });

    return div;
  }

  // Close all action dropdowns
  closeAllActionDropdowns() {
    // Close grid dropdowns
    const allDropdowns = document.querySelectorAll(".actions-dropdown");
    allDropdowns.forEach((dropdown) => {
      dropdown.style.display = "none";
    });

    // Close template dropdown
    const templateDropdown = this.template.querySelector('[data-dropdown-menu]');
    if (templateDropdown) {
      templateDropdown.classList.remove('show');
      templateDropdown.style.display = 'none';
    }
  }

  // Handle action menu selection (same as kanbanPerson)
  handleActionMenuSelect(action, recordId) {
    if (!recordId || !action) return;

    switch (action) {
      case "view":
        this.navigateToRecordDetail(recordId);
        break;
      case "edit":
        this.navigateToRecordEdit(recordId);
        break;
      case "task":
        this.handleAddTask(recordId);
        break;
      case "delete":
        this.handleDelete(recordId);
        break;
      default:
        console.warn("Unknown action:", action);
        break;
    }
  }

  // Navigation methods
  navigateToRecordDetail(recordId) {
    this[NavigationMixin.Navigate]({
      type: "standard__recordPage",
      attributes: {
        recordId: recordId,
        objectApiName: "Opportunity",
        actionName: "view"
      }
    });
  }

  navigateToRecordEdit(recordId) {
    this[NavigationMixin.Navigate]({
      type: "standard__recordPage",
      attributes: {
        recordId: recordId,
        objectApiName: "Opportunity",
        actionName: "edit"
      }
    });
  }

  navigateToAccountDetail(accountId) {
    this[NavigationMixin.Navigate]({
      type: "standard__recordPage",
      attributes: {
        recordId: accountId,
        objectApiName: "Account",
        actionName: "view"
      }
    });
  }

  navigateToUserDetail(userId) {
    this[NavigationMixin.Navigate]({
      type: "standard__recordPage",
      attributes: {
        recordId: userId,
        objectApiName: "User",
        actionName: "view"
      }
    });
  }

  // Action handlers from kanbanPerson
  handleAddTask(recordId) {
    // Create a new task related to the opportunity
    this[NavigationMixin.Navigate]({
      type: "standard__objectPage",
      attributes: {
        objectApiName: "Task",
        actionName: "new"
      },
      state: {
        defaultFieldValues: `WhatId=${recordId}`,
        navigationLocation: "LOOKUP"
      }
    });
  }

  handleDelete(recordId) {
    const record = this.opportunities.find((opp) => opp.id === recordId);
    const recordName = record ? record.name : "Registro";

    // Confirm deletion
    if (confirm(`Tem certeza que deseja excluir "${recordName}"?`)) {
      // Use Lightning Data Service deleteRecord
      deleteRecord(recordId)
        .then(() => {
          this.showToast(
            "Sucesso",
            `${recordName} foi excluído com sucesso.`,
            "success"
          );
          // Refresh the data
          return this.refreshData();
        })
        .catch((error) => {
          this.showToast(
            "Erro",
            error.body?.message || "Erro ao excluir registro",
            "error"
          );
          console.error("Erro ao excluir registro:", error);
        });
    }
  }

  // Toast message helper
  showToast(title, message, variant) {
    this.dispatchEvent(
      new ShowToastEvent({
        title: title,
        message: message,
        variant: variant
      })
    );
  }

  // Refresh data
  refreshData() {
    this.isLoading = true;
    return refreshApex(this.wiredOpportunitiesResult)
      .then(() => {
        this.showToast("Sucesso", "Dados atualizados com sucesso", "success");
      })
      .catch((error) => {
        this.showToast(
          "Erro",
          "Erro ao atualizar dados: " + error.message,
          "error"
        );
      })
      .finally(() => {
        this.isLoading = false;
      });
  }

  // Resize columns to fit content method removed - button no longer available

  // Stage Filter Event Handlers
  handleStageFilter(event) {
    const { stageValue, stageName } = event.detail;
    this.selectedStage = stageValue;
    this.applyStageFilter(stageValue);
    logger.info(`Stage filter applied: ${stageName} (${stageValue})`);
  }

  handleClearStageFilter(event) {
    this.selectedStage = null;
    this.clearStageFilter();
    logger.info("Stage filter cleared");
  }

  // Grid Filter Methods (Community Edition compatible)
  async applyStageFilter(stageValue) {
    if (!this.gridApi) {
      console.warn("Grid API not available for filtering");
      return;
    }

    try {
      // Method 1: Use setFilterModel with text filter (Community Edition compatible)
      const filterModel = {
        stageName: {
          filterType: "text",
          type: "equals",
          filter: stageValue
        }
      };

      this.gridApi.setFilterModel(filterModel);
      logger.info(`Applied stage filter for: ${stageValue}`);
    } catch (error) {
      console.error("Error applying stage filter:", error);
      // Fallback: try the direct filter instance approach
      try {
        const stageFilterInstance = this.gridApi.getFilterInstance("stageName");
        if (
          stageFilterInstance &&
          typeof stageFilterInstance.setModel === "function"
        ) {
          stageFilterInstance.setModel({
            filterType: "text",
            type: "equals",
            filter: stageValue
          });
          this.gridApi.onFilterChanged();
          logger.info(
            `Applied stage filter via fallback method: ${stageValue}`
          );
        }
      } catch (fallbackError) {
        console.error("Fallback filter method also failed:", fallbackError);
      }
    }
  }

  async clearStageFilter() {
    if (!this.gridApi) {
      console.warn("Grid API not available for clearing filter");
      return;
    }

    try {
      // Method 1: Clear specific filter using setFilterModel
      const currentFilterModel = this.gridApi.getFilterModel();
      if (currentFilterModel && currentFilterModel.stageName) {
        delete currentFilterModel.stageName;
        this.gridApi.setFilterModel(currentFilterModel);
        logger.info("Cleared stage filter");
      }

      // Alternative Method 2: Set null filter model for the column
      // this.gridApi.setFilterModel({
      //   ...this.gridApi.getFilterModel(),
      //   stageName: null
      // });
    } catch (error) {
      console.error("Error clearing stage filter:", error);
      // Fallback: try the direct filter instance approach
      try {
        const stageFilterInstance = this.gridApi.getFilterInstance("stageName");
        if (
          stageFilterInstance &&
          typeof stageFilterInstance.setModel === "function"
        ) {
          stageFilterInstance.setModel(null);
          this.gridApi.onFilterChanged();
          logger.info("Cleared stage filter via fallback method");
        }
      } catch (fallbackError) {
        console.error("Fallback clear method also failed:", fallbackError);
      }
    }
  }

  // Handle grid filter changes to sync with stage cards
  handleGridFilterChanged(params) {
    if (!this.gridApi) return;

    try {
      const filterModel = this.gridApi.getFilterModel();
      const stageFilter = filterModel ? filterModel.stageName : null;

      if (stageFilter && stageFilter.filter) {
        // Stage filter is active with text filter - update selected stage
        const selectedStageValue = stageFilter.filter;
        if (this.selectedStage !== selectedStageValue) {
          this.selectedStage = selectedStageValue;
          // Update stage cards to reflect the change
          const stageCardsComponent = this.template.querySelector(
            "c-opportunity-stage-cards"
          );
          if (stageCardsComponent) {
            stageCardsComponent.setSelectedStage(selectedStageValue);
          }
          logger.info(`Stage filter changed via grid: ${selectedStageValue}`);
        }
      } else {
        // No stage filter active - clear selection
        if (this.selectedStage !== null) {
          this.selectedStage = null;
          // Update stage cards to reflect the change - Temporarily commented for migration
          /* const stageCardsComponent = this.template.querySelector(
            "c-opportunity-stage-cards"
          );
          if (stageCardsComponent) {
            stageCardsComponent.clearSelection();
          } */
          logger.info("Stage filter cleared via grid");
        }
      }
    } catch (error) {
      console.error("Error handling grid filter change:", error);
    }
  }

  // Stage Dropdown Editor Methods
  createStageDropdownRenderer(params) {
    if (!params.data) return "";

    const stageName = params.value || "";
    const stageOption = this.stageOptions.find(
      (option) => option.value === stageName
    );
    const stageLabel = stageOption ? stageOption.label : stageName;

    const div = document.createElement("div");
    div.classList.add("stage-cell", "editable-cell");
    div.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 100%;
      padding: 0.25rem 0.5rem;
      cursor: pointer;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 0.25rem;
      transition: all 0.2s ease;
      width: 100%;
      box-sizing: border-box;
    `;

    // Add hover effect that indicates editability
    div.addEventListener("mouseenter", () => {
      div.style.background = "#f3f9ff";
      div.style.borderColor = "#1589ee";
      div.title = "Clique para editar o estágio";
    });

    div.addEventListener("mouseleave", () => {
      div.style.background = "transparent";
      div.style.borderColor = "transparent";
      div.title = "";
    });

    // Create stage badge
    const stageBadge = document.createElement("span");
    stageBadge.className = "stage-badge";
    stageBadge.style.cssText = `
      background: #f3f2f2;
      color: #080707;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex-grow: 1;
      margin-right: 0.25rem;
    `;
    stageBadge.textContent = stageLabel;

    // Create edit icon
    const editIcon = document.createElement("span");
    editIcon.innerHTML = "✏️";
    editIcon.style.cssText = `
      font-size: 0.75rem;
      opacity: 0.6;
      flex-shrink: 0;
    `;

    div.appendChild(stageBadge);
    div.appendChild(editIcon);

    return div;
  }

  createStageDropdownEditor(params) {
    console.log(
      "Creating stage dropdown editor for:",
      params.data?.id,
      "current stage:",
      params.value
    );

    // Create a wrapper div for better styling control
    const wrapper = document.createElement("div");
    wrapper.style.cssText = `
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      padding: 0;
      margin: 0;
    `;

    // Create a native HTML select dropdown for AG-Grid compatibility
    const select = document.createElement("select");
    select.style.cssText = `
      width: 100%;
      height: 100%;
      border: 2px solid #1589ee;
      border-radius: 0.25rem;
      padding: 0.25rem 0.5rem;
      font-size: 0.8125rem;
      background: white;
      cursor: pointer;
      outline: none;
      box-shadow: 0 0 3px rgba(21, 137, 238, 0.3);
    `;

    // Add options to the select
    this.stageOptions.forEach((option) => {
      const optionElement = document.createElement("option");
      optionElement.value = option.value;
      optionElement.textContent = option.label;
      optionElement.selected = option.value === params.value;
      select.appendChild(optionElement);
    });

    // Store original value for rollback
    const originalValue = params.value;

    // Handle change event
    select.addEventListener("change", async (event) => {
      const newStage = event.target.value;
      const opportunityId = params.data.id;

      console.log("Stage change detected:", originalValue, "->", newStage);

      if (newStage !== originalValue) {
        try {
          // Show loading state
          select.disabled = true;
          select.style.opacity = "0.6";
          select.style.cursor = "wait";

          // Update via Apex
          await updateOpportunityStatus(opportunityId, newStage);

          // Update the grid data
          params.node.setDataValue("stageName", newStage);

          // Handle stage change
          await this.handleStageChanged(opportunityId, newStage);

          console.log("Stage updated successfully:", newStage);

          // Stop editing after successful update
          if (params.api) {
            params.api.stopEditing();
          }
        } catch (error) {
          console.error("Error updating stage:", error);
          // Revert selection on error
          select.value = originalValue;
          this.showToast("Erro", "Erro ao atualizar estágio", "error");
        } finally {
          select.disabled = false;
          select.style.opacity = "1";
          select.style.cursor = "pointer";
        }
      }
    });

    // Handle escape key to cancel editing
    select.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        select.value = originalValue;
        if (params.api) {
          params.api.stopEditing(true); // Cancel editing
        }
      }
    });

    wrapper.appendChild(select);

    // Return the editor interface that AG-Grid expects
    return {
      getGui: () => wrapper,
      getValue: () => select.value,
      isPopup: () => false,
      isCancelBeforeStart: () => false,
      isCancelAfterEnd: () => false,
      focusIn: () => {
        setTimeout(() => {
          select.focus();
          // Optionally open the dropdown immediately
          if (select.showPicker) {
            select.showPicker();
          }
        }, 0);
      },
      focusOut: () => select.blur(),
      destroy: () => {
        // Cleanup if needed
        wrapper.removeChild(select);
      }
    };
  }

  // Handle stage changes from the dropdown editor
  async handleStageChanged(opportunityId, newStage) {
    try {
      logger.info(
        `Stage changed for opportunity ${opportunityId}: ${newStage}`
      );

      // Update the local opportunities data
      const opportunityIndex = this.opportunities.findIndex(
        (opp) => opp.id === opportunityId
      );
      if (opportunityIndex !== -1) {
        this.opportunities[opportunityIndex].stageName = newStage;
      }

      // Get the stage cards component
      const stageCardsComponent = this.template.querySelector(
        "c-opportunity-stage-cards"
      );

      if (stageCardsComponent) {
        // Refresh the stage cards to update counts
        stageCardsComponent.refreshCards();

        // Apply automatic filtering to the new stage
        stageCardsComponent.applyAutomaticStageFilter(newStage);
      }

      // Show success toast
      this.showToast(
        "Sucesso",
        `Estágio atualizado para: ${newStage}`,
        "success"
      );

      console.log("Automatic stage filtering applied after stage change");
    } catch (error) {
      console.error("Error handling stage change:", error);
      this.showToast("Erro", "Erro ao processar mudança de estágio", "error");
    }
  }

  // Propriedade computada para mesclar as opções básicas com o handler de eventos personalizado
  get gridOptions() {
    return {
      ...this._baseGridOptions,
      // Register custom cell editors
      components: {
        StageDropdownEditor: this.StageDropdownEditorClass
      },
      // Adiciona o handler onGridReady personalizado para este componente
      onGridReady: (params) => {
        logger.info("Grid ready event fired");
        // Armazena referências da API
        this.gridApi = params.api;
        this.columnApi = params.columnApi;

        // Aplica a correção do popup de filtro após o grid estar pronto
        this.filterInteractionHelper.fixFilterPopupInteraction(
          'div[data-id="agGrid"]'
        );

        // Ajustar o tamanho das colunas para caber no espaço disponível
        if (this.gridApi) {
          this.gridApi.sizeColumnsToFit();
        }
      },

      // Add filter changed listener to sync with stage cards
      onFilterChanged: (params) => {
        this.handleGridFilterChanged(params);
      },

      // Add debugging for cell editing
      onCellEditingStarted: (params) => {
        console.log("Cell editing started:", params.colDef.field, params.value);
      },

      onCellEditingStopped: (params) => {
        console.log("Cell editing stopped:", params.colDef.field, params.value);
      },

      onCellClicked: (params) => {
        console.log(
          "Cell clicked:",
          params.colDef.field,
          params.value,
          "Editable:",
          params.colDef.editable
        );

        // Force editing for stage column
        if (params.colDef.field === "stageName" && params.colDef.editable) {
          console.log("Forcing edit mode for stage cell");
          setTimeout(() => {
            params.api.startEditingCell({
              rowIndex: params.rowIndex,
              colKey: params.column.colId
            });
          }, 0);
        }
      },
      // Adiciona as definições de colunas e dados de linha quando disponíveis
      columnDefs: this._columnDefs || this.getOpportunityColumnDefs(),
      rowData: this._rowData || []
    };
  }

  // Custom Stage Dropdown Editor Class
  get StageDropdownEditorClass() {
    const self = this;

    class StageDropdownEditor {
      constructor() {
        console.log("StageDropdownEditor constructor called");
      }

      init(params) {
        console.log("StageDropdownEditor init called with params:", params);
        this.params = params;
        this.originalValue = params.value;

        // Create the select element
        this.eInput = document.createElement("select");
        this.eInput.style.cssText = `
          width: 100%;
          height: 100%;
          border: 2px solid #1589ee;
          border-radius: 0.25rem;
          padding: 0.25rem 0.5rem;
          font-size: 0.8125rem;
          background: white;
          cursor: pointer;
          outline: none;
          box-shadow: 0 0 3px rgba(21, 137, 238, 0.3);
        `;

        // Add options with multiple fallback strategies
        let stageOptions = [];

        // Strategy 1: Get from params.stageOptions
        if (
          params.stageOptions &&
          Array.isArray(params.stageOptions) &&
          params.stageOptions.length > 0
        ) {
          stageOptions = params.stageOptions;
          console.log("Using stage options from params:", stageOptions.length);
        }
        // Strategy 2: Get from params.getStageOptions function
        else if (
          params.getStageOptions &&
          typeof params.getStageOptions === "function"
        ) {
          stageOptions = params.getStageOptions();
          console.log(
            "Using stage options from getStageOptions function:",
            stageOptions.length
          );
        }
        // Strategy 3: Get from self.stageOptions
        else if (
          self.stageOptions &&
          Array.isArray(self.stageOptions) &&
          self.stageOptions.length > 0
        ) {
          stageOptions = self.stageOptions;
          console.log("Using stage options from self:", stageOptions.length);
        }
        // Strategy 4: Wait and retry
        else {
          console.warn("No stage options available, attempting to retry...");
          setTimeout(() => {
            const retryOptions = self.stageOptions || [];
            if (retryOptions.length > 0) {
              console.log(
                "Retry successful, rebuilding options:",
                retryOptions.length
              );
              // Clear existing options
              this.eInput.innerHTML = "";
              // Add new options
              retryOptions.forEach((option) => {
                const optionElement = document.createElement("option");
                optionElement.value = option.value;
                optionElement.textContent = option.label;
                optionElement.selected = option.value === params.value;
                this.eInput.appendChild(optionElement);
              });
            }
          }, 500);
        }

        console.log("Final stage options to use:", stageOptions);

        // Add options to select element
        stageOptions.forEach((option) => {
          const optionElement = document.createElement("option");
          optionElement.value = option.value;
          optionElement.textContent = option.label;
          optionElement.selected = option.value === params.value;
          this.eInput.appendChild(optionElement);
        });

        // Add a fallback option if no options are available
        if (stageOptions.length === 0) {
          const fallbackOption = document.createElement("option");
          fallbackOption.value = params.value || "";
          fallbackOption.textContent = params.value || "Carregando...";
          fallbackOption.selected = true;
          this.eInput.appendChild(fallbackOption);
          console.warn("Added fallback option due to missing stage options");
        }

        // Handle change
        this.eInput.addEventListener("change", async (event) => {
          const newStage = event.target.value;
          const opportunityId = params.data.id;

          console.log(
            "Stage change detected:",
            this.originalValue,
            "->",
            newStage
          );
          console.log("Opportunity ID:", opportunityId);
          console.log("New Stage:", newStage);

          if (newStage !== this.originalValue) {
            try {
              this.eInput.disabled = true;
              this.eInput.style.opacity = "0.6";

              // Call Apex method with proper parameter structure
              console.log("Calling updateOpportunityStatus with:", {
                recordId: opportunityId,
                newStatus: newStage
              });

              await updateOpportunityStatus({
                recordId: opportunityId,
                newStatus: newStage
              });

              // Update grid data
              params.node.setDataValue("stageName", newStage);

              // Call update callback
              if (params.updateCallback) {
                await params.updateCallback(opportunityId, newStage);
              }

              console.log("Stage updated successfully:", newStage);

              // Stop editing
              params.api.stopEditing();
            } catch (error) {
              console.error("Error updating stage:", error);
              console.error("Error details:", JSON.stringify(error, null, 2));
              this.eInput.value = this.originalValue;

              // Extract meaningful error message
              let errorMessage = "Erro ao atualizar estágio";
              if (error.body && error.body.message) {
                errorMessage = error.body.message;
              } else if (error.message) {
                errorMessage = error.message;
              }

              self.showToast("Erro", errorMessage, "error");
            } finally {
              this.eInput.disabled = false;
              this.eInput.style.opacity = "1";
            }
          }
        });

        // Handle escape key
        this.eInput.addEventListener("keydown", (event) => {
          if (event.key === "Escape") {
            this.eInput.value = this.originalValue;
            params.api.stopEditing(true);
          }
        });
      }

      getGui() {
        return this.eInput;
      }

      getValue() {
        return this.eInput.value;
      }

      isPopup() {
        return false;
      }

      isCancelBeforeStart() {
        return false;
      }

      isCancelAfterEnd() {
        return false;
      }

      focusIn() {
        setTimeout(() => {
          this.eInput.focus();
          if (this.eInput.showPicker) {
            this.eInput.showPicker();
          }
        }, 0);
      }

      focusOut() {
        // Optional cleanup
      }

      destroy() {
        // Cleanup
        if (this.eInput && this.eInput.parentNode) {
          this.eInput.parentNode.removeChild(this.eInput);
        }
      }
    }

    return StageDropdownEditor;
  }

  /**
   * Initialize grid properties when component is connected
   */
  connectedCallback() {
    logger.info("connectedCallback - Component connected to DOM");

    // Configura o manipulador de eventos de filtro
    this.handleFilterElementClick = (event) => {
      // Impede a propagação para evitar que o popup feche
      event.stopPropagation();

      // Verifica se é o botão de cancelar e permite que ele feche o popup
      if (
        event.target.innerText === "Cancel" ||
        event.target.innerText === "Cancelar"
      ) {
        logger.info(
          "Clique no botão Cancelar detectado, permitindo fechamento do popup"
        );
        // Não bloqueia a propagação para permitir que o popup feche
        return;
      }

      logger.info(
        "Clique interceptado em elemento do filtro:",
        event.target.tagName
      );
    };

    // Global click handler for closing action dropdowns
    this.handleGlobalClick = (event) => {
      // Close action dropdowns if clicking outside
      if (!event.target.closest(".actions-menu-container")) {
        this.closeAllActionDropdowns();
      }
    };

    // Add global click listener to close action dropdowns
    document.addEventListener("click", this.handleGlobalClick);

    // Inicializa o helper de interação com filtros
    this.filterInteractionHelper = setupFilterInteraction(
      this,
      this.handleFilterElementClick
    );

    // Setup template dropdown event listeners
    this.setupTemplateDropdownListeners();
  }

  // Setup event listeners for template dropdown (called once on component load)
  setupTemplateDropdownListeners() {
    console.log('Setting up template dropdown listeners...');
  }

  // Add event listeners to dropdown actions (called each time dropdown opens)
  addDropdownActionListeners(dropdown) {
    // Remove any existing listeners first
    const actionLinks = dropdown.querySelectorAll('a[data-action]');

    // Clone nodes to remove existing event listeners
    actionLinks.forEach(link => {
      const newLink = link.cloneNode(true);
      link.parentNode.replaceChild(newLink, link);
    });

    // Add fresh event listeners
    const newActionLinks = dropdown.querySelectorAll('a[data-action]');
    newActionLinks.forEach(link => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();

        const action = link.getAttribute('data-action');
        console.log('Template dropdown action clicked:', action, 'for record:', this.currentActionRecordId);

        // Handle the action
        this.handleDropdownAction(action, this.currentActionRecordId);

        // Close dropdown
        this.closeAllActionDropdowns();
      });
    });

    console.log('Fresh dropdown listeners added for', newActionLinks.length, 'actions');
  }

  // Handle dropdown actions
  handleDropdownAction(action, recordId) {
    console.log('=== DROPDOWN ACTION TRIGGERED ===');
    console.log('Action:', action);
    console.log('Record ID:', recordId);

    switch (action) {
      case 'edit':
        this.openOpportunityEditor(recordId);
        break;
      case 'delete':
        this.deleteOpportunity(recordId);
        break;
      case 'view':
        this.viewOpportunity(recordId);
        break;
      default:
        console.log('Unknown action:', action);
    }
  }

  // Open Salesforce standard opportunity editor
  openOpportunityEditor(recordId) {
    console.log('Opening opportunity editor for:', recordId);

    // Use NavigationMixin to open standard edit page
    this[NavigationMixin.Navigate]({
      type: 'standard__recordPage',
      attributes: {
        recordId: recordId,
        objectApiName: 'Opportunity',
        actionName: 'edit'
      }
    });
  }

  // Navigate to opportunity view page
  viewOpportunity(recordId) {
    console.log('Viewing opportunity:', recordId);

    // Use NavigationMixin to open standard view page
    this[NavigationMixin.Navigate]({
      type: 'standard__recordPage',
      attributes: {
        recordId: recordId,
        objectApiName: 'Opportunity',
        actionName: 'view'
      }
    });
  }

  // Delete opportunity with confirmation
  async deleteOpportunity(recordId) {
    console.log('Deleting opportunity:', recordId);

    if (!confirm('Tem certeza que deseja excluir esta oportunidade?')) {
      return;
    }

    try {
      // Use deleteRecord from lightning/uiRecordApi
      await deleteRecord(recordId);

      // Show success message
      this.dispatchEvent(
        new ShowToastEvent({
          title: 'Sucesso',
          message: 'Oportunidade excluída com sucesso',
          variant: 'success'
        })
      );

      // Refresh the grid data
      this.refreshData();

    } catch (error) {
      console.error('Error deleting opportunity:', error);

      // Show error message
      this.dispatchEvent(
        new ShowToastEvent({
          title: 'Erro',
          message: 'Erro ao excluir oportunidade: ' + error.body?.message || error.message,
          variant: 'error'
        })
      );
    }
  }

  /**
   * Clean up when component is disconnected
   */
  disconnectedCallback() {
    logger.info("disconnectedCallback - Component disconnected from DOM");

    // Remove global click listener
    if (this.handleGlobalClick) {
      document.removeEventListener("click", this.handleGlobalClick);
    }

    // Remove os listeners de eventos para evitar vazamentos de memória
    if (this.filterInteractionHelper) {
      this.filterInteractionHelper.removeFilterPopupListeners();
    }
  }

  /**
   * Load AG-Grid resources and initialize the grid after component is rendered
   */
  renderedCallback() {
    logger.info("renderedCallback - Component rendered in DOM");

    // Check if we've already initialized the grid or started the process
    if (this.gridInitialized || this.renderedOnce) {
      logger.info(
        "Grid initialization already in progress or complete, skipping"
      );
      return;
    }

    // Set flag to prevent multiple initialization attempts
    this.renderedOnce = true;

    logger.info("Starting resources loading process");
    this.loadAgGridResources()
      .then(() => {
        logger.info(
          "Resources loaded successfully, ensuring stage options available"
        );
        return this.ensureStageOptionsAvailable();
      })
      .then(() => {
        logger.info("Stage options verified, initializing grid");
        this.initializeGrid();
      })
      .catch((error) => {
        logger.error("Error initializing AG-Grid:", error);
        if (error.message) logger.error("Error message:", error.message);
        if (error.stack) logger.error("Error stack:", error.stack);
        this.showToast(
          "Erro",
          "Erro ao carregar recursos do AG-Grid: " + error.message,
          "error"
        );
      });
  }

  /**
   * Load all required AG-Grid resources
   * @returns {Promise} Promise that resolves when all resources are loaded
   */
  loadAgGridResources() {
    if (this.resourcesLoaded) {
      logger.info("Resources already loaded, skipping loading");
      return Promise.resolve();
    }

    logger.info("Loading AG-Grid resources");
    logger.info("JS Resource URL:", agGridJs);
    logger.info("CSS Resource URL:", agGridCss);
    logger.info("Theme Resource URL:", agGridThemeAlpine);

    return Promise.all([
      loadScript(this, agGridJs + '/ag-grid-community.js').then(() => {
        logger.info("AG-Grid JS loaded successfully");
        // Check if agGrid global object is available
        if (typeof window.agGrid !== "undefined") {
          logger.info("agGrid global object available:", window.agGrid.version);
        } else {
          logger.error(
            "agGrid global object NOT available after loading script"
          );
        }
      }),
      loadStyle(this, agGridCss + '/ag-grid-styles.css').then(() =>
        logger.info("AG-Grid CSS loaded successfully")
      ),
      loadStyle(this, agGridThemeAlpine + '/ag-grid-theme-alpine.css').then(() =>
        logger.info("AG-Grid Theme loaded successfully")
      )
    ])
      .then(() => {
        logger.info("All resources loaded successfully");
        this.resourcesLoaded = true;
        return Promise.resolve();
      })
      .catch((error) => {
        logger.error("Error loading resources:", error);
        return Promise.reject(error);
      });
  }

  /**
   * Initialize the AG-Grid instance
   */
  initializeGrid() {
    logger.info("Initializing grid");

    // Check if agGrid is available globally
    if (typeof window.agGrid === "undefined") {
      logger.error(
        "agGrid is not defined. Resources may not have loaded correctly."
      );
      this.showToast(
        "Erro",
        "AG-Grid não foi carregado corretamente.",
        "error"
      );
      return;
    }

    // Force reference to the global agGrid object
    const gridLib = window.agGrid;

    // Find the grid container element using data-id attribute
    const gridContainer = this.template.querySelector('div[data-id="agGrid"]');
    logger.info("Grid container element:", gridContainer);

    if (!gridContainer) {
      logger.error("Grid container not found in the DOM");
      this.showToast("Erro", "Container do grid não encontrado.", "error");
      return;
    }

    // Set the column definitions based on opportunity data
    this._columnDefs = this.getOpportunityColumnDefs();

    if (!this.resourcesLoaded) {
      logger.error("Resources not loaded yet, cannot initialize grid");
      return;
    }

    try {
      // Log what's available in the global context
      logger.info("agGrid type:", typeof window.agGrid);
      if (typeof window.agGrid === "object") {
        logger.info("agGrid object keys:", Object.keys(window.agGrid));
      }

      // Try multiple initialization approaches for different AG-Grid versions
      logger.info(
        "Trying to initialize grid with options:",
        JSON.stringify(this.gridOptions)
      );

      try {
        // Approach 1: Direct module initialization (newer versions)
        if (typeof window.agGrid === "function") {
          logger.info("Trying direct function initialization");
          window.agGrid(gridContainer, this.gridOptions);
        }
        // Approach 2: createGrid method (some versions) - most common in v33+
        else if (
          window.agGrid &&
          typeof window.agGrid.createGrid === "function"
        ) {
          logger.info("Trying createGrid method with legacy theme");
          // The createGrid method returns the grid instance
          const gridInstance = window.agGrid.createGrid(
            gridContainer,
            this.gridOptions
          );

          // Store grid API references directly from the returned grid instance
          if (gridInstance && gridInstance.api) {
            this.gridApi = gridInstance.api;
            this.columnApi = gridInstance.columnApi;
            logger.info("Grid APIs successfully obtained from grid instance");
          }
        }
        // Approach 3: Grid constructor (older versions)
        else if (window.agGrid && typeof window.agGrid.Grid === "function") {
          logger.info("Trying Grid constructor");
          new window.agGrid.Grid(gridContainer, this.gridOptions);
        }
        // Approach 4: Try to access CommonJS module pattern
        else if (window.agGrid && window.agGrid.default) {
          logger.info("Trying CommonJS module pattern");
          if (typeof window.agGrid.default === "function") {
            window.agGrid.default(gridContainer, this.gridOptions);
          } else if (typeof window.agGrid.default.Grid === "function") {
            new window.agGrid.default.Grid(gridContainer, this.gridOptions);
          }
        } else {
          throw new Error("Could not find valid AG-Grid initialization method");
        }

        logger.info("Grid initialization appears successful");
      } catch (initError) {
        logger.error("Error during grid initialization attempt:", initError);

        // One last fallback: manually create the grid structure
        try {
          logger.info("Trying manual grid creation fallback");
          // Create a simple table as fallback
          const table = document.createElement("table");
          table.className = "fallback-grid";
          table.style.width = "100%";
          table.style.borderCollapse = "collapse";

          // Create header
          const thead = document.createElement("thead");
          const headerRow = document.createElement("tr");
          this.columnDefinitions.forEach((col) => {
            const th = document.createElement("th");
            th.textContent = col.headerName;
            th.style.padding = "8px";
            th.style.borderBottom = "2px solid #ddd";
            th.style.textAlign = "left";
            headerRow.appendChild(th);
          });
          thead.appendChild(headerRow);
          table.appendChild(thead);

          // Create body with data
          const tbody = document.createElement("tbody");
          this.rowData.forEach((row) => {
            const tr = document.createElement("tr");
            this.columnDefinitions.forEach((col) => {
              const td = document.createElement("td");
              td.textContent = row[col.field] || "";
              td.style.padding = "8px";
              td.style.borderBottom = "1px solid #ddd";
              tr.appendChild(td);
            });
            tbody.appendChild(tr);
          });
          table.appendChild(tbody);

          // Clear container and append table
          gridContainer.innerHTML = "";
          gridContainer.appendChild(table);

          logger.info("Fallback table created successfully");
        } catch (fallbackError) {
          logger.error("Even fallback creation failed:", fallbackError);
        }
      }

      // Force a small delay to allow the grid to render
      setTimeout(() => {
        logger.info("Grid rendering check after timeout");
        if (this.gridApi) {
          this.gridApi.sizeColumnsToFit();
          logger.info("Resized columns to fit");
        }
      }, 100);

      // Set initialization flag - the APIs may be available directly from gridOptions
      // or from the grid instance returned by createGrid (handled above)
      this.gridInitialized = true;

      // If we haven't already captured the APIs from a returned grid instance, try from gridOptions
      if (!this.gridApi && this.gridOptions.api) {
        this.gridApi = this.gridOptions.api;
        this.columnApi = this.gridOptions.columnApi;
        logger.info("Grid API successfully obtained from gridOptions");
      }

      // Log API availability status
      if (this.gridApi) {
        logger.info("Grid API is available and ready to use");
      } else {
        logger.info(
          "Grid API not immediately available - this is normal for some initialization patterns"
        );
      }

      logger.info("Grid initialization complete");
    } catch (error) {
      logger.error("Error during grid initialization:", error);
      if (error.message) logger.error("Error message:", error.message);
      if (error.stack) logger.error("Error stack:", error.stack);
    }
  }
}
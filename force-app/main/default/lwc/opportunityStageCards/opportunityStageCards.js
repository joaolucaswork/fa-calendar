import { LightningElement, api, track } from "lwc";

/**
 * Opportunity Stage Cards Component
 *
 * A reusable component that displays opportunity stages as interactive cards.
 * Each card shows the stage name, count of opportunities, and allows filtering.
 *
 * @author Reino Capital
 * @version 1.0
 */
export default class OpportunityStageCards extends LightningElement {
  // Public API properties
  @api opportunities = [];
  @api isLoading = false;
  @api selectedStage = null;

  // Private tracked properties
  @track stageCards = [];

  // Stage icon mapping
  stageIconMap = {
    "Reunião Agendada": "utility:user",
    "Primeira Reunião": "utility:event",
    "Devolutiva": "utility:comments",
    "Análise Contratual": "utility:contract_doc",
    "Convertido": "utility:answer",
    "Não evoluiu": "utility:ban"
  };
  // Lifecycle hooks
  connectedCallback() {
    // console.log("OpportunityStageCards connected");
    this.initializeComponent();
  }

  // Initialize component with default selection
  initializeComponent() {
    // Set default selected stage to first stage if none selected
    if (
      !this.selectedStage &&
      this._stageOptions &&
      this._stageOptions.length > 0
    ) {
      this.selectedStage = this._stageOptions[0].value;
      // console.log("Default stage selected:", this.selectedStage);

      // Apply default filter after a short delay to ensure grid is ready
      setTimeout(() => {
        this.dispatchStageFilterEvent(this.selectedStage);
      }, 100);
    }

    this.updateStageCards();
  }

  // Watch for changes in opportunities or stage options
  @api
  refreshCards() {
    this.updateStageCards();
  }

  // Handle stage options changes to initialize default selection
  @api
  set stageOptions(value) {
    this._stageOptions = value;

    // Initialize default selection when stage options are first loaded
    if (value && value.length > 0 && !this.selectedStage) {
      this.selectedStage = value[0].value;
      // console.log(
      //   "Stage options loaded, default stage selected:",
      //   this.selectedStage
      // );

      // Apply default filter
      setTimeout(() => {
        this.dispatchStageFilterEvent(this.selectedStage);
      }, 200);
    }

    this.updateStageCards();
  }

  get stageOptions() {
    return this._stageOptions;
  }

  // Private methods
  updateStageCards() {
    // Always show stage cards if stage options are available
    if (!this._stageOptions) {
      this.stageCards = [];
      return;
    }

    try {
      // Create stage cards with counts (show 0 if no opportunities loaded yet)
      this.stageCards = this._stageOptions.map((stage) => {
        const count = this.opportunities
          ? this.opportunities.filter((opp) => opp.stageName === stage.value)
              .length
          : 0;
        const isActive = this.selectedStage === stage.value;

        return {
          value: stage.value,
          label: stage.label,
          count: count,
          cardClass: isActive ? "stage-card-active" : "stage-card",
          tooltip: `${stage.label}: ${count} ${count === 1 ? "oportunidade" : "oportunidades"}`,
          icon: this.stageIconMap[stage.label] || "utility:opportunity"
        };
      });

      // console.log(
      //   "Stage cards updated:",
      //   this.stageCards.length,
      //   "cards created, selected stage:",
      //   this.selectedStage
      // );
    } catch (error) {
      console.error("Error updating stage cards:", error);
      this.stageCards = [];
    }
  }

  // Method removed - icons no longer used in simplified design

  // Event handlers
  handleStageCardClick(event) {
    const stageValue = event.currentTarget.dataset.stage;

    if (this.selectedStage === stageValue) {
      // If clicking on the already selected stage, clear the filter
      this.selectedStage = null;
      this.dispatchClearFilterEvent();
    } else {
      // Select new stage and apply filter
      this.selectedStage = stageValue;
      this.dispatchStageFilterEvent(stageValue);
    }

    // Update cards to reflect new selection
    this.updateStageCards();
  }

  // Method removed - "All Stages" functionality no longer available

  // Custom event dispatchers
  dispatchStageFilterEvent(stageValue) {
    const filterEvent = new CustomEvent("stagefilter", {
      detail: {
        stageValue: stageValue,
        stageName: this.getStageLabel(stageValue)
      }
    });
    this.dispatchEvent(filterEvent);
    // console.log("Stage filter event dispatched:", stageValue);
  }

  dispatchClearFilterEvent() {
    const clearEvent = new CustomEvent("clearfilter", {
      detail: {
        message: "All stage filters cleared"
      }
    });
    this.dispatchEvent(clearEvent);
    // console.log("Clear filter event dispatched");
  }

  // Helper methods
  getStageLabel(stageValue) {
    const stage = this._stageOptions?.find(
      (option) => option.value === stageValue
    );
    return stage ? stage.label : stageValue;
  }

  // Public API methods for parent component
  @api
  setSelectedStage(stageValue) {
    this.selectedStage = stageValue;
    this.updateStageCards();
  }

  @api
  clearSelection() {
    this.selectedStage = null;
    this.updateStageCards();
  }

  @api
  getSelectedStage() {
    return this.selectedStage;
  }

  // Automatic filtering after stage change
  @api applyAutomaticStageFilter(newStageValue) {
    // console.log("Applying automatic stage filter:", newStageValue);

    // Set the selected stage to the new stage
    this.selectedStage = newStageValue;

    // Update the cards to reflect the new selection
    this.updateStageCards();

    // Dispatch the filter event to update the AG-Grid    this.dispatchStageFilterEvent(newStageValue);

    // console.log("Automatic stage filter applied successfully");
  }
}
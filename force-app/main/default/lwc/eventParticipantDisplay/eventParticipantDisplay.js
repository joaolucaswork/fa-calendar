import { LightningElement, api, track, wire } from "lwc";
import getParticipantData from "@salesforce/apex/EventParticipantController.getParticipantData";
import getParticipantDataRealTime from "@salesforce/apex/EventParticipantController.getParticipantDataRealTime";

/**
 * Reusable component for displaying event participants with profile photos
 * Supports both compact and detailed display modes
 * @author Reino Capital
 * @last-modified 2025-01-14
 */
export default class EventParticipantDisplay extends LightningElement {
  // Input properties (using setters/getters for reactivity)
  _gestorName;
  _liderComercialName;
  _sdrName;
  @api displayMode = "compact"; // 'compact' or 'detailed'
  @api maxParticipants = 3; // Maximum participants to show before "+X more"
  @api showPhotos = false;
  @api showRoles = false;
  @api customClass = "";

  // Internal state
  @track participants = [];
  @track isLoading = false;
  @track error;
  @track refreshKey = 0; // Used to force wire refresh

  // Computed properties
  get participantNames() {
    const names = [];
    if (this._gestorName) names.push(this._gestorName);
    if (this._liderComercialName) names.push(this._liderComercialName);
    if (this._sdrName) names.push(this._sdrName);
    return names;
  }

  get hasParticipants() {
    return this.participantNames.length > 0;
  }

  get displayParticipants() {
    if (!this.participants || this.participants.length === 0) {
      return [];
    }

    if (this.displayMode === "compact" && this.maxParticipants > 0) {
      return this.participants.slice(0, this.maxParticipants);
    }

    return this.participants;
  }

  get remainingCount() {
    if (
      this.displayMode === "compact" &&
      this.participants.length > this.maxParticipants
    ) {
      return this.participants.length - this.maxParticipants;
    }
    return 0;
  }

  get showRemainingIndicator() {
    return this.remainingCount > 0;
  }

  get containerClass() {
    let classes = "participant-display";
    if (this.displayMode === "compact") {
      classes += " participant-display--compact";
    } else {
      classes += " participant-display--detailed";
    }
    if (this.customClass) {
      classes += ` ${this.customClass}`;
    }
    return classes;
  }

  get participantListClass() {
    return this.showPhotos
      ? "participant-list participant-list--with-photos"
      : "participant-list participant-list--text-only";
  }

  // Wire method to get participant data with refresh capability
  @wire(getParticipantData, { participantNames: "$participantNames" })
  wiredParticipantData({ error, data }) {
    this.isLoading = false;
    if (data) {
      this.participants = this.processParticipantData(data);
      this.error = undefined;
      // console.log(
      //   "EventParticipantDisplay: Loaded participants:",
      //   this.participants.length
      // );
    } else if (error) {
      this.error = error;
      this.participants = [];
      // console.error(
      //   "EventParticipantDisplay: Error loading participant data:",
      //   error
      // );
    }
  }

  // Property watchers to detect changes and trigger refresh
  @api
  set gestorName(value) {
    this._gestorName = value;
    this.handleParticipantChange();
  }
  get gestorName() {
    return this._gestorName;
  }

  @api
  set liderComercialName(value) {
    this._liderComercialName = value;
    this.handleParticipantChange();
  }
  get liderComercialName() {
    return this._liderComercialName;
  }

  @api
  set sdrName(value) {
    this._sdrName = value;
    this.handleParticipantChange();
  }
  get sdrName() {
    return this._sdrName;
  }

  // Lifecycle methods
  connectedCallback() {
    if (this.hasParticipants) {
      this.isLoading = true;
    }
  }

  // Helper methods
  processParticipantData(data) {
    if (!data || !Array.isArray(data)) {
      return [];
    }

    return data.map((participant) => {
      const processedParticipant = { ...participant };

      // Add role information
      if (this.showRoles) {
        if (participant.name === this._gestorName) {
          processedParticipant.role = "Gestor";
          processedParticipant.roleClass =
            "participant-role participant-role--gestor";
        } else if (participant.name === this._liderComercialName) {
          processedParticipant.role = "Líder Comercial";
          processedParticipant.roleClass =
            "participant-role participant-role--lider";
        } else if (participant.name === this._sdrName) {
          processedParticipant.role = "SDR";
          processedParticipant.roleClass =
            "participant-role participant-role--sdr";
        }
      }

      // Ensure photo URL is set
      if (!processedParticipant.photoUrl) {
        processedParticipant.photoUrl =
          "/img/userprofile/default_profile_45_v2.png";
      }

      return processedParticipant;
    });
  }

  // Event handlers
  handleImageError(event) {
    event.target.src = "/img/userprofile/default_profile_45_v2.png";
  }

  handleParticipantClick(event) {
    // Prevent event bubbling to parent card elements
    event.stopPropagation();
    event.preventDefault();

    // console.log(
    //   "EventParticipantDisplay: Participant clicked, event propagation stopped"
    // );

    const participantId = event.currentTarget.dataset.participantId;
    const participant = this.participants.find((p) => p.id === participantId);

    if (participant) {
      // Dispatch custom event for parent components to handle
      this.dispatchEvent(
        new CustomEvent("participantclick", {
          detail: {
            participant: participant,
            participantId: participantId,
            participantName: participant.name,
            triggerElement: event.currentTarget
          },
          bubbles: true,
          composed: true
        })
      );
    }
  }

  // Handle participant data changes
  handleParticipantChange() {
    // console.log(
    //   "EventParticipantDisplay: Participant data changed, triggering refresh"
    // );
    // Force wire refresh by incrementing refresh key
    this.refreshKey++;
    // The wire will automatically refresh when participantNames changes
  }

  // Public methods for parent components
  @api
  refreshParticipants() {
    // console.log("EventParticipantDisplay: Manual refresh requested");
    if (this.hasParticipants) {
      this.isLoading = true;

      // Use non-cacheable method for real-time updates
      getParticipantDataRealTime({ participantNames: this.participantNames })
        .then((data) => {
          this.participants = this.processParticipantData(data);
          this.error = undefined;
          // console.log("EventParticipantDisplay: Manual refresh completed");
        })
        .catch((error) => {
          this.error = error;
          this.participants = [];
          // console.error(
          //   "EventParticipantDisplay: Error during manual refresh:",
          //   error
          // );
        })
        .finally(() => {
          this.isLoading = false;
        });
    }
  }

  @api
  getParticipantCount() {
    return this.participants.length;
  }

  @api
  getParticipantNames() {
    return this.participants.map((p) => p.name);
  }
}
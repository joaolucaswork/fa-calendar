import { LightningElement, api, track } from "lwc";
import { loadScript } from "lightning/platformResourceLoader";
import getParticipantDetailsRealTime from "@salesforce/apex/ParticipantDetailsController.getParticipantDetailsRealTime";

// Static resources
import floatingUI from "@salesforce/resourceUrl/floatingUI";

// Floating UI static resource URL
const FLOATING_UI_SCRIPT_URL = floatingUI;

/**
 * Participant Details Modal Component
 * Displays comprehensive participant information and event participation history
 * Uses Floating UI for smart positioning like calendarioReino color picker modal
 * @author Reino Capital
 * @last-modified 2025-01-14
 */
export default class ParticipantDetailsModal extends LightningElement {
  // Public properties
  @api participantName;
  @api triggerElement; // The element that triggered the modal (for positioning)
  @api isVisible = false;

  // Internal state
  @track participantInfo = {};
  @track currentUpcomingEvents = [];
  @track pastEvents = [];
  @track isLoading = false;
  @track error;

  // Floating UI state
  floatingUICleanup = null;
  isFloatingUILoaded = false;

  // Debug properties
  renderCount = 0;
  lastRenderTime = null;

  // Computed properties
  get hasParticipantInfo() {
    return this.participantInfo && Object.keys(this.participantInfo).length > 0;
  }

  get hasCurrentUpcomingEvents() {
    return this.currentUpcomingEvents && this.currentUpcomingEvents.length > 0;
  }

  get hasPastEvents() {
    return this.pastEvents && this.pastEvents.length > 0;
  }

  get hasAnyEvents() {
    return this.hasCurrentUpcomingEvents || this.hasPastEvents;
  }

  get modalClass() {
    let classes = "participant-details-modal";
    if (this.isVisible) classes += " visible";

    // Track class changes for internal state management
    this._lastModalClass = classes;

    return classes;
  }

  get backdropClass() {
    return "modal-backdrop";
  }

  get headerClass() {
    return "modal-header";
  }

  get participantPhotoUrl() {
    return (
      this.participantInfo.fullPhotoUrl ||
      "/img/userprofile/default_profile_200_v2.png"
    );
  }

  get participantTitle() {
    return this.participantInfo.title || "Cargo não especificado";
  }

  get participantEmail() {
    return this.participantInfo.email || "Email não disponível";
  }

  get participantDepartment() {
    return this.participantInfo.department || "";
  }

  get upcomingEventsCount() {
    return this.currentUpcomingEvents.length;
  }

  get pastEventsCount() {
    return this.pastEvents.length;
  }

  // Lifecycle methods
  connectedCallback() {
    // console.log(
    //   "🔧 ParticipantDetailsModal: connectedCallback - Component mounted"
    // );

    // Load Floating UI library
    this.loadFloatingUI();

    // Add event listeners for ESC key and window resize
    document.addEventListener("keydown", this.handleKeyDown.bind(this));
    window.addEventListener("resize", this.handleWindowResize.bind(this));

    // Initialize mutation observer to detect DOM changes
    this.initializeMutationObserver();

    // Add global error listener to detect JavaScript errors
    this.initializeErrorListener();
  }

  disconnectedCallback() {
    // console.log(
    //   "🔧 ParticipantDetailsModal: disconnectedCallback - Component unmounted"
    // );

    // Clean up Floating UI
    this.cleanupFloatingUI();

    // Remove event listeners
    document.removeEventListener("keydown", this.handleKeyDown.bind(this));
    window.removeEventListener("resize", this.handleWindowResize.bind(this));

    // Disconnect mutation observer
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      // console.log("🔧 MutationObserver disconnected");
    }

    // Remove error listener
    if (this.errorHandler) {
      window.removeEventListener("error", this.errorHandler);
      // console.log("🔧 Global error listener removed");
    }

    // Stop visibility enforcement
    this.stopVisibilityEnforcement();
  }

  renderedCallback() {
    this.renderCount++;
    const currentTime = Date.now();
    const timeSinceLastRender = this.lastRenderTime
      ? currentTime - this.lastRenderTime
      : 0;
    this.lastRenderTime = currentTime;

    // console.log("🔧 ParticipantDetailsModal: renderedCallback", {
    //   renderCount: this.renderCount,
    //   timeSinceLastRender: timeSinceLastRender,
    //   isVisible: this.isVisible
    // });
  }

  // DOM Investigation Methods
  initializeMutationObserver() {
    if (typeof MutationObserver !== "undefined") {
      this.mutationObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          // console.log("🔧 DOM MUTATION DETECTED:", {
          //   type: mutation.type,
          //   target: mutation.target,
          //   addedNodes: mutation.addedNodes.length,
          //   removedNodes: mutation.removedNodes.length,
          //   attributeName: mutation.attributeName,
          //   oldValue: mutation.oldValue
          // });
        });
      });

      // Start observing
      this.mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeOldValue: true,
        attributeFilter: ["class", "style", "hidden"]
      });

      // console.log("🔧 MutationObserver initialized and observing DOM changes");
    }
  }

  initializeErrorListener() {
    this.errorHandler = (event) => {
      // console.log("🔧 JAVASCRIPT ERROR detected:", {
      //   message: event.message,
      //   filename: event.filename,
      //   lineno: event.lineno,
      //   colno: event.colno,
      //   error: event.error
      // });
    };

    window.addEventListener("error", this.errorHandler);
    // console.log("🔧 Global error listener initialized");
  }

  investigateModalState(modalElement) {
    if (!modalElement) {
      // console.log("🔧 CRITICAL: Modal element not found during investigation!");
      return;
    }

    // 1. Check computed styles
    const computedStyle = window.getComputedStyle(modalElement);
    // console.log("🔧 COMPUTED STYLES:", {
    //   opacity: computedStyle.opacity,
    //   visibility: computedStyle.visibility,
    //   display: computedStyle.display,
    //   position: computedStyle.position,
    //   zIndex: computedStyle.zIndex,
    //   transform: computedStyle.transform
    // });

    // 2. Check positioning and viewport
    const rect = modalElement.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    // console.log("🔧 POSITIONING:", {
    //   rect: {
    //     top: rect.top,
    //     left: rect.left,
    //     width: rect.width,
    //     height: rect.height
    //   },
    //   viewport: viewport,
    //   isInViewport: {
    //     horizontal: rect.left >= 0 && rect.right <= viewport.width,
    //     vertical: rect.top >= 0 && rect.bottom <= viewport.height
    //   }
    // });

    // 3. Check parent containers
    let parent = modalElement.parentElement;
    let parentChain = [];
    while (parent && parent !== document.body) {
      const parentStyle = window.getComputedStyle(parent);
      parentChain.push({
        tagName: parent.tagName,
        className: parent.className,
        display: parentStyle.display,
        visibility: parentStyle.visibility,
        opacity: parentStyle.opacity,
        overflow: parentStyle.overflow
      });
      parent = parent.parentElement;
    }
    // console.log("🔧 PARENT CHAIN:", parentChain);

    // 4. Check for overlapping elements
    const elementAtPosition = document.elementFromPoint(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2
    );
    // console.log("🔧 ELEMENT AT MODAL CENTER:", {
    //   element: elementAtPosition,
    //   isModal:
    //     elementAtPosition === modalElement ||
    //     modalElement.contains(elementAtPosition),
    //   tagName: elementAtPosition?.tagName,
    //   className: elementAtPosition?.className
    // });

    // 5. Check inline styles
    // console.log("🔧 INLINE STYLES:", modalElement.style.cssText);

    // 6. Check classes
    // console.log("🔧 CSS CLASSES:", modalElement.className);

    // 7. Check if element is actually visible to user
    const isVisible =
      modalElement.offsetWidth > 0 && modalElement.offsetHeight > 0;
    // console.log("🔧 ELEMENT VISIBILITY:", {
    //   offsetWidth: modalElement.offsetWidth,
    //   offsetHeight: modalElement.offsetHeight,
    //   isActuallyVisible: isVisible
    // });
  }

  // Public methods
  @api
  showModal(participantName, triggerElement) {
    // console.log(
    //   "🔧 ParticipantDetailsModal: Showing modal for",
    //   participantName
    // );
    // console.log("🔧 Modal state at showModal start:", {
    //   isVisible: this.isVisible
    // });

    this.participantName = participantName;
    this.triggerElement = triggerElement;
    this.error = null;

    // Set visible first to render the modal
    this.isVisible = true;

    // Wait for DOM to render, then position with Floating UI
    setTimeout(() => {
      this.setupFloatingUIPositioning();
    }, 50);

    // Load participant details
    this.loadParticipantDetails();

    // Recalculate position after content loads
    setTimeout(() => {
      // console.log("🔧 Recalculating position after content load");
      this.recalculatePosition();
    }, 200);
  }

  @api
  hideModal() {
    // console.log("🔧 ParticipantDetailsModal: === HIDING MODAL ===");
    // console.log("🔧 Modal state before hiding:", {
    //   isVisible: this.isVisible
    // });

    // Clean up Floating UI positioning
    this.cleanupFloatingUI();

    this.isVisible = false;
    this.participantInfo = {};
    this.currentUpcomingEvents = [];
    this.pastEvents = [];
    this.error = null;

    // console.log("🔧 Modal state after hiding:", {
    //   isVisible: this.isVisible
    // });

    // Dispatch close event
    this.dispatchEvent(new CustomEvent("modalclose"));
    // console.log("🔧 ParticipantDetailsModal: === MODAL HIDDEN ===");
  }

  // Event handlers
  handleKeyDown(event) {
    if (event.key === "Escape" && this.isVisible) {
      this.hideModal();
    }
  }

  handleWindowResize() {
    // Floating UI handles resize automatically via autoUpdate
    // No manual intervention needed
    // console.log("🔧 ParticipantDetailsModal: Window resized - Floating UI handling automatically");
  }

  handleBackdropClick(event) {
    // console.log("🔧 handleBackdropClick: CALLED", {
    //   isVisible: this.isVisible,
    //   targetEqualsCurrentTarget: event.target === event.currentTarget,
    //   target: event.target,
    //   currentTarget: event.currentTarget
    // });

    // Close modal when clicking on backdrop
    if (event.target === event.currentTarget) {
      // console.log("🔧 handleBackdropClick: Closing modal (backdrop clicked)");
      this.hideModal();
    } else {
      // console.log("🔧 handleBackdropClick: NOT closing modal", {
      //   reason: "target !== currentTarget"
      // });
    }
  }

  handleCloseClick() {
    this.hideModal();
  }

  handleEventClick(event) {
    const eventId = event.currentTarget.dataset.eventId;
    // console.log("ParticipantDetailsModal: Event clicked:", eventId);

    // Dispatch event for parent to handle (e.g., open appointment editor)
    this.dispatchEvent(
      new CustomEvent("eventclick", {
        detail: {
          eventId: eventId,
          participantName: this.participantName
        }
      })
    );
  }

  // Floating UI methods
  async loadFloatingUI() {
    try {
      if (!this.isFloatingUILoaded) {
        await loadScript(this, FLOATING_UI_SCRIPT_URL);
        await this.waitForGlobal("FloatingUIDOM");
        this.isFloatingUILoaded = true;
        // console.log("🔧 Floating UI loaded successfully");
      }
    } catch (error) {
      console.error("🔧 Error loading Floating UI:", error);
      this.isFloatingUILoaded = false;
    }
  }

  waitForGlobal(globalName) {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 50;
      const checkInterval = 100;

      const checkGlobal = () => {
        attempts++;
        if (window[globalName]) {
          resolve(window[globalName]);
        } else if (attempts >= maxAttempts) {
          reject(new Error(`Global ${globalName} not found after ${maxAttempts} attempts`));
        } else {
          setTimeout(checkGlobal, checkInterval);
        }
      };

      checkGlobal();
    });
  }

  async setupFloatingUIPositioning() {
    if (!this.triggerElement || !this.isVisible) {
      console.warn("🔧 ParticipantDetailsModal: Missing triggerElement or modal not visible");
      return;
    }

    // Wait for modal to be rendered
    await new Promise(resolve => setTimeout(resolve, 50));

    const modal = this.template.querySelector('.participant-details-modal');
    if (!modal) {
      console.error("🔧 ParticipantDetailsModal: Modal element not found in DOM");
      return;
    }

    if (!window.FloatingUIDOM) {
      console.error("🔧 ParticipantDetailsModal: Floating UI library not loaded");
      return;
    }

    // console.log("🔧 ParticipantDetailsModal: Setting up Floating UI positioning");
    // console.log("🔧 Trigger element:", this.triggerElement);
    // console.log("🔧 Modal element:", modal);

    this.setupFloatingUI(modal);
  }

  setupFloatingUI(modal) {
    try {
      const { computePosition, flip, shift, offset, autoUpdate, hide } = window.FloatingUIDOM;

      // Validate that all required functions are available
      if (!computePosition || !flip || !shift || !offset || !autoUpdate || !hide) {
        console.error("🔧 ParticipantDetailsModal: Missing Floating UI functions");
        this.fallbackPositioning(modal);
        return;
      }

      // Clean up any existing auto-update
      this.cleanupFloatingUI();

      // Set up auto-updating position with smart placement
      this.floatingUICleanup = autoUpdate(
        this.triggerElement,
        modal,
        async () => {
          try {
            const { x, y, placement } = await computePosition(
              this.triggerElement,
              modal,
              {
                placement: 'right-start', // Start with right to avoid covering trigger
                middleware: [
                  offset(20), // Offset from trigger element
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
                    padding: 20,     // Padding from viewport edges
                    crossAxis: true, // Allow shifting on cross axis
                    limiter: 'auto'  // Auto limit shifting
                  }),
                  hide() // Hide if no good position is available
                ]
              }
            );

            // Apply modal position and make visible
            Object.assign(modal.style, {
              left: `${x}px`,
              top: `${y}px`,
              visibility: 'visible'
            });

            // Debug: Log placement for troubleshooting
            // console.log('🔧 ParticipantDetailsModal: Positioned at', { x, y, placement });
          } catch (positionError) {
            console.error('🔧 ParticipantDetailsModal: Error in computePosition:', positionError);
            // Fallback positioning
            this.fallbackPositioning(modal);
          }
        }
      );
    } catch (error) {
      console.error('🔧 ParticipantDetailsModal: Error setting up Floating UI:', error);
      // Fallback positioning
      this.fallbackPositioning(modal);
    }
  }

  cleanupFloatingUI() {
    if (this.floatingUICleanup) {
      this.floatingUICleanup();
      this.floatingUICleanup = null;
      // console.log("🔧 Floating UI cleanup completed");
    }
  }

  fallbackPositioning(modal) {
    console.log('🔧 ParticipantDetailsModal: Using fallback positioning');

    if (!this.triggerElement) {
      // Center the modal if no trigger element
      Object.assign(modal.style, {
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        visibility: 'visible'
      });
      return;
    }

    // Position relative to trigger element
    const triggerRect = this.triggerElement.getBoundingClientRect();
    const modalRect = modal.getBoundingClientRect();

    // Try to position to the right of the trigger
    let left = triggerRect.right + 20;
    let top = triggerRect.top;

    // Check if modal would go off-screen and adjust
    if (left + modalRect.width > window.innerWidth) {
      left = triggerRect.left - modalRect.width - 20; // Position to the left
    }

    if (top + modalRect.height > window.innerHeight) {
      top = window.innerHeight - modalRect.height - 20; // Move up
    }

    if (top < 20) {
      top = 20; // Don't go above viewport
    }

    Object.assign(modal.style, {
      left: `${left}px`,
      top: `${top}px`,
      visibility: 'visible'
    });

    console.log('🔧 ParticipantDetailsModal: Fallback positioned at', { left, top });
  }

  // Helper methods
  loadParticipantDetails() {
    if (!this.participantName) {
      this.error = "Nome do participante é obrigatório";
      return;
    }

    this.isLoading = true;
    this.error = null;

    getParticipantDetailsRealTime({ participantName: this.participantName })
      .then((result) => {
        // console.log(
        //   "ParticipantDetailsModal: Received participant details:",
        //   result
        // );

        if (result.success) {
          this.participantInfo = result.participantInfo || {};

          const eventParticipation = result.eventParticipation || {};
          this.currentUpcomingEvents = this.processEventsForDisplay(
            eventParticipation.currentUpcomingEvents || []
          );
          this.pastEvents = this.processEventsForDisplay(
            eventParticipation.pastEvents || []
          );

          // console.log(
          //   "ParticipantDetailsModal: Loaded",
          //   this.currentUpcomingEvents.length,
          //   "upcoming and",
          //   this.pastEvents.length,
          //   "past events"
          // );
        } else {
          this.error =
            result.errorMessage || "Erro ao carregar detalhes do participante";
        }
      })
      .catch((error) => {
        console.error(
          "ParticipantDetailsModal: Error loading participant details:",
          error
        );
        this.error =
          "Erro ao carregar detalhes do participante: " +
          (error.body?.message || error.message);
      })
      .finally(() => {
        this.isLoading = false;
      });
  }



  formatEventDate(dateTimeString) {
    try {
      const date = new Date(dateTimeString);
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      if (date.toDateString() === today.toDateString()) {
        return "Hoje";
      } else if (date.toDateString() === tomorrow.toDateString()) {
        return "Amanhã";
      } else {
        return date.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric"
        });
      }
    } catch (error) {
      return "Data inválida";
    }
  }

  getEventStatusBadge(event) {
    if (event.statusReuniao) {
      switch (event.statusReuniao) {
        case "Reuniao aconteceu":
          return { class: "status-badge status-success", text: "Realizada" };
        case "Reuniao não aconteceu":
          return { class: "status-badge status-error", text: "Não realizada" };
        case "Cancelado":
          return { class: "status-badge status-warning", text: "Cancelada" };
        case "Adiado":
          return { class: "status-badge status-info", text: "Adiada" };
        case "Reagendado":
          return { class: "status-badge status-info", text: "Reagendada" };
        default:
          return null;
      }
    }

    if (event.isUpcoming) {
      return { class: "status-badge status-upcoming", text: "Agendada" };
    }

    return null;
  }

  getRoleBadgeClass(role) {
    switch (role) {
      case "Gestor":
        return "role-badge role-gestor";
      case "Líder Comercial":
        return "role-badge role-lider";
      case "SDR":
        return "role-badge role-sdr";
      default:
        return "role-badge role-default";
    }
  }

  processEventsForDisplay(events) {
    return events.map((event) => {
      const processedEvent = { ...event };

      // Add status badge information
      processedEvent.statusBadge = this.getEventStatusBadge(event);

      // Add role badge class
      processedEvent.roleBadgeClass = this.getRoleBadgeClass(
        event.participantRole
      );

      return processedEvent;
    });
  }

  handleImageError(event) {
    event.target.src = "/img/userprofile/default_profile_200_v2.png";
  }

  handleModalClick(event) {
    // Prevent modal from closing when clicking inside the modal content
    event.stopPropagation();
  }

  /**
   * Recalculate modal position after content has loaded
   * Floating UI handles this automatically via autoUpdate
   */
  recalculatePosition() {
    if (this.floatingUICleanup && this.isVisible) {
      // Floating UI handles positioning automatically via autoUpdate
      // console.log("🔧 ParticipantDetailsModal: Position recalculation triggered");
    } else if (this.isVisible) {
      // If Floating UI isn't set up yet, try to set it up now
      // console.log("🔧 ParticipantDetailsModal: Floating UI not set up, attempting setup");
      this.setupFloatingUIPositioning();
    }
  }
}
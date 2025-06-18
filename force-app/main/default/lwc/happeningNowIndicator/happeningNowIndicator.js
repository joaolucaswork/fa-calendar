/**
 * HappeningNowIndicator LWC Component
 * Reusable component to display "Acontecendo Agora" (Happening Now) indicator
 * for events currently in progress
 */
import { LightningElement, api, track } from "lwc";
import isEventHappeningNow from "@salesforce/apex/HappeningNowController.isEventHappeningNow";

export default class HappeningNowIndicator extends LightningElement {
  /**
   * Private properties for datetime values
   */
  _startDateTime;
  _endDateTime;

  /**
   * Event start date/time (ISO string or Date object)
   */
  @api
  get startDateTime() {
    return this._startDateTime;
  }
  set startDateTime(value) {
    this._startDateTime = value;
    // Refresh status when start time changes
    if (this.template && this.template.host) {
      setTimeout(() => this.checkIfHappening(), 10);
    }
  }

  /**
   * Event end date/time (ISO string or Date object)
   */
  @api
  get endDateTime() {
    return this._endDateTime;
  }
  set endDateTime(value) {
    this._endDateTime = value;
    // Refresh status when end time changes
    if (this.template && this.template.host) {
      setTimeout(() => this.checkIfHappening(), 10);
    }
  }

  /**
   * Custom CSS class to apply to the indicator
   */
  @api customClass = "";

  /**
   * Whether to show the indicator even if not happening now (for testing)
   */
  @api forceShow = false;

  /**
   * Whether to use server-side validation (default: false, uses client-side)
   */
  @api useServerValidation = false;

  /**
   * Custom text to display (default: "Acontecendo Agora")
   */
  @api customText = "Acontecendo Agora";

  /**
   * Whether to show pulse animation (default: true)
   */
  @api showAnimation;

  /**
   * Size variant: 'small', 'medium', 'large' (default: 'medium')
   */
  @api size = "medium";

  /**
   * Event cancellation reason/status - if set to 'Cancelado', 'Adiado', or 'Reagendado',
   * the indicator will be hidden even if the event is currently happening
   */
  @api cancellationReason;

  /**
   * Tracked properties
   */
  @track isHappening = false;
  @track isLoading = false;
  @track error = null;

  /**
   * Lifecycle hook - component connected
   */
  connectedCallback() {
    this.checkIfHappening();

    // Set up periodic refresh every 30 seconds
    this.refreshInterval = setInterval(() => {
      this.checkIfHappening();
    }, 30000);

    // Add event listener for visibility changes to refresh when tab becomes active
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
  }

  /**
   * Lifecycle hook - component disconnected
   */
  disconnectedCallback() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    // Remove event listener
    if (this.handleVisibilityChange) {
      document.removeEventListener(
        "visibilitychange",
        this.handleVisibilityChange
      );
    }
  }

  /**
   * Check if the event is currently happening
   * Considers both time range and cancellation status
   */
  async checkIfHappening() {
    try {
      this.error = null;

      if (this.forceShow) {
        this.isHappening = true;
        return;
      }

      if (!this.startDateTime || !this.endDateTime) {
        this.isHappening = false;
        return;
      }

      // Check if event is cancelled/postponed/rescheduled
      if (this.isCancelledEvent()) {
        this.isHappening = false;
        return;
      }

      if (this.useServerValidation) {
        await this.checkServerSide();
      } else {
        this.checkClientSide();
      }
    } catch (error) {
      console.error(
        "HappeningNowIndicator: Error checking if happening:",
        error
      );
      this.error =
        error.body?.message ||
        error.message ||
        "Erro ao verificar status do evento";
      this.isHappening = false;
    }
  }

  /**
   * Client-side validation (faster, no server round-trip)
   */
  checkClientSide() {
    try {
      const now = new Date();
      const start = new Date(this.startDateTime);
      const end = new Date(this.endDateTime);

      // Validate dates
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        console.warn("HappeningNowIndicator: Invalid date format");
        this.isHappening = false;
        return;
      }

      // Event is happening if current time is between start and end (inclusive)
      this.isHappening = now >= start && now <= end;

      // console.log("HappeningNowIndicator: Client-side check -", {
      //   now: now.toISOString(),
      //   start: start.toISOString(),
      //   end: end.toISOString(),
      //   isHappening: this.isHappening
      // });
    } catch (error) {
      console.error(
        "HappeningNowIndicator: Client-side validation error:",
        error
      );
      this.isHappening = false;
    }
  }

  /**
   * Server-side validation (more accurate for timezone handling)
   */
  async checkServerSide() {
    try {
      this.isLoading = true;

      const start = new Date(this.startDateTime);
      const end = new Date(this.endDateTime);

      const result = await isEventHappeningNow({
        startDateTime: start,
        endDateTime: end
      });

      this.isHappening = result;

      // console.log("HappeningNowIndicator: Server-side check result:", result);
    } catch (error) {
      console.error(
        "HappeningNowIndicator: Server-side validation error:",
        error
      );
      this.isHappening = false;
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Check if the event is cancelled, postponed, or rescheduled
   * @returns {boolean} True if event should be hidden due to cancellation status
   */
  isCancelledEvent() {
    if (!this.cancellationReason) {
      return false;
    }

    const cancellationReasons = ['Cancelado', 'Adiado', 'Reagendado'];
    return cancellationReasons.includes(this.cancellationReason);
  }

  /**
   * Get the effective showAnimation value (default: true)
   */
  get effectiveShowAnimation() {
    return this.showAnimation !== false; // Default to true unless explicitly set to false
  }

  /**
   * Get computed CSS classes for the indicator
   */
  get indicatorClasses() {
    let classes = "happening-now-indicator";

    // Add size class
    classes += ` happening-now-${this.size}`;

    // Add animation class
    if (this.effectiveShowAnimation) {
      classes += " happening-now-animated";
    }

    // Add custom class
    if (this.customClass) {
      classes += ` ${this.customClass}`;
    }

    return classes;
  }

  /**
   * Get computed CSS classes for the text
   */
  get textClasses() {
    let classes = "happening-now-text";
    classes += ` happening-now-text-${this.size}`;
    return classes;
  }

  /**
   * Whether to show the indicator
   */
  get shouldShow() {
    return this.isHappening && !this.error;
  }

  /**
   * Whether to show loading state
   */
  get shouldShowLoading() {
    return this.isLoading && this.useServerValidation;
  }

  /**
   * Whether to show error state
   */
  get shouldShowError() {
    return this.error && !this.isLoading;
  }

  /**
   * Get accessibility label
   */
  get accessibilityLabel() {
    return `Evento ${this.customText.toLowerCase()}`;
  }

  /**
   * Public method to manually refresh the status
   */
  @api
  refresh() {
    this.checkIfHappening();
  }

  /**
   * Public method to force show/hide the indicator
   */
  @api
  setForceShow(show) {
    this.forceShow = show;
    this.checkIfHappening();
  }

  /**
   * Handle manual refresh button click (if error state)
   */
  handleRefresh() {
    this.refresh();
  }

  /**
   * Handle visibility change (when tab becomes active/inactive)
   */
  handleVisibilityChange() {
    // Refresh when tab becomes visible again
    if (!document.hidden) {
      // console.log(
      //   "HappeningNowIndicator: Tab became visible, refreshing status"
      // );
      this.checkIfHappening();
    }
  }
}
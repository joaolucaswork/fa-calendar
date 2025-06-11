import { LightningElement, api, track, wire } from "lwc";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import { getRecord } from "lightning/uiRecordApi";
import USER_ID from "@salesforce/user/Id";
import USER_NAME_FIELD from "@salesforce/schema/User.Name";
import USER_EMAIL_FIELD from "@salesforce/schema/User.Email";
import createTeamsMeetingApex from "@salesforce/apex/TeamsIntegrationController.createTeamsMeeting";

/**
 * @description Teams Link Generator Component
 * Encapsulates all Microsoft Teams link generation functionality
 * @author Reino Capital
 * @last-modified 2025-01-14
 */
export default class TeamsLinkGenerator extends LightningElement {
  // Public API properties for meeting data
  @api subject = "";
  @api startDateTime = "";
  @api endDateTime = "";
  @api participants = [];
  @api organizer = {};

  // Appointment type with watcher
  @api
  get appointmentType() {
    return this._appointmentType;
  }
  set appointmentType(value) {
    const oldValue = this._appointmentType;
    this._appointmentType = value;

    // Handle appointment type changes
    if (oldValue !== value) {
      this.handleAppointmentTypeChange(oldValue, value);
    }
  }
  _appointmentType = "";

  // Public API property for the generated link
  @api linkReuniao = "";

  // Internal state management
  @track isGeneratingTeamsLink = false;
  @track isLoading = false;

  // Private property to track previous appointment type
  _previousAppointmentType = "";

  // User data storage
  @track userData = null;

  // Wire service to get current user information
  @wire(getRecord, {
    recordId: USER_ID,
    fields: [USER_NAME_FIELD, USER_EMAIL_FIELD]
  })
  currentUser({ error, data }) {
    if (data) {
      console.log("User data loaded:", data);
      this.userData = data;
    } else if (error) {
      console.error("Error loading user data:", error);
      this.userData = null;
    }
  }

  /**
   * Component lifecycle - setup watchers
   */
  connectedCallback() {
    this._previousAppointmentType = this.appointmentType;

    // Load event data if eventId is provided
    if (this.eventId && !this.eventDataLoaded) {
      this.loadEventData();
    }
  }

  /**
   * Handle appointment type changes via property setter
   */
  handleAppointmentTypeChange(oldValue, newValue) {
    try {
      if (newValue === "Reunião Online" && oldValue !== "Reunião Online") {
        // Auto-generate Teams link when switching to online meeting
        setTimeout(() => {
          this.generateTeamsLink();
        }, 300);
      } else if (
        newValue !== "Reunião Online" &&
        oldValue === "Reunião Online"
      ) {
        // Clear Teams link when switching away from online meeting
        this.clearTeamsLink();
      }
    } catch (error) {
      console.error("Error in handleAppointmentTypeChange:", error);
    }
  }

  /**
   * Component lifecycle - simplified
   */
  renderedCallback() {
    // Simplified - appointment type changes handled via property setter
  }

  /**
   * Check if meeting type is online
   */
  get isOnlineMeeting() {
    return this.appointmentType === "Reunião Online";
  }

  /**
   * Check if current link is a Teams link
   */
  get isTeamsLink() {
    if (!this.linkReuniao) return false;
    return (
      this.linkReuniao.includes("teams.microsoft.com") ||
      this.linkReuniao.includes("teams.live.com")
    );
  }

  /**
   * Generate Microsoft Teams meeting link automatically
   * Uses Microsoft Graph API integration for professional Teams meeting creation
   */
  async generateTeamsLink() {
    try {
      this.isGeneratingTeamsLink = true;
      this.isLoading = true;

      // Prepare meeting data for Teams creation
      const meetingData = {
        subject: this.subject || "Reunião Reino Capital",
        startDateTime: this.startDateTime,
        endDateTime: this.endDateTime,
        participants: this.participants || [],
        organizer: this.organizer || this.getCurrentUserInfo()
      };

      // Call Apex method to create Teams meeting via Microsoft Graph API
      const result = await this.createTeamsMeeting(meetingData);

      if (result.success) {
        this.linkReuniao = result.joinUrl;
        this.dispatchLinkGenerated(result.joinUrl);
        this.showToast(
          "Sucesso",
          "Link do Microsoft Teams gerado automaticamente",
          "success"
        );
      } else {
        // Fallback to manual Teams URL generation
        this.linkReuniao = this.generateManualTeamsUrl(meetingData);
        this.dispatchLinkGenerated(this.linkReuniao);
      }
    } catch (error) {
      console.error("Error generating Teams link:", error);

      // Fallback to manual Teams URL generation
      const meetingData = {
        subject: this.subject || "Reunião Reino Capital",
        startDateTime: this.startDateTime,
        endDateTime: this.endDateTime
      };
      this.linkReuniao = this.generateManualTeamsUrl(meetingData);
      this.dispatchLinkGenerated(this.linkReuniao);
      this.dispatchLinkError(error.message || "Erro na geração do link");
    } finally {
      this.isGeneratingTeamsLink = false;
      this.isLoading = false;
    }
  }

  /**
   * Create Teams meeting via Microsoft Graph API (Apex callout)
   */
  async createTeamsMeeting(meetingData) {
    try {
      return await createTeamsMeetingApex({
        meetingData: JSON.stringify(meetingData)
      });
    } catch (error) {
      console.warn("Teams integration not available:", error);
      return { success: false, error: "Teams integration not configured" };
    }
  }

  /**
   * Generate manual Teams URL as fallback
   */
  generateManualTeamsUrl(meetingData) {
    const baseUrl = "https://teams.microsoft.com/l/meeting/new";
    const params = new URLSearchParams();

    if (meetingData.subject) {
      params.append("subject", meetingData.subject);
    }

    if (meetingData.startDateTime) {
      params.append(
        "startTime",
        this.formatTeamsDateTime(meetingData.startDateTime)
      );
    }

    if (meetingData.endDateTime) {
      params.append(
        "endTime",
        this.formatTeamsDateTime(meetingData.endDateTime)
      );
    }

    // Add default content
    params.append("content", "Reunião criada através do sistema Reino Capital");

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Format datetime for Teams URL (ISO format with timezone)
   * Uses robust date handling similar to reinoAddToCalendar
   */
  formatTeamsDateTime(dateTimeStr) {
    if (!dateTimeStr) return "";

    try {
      // Handle different input formats
      let date;
      if (typeof dateTimeStr === "string") {
        // Parse ISO string or other formats
        date = new Date(dateTimeStr);
      } else if (dateTimeStr instanceof Date) {
        date = dateTimeStr;
      } else {
        // Try to convert to string first
        date = new Date(dateTimeStr.toString());
      }

      // Validate the date
      if (isNaN(date.getTime())) {
        console.error("Invalid date provided:", dateTimeStr);
        return "";
      }

      // Format for Brasília timezone (UTC-3) using robust method
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const day = date.getDate().toString().padStart(2, "0");
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");
      const seconds = date.getSeconds().toString().padStart(2, "0");

      // Return in ISO format with Brasília timezone
      return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}-03:00`;
    } catch (error) {
      console.error("Error formatting Teams datetime:", error);
      // Return current time as fallback
      const now = new Date();
      const year = now.getFullYear();
      const month = (now.getMonth() + 1).toString().padStart(2, "0");
      const day = now.getDate().toString().padStart(2, "0");
      const hours = now.getHours().toString().padStart(2, "0");
      const minutes = now.getMinutes().toString().padStart(2, "0");
      const seconds = now.getSeconds().toString().padStart(2, "0");

      return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}-03:00`;
    }
  }

  /**
   * Get current user information for Teams meeting organizer
   */
  getCurrentUserInfo() {
    // Use real user data from wire service
    if (this.userData) {
      return {
        name: this.userData.fields.Name?.value || "Reino Capital User",
        email: this.userData.fields.Email?.value || "user@reinocapital.com.br"
      };
    }

    // Fallback if user data not loaded yet
    return {
      name: "Reino Capital User",
      email: "user@reinocapital.com.br"
    };
  }

  /**
   * Handle manual Teams link regeneration
   */
  handleRegenerateTeamsLink() {
    if (this.isOnlineMeeting) {
      this.generateTeamsLink();
    }
  }

  /**
   * Handle testing Teams link by opening in new window
   */
  handleTestTeamsLink() {
    if (this.linkReuniao) {
      try {
        window.open(this.linkReuniao, "_blank");
      } catch (error) {
        console.error("Error opening Teams link:", error);
        this.showToast(
          "Erro",
          "Não foi possível abrir o link do Teams",
          "error"
        );
      }
    }
  }

  /**
   * Clear Teams link for non-online meetings
   */
  clearTeamsLink() {
    this.linkReuniao = "";
    this.dispatchLinkCleared();
  }

  /**
   * Public API method to trigger link generation
   */
  @api
  async generateLink() {
    if (this.isOnlineMeeting) {
      await this.generateTeamsLink();
    } else {
      this.clearTeamsLink();
    }
  }

  /**
   * Public API method to clear the link
   */
  @api
  clearLink() {
    this.clearTeamsLink();
  }

  /**
   * Update link property and dispatch event to parent
   */
  dispatchLinkGenerated(link) {
    // Update property directly
    try {
      this.linkReuniao = link || "";

      // Dispatch custom event with link data for parent component
      const linkEvent = new CustomEvent("linkgenerated", {
        detail: {
          link: this.linkReuniao,
          method: "teams"
        },
        bubbles: true,
        composed: true
      });
      this.dispatchEvent(linkEvent);

      console.log(
        "Teams link generated and event dispatched:",
        this.linkReuniao
      );
    } catch (error) {
      console.error("Error updating Teams link:", error);
    }
  }

  /**
   * Log link error (safe version without events)
   */
  dispatchLinkError(error) {
    // Just log the error instead of dispatching events
    console.warn("Teams link error:", error || "Unknown error");
  }

  /**
   * Log link cleared (safe version without events)
   */
  dispatchLinkCleared() {
    // Just log the action instead of dispatching events
    console.log("Teams link cleared");
  }

  /**
   * Show toast message
   */
  showToast(title, message, variant) {
    const event = new ShowToastEvent({
      title: title,
      message: message,
      variant: variant
    });
    this.dispatchEvent(event);
  }
}
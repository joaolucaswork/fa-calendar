import { LightningElement, api } from "lwc";
import {
  COLOR_MAPPINGS,
  BORDER_COLOR_MAPPINGS,
  COLOR_NAMES,
  STATUS_MAPPINGS,
  ROOM_MAPPINGS,
  COLOR_PICKER_OPTIONS,
  PRIORITY_LEVELS,
  DEFAULT_CATEGORY,
  DEFAULT_COLOR
} from "c/colorConstants";

// Import Apex methods for color operations
import saveEventCustomColor from "@salesforce/apex/CalendarioReinoController.saveEventCustomColor";
import saveEventCustomColorAndLink from "@salesforce/apex/CalendarioReinoController.saveEventCustomColorAndLink";
import saveEventMeetingStatus from "@salesforce/apex/CalendarioReinoController.saveEventMeetingStatus";
import saveEventMeetingOutcome from "@salesforce/apex/CalendarioReinoController.saveEventMeetingOutcome";

/**
 * @description Event Color Manager - Service component for calendar event color management
 * @author Reino Capital Development Team
 * @version 1.0.0
 *
 * Provides centralized color logic with clear priority hierarchy:
 * 1. Manual/Custom colors (highest priority)
 * 2. Status outcomes (aconteceu, cancelado, adiado, reagendado) - override room colors
 * 3. Room-based colors (medium priority)
 * 4. Default (sem-categoria)
 *
 * @example
 * // Usage in parent component
 * const colorManager = this.template.querySelector('c-event-color-manager');
 * const category = colorManager.getEventColorCategory(event);
 * const color = colorManager.getColorForCategory(category);
 */
export default class EventColorManager extends LightningElement {
  // ========================================
  // CONSTANTS & CONFIGURATION
  // ========================================

  /**
   * @description Color priority levels for clear hierarchy management
   * @readonly
   */
  static PRIORITY_LEVELS = PRIORITY_LEVELS;

  /**
   * @description Default category for uncategorized events
   * @readonly
   */
  static DEFAULT_CATEGORY = DEFAULT_CATEGORY;

  /**
   * @description Default color for uncategorized events
   * @readonly
   */
  static DEFAULT_COLOR = DEFAULT_COLOR;

  // ========================================
  // PUBLIC API METHODS
  // ========================================

  /**
   * @description Get color category for an event based on priority hierarchy
   * @param {Object} event - Event object with color-related properties
   * @param {string} [event.customColor] - Custom color hex value
   * @param {string} [event.statusReuniao] - Meeting status
   * @param {boolean} [event.reuniaoAconteceu] - Whether meeting happened
   * @param {string} [event.salaReuniao] - Meeting room assignment
   * @returns {string} Color category identifier
   * @public
   */
  @api
  getEventColorCategory(event) {
    if (!this._isValidEvent(event)) {
      return EventColorManager.DEFAULT_CATEGORY;
    }

    this._logEventProcessing(event);

    // Apply priority hierarchy
    return (
      this._getCustomColorCategory(event) ||
      this._getStatusColorCategory(event) ||
      this._getRoomColorCategory(event) ||
      EventColorManager.DEFAULT_CATEGORY
    );
  }

  // ========================================
  // PRIVATE HELPER METHODS - PRIORITY HIERARCHY
  // ========================================

  /**
   * @description Validate event object
   * @param {Object} event - Event to validate
   * @returns {boolean} True if event is valid
   * @private
   */
  _isValidEvent(event) {
    return event && typeof event === "object";
  }

  /**
   * @description Log event processing for debugging
   * @param {Object} event - Event being processed
   * @private
   */
  _logEventProcessing(event) {
    // console.log(
    //   `🎨 EventColorManager: Processing event ${event.id || "unknown"}`,
    //   {
    //     customColor: event.customColor,
    //     statusReuniao: event.statusReuniao,
    //     reuniaoAconteceu: event.reuniaoAconteceu,
    //     salaReuniao: event.salaReuniao
    //   }
    // );
  }

  /**
   * @description Get custom color category (Priority 1)
   * @param {Object} event - Event object
   * @returns {string|null} Custom color category or null
   * @private
   */
  _getCustomColorCategory(event) {
    if (!event.customColor) return null;

    const customColor = event.customColor.toLowerCase();
    const matchedCategory = COLOR_MAPPINGS.colorToCategory[customColor];

    if (matchedCategory) {
      // console.log(`🎨 Custom color matches category: ${matchedCategory}`);
      return matchedCategory;
    }

    // Truly custom color
    const colorKey = customColor.replace("#", "");
    // console.log(`🎨 Using custom color: personalizado-${colorKey}`);
    return `personalizado-${colorKey}`;
  }

  /**
   * @description Get status-based color category (Priority 2)
   * @param {Object} event - Event object
   * @returns {string|null} Status color category or null
   * @private
   */
  _getStatusColorCategory(event) {
    // High-priority status outcomes
    if (event.reuniaoAconteceu === true) {
      // console.log("🎯 Status: reuniaoAconteceu=true");
      return "aconteceu";
    }

    if (event.statusReuniao) {
      const statusCategory = this._mapStatusToCategory(event.statusReuniao);
      if (statusCategory) {
        // console.log(`🎯 Status: ${event.statusReuniao} → ${statusCategory}`);
        return statusCategory;
      }
    }

    // Low-priority: "não aconteceu" only if no room assigned
    if (event.reuniaoAconteceu === false && !event.salaReuniao) {
      // console.log("🎯 Status: reuniaoAconteceu=false (no room)");
      return "nao-aconteceu";
    }

    return null;
  }

  /**
   * @description Get room-based color category (Priority 3)
   * @param {Object} event - Event object
   * @returns {string|null} Room color category or null
   * @private
   */
  _getRoomColorCategory(event) {
    if (!event.salaReuniao) return null;

    const roomCategory = this._mapRoomToCategory(event.salaReuniao);
    if (roomCategory) {
      // console.log(`🏢 Room: ${event.salaReuniao} → ${roomCategory}`);
      return roomCategory;
    }

    return null;
  }

  // ========================================
  // PRIVATE MAPPING METHODS
  // ========================================

  /**
   * @description Map status string to category
   * @param {string} status - Status string
   * @returns {string|null} Category or null
   * @private
   */
  _mapStatusToCategory(status) {
    return STATUS_MAPPINGS[status] || null;
  }

  /**
   * @description Map room string to category
   * @param {string} room - Room string
   * @returns {string|null} Category or null
   * @private
   */
  _mapRoomToCategory(room) {
    const roomValue = room.toLowerCase();
    return ROOM_MAPPINGS[roomValue] || null;
  }

  // ========================================
  // PUBLIC API METHODS - COLOR UTILITIES
  // ========================================

  /**
   * @description Get color hex value for a category
   * @param {string} categoryId - Color category identifier
   * @returns {string} Hex color value
   * @public
   */
  @api
  getColorForCategory(categoryId) {
    return (
      COLOR_MAPPINGS.categoryToColor[categoryId] ||
      EventColorManager.DEFAULT_COLOR
    );
  }

  /**
   * @description Get border color for background color
   * @param {string} backgroundColor - Background color hex value
   * @returns {string} Border color hex value
   * @public
   */
  @api
  getBorderColorForBackground(backgroundColor) {
    return (
      BORDER_COLOR_MAPPINGS[backgroundColor?.toUpperCase()] ||
      EventColorManager.DEFAULT_COLOR
    );
  }

  /**
   * @description Get descriptive name for color
   * @param {string} hexColor - Hex color value
   * @returns {string} Human-readable color name
   * @public
   */
  @api
  getColorDescriptiveName(hexColor) {
    if (!hexColor) return "Cor Desconhecida";

    return COLOR_NAMES[hexColor.toUpperCase()] || hexColor;
  }

  /**
   * @description Check if color is predefined
   * @param {string} hexColor - Hex color value
   * @returns {boolean} True if color is predefined
   * @public
   */
  @api
  isPredefinedColor(hexColor) {
    if (!hexColor) return false;
    return COLOR_MAPPINGS.colorToCategory.hasOwnProperty(
      hexColor.toLowerCase()
    );
  }

  /**
   * @description Get all available colors for picker
   * @returns {Array<Object>} Array of color objects with label, value, and category
   * @public
   */
  @api
  getAvailableColors() {
    return COLOR_PICKER_OPTIONS;
  }

  /**
   * @description Get color for a specific status value
   * @param {string} status - The meeting status value
   * @returns {string|null} Hex color code or null
   * @public
   */
  @api
  getColorForStatus(status) {
    if (!status) return null;

    const statusCategory = this._mapStatusToCategory(status);
    return statusCategory ? this.getColorForCategory(statusCategory) : null;
  }

  /**
   * @description Get predefined color mappings for compatibility
   * @returns {Object} Color mappings object
   * @public
   */
  @api
  getPredefinedColorMappings() {
    return COLOR_MAPPINGS;
  }

  /**
   * @description Get category color for an occupied slot based on event data
   * @param {Object} conflict - Conflict data object
   * @returns {string} Hex color value
   * @public
   */
  @api
  getCategoryColorForSlot(conflict) {
    // Create a temporary event object with the conflict data
    const tempEvent = {
      customColor: conflict.customColor,
      statusReuniao: conflict.statusReuniao,
      reuniaoAconteceu: conflict.reuniaoAconteceu,
      salaReuniao: conflict.salaReuniao
    };

    // Use existing color determination logic
    const colorCategory = this.getEventColorCategory(tempEvent);
    const predefinedColor = COLOR_MAPPINGS.categoryToColor[colorCategory];

    // Return the color or a default if none found
    return predefinedColor || DEFAULT_COLOR;
  }

  /**
   * @description Get the "Aconteceu" (meeting happened) color
   * @returns {string} Hex color value for meetings that happened
   * @public
   */
  @api
  getAconteceuColor() {
    return COLOR_MAPPINGS.categoryToColor["aconteceu"] || "#D6F3E4";
  }

  /**
   * @description Get custom color legend items from events
   * @param {Array} allEvents - Array of all events
   * @param {Array} activeColorFilters - Array of active filter IDs
   * @param {Function} getColorItemCssClass - Function to get CSS class for color items
   * @param {Function} getBorderColorForBackground - Function to get border color
   * @returns {Array} Array of custom color legend items
   * @public
   */
  @api
  getCustomColorLegendItems(
    allEvents,
    activeColorFilters = [],
    getColorItemCssClass = null,
    getBorderColorForBackground = null
  ) {
    if (!allEvents) return [];

    // Get predefined colors to exclude from custom color legend
    const predefinedColors = new Set(
      Object.keys(COLOR_MAPPINGS.colorToCategory)
    );

    // Collect all unique custom colors from events (excluding predefined colors)
    const customColors = new Map();

    allEvents.forEach((event) => {
      if (event.customColor) {
        const colorKey = event.customColor.toLowerCase();

        // Skip if this is a predefined color
        if (predefinedColors.has(colorKey)) {
          return;
        }

        if (!customColors.has(colorKey)) {
          customColors.set(colorKey, {
            color: event.customColor,
            count: 0,
            events: []
          });
        }
        customColors.get(colorKey).count++;
        customColors.get(colorKey).events.push(event);
      }
    });

    // Convert to legend items with descriptive names
    const customColorItems = [];

    customColors.forEach((colorData, colorKey) => {
      const colorId = `personalizado-${colorKey.replace("#", "")}`;
      const isActive = activeColorFilters.includes(colorId);

      // Get descriptive name for the color
      const descriptiveName = this.getColorDescriptiveName(colorData.color);

      // Get border color for styling
      const borderColor = getBorderColorForBackground
        ? getBorderColorForBackground(colorData.color)
        : this.getBorderColorForBackground(colorData.color);

      const colorItem = {
        id: colorId,
        color: colorData.color,
        label: descriptiveName,
        description: `Cor personalizada: ${descriptiveName} (${colorData.color})`,
        active: isActive,
        count: colorData.count,
        colorStyle: `background-color: ${colorData.color}; border: 1px solid ${borderColor};`,
        isCustomColor: true
      };

      // Add CSS class if function provided
      if (getColorItemCssClass) {
        colorItem.cssClass = getColorItemCssClass(colorItem);
      }

      customColorItems.push(colorItem);
    });

    return customColorItems;
  }

  /**
   * @description Get custom colors for the color picker
   * @param {Array} allEvents - Array of all events
   * @returns {Array} Array of custom color objects for picker
   * @public
   */
  @api
  getCustomColorsForPicker(allEvents) {
    if (!allEvents) return [];

    // Get predefined colors to exclude
    const predefinedColors = new Set(
      Object.keys(COLOR_MAPPINGS.colorToCategory)
    );

    // Collect unique custom colors
    const customColors = new Set();

    allEvents.forEach((event) => {
      if (event.customColor) {
        const colorKey = event.customColor.toLowerCase();

        // Skip predefined colors
        if (!predefinedColors.has(colorKey)) {
          customColors.add(event.customColor);
        }
      }
    });

    // Convert to picker format with descriptive names
    return Array.from(customColors).map((color) => ({
      value: color,
      label: this.getColorDescriptiveName(color),
      category: "custom"
    }));
  }

  // ========================================
  // COLOR OPERATIONS - SALESFORCE INTEGRATION
  // ========================================

  /**
   * @description Clear custom color and save meeting outcome to Salesforce
   * @param {string} eventId - The event ID
   * @param {boolean} meetingOutcome - The meeting outcome
   * @param {Function} onSuccess - Success callback
   * @param {Function} onError - Error callback
   * @public
   */
  @api
  clearCustomColorAndSaveOutcome(eventId, meetingOutcome, onSuccess, onError) {
    // First clear the custom color to allow status-based color to take effect
    saveEventCustomColor({
      eventId: eventId,
      customColor: null // Clear custom color
    })
      .then((colorResult) => {
        if (colorResult.success) {
          // Notify success of color clearing
          this._dispatchColorEvent("colorclear", {
            eventId: eventId,
            customColor: null
          });

          // Then save the meeting outcome
          this._saveMeetingOutcome(eventId, meetingOutcome, onSuccess, onError);
        } else {
          console.error(
            "🎯 EventColorManager: Error clearing custom color:",
            colorResult.error
          );
          // Still try to save the outcome even if color clear fails
          this._saveMeetingOutcome(eventId, meetingOutcome, onSuccess, onError);
        }
      })
      .catch((error) => {
        console.error(
          "🎯 EventColorManager: Error clearing custom color:",
          error
        );
        // Still try to save the outcome even if color clear fails
        this._saveMeetingOutcome(eventId, meetingOutcome, onSuccess, onError);
      });
  }

  /**
   * @description Clear custom color and save meeting status to Salesforce
   * @param {string} eventId - The event ID
   * @param {string} statusValue - The meeting status
   * @param {Function} onSuccess - Success callback
   * @param {Function} onError - Error callback
   * @public
   */
  @api
  clearCustomColorAndSaveStatus(eventId, statusValue, onSuccess, onError) {
    // First clear the custom color to allow status-based color to take effect
    saveEventCustomColor({
      eventId: eventId,
      customColor: null // Clear custom color
    })
      .then((colorResult) => {
        if (colorResult.success) {
          // Notify success of color clearing
          this._dispatchColorEvent("colorclear", {
            eventId: eventId,
            customColor: null
          });

          // Then save the meeting status
          this._saveMeetingStatus(eventId, statusValue, onSuccess, onError);
        } else {
          console.error(
            "🎯 EventColorManager: Error clearing custom color:",
            colorResult.error
          );
          // Still try to save the status even if color clear fails
          this._saveMeetingStatus(eventId, statusValue, onSuccess, onError);
        }
      })
      .catch((error) => {
        console.error(
          "🎯 EventColorManager: Error clearing custom color:",
          error
        );
        // Still try to save the status even if color clear fails
        this._saveMeetingStatus(eventId, statusValue, onSuccess, onError);
      });
  }

  /**
   * @description Save custom color to Salesforce
   * @param {string} eventId - The event ID
   * @param {string} customColor - The custom color hex value
   * @param {Function} onSuccess - Success callback
   * @param {Function} onError - Error callback
   * @public
   */
  @api
  saveCustomColor(eventId, customColor, onSuccess, onError) {
    saveEventCustomColor({
      eventId: eventId,
      customColor: customColor
    })
      .then((result) => {
        if (result.success) {
          // Notify success of color update
          this._dispatchColorEvent("colorupdate", {
            eventId: eventId,
            customColor: customColor
          });

          if (onSuccess) onSuccess(result);
        } else {
          console.error(
            "🎨 EventColorManager: Error saving custom color:",
            result.error
          );
          if (onError) onError(result);
        }
      })
      .catch((error) => {
        console.error(
          "🎨 EventColorManager: Error saving custom color:",
          error
        );
        if (onError) onError(error);
      });
  }

  /**
   * @description Save custom color and meeting link to Salesforce
   * @param {string} eventId - The event ID
   * @param {string} customColor - The custom color hex value
   * @param {string} linkReuniao - The meeting link URL
   * @param {Function} onSuccess - Success callback
   * @param {Function} onError - Error callback
   * @public
   */
  @api
  saveCustomColorAndLink(
    eventId,
    customColor,
    linkReuniao,
    onSuccess,
    onError
  ) {
    saveEventCustomColorAndLink({
      eventId: eventId,
      customColor: customColor,
      linkReuniao: linkReuniao
    })
      .then((result) => {
        if (result.success) {
          // Update cache with both color and link
          if (
            this.calendarioReino &&
            this.calendarioReino.updateEventColorAndLinkInCache
          ) {
            this.calendarioReino.updateEventColorAndLinkInCache(
              eventId,
              customColor,
              linkReuniao
            );
          }

          // Notify success of color and link update
          this._dispatchColorEvent("colorupdate", {
            eventId: eventId,
            customColor: customColor,
            linkReuniao: linkReuniao
          });

          if (onSuccess) onSuccess(result);
        } else {
          console.error(
            "🎨 EventColorManager: Error saving custom color and link:",
            result.error
          );
          if (onError) onError(result);
        }
      })
      .catch((error) => {
        console.error(
          "🎨 EventColorManager: Error saving custom color and link:",
          error
        );
        if (onError) onError(error);
      });
  }

  /**
   * @description Notify parent component of room assignment change for color recalculation
   * @param {string} eventId - The event ID
   * @param {string} roomValue - The room assignment value
   * @public
   */
  @api
  notifyRoomUpdate(eventId, roomValue) {
    // Dispatch room update event for parent component to handle
    this._dispatchColorEvent("roomupdate", {
      eventId: eventId,
      salaReuniao: roomValue
    });
  }

  // ========================================
  // PRIVATE HELPER METHODS - SALESFORCE OPERATIONS
  // ========================================

  /**
   * @description Save meeting outcome to Salesforce
   * @param {string} eventId - The event ID
   * @param {boolean} meetingOutcome - The meeting outcome
   * @param {Function} onSuccess - Success callback
   * @param {Function} onError - Error callback
   * @private
   */
  _saveMeetingOutcome(eventId, meetingOutcome, onSuccess, onError) {
    saveEventMeetingOutcome({
      eventId: eventId,
      reuniaoAconteceu: meetingOutcome
    })
      .then((result) => {
        if (result.success) {
          // Notify success of outcome update
          this._dispatchColorEvent("outcomeupdate", {
            eventId: eventId,
            reuniaoAconteceu: meetingOutcome
          });

          if (onSuccess) onSuccess(result);
        } else {
          console.error(
            "🎯 EventColorManager: Error saving meeting outcome:",
            result.error
          );
          if (onError) onError(result);
        }
      })
      .catch((error) => {
        console.error(
          "🎯 EventColorManager: Error saving meeting outcome:",
          error
        );
        if (onError) onError(error);
      });
  }

  /**
   * @description Save meeting status to Salesforce
   * @param {string} eventId - The event ID
   * @param {string} statusValue - The meeting status
   * @param {Function} onSuccess - Success callback
   * @param {Function} onError - Error callback
   * @private
   */
  _saveMeetingStatus(eventId, statusValue, onSuccess, onError) {
    saveEventMeetingStatus({
      eventId: eventId,
      statusReuniao: statusValue
    })
      .then((result) => {
        if (result.success) {
          // Notify success of status update
          this._dispatchColorEvent("statusupdate", {
            eventId: eventId,
            statusReuniao: statusValue
          });

          if (onSuccess) onSuccess(result);
        } else {
          console.error(
            "🎯 EventColorManager: Error saving meeting status:",
            result.error
          );
          if (onError) onError(result);
        }
      })
      .catch((error) => {
        console.error(
          "🎯 EventColorManager: Error saving meeting status:",
          error
        );
        if (onError) onError(error);
      });
  }

  /**
   * @description Dispatch color-related events for parent component communication
   * @param {string} eventType - Type of event to dispatch
   * @param {Object} detail - Event detail data
   * @private
   */
  _dispatchColorEvent(eventType, detail) {
    const event = new CustomEvent(eventType, {
      detail: detail,
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }
}
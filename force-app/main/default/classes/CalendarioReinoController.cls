/**
 * Controller for the calendarioReino LWC component
 * Handles fetching events from Salesforce and provides methods for manipulating them
 * Note: Using 'without sharing' to allow all users to see all calendar events
 * for better collaboration and visibility in corporate calendar system
 */
public without sharing class CalendarioReinoController {
  /**
   * Get events from Salesforce for the calendar
   * @param startDate The start date for the range of events to fetch
   * @param endDate The end date for the range of events to fetch
   * @return A list of event data objects with proper timezone information
   * Note: Removed cacheable=true to ensure fresh data after appointments are saved
   */
  @AuraEnabled
  public static List<Map<String, Object>> getEvents(
    Date startDate,
    Date endDate
  ) {
    List<Map<String, Object>> eventList = new List<Map<String, Object>>();

    try {
      // Convert Date parameters to DateTime for proper comparison
      // Start of day for startDate, end of day for endDate
      DateTime startDateTime = DateTime.newInstance(
        startDate,
        Time.newInstance(0, 0, 0, 0)
      );
      DateTime endDateTime = DateTime.newInstance(
        endDate,
        Time.newInstance(23, 59, 59, 999)
      );

      // Query for events in the specified date range with enhanced fields
      // Note: gestor__c, liderComercial__c, sdr__c are being used as text fields
      // storing names directly, not as lookup relationships
      List<Event> events = [
        SELECT
          Id,
          Subject,
          Description,
          StartDateTime,
          EndDateTime,
          Location,
          WhoId,
          WhatId,
          IsAllDayEvent,
          salaReuniao__c,
          gestor__c,
          liderComercial__c,
          sdr__c,
          customColor__c,
          statusReuniao__c,
          reuniaoAconteceu__c,
          tipoReuniao__c,
          OwnerId,
          Owner.Name,
          Who.Name
        FROM Event
        WHERE StartDateTime <= :endDateTime AND EndDateTime >= :startDateTime
        ORDER BY StartDateTime ASC
      ];

      // Process events to ensure proper timezone handling
      for (Event evt : events) {
        Map<String, Object> eventData = new Map<String, Object>();
        eventData.put('id', evt.Id);
        eventData.put('title', evt.Subject);
        eventData.put('description', evt.Description);

        // Return DateTime fields directly - no timezone conversion needed as
        // Salesforce will serialize them correctly to ISO8601 with timezone info
        eventData.put('start', evt.StartDateTime);
        eventData.put('end', evt.EndDateTime);

        eventData.put('location', evt.Location);
        eventData.put('allDay', evt.IsAllDayEvent);

        // Add relation information if present
        if (evt.WhoId != null) {
          eventData.put('whoId', evt.WhoId);
          // Determine attachment type based on WhoId (Contact or Lead)
          String whoIdPrefix = String.valueOf(evt.WhoId).substring(0, 3);
          if (whoIdPrefix == '003') {
            eventData.put('hasContact', true);
            eventData.put('attachmentType', 'Contact');
          } else if (whoIdPrefix == '00Q') {
            eventData.put('hasLead', true);
            eventData.put('attachmentType', 'Lead');
          }
        }
        if (evt.WhatId != null) {
          eventData.put('whatId', evt.WhatId);
          // Determine attachment type based on WhatId (Opportunity, Account, etc.)
          String whatIdPrefix = String.valueOf(evt.WhatId).substring(0, 3);
          if (whatIdPrefix == '006') {
            eventData.put('hasOpportunity', true);
            eventData.put('attachmentType', 'Opportunity');
          } else if (whatIdPrefix == '001') {
            eventData.put('hasAccount', true);
            eventData.put('attachmentType', 'Account');
          }
        }

        // Add enhanced fields for calendar display
        eventData.put('type', evt.tipoReuniao__c); // Use tipoReuniao__c field
        eventData.put('salaReuniao', evt.salaReuniao__c);
        eventData.put('customColor', evt.customColor__c);

        // Use picklist values directly - no conversion needed
        eventData.put('statusReuniao', evt.statusReuniao__c);

        // Add meeting outcome checkbox field
        eventData.put('reuniaoAconteceu', evt.reuniaoAconteceu__c);

        // Extract meeting link URL from Description field using utility class
        String linkReuniao = MeetingLinkUtils.extractLinkFromDescription(
          evt.Description
        );
        eventData.put('linkReuniao', linkReuniao);

        // TODO: Add support for detalhesReuniao__c field when created
        // This will store the actual meeting description/details separately from the link
        // eventData.put('detalhesReuniao', evt.detalhesReuniao__c);

        // Add participant information (stored as text names, not lookup IDs)
        if (evt.gestor__c != null && evt.gestor__c != '') {
          eventData.put('gestorName', evt.gestor__c);
        }
        if (evt.liderComercial__c != null && evt.liderComercial__c != '') {
          eventData.put('liderComercialName', evt.liderComercial__c);
        }
        if (evt.sdr__c != null && evt.sdr__c != '') {
          eventData.put('sdrName', evt.sdr__c);
        }

        // Add creator/owner information
        if (evt.OwnerId != null) {
          eventData.put('ownerId', evt.OwnerId);
        }
        if (evt.Owner != null && evt.Owner.Name != null) {
          eventData.put('ownerName', evt.Owner.Name);
        }

        eventList.add(eventData);
      }
    } catch (Exception e) {
      System.debug('Error fetching events: ' + e.getMessage());
      throw new AuraHandledException(
        'Error fetching events: ' + e.getMessage()
      );
    }

    return eventList;
  }

  /**
   * Parse datetime string from various formats to DateTime
   * @param dateTimeString The datetime string to parse
   * @return DateTime object
   */
  private static DateTime parseDateTime(String dateTimeString) {
    if (String.isBlank(dateTimeString)) {
      return null;
    }

    try {
      // Handle ISO format with 'T' separator (from datetime-local inputs)
      if (dateTimeString.contains('T')) {
        // Remove 'Z' if present and replace 'T' with space
        String cleanedString = dateTimeString.replace('T', ' ')
          .replace('Z', '');
        return DateTime.valueOf(cleanedString);
      }

      // Handle date-only format (YYYY-MM-DD)
      if (dateTimeString.length() == 10 && dateTimeString.contains('-')) {
        return DateTime.valueOf(dateTimeString + ' 00:00:00');
      }

      // Handle datetime format with space separator
      return DateTime.valueOf(dateTimeString);
    } catch (Exception e) {
      // If all parsing fails, try to parse as date and add time
      try {
        Date d = Date.valueOf(dateTimeString);
        return DateTime.newInstance(d, Time.newInstance(0, 0, 0, 0));
      } catch (Exception ex) {
        throw new AuraHandledException(
          'Formato de data inválido: ' + dateTimeString
        );
      }
    }
  }

  /**
   * Save an event to Salesforce
   * @param eventData Map containing event data
   * @return The ID of the saved event
   */
  @AuraEnabled
  public static String saveEvent(Map<String, Object> eventData) {
    try {
      Event evt = new Event();

      // If ID is present, it's an update
      if (eventData.containsKey('id') && eventData.get('id') != null) {
        evt.Id = (String) eventData.get('id');
      }

      // Set event fields
      evt.Subject = (String) eventData.get('title');
      evt.Description = (String) eventData.get('description');
      evt.Location = (String) eventData.get('location');

      // Handle IsAllDayEvent with default value
      Object allDayValue = eventData.get('allDay');
      evt.IsAllDayEvent = allDayValue != null ? (Boolean) allDayValue : false;

      // Handle start and end dates - support both DateTime objects and String formats
      if (eventData.containsKey('start')) {
        Object startValue = eventData.get('start');
        if (startValue instanceof DateTime) {
          evt.StartDateTime = (DateTime) startValue;
        } else if (startValue instanceof String) {
          evt.StartDateTime = parseDateTime((String) startValue);
        }
      }

      if (eventData.containsKey('end')) {
        Object endValue = eventData.get('end');
        if (endValue instanceof DateTime) {
          evt.EndDateTime = (DateTime) endValue;
        } else if (endValue instanceof String) {
          evt.EndDateTime = parseDateTime((String) endValue);
        }
      }

      // Handle relationship fields
      if (eventData.containsKey('whoId') && eventData.get('whoId') != null) {
        evt.WhoId = (String) eventData.get('whoId');
      }

      if (eventData.containsKey('whatId') && eventData.get('whatId') != null) {
        evt.WhatId = (String) eventData.get('whatId');
      }

      upsert evt;
      return evt.Id;
    } catch (Exception e) {
      System.debug('Error saving event: ' + e.getMessage());
      throw new AuraHandledException('Error saving event: ' + e.getMessage());
    }
  }

  /**
   * Delete an event from Salesforce
   * @param eventId The ID of the event to delete
   * @return Boolean indicating success
   */
  @AuraEnabled
  public static Boolean deleteEvent(String eventId) {
    try {
      Event evt = [SELECT Id FROM Event WHERE Id = :eventId LIMIT 1];
      delete evt;
      return true;
    } catch (Exception e) {
      System.debug('Error deleting event: ' + e.getMessage());
      throw new AuraHandledException('Error deleting event: ' + e.getMessage());
    }
  }

  /**
   * Save custom color for an event
   * @param eventId The ID of the event to update
   * @param customColor The hex color code to save
   * @return Status of the operation
   */
  @AuraEnabled
  public static Map<String, Object> saveEventCustomColor(
    String eventId,
    String customColor
  ) {
    Map<String, Object> result = new Map<String, Object>();
    result.put('success', false);

    try {
      // Validate inputs
      if (String.isBlank(eventId)) {
        result.put('error', 'Event ID is required');
        return result;
      }

      // Validate color format (should be hex color like #FFFFFF)
      if (
        String.isNotBlank(customColor) &&
        !Pattern.matches('^#[0-9A-Fa-f]{6}$', customColor)
      ) {
        result.put(
          'error',
          'Invalid color format. Use hex format like #FFFFFF'
        );
        return result;
      }

      // Check permissions
      if (!Schema.sObjectType.Event.isUpdateable()) {
        throw new AuraHandledException('No permission to update events');
      }

      // Update the event
      Event eventToUpdate = new Event(Id = eventId);
      eventToUpdate.customColor__c = customColor;

      update eventToUpdate;

      result.put('success', true);
      result.put('message', 'Color updated successfully');
    } catch (Exception e) {
      result.put('success', false);
      result.put('error', e.getMessage());
      System.debug('Error saving custom color: ' + e.getMessage());
    }

    return result;
  }

  /**
   * Save custom color and meeting link for an event
   * @param eventId The ID of the event to update
   * @param customColor The hex color code to save
   * @param linkReuniao The meeting link URL to save
   * @return Status of the operation
   */
  @AuraEnabled
  public static Map<String, Object> saveEventCustomColorAndLink(
    String eventId,
    String customColor,
    String linkReuniao
  ) {
    Map<String, Object> result = new Map<String, Object>();
    result.put('success', false);

    try {
      // Validate inputs
      if (String.isBlank(eventId)) {
        result.put('error', 'Event ID is required');
        return result;
      }

      // Validate color format (should be hex color like #FFFFFF)
      if (
        String.isNotBlank(customColor) &&
        !Pattern.matches('^#[0-9A-Fa-f]{6}$', customColor)
      ) {
        result.put(
          'error',
          'Invalid color format. Use hex format like #FFFFFF'
        );
        return result;
      }

      // URL validation removed - accept any URL format for flexibility

      // Check permissions
      if (!Schema.sObjectType.Event.isUpdateable()) {
        throw new AuraHandledException('No permission to update events');
      }

      // Update the event
      Event eventToUpdate = new Event(Id = eventId);
      eventToUpdate.customColor__c = customColor;

      // Store meeting link in Description field (supports unlimited length)
      if (String.isNotBlank(linkReuniao)) {
        String currentDescription = '';
        try {
          Event currentEvent = [
            SELECT Description
            FROM Event
            WHERE Id = :eventId
            LIMIT 1
          ];
          currentDescription = currentEvent.Description != null
            ? currentEvent.Description
            : '';
        } catch (Exception queryEx) {
          // Continue with empty description if query fails
        }

        // Use utility class to add link to description
        eventToUpdate.Description = MeetingLinkUtils.addLinkToDescription(
          currentDescription,
          linkReuniao
        );
      } else {
        // If no link provided, just remove existing link from description
        String currentDescription = '';
        try {
          Event currentEvent = [
            SELECT Description
            FROM Event
            WHERE Id = :eventId
            LIMIT 1
          ];
          currentDescription = currentEvent.Description != null
            ? currentEvent.Description
            : '';

          // Remove existing link using utility class
          eventToUpdate.Description = MeetingLinkUtils.removeLinkFromDescription(
            currentDescription
          );
        } catch (Exception queryEx) {
          // Continue if query fails
        }
      }

      update eventToUpdate;

      result.put('success', true);
      result.put('message', 'Cor e link atualizados com sucesso');
      result.put('customColor', customColor);
      result.put('linkReuniao', linkReuniao);
    } catch (Exception e) {
      result.put('success', false);
      result.put('error', e.getMessage());
      System.debug('Error saving custom color and link: ' + e.getMessage());
    }

    return result;
  }

  /**
   * Save meeting status for an event
   * @param eventId The ID of the event to update
   * @param statusReuniao The meeting status picklist value
   * @return Status of the operation
   */
  @AuraEnabled
  public static Map<String, Object> saveEventMeetingStatus(
    String eventId,
    String statusReuniao
  ) {
    Map<String, Object> result = new Map<String, Object>();
    result.put('success', false);

    try {
      // Validate inputs
      if (String.isBlank(eventId)) {
        result.put('error', 'Event ID is required');
        return result;
      }

      // Check permissions
      if (!Schema.sObjectType.Event.isUpdateable()) {
        throw new AuraHandledException('No permission to update events');
      }

      // Update the event
      Event eventToUpdate = new Event(Id = eventId);

      // Set picklist value directly - no conversion needed
      eventToUpdate.statusReuniao__c = statusReuniao;

      // DO NOT clear custom color - let frontend priority hierarchy handle color determination

      update eventToUpdate;

      result.put('success', true);
      result.put('message', 'Meeting status updated successfully');
      // Return the picklist value directly
      result.put('statusReuniao', eventToUpdate.statusReuniao__c);
    } catch (Exception e) {
      result.put('success', false);
      result.put('error', e.getMessage());
      System.debug('Error saving meeting status: ' + e.getMessage());
    }

    return result;
  }

  /**
   * Save meeting outcome (reuniaoAconteceu__c checkbox) for an event
   * @param eventId The ID of the event to update
   * @param reuniaoAconteceu The meeting outcome checkbox value
   * @return Status of the operation
   */
  @AuraEnabled
  public static Map<String, Object> saveEventMeetingOutcome(
    String eventId,
    Boolean reuniaoAconteceu
  ) {
    Map<String, Object> result = new Map<String, Object>();
    result.put('success', false);

    try {
      // Validate inputs
      if (String.isBlank(eventId)) {
        result.put('error', 'Event ID is required');
        return result;
      }

      // Check permissions
      if (!Schema.sObjectType.Event.isUpdateable()) {
        throw new AuraHandledException('No permission to update events');
      }

      // Update the event
      Event eventToUpdate = new Event(Id = eventId);

      // Set checkbox value
      eventToUpdate.reuniaoAconteceu__c = reuniaoAconteceu;

      // DO NOT clear custom color - let frontend priority hierarchy handle color determination

      update eventToUpdate;

      result.put('success', true);
      result.put('message', 'Meeting outcome updated successfully');
      result.put('reuniaoAconteceu', eventToUpdate.reuniaoAconteceu__c);
    } catch (Exception e) {
      result.put('success', false);
      result.put('error', e.getMessage());
      System.debug('Error saving meeting outcome: ' + e.getMessage());
    }

    return result;
  }

  /**
   * Get room availability for the specified date range
   * @param startDate The start date for the range
   * @param endDate The end date for the range
   * @return A map with room availability information
   */
  @AuraEnabled(cacheable=true)
  public static Map<String, Object> getRoomAvailability(
    String startDate,
    String endDate
  ) {
    Map<String, Object> result = new Map<String, Object>();
    Map<String, Object> roomAvailability = new Map<String, Object>();

    try {
      // Parse date strings to Date objects
      Date startDateParsed = Date.valueOf(startDate);
      Date endDateParsed = Date.valueOf(endDate);

      // Convert to DateTime for proper querying (start of day and end of day)
      DateTime startDateTime = DateTime.newInstance(
        startDateParsed,
        Time.newInstance(0, 0, 0, 0)
      );
      DateTime endDateTime = DateTime.newInstance(
        endDateParsed,
        Time.newInstance(23, 59, 59, 999)
      );

      // Query events that have room assignments and fall within the date range
      List<Event> roomEvents = [
        SELECT
          Id,
          Subject,
          Description,
          StartDateTime,
          EndDateTime,
          Location,
          salaReuniao__c,
          gestor__c,
          liderComercial__c,
          sdr__c,
          WhoId,
          WhatId,
          OwnerId,
          Owner.Name,
          customColor__c,
          statusReuniao__c,
          reuniaoAconteceu__c
        FROM Event
        WHERE
          salaReuniao__c != NULL
          AND salaReuniao__c != ''
          AND salaReuniao__c != 'Outra'
          AND salaReuniao__c != 'online'
          AND StartDateTime <= :endDateTime
          AND EndDateTime >= :startDateTime
        ORDER BY salaReuniao__c, StartDateTime ASC
      ];

      // Group events by room
      Map<String, List<Map<String, Object>>> roomConflicts = new Map<String, List<Map<String, Object>>>();

      for (Event evt : roomEvents) {
        String roomKey = evt.salaReuniao__c;

        if (!roomConflicts.containsKey(roomKey)) {
          roomConflicts.put(roomKey, new List<Map<String, Object>>());
        }

        Map<String, Object> conflictInfo = new Map<String, Object>();
        conflictInfo.put('eventId', evt.Id);
        conflictInfo.put('subject', evt.Subject);
        conflictInfo.put('description', evt.Description);
        conflictInfo.put('startDateTime', evt.StartDateTime);
        conflictInfo.put('endDateTime', evt.EndDateTime);
        conflictInfo.put('location', evt.Location);
        conflictInfo.put('type', null); // Type field removed due to permissions
        conflictInfo.put('organizer', evt.Owner.Name);
        conflictInfo.put('ownerId', evt.OwnerId);
        conflictInfo.put('gestorName', evt.gestor__c);
        conflictInfo.put('liderComercialName', evt.liderComercial__c);
        conflictInfo.put('sdrName', evt.sdr__c);
        conflictInfo.put('whoId', evt.WhoId);
        conflictInfo.put('whatId', evt.WhatId);
        conflictInfo.put('salaReuniao', evt.salaReuniao__c);
        conflictInfo.put('customColor', evt.customColor__c);
        conflictInfo.put('statusReuniao', evt.statusReuniao__c);
        conflictInfo.put('reuniaoAconteceu', evt.reuniaoAconteceu__c);

        roomConflicts.get(roomKey).add(conflictInfo);
      }

      // Build room availability data for each physical room
      List<String> physicalRooms = new List<String>{
        'salaPrincipal',
        'salaGabriel'
      };

      for (String room : physicalRooms) {
        Map<String, Object> roomData = new Map<String, Object>();
        roomData.put('roomId', room);
        roomData.put(
          'conflicts',
          roomConflicts.get(room) ?? new List<Map<String, Object>>()
        );
        roomData.put(
          'isAvailable',
          !roomConflicts.containsKey(room) || roomConflicts.get(room).isEmpty()
        );

        roomAvailability.put(room, roomData);
      }

      result.put('success', true);
      result.put('roomAvailability', roomAvailability);
    } catch (Exception e) {
      result.put('success', false);
      result.put(
        'errorMessage',
        'Erro ao buscar disponibilidade das salas: ' + e.getMessage()
      );
      System.debug('Error getting room availability: ' + e.getMessage());
    }

    return result;
  }

  /**
   * Get available picklist values for statusReuniao__c field
   * @return List of available status values
   */
  @AuraEnabled(cacheable=true)
  public static List<Map<String, String>> getStatusPicklistValues() {
    List<Map<String, String>> options = new List<Map<String, String>>();

    try {
      Schema.DescribeFieldResult fieldResult = Event.statusReuniao__c.getDescribe();
      List<Schema.PicklistEntry> picklistValues = fieldResult.getPicklistValues();

      for (Schema.PicklistEntry entry : picklistValues) {
        if (entry.isActive()) {
          Map<String, String> option = new Map<String, String>();
          option.put('label', entry.getLabel());
          option.put('value', entry.getValue());
          options.add(option);
        }
      }
    } catch (Exception e) {
      System.debug('Error getting picklist values: ' + e.getMessage());
    }

    return options;
  }

  /**
   * Save meeting room assignment for an event
   * @param eventId The ID of the event to update
   * @param salaReuniao The meeting room value
   * @return Status of the operation
   */
  @AuraEnabled
  public static Map<String, Object> saveEventMeetingRoom(
    String eventId,
    String salaReuniao
  ) {
    Map<String, Object> result = new Map<String, Object>();
    result.put('success', false);

    try {
      // Validate inputs
      if (String.isBlank(eventId)) {
        result.put('error', 'Event ID is required');
        return result;
      }

      // Check permissions
      if (!Schema.sObjectType.Event.isUpdateable()) {
        throw new AuraHandledException('No permission to update events');
      }

      // Update the event
      Event eventToUpdate = new Event(Id = eventId);

      // Set room value directly
      eventToUpdate.salaReuniao__c = salaReuniao;

      // DO NOT clear custom color - let frontend priority hierarchy handle color determination

      update eventToUpdate;

      result.put('success', true);
      result.put('message', 'Meeting room updated successfully');
      result.put('salaReuniao', eventToUpdate.salaReuniao__c);
    } catch (Exception e) {
      result.put('success', false);
      result.put('error', e.getMessage());
      System.debug('Error saving meeting room: ' + e.getMessage());
    }

    return result;
  }
}
/**
 * Controller for participant details modal functionality
 * Provides comprehensive participant information and event participation history
 * @author Reino Capital
 * @last-modified 2025-01-14
 */
public with sharing class ParticipantDetailsController {
  /**
   * Get comprehensive participant details including profile and event participation
   * @param participantName The name of the participant to get details for
   * @return Map containing participant details and event participation data
   * Note: Using cacheable=true as required for @wire methods
   */
  @AuraEnabled(cacheable=true)
  public static Map<String, Object> getParticipantDetails(
    String participantName
  ) {
    Map<String, Object> result = new Map<String, Object>();

    if (String.isBlank(participantName)) {
      result.put('success', false);
      result.put('errorMessage', 'Nome do participante é obrigatório');
      return result;
    }

    try {
      // Get participant user information
      Map<String, Object> participantInfo = getParticipantUserInfo(
        participantName
      );

      if (participantInfo == null) {
        result.put('success', false);
        result.put('errorMessage', 'Participante não encontrado');
        return result;
      }

      // Get participant's event participation history
      Map<String, Object> eventParticipation = getParticipantEventHistory(
        participantName
      );

      // Combine all data
      result.put('success', true);
      result.put('participantInfo', participantInfo);
      result.put('eventParticipation', eventParticipation);

      System.debug(
        'ParticipantDetailsController: Successfully retrieved details for ' +
        participantName
      );
    } catch (Exception e) {
      result.put('success', false);
      result.put(
        'errorMessage',
        'Erro ao buscar detalhes do participante: ' + e.getMessage()
      );
      System.debug('Error in getParticipantDetails: ' + e.getMessage());
    }

    return result;
  }

  /**
   * Get comprehensive participant details including profile and event participation (non-cacheable)
   * @param participantName The name of the participant to get details for
   * @return Map containing participant details and event participation data
   * Note: Non-cacheable version for real-time updates
   */
  @AuraEnabled
  public static Map<String, Object> getParticipantDetailsRealTime(
    String participantName
  ) {
    // Delegate to the main method - same logic but not cached
    return getParticipantDetails(participantName);
  }

  /**
   * Get participant user information from User record
   * @param participantName The name of the participant
   * @return Map containing user information or null if not found
   */
  private static Map<String, Object> getParticipantUserInfo(
    String participantName
  ) {
    try {
      List<User> users = [
        SELECT
          Id,
          Name,
          Email,
          Title,
          Phone,
          Department,
          SmallPhotoUrl,
          FullPhotoUrl,
          CompanyName,
          Division,
          IsActive,
          LastLoginDate,
          CreatedDate
        FROM User
        WHERE
          Name = :participantName
          AND IsActive = TRUE
          AND UserType = 'Standard'
        WITH SECURITY_ENFORCED
        LIMIT 1
      ];

      if (users.isEmpty()) {
        return null;
      }

      User participant = users[0];
      Map<String, Object> userInfo = new Map<String, Object>();

      userInfo.put('id', participant.Id);
      userInfo.put('name', participant.Name);
      userInfo.put('email', participant.Email);
      userInfo.put('title', participant.Title);
      userInfo.put('phone', participant.Phone);
      userInfo.put('department', participant.Department);
      userInfo.put('companyName', participant.CompanyName);
      userInfo.put('division', participant.Division);
      userInfo.put('isActive', participant.IsActive);
      userInfo.put('lastLoginDate', participant.LastLoginDate);
      userInfo.put('createdDate', participant.CreatedDate);

      // Profile photos with fallback
      userInfo.put(
        'smallPhotoUrl',
        participant.SmallPhotoUrl != null
          ? participant.SmallPhotoUrl
          : '/img/userprofile/default_profile_45_v2.png'
      );
      userInfo.put(
        'fullPhotoUrl',
        participant.FullPhotoUrl != null
          ? participant.FullPhotoUrl
          : '/img/userprofile/default_profile_200_v2.png'
      );

      return userInfo;
    } catch (Exception e) {
      System.debug('Error getting participant user info: ' + e.getMessage());
      return null;
    }
  }

  /**
   * Get participant's event participation history
   * @param participantName The name of the participant
   * @return Map containing current/upcoming and past events
   */
  private static Map<String, Object> getParticipantEventHistory(
    String participantName
  ) {
    Map<String, Object> eventHistory = new Map<String, Object>();

    try {
      // Query all events where this person is a participant
      List<Event> allEvents = [
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
          customColor__c,
          statusReuniao__c,
          reuniaoAconteceu__c,
          WhoId,
          WhatId,
          OwnerId,
          Owner.Name
        FROM Event
        WHERE
          gestor__c = :participantName
          OR liderComercial__c = :participantName
          OR sdr__c = :participantName
        WITH SECURITY_ENFORCED
        ORDER BY StartDateTime DESC
      ];

      // Separate current/upcoming vs past events
      DateTime now = DateTime.now();
      List<Map<String, Object>> currentUpcomingEvents = new List<Map<String, Object>>();
      List<Map<String, Object>> pastEvents = new List<Map<String, Object>>();

      for (Event evt : allEvents) {
        Map<String, Object> eventData = processEventForParticipant(
          evt,
          participantName
        );

        if (evt.EndDateTime >= now) {
          currentUpcomingEvents.add(eventData);
        } else {
          pastEvents.add(eventData);
        }
      }

      // Sort current/upcoming events chronologically (earliest first)
      currentUpcomingEvents.sort(new EventDateComparator(true));

      // Sort past events reverse chronologically (most recent first)
      pastEvents.sort(new EventDateComparator(false));

      eventHistory.put('currentUpcomingEvents', currentUpcomingEvents);
      eventHistory.put('pastEvents', pastEvents);
      eventHistory.put('totalEvents', allEvents.size());
      eventHistory.put('upcomingCount', currentUpcomingEvents.size());
      eventHistory.put('pastCount', pastEvents.size());

      System.debug(
        'ParticipantDetailsController: Found ' +
          allEvents.size() +
          ' events for participant ' +
          participantName
      );
    } catch (Exception e) {
      System.debug(
        'Error getting participant event history: ' + e.getMessage()
      );
      eventHistory.put(
        'currentUpcomingEvents',
        new List<Map<String, Object>>()
      );
      eventHistory.put('pastEvents', new List<Map<String, Object>>());
      eventHistory.put('totalEvents', 0);
      eventHistory.put('upcomingCount', 0);
      eventHistory.put('pastCount', 0);
    }

    return eventHistory;
  }

  /**
   * Process event data for participant display
   * @param evt The event record
   * @param participantName The participant's name to determine their role
   * @return Map containing processed event data
   */
  private static Map<String, Object> processEventForParticipant(
    Event evt,
    String participantName
  ) {
    Map<String, Object> eventData = new Map<String, Object>();

    eventData.put('id', evt.Id);
    eventData.put('subject', evt.Subject);
    eventData.put('description', evt.Description);
    eventData.put('startDateTime', evt.StartDateTime);
    eventData.put('endDateTime', evt.EndDateTime);
    eventData.put('location', evt.Location);
    eventData.put('type', null); // Type field removed due to permissions
    eventData.put('salaReuniao', evt.salaReuniao__c);
    eventData.put('customColor', evt.customColor__c);
    eventData.put('statusReuniao', evt.statusReuniao__c);
    eventData.put('reuniaoAconteceu', evt.reuniaoAconteceu__c);
    eventData.put('whoId', evt.WhoId);
    eventData.put('whatId', evt.WhatId);
    eventData.put('ownerId', evt.OwnerId);
    eventData.put('ownerName', evt.Owner.Name);

    // Determine participant's role in this event
    String participantRole = '';
    if (evt.gestor__c == participantName) {
      participantRole = 'Gestor';
    } else if (evt.liderComercial__c == participantName) {
      participantRole = 'Líder Comercial';
    } else if (evt.sdr__c == participantName) {
      participantRole = 'SDR';
    }
    eventData.put('participantRole', participantRole);

    // Format display information
    eventData.put(
      'formattedDateTime',
      formatEventDateTime(evt.StartDateTime, evt.EndDateTime)
    );
    eventData.put(
      'formattedLocation',
      formatEventLocation(evt.salaReuniao__c, evt.Location)
    );
    eventData.put('isUpcoming', evt.EndDateTime >= DateTime.now());

    return eventData;
  }

  /**
   * Format event date and time for display
   * @param startDateTime Event start date/time
   * @param endDateTime Event end date/time
   * @return Formatted date/time string
   */
  private static String formatEventDateTime(
    DateTime startDateTime,
    DateTime endDateTime
  ) {
    try {
      String dateStr = startDateTime.format('dd/MM/yyyy');
      String startTime = startDateTime.format('HH:mm');
      String endTime = endDateTime.format('HH:mm');

      return dateStr + ' • ' + startTime + ' - ' + endTime;
    } catch (Exception e) {
      return 'Data/hora indisponível';
    }
  }

  /**
   * Format event location for display
   * @param salaReuniao Meeting room field value
   * @param location Location field value
   * @return Formatted location string
   */
  private static String formatEventLocation(
    String salaReuniao,
    String location
  ) {
    if (String.isNotBlank(salaReuniao)) {
      if (salaReuniao == 'salaPrincipal') {
        return 'Sala Principal';
      } else if (salaReuniao == 'salaGabriel') {
        return 'Sala do Gabriel';
      } else if (salaReuniao == 'online') {
        return 'Online';
      } else if (salaReuniao == 'Outra') {
        return String.isNotBlank(location) ? location : 'Localização variável';
      }
      return salaReuniao;
    }

    return String.isNotBlank(location) ? location : 'Local não especificado';
  }

  /**
   * Comparator class for sorting events by date
   */
  public class EventDateComparator implements Comparator<Map<String, Object>> {
    private Boolean ascending;

    public EventDateComparator(Boolean ascending) {
      this.ascending = ascending;
    }

    public Integer compare(
      Map<String, Object> event1,
      Map<String, Object> event2
    ) {
      DateTime date1 = (DateTime) event1.get('startDateTime');
      DateTime date2 = (DateTime) event2.get('startDateTime');

      if (date1 == null && date2 == null)
        return 0;
      if (date1 == null)
        return ascending ? 1 : -1;
      if (date2 == null)
        return ascending ? -1 : 1;

      Integer result = date1 < date2 ? -1 : (date1 > date2 ? 1 : 0);
      return ascending ? result : -result;
    }
  }
}
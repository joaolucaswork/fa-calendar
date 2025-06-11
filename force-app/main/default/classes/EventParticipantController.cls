/**
 * Controller for handling event participant information and profile photos
 * Provides reusable methods for retrieving participant data across calendar components
 * @author Reino Capital
 * @last-modified 2025-01-14
 */
public with sharing class EventParticipantController {
  /**
   * Get participant data with profile photos for a list of participant names
   * @param participantNames Set of participant names to retrieve data for
   * @return List of participant data including profile photos
   * Note: Using cacheable=true as required for @wire methods
   */
  @AuraEnabled(cacheable=true)
  public static List<Map<String, Object>> getParticipantData(
    List<String> participantNames
  ) {
    List<Map<String, Object>> participantData = new List<Map<String, Object>>();

    if (participantNames == null || participantNames.isEmpty()) {
      return participantData;
    }

    // Remove null and empty values
    Set<String> cleanParticipantNames = new Set<String>();
    for (String name : participantNames) {
      if (String.isNotBlank(name)) {
        cleanParticipantNames.add(name);
      }
    }

    if (cleanParticipantNames.isEmpty()) {
      return participantData;
    }

    try {
      // Query users by name to get profile photos
      List<User> users = [
        SELECT Id, Name, SmallPhotoUrl, Title, Email, IsActive
        FROM User
        WHERE
          Name IN :cleanParticipantNames
          AND IsActive = TRUE
          AND UserType = 'Standard'
        WITH SECURITY_ENFORCED
        ORDER BY Name
      ];

      // Build participant data list
      for (User user : users) {
        Map<String, Object> userData = new Map<String, Object>();
        userData.put('id', user.Id);
        userData.put('name', user.Name);
        userData.put(
          'photoUrl',
          user.SmallPhotoUrl != null
            ? user.SmallPhotoUrl
            : '/img/userprofile/default_profile_45_v2.png'
        );
        userData.put('title', user.Title);
        userData.put('email', user.Email);
        userData.put('isActive', user.IsActive);

        participantData.add(userData);
      }

      System.debug(
        'EventParticipantController: Retrieved ' +
          participantData.size() +
          ' participants'
      );
    } catch (Exception e) {
      System.debug('Error retrieving participant data: ' + e.getMessage());
    }

    return participantData;
  }

  /**
   * Get participant data with profile photos for a list of participant names (non-cacheable)
   * @param participantNames Set of participant names to retrieve data for
   * @return List of participant data including profile photos
   * Note: Non-cacheable version for real-time updates
   */
  @AuraEnabled
  public static List<Map<String, Object>> getParticipantDataRealTime(
    List<String> participantNames
  ) {
    // Delegate to the main method - same logic but not cached
    return getParticipantData(participantNames);
  }

  /**
   * Get participant data for a single event by event ID
   * @param eventId The ID of the event to get participants for
   * @return List of participant data including profile photos
   * Note: Removed cacheable=true to ensure real-time updates
   */
  @AuraEnabled
  public static List<Map<String, Object>> getEventParticipants(String eventId) {
    List<Map<String, Object>> participantData = new List<Map<String, Object>>();

    if (String.isBlank(eventId)) {
      return participantData;
    }

    try {
      // Query the event to get participant names
      Event evt = [
        SELECT Id, gestor__c, liderComercial__c, sdr__c
        FROM Event
        WHERE Id = :eventId
        WITH SECURITY_ENFORCED
        LIMIT 1
      ];

      // Collect participant names
      List<String> participantNames = new List<String>();
      if (String.isNotBlank(evt.gestor__c)) {
        participantNames.add(evt.gestor__c);
      }
      if (String.isNotBlank(evt.liderComercial__c)) {
        participantNames.add(evt.liderComercial__c);
      }
      if (String.isNotBlank(evt.sdr__c)) {
        participantNames.add(evt.sdr__c);
      }

      // Get participant data
      participantData = getParticipantData(participantNames);
    } catch (Exception e) {
      System.debug('Error retrieving event participants: ' + e.getMessage());
    }

    return participantData;
  }

  /**
   * Format participant names for display in a compact format
   * @param participantNames List of participant names
   * @param maxDisplay Maximum number of participants to display before showing "+X more"
   * @return Formatted participant string
   */
  @AuraEnabled
  public static String formatParticipantNames(
    List<String> participantNames,
    Integer maxDisplay
  ) {
    if (participantNames == null || participantNames.isEmpty()) {
      return '';
    }

    // Remove null and empty values
    List<String> cleanNames = new List<String>();
    for (String name : participantNames) {
      if (String.isNotBlank(name)) {
        cleanNames.add(name);
      }
    }

    if (cleanNames.isEmpty()) {
      return '';
    }

    if (maxDisplay == null || maxDisplay <= 0) {
      maxDisplay = 2; // Default to showing 2 participants
    }

    if (cleanNames.size() <= maxDisplay) {
      return String.join(cleanNames, ', ');
    } else {
      List<String> displayNames = new List<String>();
      for (Integer i = 0; i < maxDisplay; i++) {
        displayNames.add(cleanNames[i]);
      }
      Integer remaining = cleanNames.size() - maxDisplay;
      return String.join(displayNames, ', ') + ' +' + remaining + ' mais';
    }
  }

  /**
   * Get participant role labels for display
   * @param gestorName Name of the gestor participant
   * @param liderComercialName Name of the líder comercial participant
   * @param sdrName Name of the SDR participant
   * @return Map with role-based participant information
   */
  @AuraEnabled
  public static Map<String, Object> getParticipantRoles(
    String gestorName,
    String liderComercialName,
    String sdrName
  ) {
    Map<String, Object> roles = new Map<String, Object>();

    if (String.isNotBlank(gestorName)) {
      roles.put(
        'gestor',
        new Map<String, String>{ 'name' => gestorName, 'role' => 'Gestor' }
      );
    }

    if (String.isNotBlank(liderComercialName)) {
      roles.put(
        'liderComercial',
        new Map<String, String>{
          'name' => liderComercialName,
          'role' => 'Líder Comercial'
        }
      );
    }

    if (String.isNotBlank(sdrName)) {
      roles.put(
        'sdr',
        new Map<String, String>{ 'name' => sdrName, 'role' => 'SDR' }
      );
    }

    return roles;
  }
}
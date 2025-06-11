/**
 * @description Utility class for handling meeting links in Event records
 * @author Reino Capital Development Team
 * @version 1.0.0
 *
 * This class provides centralized methods for storing and retrieving meeting links
 * from the Description field of Event records. The linkReuniao__c field is deprecated
 * and should not be used.
 */
public with sharing class MeetingLinkUtils {
  /**
   * @description Extract meeting link from Event Description field
   * @param description The Event Description field content
   * @return String The extracted meeting link URL or null if not found
   */
  public static String extractLinkFromDescription(String description) {
    if (String.isBlank(description)) {
      return null;
    }

    // Pattern to match "Link: [URL]" at the beginning of description
    Pattern linkPattern = Pattern.compile(
      '(?i)^Link:\\s*(https?://[^\\s\\n]+)'
    );
    Matcher matcher = linkPattern.matcher(description);

    if (matcher.find()) {
      return matcher.group(1);
    }

    return null;
  }

  /**
   * @description Remove existing meeting link from Description field
   * @param description The Event Description field content
   * @return String The description with meeting link removed
   */
  public static String removeLinkFromDescription(String description) {
    if (String.isBlank(description)) {
      return '';
    }

    // Pattern to match "Link: [URL]" followed by optional newlines
    Pattern linkPattern = Pattern.compile(
      '(?i)^Link:\\s*https?://[^\\s\\n]+\\s*\\n*'
    );
    String cleanDescription = linkPattern.matcher(description).replaceFirst('');

    return cleanDescription.trim();
  }

  /**
   * @description Add meeting link to Description field
   * @param description The current Event Description field content
   * @param meetingLink The meeting link URL to add
   * @return String The updated description with meeting link
   */
  public static String addLinkToDescription(
    String description,
    String meetingLink
  ) {
    if (String.isBlank(meetingLink)) {
      return description != null ? description : '';
    }

    // Remove any existing link first
    String cleanDescription = removeLinkFromDescription(description);

    // Add new link at the beginning
    String updatedDescription = 'Link: ' + meetingLink;

    if (String.isNotBlank(cleanDescription)) {
      updatedDescription += '\n\n' + cleanDescription;
    }

    return updatedDescription;
  }

  /**
   * @description Update Event record with meeting link stored in Description field
   * @param eventId The Event record ID
   * @param meetingLink The meeting link URL
   * @return Boolean True if update was successful
   */
  public static Boolean updateEventMeetingLink(Id eventId, String meetingLink) {
    try {
      // Query current event
      Event currentEvent = [
        SELECT Id, Description
        FROM Event
        WHERE Id = :eventId
        LIMIT 1
      ];

      // Update description with new meeting link
      currentEvent.Description = addLinkToDescription(
        currentEvent.Description,
        meetingLink
      );

      // Update the event
      update currentEvent;

      return true;
    } catch (Exception e) {
      System.debug('Error updating event meeting link: ' + e.getMessage());
      return false;
    }
  }

  /**
   * @description Validate that Event data does not contain linkReuniao__c field
   * This method helps prevent accidental use of the deprecated field
   * @param eventData Map containing Event field data
   * @return Map<String, Object> Cleaned event data without deprecated field
   */
  public static Map<String, Object> cleanEventData(
    Map<String, Object> eventData
  ) {
    Map<String, Object> cleanedData = new Map<String, Object>(eventData);

    // Remove deprecated field if present
    if (cleanedData.containsKey('linkReuniao__c')) {
      System.debug(
        'WARNING: Removing deprecated linkReuniao__c field from event data'
      );
      cleanedData.remove('linkReuniao__c');
    }

    return cleanedData;
  }

  /**
   * @description Convert linkReuniao field to Description field format
   * This method helps with migration from old field to new approach
   * @param eventData Map containing Event field data
   * @return Map<String, Object> Event data with meeting link in Description field
   */
  public static Map<String, Object> migrateLinkToDescription(
    Map<String, Object> eventData
  ) {
    Map<String, Object> migratedData = cleanEventData(eventData);

    // Check if linkReuniao field exists in input data
    String meetingLink = null;
    if (eventData.containsKey('linkReuniao')) {
      meetingLink = (String) eventData.get('linkReuniao');
    }

    // If we have a meeting link, add it to description
    if (String.isNotBlank(meetingLink)) {
      String currentDescription = (String) migratedData.get('description');
      migratedData.put(
        'description',
        addLinkToDescription(currentDescription, meetingLink)
      );
    }

    return migratedData;
  }
}
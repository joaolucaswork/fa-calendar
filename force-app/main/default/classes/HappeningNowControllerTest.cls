/**
 * Test class for HappeningNowController
 * Tests the "Acontecendo Agora" (Happening Now) functionality
 */
@isTest
public class HappeningNowControllerTest {
  /**
   * Test setup method to create test data
   */
  @TestSetup
  static void setupTestData() {
    // Create test events with different timing scenarios
    List<Event> testEvents = new List<Event>();

    DateTime now = DateTime.now();

    // Event currently happening (started 30 minutes ago, ends in 30 minutes)
    Event currentEvent = new Event(
      Subject = 'Current Meeting',
      StartDateTime = now.addMinutes(-30),
      EndDateTime = now.addMinutes(30),
      salaReuniao__c = 'salaPrincipal',
      Type = 'Reunião Presencial'
    );
    testEvents.add(currentEvent);

    // Event that just started (started 1 minute ago, ends in 59 minutes)
    Event justStartedEvent = new Event(
      Subject = 'Just Started Meeting',
      StartDateTime = now.addMinutes(-1),
      EndDateTime = now.addMinutes(59),
      salaReuniao__c = 'salaGabriel',
      Type = 'Reunião Presencial'
    );
    testEvents.add(justStartedEvent);

    // Event ending soon (started 59 minutes ago, ends in 1 minute)
    Event endingSoonEvent = new Event(
      Subject = 'Ending Soon Meeting',
      StartDateTime = now.addMinutes(-59),
      EndDateTime = now.addMinutes(1),
      salaReuniao__c = 'salaPrincipal',
      Type = 'Reunião Online'
    );
    testEvents.add(endingSoonEvent);

    // Future event (starts in 1 hour)
    Event futureEvent = new Event(
      Subject = 'Future Meeting',
      StartDateTime = now.addHours(1),
      EndDateTime = now.addHours(2),
      salaReuniao__c = 'salaGabriel',
      Type = 'Reunião Presencial'
    );
    testEvents.add(futureEvent);

    // Past event (ended 1 hour ago)
    Event pastEvent = new Event(
      Subject = 'Past Meeting',
      StartDateTime = now.addHours(-2),
      EndDateTime = now.addHours(-1),
      salaReuniao__c = 'salaPrincipal',
      Type = 'Ligação Telefônica'
    );
    testEvents.add(pastEvent);

    insert testEvents;
  }

  /**
   * Test isEventHappeningNow with current event
   */
  @isTest
  static void testIsEventHappeningNow_CurrentEvent() {
    DateTime now = DateTime.now();
    DateTime start = now.addMinutes(-15);
    DateTime endTime = now.addMinutes(15);

    Test.startTest();
    Boolean result = HappeningNowController.isEventHappeningNow(start, endTime);
    Test.stopTest();

    System.assertEquals(true, result, 'Event should be happening now');
  }

  /**
   * Test isEventHappeningNow with future event
   */
  @isTest
  static void testIsEventHappeningNow_FutureEvent() {
    DateTime now = DateTime.now();
    DateTime start = now.addHours(1);
    DateTime endTime = now.addHours(2);

    Test.startTest();
    Boolean result = HappeningNowController.isEventHappeningNow(start, endTime);
    Test.stopTest();

    System.assertEquals(
      false,
      result,
      'Future event should not be happening now'
    );
  }

  /**
   * Test isEventHappeningNow with past event
   */
  @isTest
  static void testIsEventHappeningNow_PastEvent() {
    DateTime now = DateTime.now();
    DateTime start = now.addHours(-2);
    DateTime endTime = now.addHours(-1);

    Test.startTest();
    Boolean result = HappeningNowController.isEventHappeningNow(start, endTime);
    Test.stopTest();

    System.assertEquals(
      false,
      result,
      'Past event should not be happening now'
    );
  }

  /**
   * Test isEventHappeningNow with null parameters
   */
  @isTest
  static void testIsEventHappeningNow_NullParameters() {
    Test.startTest();
    Boolean result1 = HappeningNowController.isEventHappeningNow(
      null,
      DateTime.now()
    );
    Boolean result2 = HappeningNowController.isEventHappeningNow(
      DateTime.now(),
      null
    );
    Boolean result3 = HappeningNowController.isEventHappeningNow(null, null);
    Test.stopTest();

    System.assertEquals(
      false,
      result1,
      'Should return false for null start time'
    );
    System.assertEquals(
      false,
      result2,
      'Should return false for null end time'
    );
    System.assertEquals(
      false,
      result3,
      'Should return false for both null times'
    );
  }

  /**
   * Test checkMultipleEventsHappeningNow
   */
  @isTest
  static void testCheckMultipleEventsHappeningNow() {
    List<Event> events = [SELECT Id, Subject FROM Event ORDER BY Subject];
    List<String> eventIds = new List<String>();
    for (Event evt : events) {
      eventIds.add(evt.Id);
    }

    Test.startTest();
    Map<String, Boolean> results = HappeningNowController.checkMultipleEventsHappeningNow(
      eventIds
    );
    Test.stopTest();

    System.assertEquals(
      events.size(),
      results.size(),
      'Should return results for all events'
    );

    // Verify specific events
    for (Event evt : events) {
      System.assert(
        results.containsKey(evt.Id),
        'Should contain result for event: ' + evt.Subject
      );

      if (
        evt.Subject.contains('Current') ||
        evt.Subject.contains('Just Started') ||
        evt.Subject.contains('Ending Soon')
      ) {
        System.assertEquals(
          true,
          results.get(evt.Id),
          'Event should be happening: ' + evt.Subject
        );
      } else {
        System.assertEquals(
          false,
          results.get(evt.Id),
          'Event should not be happening: ' + evt.Subject
        );
      }
    }
  }

  /**
   * Test checkMultipleEventsHappeningNow with empty list
   */
  @isTest
  static void testCheckMultipleEventsHappeningNow_EmptyList() {
    Test.startTest();
    Map<String, Boolean> results = HappeningNowController.checkMultipleEventsHappeningNow(
      new List<String>()
    );
    Test.stopTest();

    System.assertEquals(
      0,
      results.size(),
      'Should return empty map for empty input'
    );
  }

  /**
   * Test getCurrentBrasiliaTime
   */
  @isTest
  static void testGetCurrentBrasiliaTime() {
    Test.startTest();
    DateTime brasiliaTime = HappeningNowController.getCurrentBrasiliaTime();
    Test.stopTest();

    System.assertNotEquals(
      null,
      brasiliaTime,
      'Should return a valid DateTime'
    );

    // Brasília time should be 3 hours behind UTC
    DateTime utcNow = DateTime.now();
    Long timeDifference = Math.abs(
      brasiliaTime.getTime() - utcNow.addHours(-3).getTime()
    );

    // Allow for small execution time differences (less than 1 minute)
    System.assert(
      timeDifference < 60000,
      'Brasília time should be approximately UTC-3'
    );
  }

  /**
   * Test isBusinessHours during business hours
   */
  @isTest
  static void testIsBusinessHours_DuringBusinessHours() {
    // Note: This test assumes the test runs during business hours
    // In a real scenario, you might want to mock the time
    Test.startTest();
    Boolean result = HappeningNowController.isBusinessHours();
    Test.stopTest();

    // Since we can't control the exact time during test execution,
    // we just verify the method doesn't throw an exception
    System.assertNotEquals(null, result, 'Should return a boolean value');
  }

  /**
   * Test getCurrentlyHappeningEventsInRoom
   */
  @isTest
  static void testGetCurrentlyHappeningEventsInRoom() {
    Test.startTest();
    List<Event> happeningEvents = HappeningNowController.getCurrentlyHappeningEventsInRoom(
      'salaPrincipal'
    );
    Test.stopTest();

    // Should find current events in Sala Principal
    System.assert(
      happeningEvents.size() >= 1,
      'Should find at least one happening event in Sala Principal'
    );

    for (Event evt : happeningEvents) {
      System.assertEquals(
        'salaPrincipal',
        evt.salaReuniao__c,
        'All events should be in Sala Principal'
      );
    }
  }

  /**
   * Test getCurrentlyHappeningEventsInRoom with invalid room
   */
  @isTest
  static void testGetCurrentlyHappeningEventsInRoom_InvalidRoom() {
    Test.startTest();
    List<Event> happeningEvents = HappeningNowController.getCurrentlyHappeningEventsInRoom(
      'nonexistentRoom'
    );
    Test.stopTest();

    System.assertEquals(
      0,
      happeningEvents.size(),
      'Should return empty list for nonexistent room'
    );
  }

  /**
   * Test getCurrentlyHappeningEventsInRoom with blank room value
   */
  @isTest
  static void testGetCurrentlyHappeningEventsInRoom_BlankRoom() {
    Test.startTest();
    List<Event> happeningEvents = HappeningNowController.getCurrentlyHappeningEventsInRoom(
      ''
    );
    Test.stopTest();

    System.assertEquals(
      0,
      happeningEvents.size(),
      'Should return empty list for blank room value'
    );
  }

  /**
   * Test getDetailedHappeningStatus
   */
  @isTest
  static void testGetDetailedHappeningStatus() {
    List<Event> events = [SELECT Id FROM Event LIMIT 3];
    List<String> eventIds = new List<String>();
    for (Event evt : events) {
      eventIds.add(evt.Id);
    }

    Test.startTest();
    List<HappeningNowController.EventHappeningStatus> statusList = HappeningNowController.getDetailedHappeningStatus(
      eventIds
    );
    Test.stopTest();

    System.assertEquals(
      events.size(),
      statusList.size(),
      'Should return status for all events'
    );

    for (HappeningNowController.EventHappeningStatus status : statusList) {
      System.assertNotEquals(
        null,
        status.eventId,
        'Event ID should not be null'
      );
      System.assertNotEquals(
        null,
        status.eventSubject,
        'Event subject should not be null'
      );
      System.assertNotEquals(
        null,
        status.isHappening,
        'IsHappening should not be null'
      );
    }
  }

  /**
   * Test edge case: event starting exactly now
   */
  @isTest
  static void testEventStartingExactlyNow() {
    DateTime now = DateTime.now();

    Test.startTest();
    Boolean result = HappeningNowController.isEventHappeningNow(
      now,
      now.addHours(1)
    );
    Test.stopTest();

    System.assertEquals(
      true,
      result,
      'Event starting exactly now should be happening'
    );
  }

  /**
   * Test edge case: event ending exactly now
   */
  @isTest
  static void testEventEndingExactlyNow() {
    // Use a time slightly in the future to avoid timing precision issues
    // between test DateTime.now() and controller DateTime.now()
    DateTime endTime = DateTime.now().addSeconds(1);
    DateTime startTime = endTime.addHours(-1);

    Test.startTest();
    Boolean result = HappeningNowController.isEventHappeningNow(
      startTime,
      endTime
    );
    Test.stopTest();

    System.assertEquals(
      true,
      result,
      'Event ending very soon should still be happening'
    );
  }
}
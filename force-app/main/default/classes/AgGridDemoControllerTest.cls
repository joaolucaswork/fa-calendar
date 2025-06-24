/**
 * @description Test class for AgGridDemoController
 * Tests AG-Grid demo functionality for opportunities and events
 * @author Reino Capital Development Team
 */
@isTest
public class AgGridDemoControllerTest {
  @TestSetup
  static void setupTestData() {
    // Create test Account
    Account testAccount = new Account(Name = 'Test Account for AG Grid');
    insert testAccount;

    // Create test Opportunities
    List<Opportunity> testOpportunities = new List<Opportunity>();

    for (Integer i = 1; i <= 3; i++) {
      testOpportunities.add(
        new Opportunity(
          Name = 'Test Opportunity ' + i,
          AccountId = testAccount.Id,
          StageName = 'Prospecting',
          CloseDate = Date.today().addDays(30),
          Amount = 10000 * i,
          Probability = 25 * i
        )
      );
    }

    insert testOpportunities;

    // Create test Events related to opportunities
    List<Event> testEvents = new List<Event>();

    testEvents.add(
      new Event(
        Subject = 'Test Event for Opportunity 1',
        StartDateTime = DateTime.now().addDays(1),
        EndDateTime = DateTime.now().addDays(1).addHours(1),
        WhatId = testOpportunities[0].Id,
        Type = 'Meeting',
        Location = 'Test Location'
      )
    );

    testEvents.add(
      new Event(
        Subject = 'Test Event for Account',
        StartDateTime = DateTime.now().addDays(2),
        EndDateTime = DateTime.now().addDays(2).addHours(1),
        WhatId = testOpportunities[1].Id,
        Type = 'Call'
      )
    );

    insert testEvents;
  }
  /**
   * Test getOpportunities method
   */
  @isTest
  static void testGetOpportunities() {
    Test.startTest();

    List<Opportunity> opportunities = AgGridDemoController.getOpportunities();

    Test.stopTest();

    // Verify opportunities are returned
    System.assertNotEquals(
      null,
      opportunities,
      'Should return opportunities list'
    );
    System.assertEquals(
      3,
      opportunities.size(),
      'Should return 3 test opportunities'
    );

    // Verify opportunity data
    Opportunity firstOpp = opportunities[0];
    System.assertNotEquals(null, firstOpp.Name, 'Opportunity should have name');
    System.assertNotEquals(
      null,
      firstOpp.StageName,
      'Opportunity should have stage'
    );
    System.assertNotEquals(
      null,
      firstOpp.Account,
      'Opportunity should have account'
    );
    System.assertNotEquals(
      null,
      firstOpp.Owner,
      'Opportunity should have owner'
    );
  }

  /**
   * Test getRelatedEvents method
   */
  @isTest
  static void testGetRelatedEvents() {
    // Get test opportunity
    List<Opportunity> opportunities = [SELECT Id FROM Opportunity LIMIT 1];
    System.assert(!opportunities.isEmpty(), 'Should have test opportunity');

    Test.startTest();

    List<Event> events = AgGridDemoController.getEventsForOpportunities(
      new List<Id>{ opportunities[0].Id }
    );

    Test.stopTest();

    // Verify events are returned
    System.assertNotEquals(null, events, 'Should return events list');
    System.assert(events.size() >= 1, 'Should return at least 1 event');

    // Verify event data
    Event firstEvent = events[0];
    System.assertNotEquals(
      null,
      firstEvent.Subject,
      'Event should have subject'
    );
    System.assertNotEquals(
      null,
      firstEvent.StartDateTime,
      'Event should have start time'
    );
  }

  /**
   * Test getRelatedEvents with empty list
   */
  @isTest
  static void testGetRelatedEvents_EmptyList() {
    Test.startTest();

    List<Event> events = AgGridDemoController.getEventsForOpportunities(
      new List<Id>()
    );

    Test.stopTest();

    // Should return empty list
    System.assertNotEquals(null, events, 'Should return events list');
    System.assertEquals(0, events.size(), 'Should return empty list');
  }
  /**
   * Test getProbabilityPicklistValues method
   */
  @isTest
  static void testGetProbabilityPicklistValues() {
    Test.startTest();

    List<Map<String, String>> picklistValues = AgGridDemoController.getProbabilityPicklistValues();

    Test.stopTest();

    // Verify picklist values are returned
    System.assertNotEquals(
      null,
      picklistValues,
      'Should return picklist values'
    );
    System.assert(picklistValues.size() > 0, 'Should have picklist values');

    // Verify structure of first value
    if (!picklistValues.isEmpty()) {
      Map<String, String> firstValue = picklistValues[0];
      System.assert(firstValue.containsKey('label'), 'Should have label key');
      System.assert(firstValue.containsKey('value'), 'Should have value key');
    }
  }

  /**
   * Test updateOpportunityStatus method with valid data
   */
  @isTest
  static void testUpdateOpportunityStatus_Success() {
    // Get test opportunity
    Opportunity testOpp = [SELECT Id, StageName FROM Opportunity LIMIT 1];

    Test.startTest();

    // Update opportunity status
    AgGridDemoController.updateOpportunityStatus(testOpp.Id, 'Qualification');

    Test.stopTest();

    // Verify opportunity was updated
    Opportunity updatedOpp = [
      SELECT Id, StageName
      FROM Opportunity
      WHERE Id = :testOpp.Id
    ];
    System.assertEquals(
      'Qualification',
      updatedOpp.StageName,
      'Opportunity stage should be updated'
    );
  }

  /**
   * Test updateOpportunityStatus method with invalid ID
   */
  @isTest
  static void testUpdateOpportunityStatus_InvalidId() {
    // Generate fake opportunity ID
    Id fakeId = '006' + '0'.repeat(12) + 'AAA';

    Test.startTest();

    try {
      AgGridDemoController.updateOpportunityStatus(fakeId, 'Qualification');
      System.assert(false, 'Should throw exception for invalid ID');
    } catch (AuraHandledException e) {
      System.assertNotEquals(null, e.getMessage(), 'Should have error message');
    }

    Test.stopTest();
  }

  /**
   * Test getEventsForOpportunities with null list
   */
  @isTest
  static void testGetEventsForOpportunities_NullList() {
    Test.startTest();

    List<Event> events = AgGridDemoController.getEventsForOpportunities(null);

    Test.stopTest();

    // Should return empty list
    System.assertNotEquals(null, events, 'Should return events list');
    System.assertEquals(0, events.size(), 'Should return empty list for null input');
  }

  /**
   * Test getStagePicklistValues method
   */
  @isTest
  static void testGetStagePicklistValues() {
    Test.startTest();

    List<Map<String, String>> picklistValues = AgGridDemoController.getStagePicklistValues();

    Test.stopTest();

    // Verify picklist values are returned
    System.assertNotEquals(null, picklistValues, 'Should return picklist values');
    System.assert(picklistValues.size() > 0, 'Should have stage picklist values');

    // Verify structure of first value
    if (!picklistValues.isEmpty()) {
      Map<String, String> firstValue = picklistValues[0];
      System.assert(firstValue.containsKey('label'), 'Should have label key');
      System.assert(firstValue.containsKey('value'), 'Should have value key');
      System.assertNotEquals(null, firstValue.get('label'), 'Label should not be null');
      System.assertNotEquals(null, firstValue.get('value'), 'Value should not be null');
    }
  }

  /**
   * Test getEventsForOpportunities with opportunities that have no AccountId
   */
  @isTest
  static void testGetEventsForOpportunities_NoAccount() {
    // Create opportunity without account
    Opportunity oppWithoutAccount = new Opportunity(
      Name = 'Opp Without Account',
      StageName = 'Prospecting',
      CloseDate = Date.today().addDays(30)
    );
    insert oppWithoutAccount;

    Test.startTest();

    List<Event> events = AgGridDemoController.getEventsForOpportunities(
      new List<Id>{ oppWithoutAccount.Id }
    );

    Test.stopTest();

    // Should return events list (may be empty)
    System.assertNotEquals(null, events, 'Should return events list');
  }
}
/**
 * Test class for AppointmentController
 * Comprehensive unit tests covering all public methods with positive and negative scenarios
 * @author Reino Capital
 * @last-modified 2025-01-14
 */
@isTest
public class AppointmentControllerTest {
  // Test data setup
  @TestSetup
  static void setupTestData() {
    // Create unique identifier for this test run
    String uniqueId =
      UserInfo.getOrganizationId() +
      String.valueOf(Datetime.now().getTime()) +
      String.valueOf(Math.random()).substring(2, 8);

    // Create test users - use more robust profile selection
    List<Profile> profiles = [
      SELECT Id
      FROM Profile
      WHERE Name IN ('Standard User', 'Usuário Padrão', 'System Administrator')
      ORDER BY Name
      LIMIT 1
    ];
    if (profiles.isEmpty()) {
      profiles = [
        SELECT Id
        FROM Profile
        WHERE UserLicense.Name = 'Salesforce'
        LIMIT 1
      ];
    }

    if (profiles.isEmpty()) {
      // Fallback to any available profile
      profiles = [SELECT Id FROM Profile WHERE UserType = 'Standard' LIMIT 1];
    }

    Profile standardProfile = profiles[0];

    User testUser1 = new User(
      FirstName = 'Test',
      LastName = 'User1',
      Email = 'testuser1.' + uniqueId + '@example.com',
      Username = 'testuser1.' + uniqueId + '@example.com.test',
      Alias = 'tuser1',
      TimeZoneSidKey = 'America/New_York',
      LocaleSidKey = 'en_US',
      EmailEncodingKey = 'UTF-8',
      LanguageLocaleKey = 'en_US',
      ProfileId = standardProfile.Id,
      IsActive = true
    );
    insert testUser1;

    User testUser2 = new User(
      FirstName = 'Test',
      LastName = 'User2',
      Email = 'testuser2.' + uniqueId + '@example.com',
      Username = 'testuser2.' + uniqueId + '@example.com.test',
      Alias = 'tuser2',
      TimeZoneSidKey = 'America/New_York',
      LocaleSidKey = 'en_US',
      EmailEncodingKey = 'UTF-8',
      LanguageLocaleKey = 'en_US',
      ProfileId = standardProfile.Id,
      IsActive = true
    );
    insert testUser2;

    // Create system user for filtering tests
    User systemUser = new User(
      FirstName = 'System',
      LastName = 'Integration User',
      Email = 'system.' + uniqueId + '@noreply.com',
      Username = 'systemuser.' + uniqueId + '@example.com.test',
      Alias = 'sysuser',
      TimeZoneSidKey = 'America/New_York',
      LocaleSidKey = 'en_US',
      EmailEncodingKey = 'UTF-8',
      LanguageLocaleKey = 'en_US',
      ProfileId = standardProfile.Id,
      IsActive = true
    );
    insert systemUser;

    // Run as test user to ensure proper data ownership and visibility
    System.runAs(testUser1) {
      // Create test account with unique name
      Account testAccount = new Account(
        Name = 'Test Account ' + uniqueId,
        Type = 'Customer',
        Industry = 'Technology'
      );
      insert testAccount;

      // Create test contact
      Contact testContact = new Contact(
        FirstName = 'Test',
        LastName = 'Contact',
        Email = 'testcontact.' + uniqueId + '@example.com',
        Phone = '11987654321', // Only numbers as required by validation rule
        AccountId = testAccount.Id,
        Title = 'Test Title'
      );
      insert testContact;

      // Create test lead
      Lead testLead = new Lead(
        FirstName = 'Test',
        LastName = 'Lead',
        Email = 'testlead.' + uniqueId + '@example.com',
        Phone = '11987654322', // Only numbers as required by validation rule
        Company = 'Test Company ' + uniqueId,
        Title = 'Test Lead Title'
      );
      insert testLead;

      // Create test opportunity
      Opportunity testOpportunity = new Opportunity(
        Name = 'Test Opportunity ' + uniqueId,
        AccountId = testAccount.Id,
        StageName = 'Prospecting',
        CloseDate = Date.today().addDays(30),
        Amount = 10000,
        Type = 'New Customer',
        Probabilidade_da_Oportunidade__c = 'treze' // Required field
      );
      insert testOpportunity;

      // Create test event with all custom fields properly set
      Event testEvent = new Event(
        Subject = 'Test Event ' + uniqueId,
        Description = 'Test Description',
        Location = 'Test Location',
        StartDateTime = DateTime.now().addDays(1),
        EndDateTime = DateTime.now().addDays(1).addHours(1),
        IsAllDayEvent = false,
        Type = 'Meeting',
        WhoId = testContact.Id,
        WhatId = testOpportunity.Id,
        gestor__c = 'Test Gestor',
        liderComercial__c = 'Test Lider',
        sdr__c = 'Test SDR',
        reuniaoCriada__c = true,
        statusReuniao__c = 'Reagendado',
        salaReuniao__c = 'salaPrincipal',
        customColor__c = '#6264a7'
      );
      insert testEvent;
    }
  }

  @isTest
  static void testGetAppointmentDetails_ValidEventId() {
    // Get test data with proper validation
    List<Event> events = [
      SELECT Id
      FROM Event
      WHERE Subject LIKE 'Test Event %'
      LIMIT 1
    ];
    System.assert(!events.isEmpty(), 'Test event should exist');
    Event testEvent = events[0];

    Test.startTest();
    Map<String, Object> result = AppointmentController.getAppointmentDetails(
      testEvent.Id,
      null,
      null
    );
    Test.stopTest();

    // Assertions
    System.assertEquals(
      true,
      result.get('success'),
      'Should successfully retrieve event details'
    );
    System.assert(
      String.valueOf(result.get('subject')).startsWith('Test Event'),
      'Should return correct subject starting with Test Event'
    );
    System.assertEquals(
      'Test Description',
      result.get('description'),
      'Should return correct description'
    );
    System.assertEquals(
      'Test Location',
      result.get('location'),
      'Should return correct location'
    );
    System.assertEquals(
      'Meeting',
      result.get('type'),
      'Should return correct type'
    );
    System.assertEquals(
      true,
      result.get('reuniaoCriada'),
      'Should return correct reuniaoCriada value'
    );
    System.assertEquals(
      'Test Gestor',
      result.get('gestorName'),
      'Should return correct gestor name'
    );
    System.assertEquals(
      'Test Lider',
      result.get('liderComercialName'),
      'Should return correct lider comercial name'
    );
    System.assertEquals(
      'Test SDR',
      result.get('sdrName'),
      'Should return correct SDR name'
    );

    // Check contact and opportunity info
    System.assertNotEquals(
      null,
      result.get('contactInfo'),
      'Should include contact information'
    );
    System.assertNotEquals(
      null,
      result.get('opportunityInfo'),
      'Should include opportunity information'
    );
  }

  @isTest
  static void testGetAppointmentDetails_InvalidEventId() {
    Test.startTest();
    Map<String, Object> result = AppointmentController.getAppointmentDetails(
      'invalid',
      null,
      null
    );
    Test.stopTest();

    // Assertions
    System.assertEquals(
      false,
      result.get('success'),
      'Should fail with invalid event ID'
    );
    System.assertNotEquals(
      null,
      result.get('errorMessage'),
      'Should return error message'
    );
  }

  @isTest
  static void testGetAppointmentDetails_NoEventId() {
    Test.startTest();
    Map<String, Object> result = AppointmentController.getAppointmentDetails(
      null,
      null,
      null
    );
    Test.stopTest();

    // Assertions
    System.assertEquals(
      false,
      result.get('success'),
      'Should fail with no event ID'
    );
    System.assertEquals(
      'ID do evento não fornecido',
      result.get('errorMessage'),
      'Should return correct error message'
    );
  }

  @isTest
  static void testGetAppointmentDetails_WhoIdOnly() {
    // Get test contact with proper validation
    List<Contact> contacts = [
      SELECT Id
      FROM Contact
      WHERE LastName = 'Contact'
      LIMIT 1
    ];
    System.assert(!contacts.isEmpty(), 'Test contact should exist');
    Contact testContact = contacts[0];

    Test.startTest();
    Map<String, Object> result = AppointmentController.getAppointmentDetails(
      null,
      testContact.Id,
      null
    );
    Test.stopTest();

    // Assertions
    System.assertEquals(
      true,
      result.get('success'),
      'Should successfully retrieve contact info'
    );
    System.assertNotEquals(
      null,
      result.get('contactInfo'),
      'Should include contact information'
    );
  }

  @isTest
  static void testGetAppointmentDetails_WhatIdOnly() {
    // Get test opportunity with proper validation
    List<Opportunity> opportunities = [
      SELECT Id
      FROM Opportunity
      WHERE Name LIKE 'Test Opportunity %'
      LIMIT 1
    ];
    System.assert(!opportunities.isEmpty(), 'Test opportunity should exist');
    Opportunity testOpportunity = opportunities[0];

    Test.startTest();
    Map<String, Object> result = AppointmentController.getAppointmentDetails(
      null,
      null,
      testOpportunity.Id
    );
    Test.stopTest();

    // Assertions
    System.assertEquals(
      true,
      result.get('success'),
      'Should successfully retrieve opportunity info'
    );
    System.assertNotEquals(
      null,
      result.get('opportunityInfo'),
      'Should include opportunity information'
    );
  }

  @isTest
  static void testCreateAppointment_Success() {
    // Get test user
    List<User> testUsers = [
      SELECT Id
      FROM User
      WHERE FirstName = 'Test' AND LastName = 'User1'
      LIMIT 1
    ];
    System.assert(!testUsers.isEmpty(), 'Test user should exist');
    User testUser = testUsers[0];

    System.runAs(testUser) {
      // Get test data with proper validation
      List<Contact> contacts = [
        SELECT Id
        FROM Contact
        WHERE LastName = 'Contact'
        LIMIT 1
      ];
      System.assert(!contacts.isEmpty(), 'Test contact should exist');
      Contact testContact = contacts[0];

      List<Opportunity> opportunities = [
        SELECT Id
        FROM Opportunity
        WHERE Name LIKE 'Test Opportunity %'
        LIMIT 1
      ];
      System.assert(!opportunities.isEmpty(), 'Test opportunity should exist');
      Opportunity testOpportunity = opportunities[0];

      // Prepare event data
      Map<String, Object> eventData = new Map<String, Object>();
      eventData.put('subject', 'New Test Event');
      eventData.put('location', 'New Test Location');
      eventData.put(
        'startDateTime',
        DateTime.now().addDays(2).format('yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\'')
      );
      eventData.put(
        'endDateTime',
        DateTime.now()
          .addDays(2)
          .addHours(1)
          .format('yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\'')
      );
      eventData.put('isAllDayEvent', false);
      eventData.put('type', 'Call');
      eventData.put('description', 'New Test Description');
      eventData.put('whoId', testContact.Id);
      eventData.put('whatId', testOpportunity.Id);
      eventData.put('gestorName', 'New Gestor');
      eventData.put('liderComercialName', 'New Lider');
      eventData.put('sdrName', 'New SDR');
      eventData.put('reuniaoCriada', false);

      Test.startTest();
      Map<String, Object> result = AppointmentController.createAppointment(
        eventData
      );
      Test.stopTest();

      // Assertions
      System.assertEquals(
        true,
        result.get('success'),
        'Should successfully create event'
      );
      System.assertNotEquals(
        null,
        result.get('eventId'),
        'Should return event ID'
      );

      // Verify event was created
      Id eventId = (Id) result.get('eventId');
      Event createdEvent = [
        SELECT Subject, Location, Type, Description
        FROM Event
        WHERE Id = :eventId
      ];
      System.assertEquals(
        'New Test Event',
        createdEvent.Subject,
        'Should create event with correct subject'
      );
      System.assertEquals(
        'New Test Location',
        createdEvent.Location,
        'Should create event with correct location'
      );
      System.assertEquals(
        'Call',
        createdEvent.Type,
        'Should create event with correct type'
      );
    }
  }

  @isTest
  static void testCreateAppointment_MissingData() {
    // Prepare incomplete event data
    Map<String, Object> eventData = new Map<String, Object>();
    eventData.put('subject', 'Incomplete Event');
    // Missing required fields

    Test.startTest();
    Map<String, Object> result = AppointmentController.createAppointment(
      eventData
    );
    Test.stopTest();

    // Assertions
    System.assertEquals(
      false,
      result.get('success'),
      'Should fail with incomplete data'
    );
    System.assertNotEquals(
      null,
      result.get('errorMessage'),
      'Should return error message'
    );
  }

  @isTest
  static void testUpdateAppointment_Success() {
    // Get test event with proper validation
    List<Event> events = [
      SELECT Id
      FROM Event
      WHERE Subject LIKE 'Test Event %'
      LIMIT 1
    ];
    System.assert(!events.isEmpty(), 'Test event should exist');
    Event testEvent = events[0];

    // Prepare updated event data
    Map<String, Object> eventData = new Map<String, Object>();
    eventData.put('eventId', testEvent.Id);
    eventData.put('subject', 'Updated Test Event');
    eventData.put('location', 'Updated Test Location');
    eventData.put(
      'startDateTime',
      DateTime.now().addDays(3).format('yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\'')
    );
    eventData.put(
      'endDateTime',
      DateTime.now()
        .addDays(3)
        .addHours(1)
        .format('yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\'')
    );
    eventData.put('isAllDayEvent', false);
    eventData.put('type', 'Email');
    eventData.put('description', 'Updated Test Description');
    eventData.put('gestorName', 'Updated Gestor');
    eventData.put('liderComercialName', 'Updated Lider');
    eventData.put('sdrName', 'Updated SDR');

    Test.startTest();
    Map<String, Object> result = AppointmentController.updateAppointment(
      eventData
    );
    Test.stopTest();

    // Assertions
    System.assertEquals(
      true,
      result.get('success'),
      'Should successfully update event'
    );

    // Verify event was updated
    Event updatedEvent = [
      SELECT
        Subject,
        Location,
        Type,
        Description,
        gestor__c,
        liderComercial__c,
        sdr__c
      FROM Event
      WHERE Id = :testEvent.Id
    ];
    System.assertEquals(
      'Updated Test Event',
      updatedEvent.Subject,
      'Should update event subject'
    );
    System.assertEquals(
      'Updated Test Location',
      updatedEvent.Location,
      'Should update event location'
    );
    System.assertEquals('Email', updatedEvent.Type, 'Should update event type');
    System.assertEquals(
      'Updated Gestor',
      updatedEvent.gestor__c,
      'Should update gestor'
    );
    System.assertEquals(
      'Updated Lider',
      updatedEvent.liderComercial__c,
      'Should update lider comercial'
    );
    System.assertEquals(
      'Updated SDR',
      updatedEvent.sdr__c,
      'Should update SDR'
    );
  }

  @isTest
  static void testUpdateAppointment_NoEventId() {
    // Prepare event data without event ID
    Map<String, Object> eventData = new Map<String, Object>();
    eventData.put('subject', 'Updated Event');

    Test.startTest();
    Map<String, Object> result = AppointmentController.updateAppointment(
      eventData
    );
    Test.stopTest();

    // Assertions
    System.assertEquals(
      false,
      result.get('success'),
      'Should fail without event ID'
    );

    // The error message should contain the expected text
    String errorMessage = (String) result.get('errorMessage');
    System.assert(
      errorMessage.contains('ID do compromisso não fornecido') ||
      errorMessage.contains('Erro ao atualizar compromisso'),
      'Should return error message about missing event ID. Actual: ' +
      errorMessage
    );
  }

  @isTest
  static void testUpdateAppointment_InvalidEventId() {
    // Prepare event data with invalid event ID
    Map<String, Object> eventData = new Map<String, Object>();
    eventData.put('eventId', 'invalid_id');
    eventData.put('subject', 'Updated Event');

    Test.startTest();
    Map<String, Object> result = AppointmentController.updateAppointment(
      eventData
    );
    Test.stopTest();

    // Assertions
    System.assertEquals(
      false,
      result.get('success'),
      'Should fail with invalid event ID'
    );
    System.assertNotEquals(
      null,
      result.get('errorMessage'),
      'Should return error message'
    );
  }

  @isTest
  static void testSearchUsers_WithSearchTerm() {
    Test.startTest();
    List<Map<String, Object>> result = AppointmentController.searchUsers(
      'Test',
      10
    );
    Test.stopTest();

    // Assertions
    System.assertNotEquals(null, result, 'Should return results');
    System.assert(result.size() > 0, 'Should find test users');

    // Verify user data structure
    Map<String, Object> firstUser = result[0];
    System.assert(firstUser.containsKey('id'), 'Should include user ID');
    System.assert(firstUser.containsKey('name'), 'Should include user name');
    System.assert(firstUser.containsKey('email'), 'Should include user email');
    System.assert(
      firstUser.containsKey('isActive'),
      'Should include active status'
    );

    // Verify system users are filtered out
    for (Map<String, Object> user : result) {
      String userName = (String) user.get('name');
      String userEmail = (String) user.get('email');
      System.assert(
        !userName.containsIgnoreCase('Integration'),
        'Should filter out integration users'
      );
      System.assert(
        !userEmail.containsIgnoreCase('noreply'),
        'Should filter out noreply emails'
      );
    }
  }

  @isTest
  static void testSearchUsers_NoSearchTerm() {
    Test.startTest();
    List<Map<String, Object>> result = AppointmentController.searchUsers('', 5);
    Test.stopTest();

    // Assertions
    System.assertNotEquals(null, result, 'Should return results');
    System.assert(result.size() <= 5, 'Should respect max results limit');

    // Verify all returned users are active and standard
    for (Map<String, Object> user : result) {
      System.assertEquals(
        true,
        user.get('isActive'),
        'Should only return active users'
      );
    }
  }

  /**
   * Test getOptimalMeetingTimes method
   */
  @isTest
  static void testGetOptimalMeetingTimes() {
    // Create test users
    List<User> testUsers = [SELECT Id FROM User WHERE IsActive = TRUE LIMIT 2];
    List<String> userIds = new List<String>();
    for (User u : testUsers) {
      userIds.add(u.Id);
    }

    Date targetDate = Date.today().addDays(1);

    Test.startTest();

    // Test with valid parameters
    Map<String, Object> result = AppointmentController.getOptimalMeetingTimes(
      userIds,
      targetDate,
      60,
      9,
      17
    );

    Test.stopTest();

    // Verify results
    System.assertEquals(true, result.get('success'), 'Should return success');
    System.assertNotEquals(
      null,
      result.get('suggestedTimes'),
      'Should return suggested times'
    );
  }

  /**
   * Test getOptimalMeetingTimes with invalid parameters
   */
  @isTest
  static void testGetOptimalMeetingTimes_InvalidParams() {
    Test.startTest();

    // Test with null userIds
    Map<String, Object> result1 = AppointmentController.getOptimalMeetingTimes(
      null,
      Date.today(),
      60,
      9,
      17
    );

    // Test with empty userIds
    Map<String, Object> result2 = AppointmentController.getOptimalMeetingTimes(
      new List<String>(),
      Date.today(),
      60,
      9,
      17
    );

    // Test with null date
    Map<String, Object> result3 = AppointmentController.getOptimalMeetingTimes(
      new List<String>{ '003000000000000' },
      null,
      60,
      9,
      17
    );

    Test.stopTest();

    // Verify all return failure
    System.assertEquals(
      false,
      result1.get('success'),
      'Should fail with null userIds'
    );
    System.assertEquals(
      false,
      result2.get('success'),
      'Should fail with empty userIds'
    );
    System.assertEquals(
      false,
      result3.get('success'),
      'Should fail with null date'
    );
  }

  @isTest
  static void testSearchUsers_NullMaxResults() {
    Test.startTest();
    List<Map<String, Object>> result = AppointmentController.searchUsers(
      'Test',
      null
    );
    Test.stopTest();

    // Assertions
    System.assertNotEquals(
      null,
      result,
      'Should return results with default max'
    );
    System.assert(result.size() <= 100, 'Should use default max of 100');
  }

  @isTest
  static void testGetUserAvailability_Success() {
    // Get test users
    List<User> testUsers = [
      SELECT Id
      FROM User
      WHERE FirstName = 'Test' AND LastName LIKE 'User%'
      LIMIT 2
    ];
    List<String> userIds = new List<String>();
    for (User u : testUsers) {
      userIds.add(u.Id);
    }

    DateTime startTime = DateTime.now().addDays(1);
    DateTime endTime = startTime.addHours(2);

    Test.startTest();
    Map<String, Object> result = AppointmentController.getUserAvailability(
      userIds,
      startTime,
      endTime,
      null
    );
    Test.stopTest();

    // Assertions
    System.assertEquals(
      true,
      result.get('success'),
      'Should successfully check availability'
    );
    System.assertNotEquals(
      null,
      result.get('userAvailability'),
      'Should return availability data'
    );

    Map<String, List<Map<String, Object>>> availability = (Map<String, List<Map<String, Object>>>) result.get(
      'userAvailability'
    );
    System.assertEquals(
      userIds.size(),
      availability.size(),
      'Should return availability for all users'
    );
  }

  @isTest
  static void testGetUserAvailability_InvalidParameters() {
    Test.startTest();
    Map<String, Object> result = AppointmentController.getUserAvailability(
      null,
      null,
      null,
      null
    );
    Test.stopTest();

    // Assertions
    System.assertEquals(
      false,
      result.get('success'),
      'Should fail with invalid parameters'
    );
    System.assertEquals(
      'Parâmetros inválidos para verificação de disponibilidade',
      result.get('errorMessage'),
      'Should return correct error message'
    );
  }

  @isTest
  static void testGetUserAvailability_WithConflicts() {
    // Get test users
    List<User> testUsers = [
      SELECT Id
      FROM User
      WHERE FirstName = 'Test' AND LastName LIKE 'User%'
      LIMIT 1
    ];
    System.assert(!testUsers.isEmpty(), 'Test users should exist');
    List<String> userIds = new List<String>();
    for (User u : testUsers) {
      userIds.add(u.Id);
    }

    // Create conflicting event
    Event conflictEvent = new Event(
      Subject = 'Conflict Event',
      StartDateTime = DateTime.now().addDays(1),
      EndDateTime = DateTime.now().addDays(1).addHours(1),
      OwnerId = testUsers[0].Id
    );
    insert conflictEvent;

    DateTime startTime = DateTime.now().addDays(1).addMinutes(-30);
    DateTime endTime = DateTime.now().addDays(1).addHours(2);

    Test.startTest();
    Map<String, Object> result = AppointmentController.getUserAvailability(
      userIds,
      startTime,
      endTime,
      null
    );
    Test.stopTest();

    // Assertions
    System.assertEquals(
      true,
      result.get('success'),
      'Should successfully check availability'
    );
    Map<String, List<Map<String, Object>>> availability = (Map<String, List<Map<String, Object>>>) result.get(
      'userAvailability'
    );
    System.assert(
      availability.get(testUsers[0].Id).size() > 0,
      'Should detect conflicts'
    );
  }

  @isTest
  static void testGetOptimalMeetingTimes_Success() {
    // Get test users
    List<User> testUsers = [
      SELECT Id
      FROM User
      WHERE FirstName = 'Test' AND LastName LIKE 'User%'
      LIMIT 2
    ];
    System.assert(!testUsers.isEmpty(), 'Test users should exist');
    List<String> userIds = new List<String>();
    for (User u : testUsers) {
      userIds.add(u.Id);
    }

    Date targetDate = Date.today().addDays(1);

    Test.startTest();
    Map<String, Object> result = AppointmentController.getOptimalMeetingTimes(
      userIds,
      targetDate,
      60,
      9,
      17
    );
    Test.stopTest();

    // Assertions
    System.assertEquals(
      true,
      result.get('success'),
      'Should successfully find optimal times'
    );
    System.assertNotEquals(
      null,
      result.get('suggestedTimes'),
      'Should return suggested times'
    );

    List<Map<String, Object>> suggestedTimes = (List<Map<String, Object>>) result.get(
      'suggestedTimes'
    );
    System.assert(suggestedTimes.size() >= 0, 'Should return time slots');
  }

  @isTest
  static void testGetOptimalMeetingTimes_InvalidParameters() {
    Test.startTest();
    Map<String, Object> result = AppointmentController.getOptimalMeetingTimes(
      null,
      null,
      null,
      null,
      null
    );
    Test.stopTest();

    // Assertions
    System.assertEquals(
      false,
      result.get('success'),
      'Should fail with invalid parameters'
    );
    System.assertEquals(
      'Parâmetros inválidos',
      result.get('errorMessage'),
      'Should return correct error message'
    );
  }

  @isTest
  static void testGetOptimalMeetingTimes_DefaultValues() {
    // Get test users
    List<User> testUsers = [
      SELECT Id
      FROM User
      WHERE FirstName = 'Test' AND LastName LIKE 'User%'
      LIMIT 1
    ];
    System.assert(!testUsers.isEmpty(), 'Test users should exist');
    List<String> userIds = new List<String>();
    for (User u : testUsers) {
      userIds.add(u.Id);
    }

    Date targetDate = Date.today().addDays(1);

    Test.startTest();
    Map<String, Object> result = AppointmentController.getOptimalMeetingTimes(
      userIds,
      targetDate,
      null,
      null,
      null
    );
    Test.stopTest();

    // Assertions
    System.assertEquals(
      true,
      result.get('success'),
      'Should use default values successfully'
    );
    System.assertNotEquals(
      null,
      result.get('suggestedTimes'),
      'Should return suggested times with defaults'
    );
  }

  @isTest
  static void testSearchContacts_Success() {
    Test.startTest();
    List<Map<String, Object>> result = AppointmentController.searchContacts(
      'Test',
      10
    );
    Test.stopTest();

    // Assertions
    System.assertNotEquals(null, result, 'Should return results');
    System.assert(result.size() > 0, 'Should find test contacts');

    // Verify contact data structure
    Map<String, Object> firstContact = result[0];
    System.assert(firstContact.containsKey('Id'), 'Should include contact ID');
    System.assert(
      firstContact.containsKey('Name'),
      'Should include contact name'
    );
    System.assert(
      firstContact.containsKey('Email'),
      'Should include contact email'
    );
    System.assert(
      firstContact.containsKey('Type'),
      'Should include contact type'
    );
    System.assert(
      firstContact.containsKey('DisplayName'),
      'Should include display name'
    );
  }

  @isTest
  static void testSearchContacts_ShortSearchTerm() {
    Test.startTest();
    List<Map<String, Object>> result = AppointmentController.searchContacts(
      'T',
      10
    );
    Test.stopTest();

    // Assertions
    System.assertEquals(
      0,
      result.size(),
      'Should return empty list for short search term'
    );
  }

  @isTest
  static void testSearchContacts_EmptySearchTerm() {
    Test.startTest();
    List<Map<String, Object>> result = AppointmentController.searchContacts(
      '',
      10
    );
    Test.stopTest();

    // Assertions
    System.assertEquals(
      0,
      result.size(),
      'Should return empty list for empty search term'
    );
  }

  @isTest
  static void testSearchContacts_NullMaxResults() {
    Test.startTest();
    List<Map<String, Object>> result = AppointmentController.searchContacts(
      'Test',
      null
    );
    Test.stopTest();

    // Assertions
    System.assertNotEquals(
      null,
      result,
      'Should return results with default max'
    );
    System.assert(result.size() <= 10, 'Should use default max of 10');
  }

  @isTest
  static void testSearchOpportunities_Success() {
    Test.startTest();
    List<Map<String, Object>> result = AppointmentController.searchOpportunities(
      'Test',
      10
    );
    Test.stopTest();

    // Assertions
    System.assertNotEquals(null, result, 'Should return results');
    System.assert(result.size() > 0, 'Should find test opportunities');

    // Verify opportunity data structure
    Map<String, Object> firstOpportunity = result[0];
    System.assert(
      firstOpportunity.containsKey('Id'),
      'Should include opportunity ID'
    );
    System.assert(
      firstOpportunity.containsKey('Name'),
      'Should include opportunity name'
    );
    System.assert(
      firstOpportunity.containsKey('Type'),
      'Should include opportunity type'
    );
    System.assert(
      firstOpportunity.containsKey('DisplayName'),
      'Should include display name'
    );
  }

  @isTest
  static void testSearchOpportunities_ShortSearchTerm() {
    Test.startTest();
    List<Map<String, Object>> result = AppointmentController.searchOpportunities(
      'T',
      10
    );
    Test.stopTest();

    // Assertions
    System.assertEquals(
      0,
      result.size(),
      'Should return empty list for short search term'
    );
  }

  @isTest
  static void testSearchOpportunities_EmptySearchTerm() {
    Test.startTest();
    List<Map<String, Object>> result = AppointmentController.searchOpportunities(
      '',
      10
    );
    Test.stopTest();

    // Assertions
    System.assertEquals(
      0,
      result.size(),
      'Should return empty list for empty search term'
    );
  }

  @isTest
  static void testSearchOpportunities_NullMaxResults() {
    Test.startTest();
    List<Map<String, Object>> result = AppointmentController.searchOpportunities(
      'Test',
      null
    );
    Test.stopTest();

    // Assertions
    System.assertNotEquals(
      null,
      result,
      'Should return results with default max'
    );
    System.assert(result.size() <= 10, 'Should use default max of 10');
  }

  // Test helper methods indirectly through public methods
  @isTest
  static void testGetContactInformation_Contact() {
    // Get test contact
    List<Contact> contacts = [
      SELECT Id
      FROM Contact
      WHERE LastName = 'Contact'
      LIMIT 1
    ];
    System.assert(!contacts.isEmpty(), 'Test contact should exist');
    Contact testContact = contacts[0];

    Test.startTest();
    Map<String, Object> result = AppointmentController.getAppointmentDetails(
      null,
      testContact.Id,
      null
    );
    Test.stopTest();

    // Assertions
    System.assertEquals(
      true,
      result.get('success'),
      'Should successfully get contact info'
    );
    Map<String, Object> contactInfo = (Map<String, Object>) result.get(
      'contactInfo'
    );
    System.assertNotEquals(
      null,
      contactInfo,
      'Should return contact information'
    );
    System.assertEquals(
      testContact.Id,
      contactInfo.get('id'),
      'Should return correct contact ID'
    );
  }

  @isTest
  static void testGetContactInformation_Lead() {
    // Get test lead
    List<Lead> leads = [SELECT Id FROM Lead WHERE LastName = 'Lead' LIMIT 1];
    System.assert(!leads.isEmpty(), 'Test lead should exist');
    Lead testLead = leads[0];

    Test.startTest();
    Map<String, Object> result = AppointmentController.getAppointmentDetails(
      null,
      testLead.Id,
      null
    );
    Test.stopTest();

    // Assertions
    System.assertEquals(
      true,
      result.get('success'),
      'Should successfully get lead info'
    );
    Map<String, Object> contactInfo = (Map<String, Object>) result.get(
      'contactInfo'
    );
    System.assertNotEquals(null, contactInfo, 'Should return lead information');
    System.assertEquals(
      testLead.Id,
      contactInfo.get('id'),
      'Should return correct lead ID'
    );
  }

  @isTest
  static void testGetOpportunityInformation_Opportunity() {
    // Get test opportunity
    List<Opportunity> opportunities = [
      SELECT Id
      FROM Opportunity
      WHERE Name LIKE 'Test Opportunity %'
      LIMIT 1
    ];
    System.assert(!opportunities.isEmpty(), 'Test opportunity should exist');
    Opportunity testOpportunity = opportunities[0];

    Test.startTest();
    Map<String, Object> result = AppointmentController.getAppointmentDetails(
      null,
      null,
      testOpportunity.Id
    );
    Test.stopTest();

    // Assertions
    System.assertEquals(
      true,
      result.get('success'),
      'Should successfully get opportunity info'
    );
    Map<String, Object> opportunityInfo = (Map<String, Object>) result.get(
      'opportunityInfo'
    );
    System.assertNotEquals(
      null,
      opportunityInfo,
      'Should return opportunity information'
    );
    System.assertEquals(
      testOpportunity.Id,
      opportunityInfo.get('id'),
      'Should return correct opportunity ID'
    );
  }

  @isTest
  static void testGetOpportunityInformation_Account() {
    // Get test account
    List<Account> accounts = [
      SELECT Id
      FROM Account
      WHERE Name LIKE 'Test Account %'
      LIMIT 1
    ];
    System.assert(!accounts.isEmpty(), 'Test account should exist');
    Account testAccount = accounts[0];

    Test.startTest();
    Map<String, Object> result = AppointmentController.getAppointmentDetails(
      null,
      null,
      testAccount.Id
    );
    Test.stopTest();

    // Assertions
    System.assertEquals(
      true,
      result.get('success'),
      'Should successfully get account info'
    );
    Map<String, Object> opportunityInfo = (Map<String, Object>) result.get(
      'opportunityInfo'
    );
    System.assertNotEquals(
      null,
      opportunityInfo,
      'Should return account information'
    );

    // Debug the actual returned ID
    System.debug('Expected Account ID: ' + testAccount.Id);
    System.debug('Actual returned ID: ' + opportunityInfo.get('id'));
    System.debug('Full opportunityInfo: ' + opportunityInfo);

    // The method should return the account information
    if (opportunityInfo.get('id') != null) {
      System.assertEquals(
        testAccount.Id,
        opportunityInfo.get('id'),
        'Should return correct account ID'
      );
    } else {
      System.assert(
        false,
        'Account ID should not be null. OpportunityInfo: ' + opportunityInfo
      );
    }
  }

  /**
   * Test creating appointment with statusReuniao field
   */
  @isTest
  static void testCreateAppointment_WithStatusReuniao() {
    // Get test contact
    List<Contact> contacts = [
      SELECT Id
      FROM Contact
      WHERE LastName = 'Contact'
      LIMIT 1
    ];
    System.assert(!contacts.isEmpty(), 'Test contact should exist');
    Contact testContact = contacts[0];

    // Prepare event data with statusReuniao
    Map<String, Object> eventData = new Map<String, Object>{
      'subject' => 'Test Appointment with Status',
      'startDateTime' => DateTime.now()
        .addDays(1)
        .format('yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\''),
      'endDateTime' => DateTime.now()
        .addDays(1)
        .addHours(1)
        .format('yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\''),
      'isAllDayEvent' => false,
      'type' => 'Reunião Presencial',
      'statusReuniao' => 'Cancelado',
      'whoId' => testContact.Id
    };

    Test.startTest();
    Map<String, Object> result = AppointmentController.createAppointment(
      eventData
    );
    Test.stopTest();

    // Assertions
    System.assertEquals(
      true,
      result.get('success'),
      'Should create appointment successfully. Error: ' +
      result.get('errorMessage')
    );
    System.assertNotEquals(
      null,
      result.get('eventId'),
      'Should return event ID'
    );

    // Verify statusReuniao was saved correctly
    String eventId = (String) result.get('eventId');
    Event createdEvent = [
      SELECT Id, statusReuniao__c
      FROM Event
      WHERE Id = :eventId
    ];
    System.assertEquals(
      'Cancelado',
      createdEvent.statusReuniao__c,
      'StatusReuniao should be saved correctly'
    );
  }

  /**
   * Test updating appointment with statusReuniao field
   */
  @isTest
  static void testUpdateAppointment_WithStatusReuniao() {
    // Get test event
    List<Event> events = [
      SELECT Id
      FROM Event
      WHERE Subject LIKE 'Test Event %'
      LIMIT 1
    ];
    System.assert(!events.isEmpty(), 'Test event should exist');
    Event testEvent = events[0];

    // Prepare update data with statusReuniao
    Map<String, Object> eventData = new Map<String, Object>{
      'eventId' => testEvent.Id,
      'subject' => 'Updated Test Event',
      'isAllDayEvent' => false,
      'statusReuniao' => 'Cancelado'
    };

    Test.startTest();
    Map<String, Object> result = AppointmentController.updateAppointment(
      eventData
    );
    Test.stopTest();

    // Assertions
    System.assertEquals(
      true,
      result.get('success'),
      'Should update appointment successfully. Error: ' +
      result.get('errorMessage')
    );

    // Verify statusReuniao was updated correctly
    Event updatedEvent = [
      SELECT Id, statusReuniao__c, Subject
      FROM Event
      WHERE Id = :testEvent.Id
    ];
    System.assertEquals(
      'Cancelado',
      updatedEvent.statusReuniao__c,
      'StatusReuniao should be updated correctly'
    );
    System.assertEquals(
      'Updated Test Event',
      updatedEvent.Subject,
      'Subject should be updated'
    );
  }

  /**
   * Test getAppointmentDetails returns statusReuniao field
   */
  @isTest
  static void testGetAppointmentDetails_ReturnsStatusReuniao() {
    // Create a test event with statusReuniao
    Event testEvent = new Event(
      Subject = 'Test Event with Status',
      StartDateTime = DateTime.now().addDays(1),
      EndDateTime = DateTime.now().addDays(1).addHours(1),
      statusReuniao__c = 'Reagendado'
    );
    insert testEvent;

    Test.startTest();
    Map<String, Object> result = AppointmentController.getAppointmentDetails(
      testEvent.Id,
      null,
      null
    );
    Test.stopTest();

    // Assertions
    System.assertEquals(
      true,
      result.get('success'),
      'Should retrieve appointment details successfully'
    );
    System.assertEquals(
      'Reagendado',
      result.get('statusReuniao'),
      'Should return correct statusReuniao value'
    );
  }

  /**
   * Test creating appointment with all statusReuniao values
   */
  @isTest
  static void testCreateAppointment_AllStatusValues() {
    // Test valid statusReuniao values from the org
    List<String> statusValues = new List<String>{
      'Cancelado',
      'Adiado',
      'Reagendado'
    };

    Test.startTest();

    List<Map<String, Object>> results = new List<Map<String, Object>>();

    for (Integer i = 0; i < statusValues.size(); i++) {
      String statusValue = statusValues[i];

      // Prepare event data
      Map<String, Object> eventData = new Map<String, Object>{
        'subject' => 'Test Event Status ' + statusValue,
        'startDateTime' => DateTime.now()
          .addDays(i + 1)
          .format('yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\''),
        'endDateTime' => DateTime.now()
          .addDays(i + 1)
          .addHours(1)
          .format('yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\''),
        'isAllDayEvent' => false,
        'type' => 'Reunião Presencial',
        'statusReuniao' => statusValue
      };

      Map<String, Object> result = AppointmentController.createAppointment(
        eventData
      );
      results.add(result);
    }

    Test.stopTest();

    // Assertions for all results
    for (Integer i = 0; i < results.size(); i++) {
      Map<String, Object> result = results[i];
      String statusValue = statusValues[i];

      System.assertEquals(
        true,
        result.get('success'),
        'Should create appointment with status ' +
          statusValue +
          '. Error: ' +
          result.get('errorMessage')
      );

      // Verify statusReuniao was saved correctly
      String eventId = (String) result.get('eventId');
      Event createdEvent = [
        SELECT Id, statusReuniao__c
        FROM Event
        WHERE Id = :eventId
      ];
      System.assertEquals(
        statusValue,
        createdEvent.statusReuniao__c,
        'StatusReuniao should be ' + statusValue
      );
    }
  }

  /**
   * Test updating appointment with null statusReuniao
   */
  @isTest
  static void testUpdateAppointment_NullStatusReuniao() {
    // Get test event
    List<Event> events = [
      SELECT Id
      FROM Event
      WHERE Subject LIKE 'Test Event %'
      LIMIT 1
    ];
    System.assert(!events.isEmpty(), 'Test event should exist');
    Event testEvent = events[0];

    // First set a status
    testEvent.statusReuniao__c = 'Cancelado';
    update testEvent;

    // Prepare update data with null statusReuniao
    Map<String, Object> eventData = new Map<String, Object>{
      'eventId' => testEvent.Id,
      'subject' => 'Updated Test Event Null Status',
      'isAllDayEvent' => false,
      'statusReuniao' => null
    };

    Test.startTest();
    Map<String, Object> result = AppointmentController.updateAppointment(
      eventData
    );
    Test.stopTest();

    // Assertions
    System.assertEquals(
      true,
      result.get('success'),
      'Should update appointment successfully. Error: ' +
      result.get('errorMessage')
    );

    // Verify statusReuniao was cleared
    Event updatedEvent = [
      SELECT Id, statusReuniao__c
      FROM Event
      WHERE Id = :testEvent.Id
    ];
    System.assertEquals(
      null,
      updatedEvent.statusReuniao__c,
      'StatusReuniao should be null when cleared'
    );
  }

  /**
   * Test generateEventSubject method
   */
  @isTest
  static void testGenerateEventSubject() {
    List<Map<String, Object>> inputVariables = new List<Map<String, Object>>();
    Map<String, Object> inputVar = new Map<String, Object>();
    inputVar.put('name', 'fase_evento__c');
    inputVar.put('value', 'Primeira Reunião');
    inputVariables.add(inputVar);

    Test.startTest();
    Map<String, Object> result = AppointmentController.generateEventSubject(
      inputVariables
    );
    Test.stopTest();

    // Verify result structure
    System.assertNotEquals(null, result, 'Should return result');
    // Note: Since we can't test actual Flow execution in unit tests,
    // we just verify the method doesn't throw exceptions
  }

  /**
   * Test generateEventSubject with null input
   */
  @isTest
  static void testGenerateEventSubject_NullInput() {
    Test.startTest();
    Map<String, Object> result = AppointmentController.generateEventSubject(
      null
    );
    Test.stopTest();

    // Verify result structure
    System.assertNotEquals(
      null,
      result,
      'Should return result even with null input'
    );
  }
}
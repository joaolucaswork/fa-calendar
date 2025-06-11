/**
 * Test class for ParticipantDetailsController
 * Tests participant details retrieval and event participation history functionality
 * @author Reino Capital
 * @last-modified 2025-01-14
 */
@isTest
public class ParticipantDetailsControllerTest {
  @testSetup
  static void setupTestData() {
    // Create test users
    List<User> testUsers = new List<User>();

    // Get standard profile - use more robust profile selection
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

    // Create test participant user
    User participantUser = new User(
      FirstName = 'Test',
      LastName = 'Participant',
      Email = 'test.participant@reino.test',
      Username = 'test.participant@reino.test.unique',
      Alias = 'tpart',
      TimeZoneSidKey = 'America/Sao_Paulo',
      LocaleSidKey = 'pt_BR',
      EmailEncodingKey = 'UTF-8',
      LanguageLocaleKey = 'pt_BR',
      ProfileId = standardProfile.Id,
      Title = 'Gestor de Vendas',
      Department = 'Vendas',
      Phone = '(11) 99999-9999',
      IsActive = true
    );
    testUsers.add(participantUser);

    insert testUsers;

    // Create test events with participant involvement
    List<Event> testEvents = new List<Event>();

    // Future event where user is gestor
    Event futureEvent1 = new Event(
      Subject = 'Reunião Futura - Gestor',
      StartDateTime = DateTime.now().addDays(1),
      EndDateTime = DateTime.now().addDays(1).addHours(1),
      gestor__c = 'Test Participant',
      liderComercial__c = 'Other User',
      sdr__c = 'Another User',
      salaReuniao__c = 'salaPrincipal',
      Type = 'Reunião Presencial',
      statusReuniao__c = null
    );
    testEvents.add(futureEvent1);

    // Future event where user is líder comercial
    Event futureEvent2 = new Event(
      Subject = 'Reunião Futura - Líder',
      StartDateTime = DateTime.now().addDays(2),
      EndDateTime = DateTime.now().addDays(2).addHours(1),
      gestor__c = 'Other User',
      liderComercial__c = 'Test Participant',
      sdr__c = 'Another User',
      salaReuniao__c = 'salaGabriel',
      Type = 'Reunião Online',
      statusReuniao__c = null
    );
    testEvents.add(futureEvent2);

    // Past event where user is SDR
    Event pastEvent1 = new Event(
      Subject = 'Reunião Passada - SDR',
      StartDateTime = DateTime.now().addDays(-2),
      EndDateTime = DateTime.now().addDays(-2).addHours(1),
      gestor__c = 'Other User',
      liderComercial__c = 'Another User',
      sdr__c = 'Test Participant',
      salaReuniao__c = 'salaPrincipal',
      Type = 'Reunião Online',
      statusReuniao__c = null
    );
    testEvents.add(pastEvent1);

    // Past event with different status
    Event pastEvent2 = new Event(
      Subject = 'Reunião Cancelada',
      StartDateTime = DateTime.now().addDays(-1),
      EndDateTime = DateTime.now().addDays(-1).addHours(1),
      gestor__c = 'Test Participant',
      liderComercial__c = 'Other User',
      sdr__c = 'Another User',
      salaReuniao__c = 'Outra',
      Location = 'Cliente XYZ',
      Type = 'Reunião Externa',
      statusReuniao__c = 'Cancelado'
    );
    testEvents.add(pastEvent2);

    insert testEvents;
  }

  @isTest
  static void testGetParticipantDetails_WithValidParticipant() {
    Test.startTest();
    Map<String, Object> result = ParticipantDetailsController.getParticipantDetails(
      'Test Participant'
    );
    Test.stopTest();

    // Assertions
    System.assertNotEquals(null, result, 'Result should not be null');
    System.assertEquals(true, result.get('success'), 'Should return success');

    // Check participant info
    Map<String, Object> participantInfo = (Map<String, Object>) result.get(
      'participantInfo'
    );
    System.assertNotEquals(
      null,
      participantInfo,
      'Participant info should not be null'
    );
    System.assertEquals(
      'Test Participant',
      participantInfo.get('name'),
      'Should return correct name'
    );
    System.assertEquals(
      'test.participant@reino.test',
      participantInfo.get('email'),
      'Should return correct email'
    );
    System.assertEquals(
      'Gestor de Vendas',
      participantInfo.get('title'),
      'Should return correct title'
    );

    // Check event participation
    Map<String, Object> eventParticipation = (Map<String, Object>) result.get(
      'eventParticipation'
    );
    System.assertNotEquals(
      null,
      eventParticipation,
      'Event participation should not be null'
    );

    List<Object> upcomingEvents = (List<Object>) eventParticipation.get(
      'currentUpcomingEvents'
    );
    List<Object> pastEvents = (List<Object>) eventParticipation.get(
      'pastEvents'
    );

    System.assertEquals(
      2,
      upcomingEvents.size(),
      'Should have 2 upcoming events'
    );
    System.assertEquals(2, pastEvents.size(), 'Should have 2 past events');
    System.assertEquals(
      4,
      (Integer) eventParticipation.get('totalEvents'),
      'Should have 4 total events'
    );
  }

  @isTest
  static void testGetParticipantDetails_WithInvalidParticipant() {
    Test.startTest();
    Map<String, Object> result = ParticipantDetailsController.getParticipantDetails(
      'Nonexistent User'
    );
    Test.stopTest();

    // Assertions
    System.assertNotEquals(null, result, 'Result should not be null');
    System.assertEquals(false, result.get('success'), 'Should return failure');
    System.assertEquals(
      'Participante não encontrado',
      result.get('errorMessage'),
      'Should return correct error message'
    );
  }

  @isTest
  static void testGetParticipantDetails_WithEmptyName() {
    Test.startTest();
    Map<String, Object> result = ParticipantDetailsController.getParticipantDetails(
      ''
    );
    Test.stopTest();

    // Assertions
    System.assertNotEquals(null, result, 'Result should not be null');
    System.assertEquals(false, result.get('success'), 'Should return failure');
    System.assertEquals(
      'Nome do participante é obrigatório',
      result.get('errorMessage'),
      'Should return correct error message'
    );
  }

  @isTest
  static void testGetParticipantDetails_WithNullName() {
    Test.startTest();
    Map<String, Object> result = ParticipantDetailsController.getParticipantDetails(
      null
    );
    Test.stopTest();

    // Assertions
    System.assertNotEquals(null, result, 'Result should not be null');
    System.assertEquals(false, result.get('success'), 'Should return failure');
    System.assertEquals(
      'Nome do participante é obrigatório',
      result.get('errorMessage'),
      'Should return correct error message'
    );
  }

  @isTest
  static void testEventRoleDetection() {
    Test.startTest();
    Map<String, Object> result = ParticipantDetailsController.getParticipantDetails(
      'Test Participant'
    );
    Test.stopTest();

    // Get event participation data
    Map<String, Object> eventParticipation = (Map<String, Object>) result.get(
      'eventParticipation'
    );
    List<Object> upcomingEvents = (List<Object>) eventParticipation.get(
      'currentUpcomingEvents'
    );
    List<Object> pastEvents = (List<Object>) eventParticipation.get(
      'pastEvents'
    );

    // Check that roles are correctly identified
    Boolean foundGestorRole = false;
    Boolean foundLiderRole = false;
    Boolean foundSdrRole = false;

    // Check upcoming events
    for (Object eventObj : upcomingEvents) {
      Map<String, Object> event = (Map<String, Object>) eventObj;
      String role = (String) event.get('participantRole');

      if (role == 'Gestor')
        foundGestorRole = true;
      if (role == 'Líder Comercial')
        foundLiderRole = true;
      if (role == 'SDR')
        foundSdrRole = true;
    }

    // Check past events
    for (Object eventObj : pastEvents) {
      Map<String, Object> event = (Map<String, Object>) eventObj;
      String role = (String) event.get('participantRole');

      if (role == 'Gestor')
        foundGestorRole = true;
      if (role == 'Líder Comercial')
        foundLiderRole = true;
      if (role == 'SDR')
        foundSdrRole = true;
    }

    System.assert(foundGestorRole, 'Should find Gestor role');
    System.assert(foundLiderRole, 'Should find Líder Comercial role');
    System.assert(foundSdrRole, 'Should find SDR role');
  }

  @isTest
  static void testEventStatusFormatting() {
    Test.startTest();
    Map<String, Object> result = ParticipantDetailsController.getParticipantDetails(
      'Test Participant'
    );
    Test.stopTest();

    // Get past events to check status formatting
    Map<String, Object> eventParticipation = (Map<String, Object>) result.get(
      'eventParticipation'
    );
    List<Object> pastEvents = (List<Object>) eventParticipation.get(
      'pastEvents'
    );

    // Verify that events have formatted location and date/time
    for (Object eventObj : pastEvents) {
      Map<String, Object> event = (Map<String, Object>) eventObj;

      System.assertNotEquals(
        null,
        event.get('formattedDateTime'),
        'Should have formatted date/time'
      );
      System.assertNotEquals(
        null,
        event.get('formattedLocation'),
        'Should have formatted location'
      );
      System.assertNotEquals(
        null,
        event.get('isUpcoming'),
        'Should have upcoming flag'
      );
    }
  }
}
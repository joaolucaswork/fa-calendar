/**
 * Test class for EventParticipantController
 * Tests participant data retrieval and formatting functionality
 * @author Reino Capital
 * @last-modified 2025-01-14
 */
@isTest
public class EventParticipantControllerTest {
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

    // Create test users with different roles
    User gestorUser = new User(
      FirstName = 'Test',
      LastName = 'Gestor',
      Email = 'test.gestor@reino.test',
      Username = 'test.gestor@reino.test.unique',
      Alias = 'tgestor',
      TimeZoneSidKey = 'America/Sao_Paulo',
      LocaleSidKey = 'pt_BR',
      EmailEncodingKey = 'UTF-8',
      LanguageLocaleKey = 'pt_BR',
      ProfileId = standardProfile.Id,
      Title = 'Gestor de Vendas',
      IsActive = true
    );
    testUsers.add(gestorUser);

    User liderUser = new User(
      FirstName = 'Test',
      LastName = 'Lider',
      Email = 'test.lider@reino.test',
      Username = 'test.lider@reino.test.unique',
      Alias = 'tlider',
      TimeZoneSidKey = 'America/Sao_Paulo',
      LocaleSidKey = 'pt_BR',
      EmailEncodingKey = 'UTF-8',
      LanguageLocaleKey = 'pt_BR',
      ProfileId = standardProfile.Id,
      Title = 'Líder Comercial',
      IsActive = true
    );
    testUsers.add(liderUser);

    User sdrUser = new User(
      FirstName = 'Test',
      LastName = 'SDR',
      Email = 'test.sdr@reino.test',
      Username = 'test.sdr@reino.test.unique',
      Alias = 'tsdr',
      TimeZoneSidKey = 'America/Sao_Paulo',
      LocaleSidKey = 'pt_BR',
      EmailEncodingKey = 'UTF-8',
      LanguageLocaleKey = 'pt_BR',
      ProfileId = standardProfile.Id,
      Title = 'SDR',
      IsActive = true
    );
    testUsers.add(sdrUser);

    insert testUsers;

    // Create test event with participants
    Event testEvent = new Event(
      Subject = 'Test Meeting',
      StartDateTime = DateTime.now().addDays(1),
      EndDateTime = DateTime.now().addDays(1).addHours(1),
      gestor__c = 'Test Gestor',
      liderComercial__c = 'Test Lider',
      sdr__c = 'Test SDR'
    );
    insert testEvent;
  }

  @isTest
  static void testGetParticipantData_WithValidNames() {
    List<String> participantNames = new List<String>{
      'Test Gestor',
      'Test Lider',
      'Test SDR'
    };

    Test.startTest();
    List<Map<String, Object>> result = EventParticipantController.getParticipantData(
      participantNames
    );
    Test.stopTest();

    // Assertions
    System.assertNotEquals(null, result, 'Result should not be null');
    System.assertEquals(3, result.size(), 'Should return 3 participants');

    // Verify data structure
    for (Map<String, Object> participant : result) {
      System.assert(participant.containsKey('id'), 'Should contain user ID');
      System.assert(
        participant.containsKey('name'),
        'Should contain user name'
      );
      System.assert(
        participant.containsKey('photoUrl'),
        'Should contain photo URL'
      );
      System.assert(
        participant.containsKey('title'),
        'Should contain user title'
      );
      System.assert(
        participant.containsKey('email'),
        'Should contain user email'
      );
      System.assert(
        participant.containsKey('isActive'),
        'Should contain active status'
      );
    }
  }

  @isTest
  static void testGetParticipantData_WithEmptyList() {
    List<String> participantNames = new List<String>();

    Test.startTest();
    List<Map<String, Object>> result = EventParticipantController.getParticipantData(
      participantNames
    );
    Test.stopTest();

    // Assertions
    System.assertNotEquals(null, result, 'Result should not be null');
    System.assertEquals(0, result.size(), 'Should return empty list');
  }

  @isTest
  static void testGetParticipantData_WithNullList() {
    Test.startTest();
    List<Map<String, Object>> result = EventParticipantController.getParticipantData(
      null
    );
    Test.stopTest();

    // Assertions
    System.assertNotEquals(null, result, 'Result should not be null');
    System.assertEquals(0, result.size(), 'Should return empty list');
  }

  @isTest
  static void testGetEventParticipants_WithValidEventId() {
    Event testEvent = [
      SELECT Id
      FROM Event
      WHERE Subject = 'Test Meeting'
      LIMIT 1
    ];

    Test.startTest();
    List<Map<String, Object>> result = EventParticipantController.getEventParticipants(
      testEvent.Id
    );
    Test.stopTest();

    // Assertions
    System.assertNotEquals(null, result, 'Result should not be null');
    System.assertEquals(3, result.size(), 'Should return 3 participants');
  }

  @isTest
  static void testGetEventParticipants_WithInvalidEventId() {
    Test.startTest();
    List<Map<String, Object>> result = EventParticipantController.getEventParticipants(
      'invalid-id'
    );
    Test.stopTest();

    // Assertions
    System.assertNotEquals(null, result, 'Result should not be null');
    System.assertEquals(
      0,
      result.size(),
      'Should return empty list for invalid ID'
    );
  }

  @isTest
  static void testFormatParticipantNames_WithMultipleNames() {
    List<String> participantNames = new List<String>{
      'João Silva',
      'Maria Santos',
      'Pedro Costa'
    };

    Test.startTest();
    String result = EventParticipantController.formatParticipantNames(
      participantNames,
      2
    );
    Test.stopTest();

    // Assertions
    System.assertNotEquals(null, result, 'Result should not be null');
    System.assert(
      result.contains('João Silva'),
      'Should contain first participant'
    );
    System.assert(
      result.contains('Maria Santos'),
      'Should contain second participant'
    );
    System.assert(result.contains('+1 mais'), 'Should show remaining count');
  }

  @isTest
  static void testFormatParticipantNames_WithFewNames() {
    List<String> participantNames = new List<String>{
      'João Silva',
      'Maria Santos'
    };

    Test.startTest();
    String result = EventParticipantController.formatParticipantNames(
      participantNames,
      3
    );
    Test.stopTest();

    // Assertions
    System.assertNotEquals(null, result, 'Result should not be null');
    System.assertEquals(
      'João Silva, Maria Santos',
      result,
      'Should show all names'
    );
  }

  @isTest
  static void testFormatParticipantNames_WithEmptyList() {
    List<String> participantNames = new List<String>();

    Test.startTest();
    String result = EventParticipantController.formatParticipantNames(
      participantNames,
      2
    );
    Test.stopTest();

    // Assertions
    System.assertEquals('', result, 'Should return empty string');
  }

  @isTest
  static void testGetParticipantRoles_WithAllRoles() {
    Test.startTest();
    Map<String, Object> result = EventParticipantController.getParticipantRoles(
      'Test Gestor',
      'Test Lider',
      'Test SDR'
    );
    Test.stopTest();

    // Assertions
    System.assertNotEquals(null, result, 'Result should not be null');
    System.assertEquals(3, result.size(), 'Should return 3 roles');
    System.assert(result.containsKey('gestor'), 'Should contain gestor role');
    System.assert(
      result.containsKey('liderComercial'),
      'Should contain lider comercial role'
    );
    System.assert(result.containsKey('sdr'), 'Should contain SDR role');
  }

  @isTest
  static void testGetParticipantRoles_WithPartialRoles() {
    Test.startTest();
    Map<String, Object> result = EventParticipantController.getParticipantRoles(
      'Test Gestor',
      null,
      'Test SDR'
    );
    Test.stopTest();

    // Assertions
    System.assertNotEquals(null, result, 'Result should not be null');
    System.assertEquals(2, result.size(), 'Should return 2 roles');
    System.assert(result.containsKey('gestor'), 'Should contain gestor role');
    System.assert(result.containsKey('sdr'), 'Should contain SDR role');
    System.assert(
      !result.containsKey('liderComercial'),
      'Should not contain empty lider comercial role'
    );
  }
}
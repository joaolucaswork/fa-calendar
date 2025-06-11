/**
 * @description Test class for TeamsIntegrationController
 * Tests Microsoft Teams integration functionality
 * @author Reino Capital
 * @last-modified 2025-01-14
 */
@isTest
public class TeamsIntegrationControllerTest {
    
    /**
     * Mock HTTP response for successful Teams meeting creation
     */
    public class MockHttpResponseSuccess implements HttpCalloutMock {
        public HTTPResponse respond(HTTPRequest req) {
            HttpResponse res = new HttpResponse();
            res.setHeader('Content-Type', 'application/json');
            res.setStatusCode(201);
            
            Map<String, Object> responseBody = new Map<String, Object>();
            responseBody.put('id', 'test-meeting-id-123');
            responseBody.put('joinWebUrl', 'https://teams.microsoft.com/l/meetup-join/test-meeting-url');
            responseBody.put('subject', 'Test Meeting');
            
            res.setBody(JSON.serialize(responseBody));
            return res;
        }
    }
    
    /**
     * Mock HTTP response for failed Teams meeting creation
     */
    public class MockHttpResponseError implements HttpCalloutMock {
        public HTTPResponse respond(HTTPRequest req) {
            HttpResponse res = new HttpResponse();
            res.setHeader('Content-Type', 'application/json');
            res.setStatusCode(400);
            res.setBody('{"error": {"code": "BadRequest", "message": "Invalid request"}}');
            return res;
        }
    }
    
    /**
     * Mock HTTP response for token refresh
     */
    public class MockTokenRefreshResponse implements HttpCalloutMock {
        public HTTPResponse respond(HTTPRequest req) {
            HttpResponse res = new HttpResponse();
            res.setHeader('Content-Type', 'application/json');
            res.setStatusCode(200);
            
            Map<String, Object> tokenResponse = new Map<String, Object>();
            tokenResponse.put('access_token', 'new-access-token-123');
            tokenResponse.put('refresh_token', 'new-refresh-token-123');
            tokenResponse.put('expires_in', 3600);
            
            res.setBody(JSON.serialize(tokenResponse));
            return res;
        }
    }
    
    @testSetup
    static void setupTestData() {
        // Create test Teams integration settings
        Teams_Integration_Settings__c settings = new Teams_Integration_Settings__c();
        settings.SetupOwnerId = UserInfo.getOrganizationId();
        settings.Integration_Enabled__c = true;
        settings.Auto_Generate_Links__c = true;
        settings.Default_Meeting_Duration__c = 60;
        settings.Client_Id__c = 'test-client-id';
        settings.Client_Secret__c = 'test-client-secret';
        settings.Tenant_Id__c = 'test-tenant-id';
        settings.Access_Token__c = 'test-access-token';
        settings.Refresh_Token__c = 'test-refresh-token';
        settings.Token_Expires_At__c = DateTime.now().addHours(1);
        
        insert settings;
    }
    
    @isTest
    static void testCreateTeamsMeetingSuccess() {
        // Set mock for successful API response
        Test.setMock(HttpCalloutMock.class, new MockHttpResponseSuccess());
        
        // Prepare test meeting data
        Map<String, Object> meetingData = new Map<String, Object>();
        meetingData.put('subject', 'Test Meeting');
        meetingData.put('startDateTime', '2025-01-15T09:00:00');
        meetingData.put('endDateTime', '2025-01-15T10:00:00');
        
        List<Map<String, Object>> participants = new List<Map<String, Object>>();
        participants.add(new Map<String, Object>{'name' => 'Test User', 'role' => 'Gestor'});
        meetingData.put('participants', participants);
        
        Map<String, Object> organizer = new Map<String, Object>();
        organizer.put('name', 'Test Organizer');
        organizer.put('email', 'test@reinocapital.com.br');
        meetingData.put('organizer', organizer);
        
        Test.startTest();
        
        // Call the method
        Map<String, Object> result = TeamsIntegrationController.createTeamsMeeting(
            JSON.serialize(meetingData)
        );
        
        Test.stopTest();
        
        // Verify results
        System.assertEquals(true, result.get('success'), 'Meeting creation should succeed');
        System.assertEquals('https://teams.microsoft.com/l/meetup-join/test-meeting-url', 
                          result.get('joinUrl'), 'Should return correct join URL');
        System.assertEquals('test-meeting-id-123', result.get('meetingId'), 'Should return meeting ID');
    }
    
    @isTest
    static void testCreateTeamsMeetingError() {
        // Set mock for error API response
        Test.setMock(HttpCalloutMock.class, new MockHttpResponseError());
        
        // Prepare test meeting data
        Map<String, Object> meetingData = new Map<String, Object>();
        meetingData.put('subject', 'Test Meeting');
        
        Test.startTest();
        
        // Call the method
        Map<String, Object> result = TeamsIntegrationController.createTeamsMeeting(
            JSON.serialize(meetingData)
        );
        
        Test.stopTest();
        
        // Verify results
        System.assertEquals(false, result.get('success'), 'Meeting creation should fail');
        System.assert(result.containsKey('error'), 'Should contain error message');
    }
    
    @isTest
    static void testCreateTeamsMeetingNoToken() {
        // Remove access token from settings
        Teams_Integration_Settings__c settings = Teams_Integration_Settings__c.getOrgDefaults();
        settings.Access_Token__c = null;
        update settings;
        
        // Prepare test meeting data
        Map<String, Object> meetingData = new Map<String, Object>();
        meetingData.put('subject', 'Test Meeting');
        
        Test.startTest();
        
        // Call the method
        Map<String, Object> result = TeamsIntegrationController.createTeamsMeeting(
            JSON.serialize(meetingData)
        );
        
        Test.stopTest();
        
        // Verify results
        System.assertEquals(false, result.get('success'), 'Should fail without token');
        System.assert(result.get('error').toString().contains('não configurado'), 
                     'Should indicate configuration issue');
    }
    
    @isTest
    static void testTeamsIntegrationTest() {
        Test.startTest();
        
        // Test with valid configuration
        Map<String, Object> result = TeamsIntegrationController.testTeamsIntegration();
        
        Test.stopTest();
        
        // Verify results
        System.assertEquals(true, result.get('success'), 'Integration test should succeed');
        System.assertEquals(true, result.get('hasToken'), 'Should have access token');
        System.assert(result.get('message').toString().contains('configured successfully'), 
                     'Should indicate successful configuration');
    }
    
    @isTest
    static void testTeamsIntegrationTestNoConfig() {
        // Remove settings
        Teams_Integration_Settings__c settings = Teams_Integration_Settings__c.getOrgDefaults();
        delete settings;
        
        Test.startTest();
        
        // Test without configuration
        Map<String, Object> result = TeamsIntegrationController.testTeamsIntegration();
        
        Test.stopTest();
        
        // Verify results
        System.assertEquals(false, result.get('success'), 'Integration test should fail');
        System.assertEquals(false, result.get('hasToken'), 'Should not have access token');
        System.assert(result.get('message').toString().contains('not configured'), 
                     'Should indicate missing configuration');
    }
    
    @isTest
    static void testInvalidMeetingData() {
        Test.startTest();
        
        // Test with invalid JSON
        Map<String, Object> result = TeamsIntegrationController.createTeamsMeeting('invalid-json');
        
        Test.stopTest();
        
        // Verify results
        System.assertEquals(false, result.get('success'), 'Should fail with invalid JSON');
        System.assert(result.containsKey('error'), 'Should contain error message');
    }
}
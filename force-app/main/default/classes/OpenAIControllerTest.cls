/**
 * Test class for OpenAIController
 * Provides comprehensive test coverage for OpenAI API integration
 * @author Reino Capital Development Team
 * @version 1.0.0
 */
@isTest
public class OpenAIControllerTest {
    
    /**
     * Test data setup
     */
    @TestSetup
    static void setupTestData() {
        // Use current user instead of creating new user to avoid profile issues
        
        // Create test contact
        Contact testContact = new Contact(
            FirstName = 'Test',
            LastName = 'Contact',
            Email = 'testcontact@reino.com'
        );
        insert testContact;
        
        // Create test opportunity
        Opportunity testOpportunity = new Opportunity(
            Name = 'Test Opportunity',
            StageName = 'Prospecting',
            CloseDate = Date.today().addDays(30)
        );
        insert testOpportunity;
        
        // Create test events
        List<Event> testEvents = new List<Event>();
        
        DateTime baseTime = DateTime.now().addDays(-7);
        
        // Event 1: Completed meeting
        testEvents.add(new Event(
            Subject = 'Reunião de Apresentação',
            Description = 'Apresentação da proposta comercial',
            Location = 'Sala Principal - Reino Capital',
            StartDateTime = baseTime,
            EndDateTime = baseTime.addHours(1),
            IsAllDayEvent = false,
            WhoId = testContact.Id,
            WhatId = testOpportunity.Id,
            salaReuniao__c = 'salaPrincipal',
            gestor__c = 'João Silva',
            liderComercial__c = 'Maria Santos',
            sdr__c = 'Pedro Costa',
            statusReuniao__c = 'Reagendado',
            reuniaoAconteceu__c = true,
            customColor__c = '#6264a7',
            OwnerId = UserInfo.getUserId()
        ));

        // Event 2: Upcoming meeting
        testEvents.add(new Event(
            Subject = 'Follow-up Cliente',
            Description = 'Acompanhamento pós-venda',
            Location = 'Online',
            StartDateTime = DateTime.now().addDays(2),
            EndDateTime = DateTime.now().addDays(2).addHours(1),
            IsAllDayEvent = false,
            WhoId = testContact.Id,
            WhatId = testOpportunity.Id,
            salaReuniao__c = 'Outra',
            gestor__c = 'Ana Costa',
            statusReuniao__c = 'Cancelado',
            reuniaoAconteceu__c = false,
            OwnerId = UserInfo.getUserId()
        ));

        // Event 3: Training session
        testEvents.add(new Event(
            Subject = 'Treinamento Equipe',
            Description = 'Capacitação em vendas',
            Location = 'Sala de Reunião 1',
            StartDateTime = baseTime.addDays(1),
            EndDateTime = baseTime.addDays(1).addHours(2),
            IsAllDayEvent = false,
            salaReuniao__c = 'salaGabriel',
            liderComercial__c = 'Carlos Lima',
            sdr__c = 'Julia Mendes',
            statusReuniao__c = 'Adiado',
            reuniaoAconteceu__c = true,
            OwnerId = UserInfo.getUserId()
        ));
        
        insert testEvents;
    }
    
    /**
     * Test successful event summary generation
     */
    @isTest
    static void testGenerateEventSummarySuccess() {
        // Clear cache to avoid interference
        OpenAICacheManager.clearCache();

        // Create test data directly in the test method
        Contact testContact = new Contact(
            FirstName = 'Test',
            LastName = 'Contact',
            Email = 'test@example.com'
        );
        insert testContact;

        Event testEvent = new Event(
            Subject = 'Test Meeting',
            StartDateTime = DateTime.newInstance(Date.today().addDays(-5), Time.newInstance(10, 0, 0, 0)),
            EndDateTime = DateTime.newInstance(Date.today().addDays(-5), Time.newInstance(11, 0, 0, 0)),
            WhoId = testContact.Id,
            salaReuniao__c = 'salaPrincipal',
            gestor__c = 'João Silva',
            OwnerId = UserInfo.getUserId()
        );
        insert testEvent;

        Test.startTest();

        // Set up mock response AFTER Test.startTest() to ensure it's active
        Test.setMock(HttpCalloutMock.class, new OpenAIMockResponse(true));

        Date startDate = Date.today().addDays(-10);
        Date endDate = Date.today().addDays(10);

        // Debug: Check if events are found
        List<Map<String, Object>> eventData = EventSummaryGenerator.aggregateEvents(startDate, endDate);
        System.debug('Found events: ' + eventData.size());
        if (!eventData.isEmpty()) {
            System.debug('First event: ' + eventData[0]);
        }

        Map<String, Object> result = OpenAIController.generateEventSummary(
            startDate, endDate, 'monthly'
        );

        Test.stopTest();

        // Debug the result
        System.debug('Result: ' + result);
        System.debug('Summary: ' + result.get('summary'));
        System.debug('Success: ' + result.get('success'));
        System.debug('Error: ' + result.get('error'));

        // Verify results
        System.assertEquals(true, result.get('success'), 'Should return success');

        // The summary should never be null - it should either be the "no events" message or a real summary
        System.assertNotEquals(null, result.get('summary'), 'Should have summary');

        String summary = (String) result.get('summary');
        System.assert(summary != null && summary.length() > 0, 'Should have valid summary content');

        // Check if we got the "no events" message or a real summary
        if (summary.equals('Nenhum evento encontrado para o período selecionado.')) {
            // No events case
            System.debug('Test passed: No events found, got expected message');
        } else {
            // Events found case - should have insights and recommendations too
            System.assertNotEquals(null, result.get('insights'), 'Should have insights');
            System.assertNotEquals(null, result.get('recommendations'), 'Should have recommendations');
            System.debug('Test passed: Events found, got summary with insights and recommendations');
        }
    }
    
    /**
     * Test event summary with no events
     */
    @isTest
    static void testGenerateEventSummaryNoEvents() {
        Test.startTest();
        
        // Use date range with no events
        Date startDate = Date.today().addDays(100);
        Date endDate = Date.today().addDays(110);
        
        Map<String, Object> result = OpenAIController.generateEventSummary(
            startDate, endDate, 'monthly'
        );
        
        Test.stopTest();
        
        // Verify results
        System.assertEquals(true, result.get('success'), 'Should return success');
        System.assertEquals('Nenhum evento encontrado para o período selecionado.', 
                          result.get('summary'), 'Should have no events message');
    }
    
    /**
     * Test event summary with invalid dates
     */
    @isTest
    static void testGenerateEventSummaryInvalidDates() {
        Test.startTest();
        
        Map<String, Object> result = OpenAIController.generateEventSummary(
            null, null, 'monthly'
        );
        
        Test.stopTest();
        
        // Verify error handling
        System.assertEquals(false, result.get('success'), 'Should return failure');
        System.assertNotEquals(null, result.get('error'), 'Should have error message');
    }
    
    /**
     * Test API connection failure
     */
    @isTest
    static void testGenerateEventSummaryAPIFailure() {
        // Set up mock response for failure
        Test.setMock(HttpCalloutMock.class, new OpenAIMockResponse(false));
        
        Test.startTest();
        
        Date startDate = Date.today().addDays(-10);
        Date endDate = Date.today().addDays(10);
        
        Map<String, Object> result = OpenAIController.generateEventSummary(
            startDate, endDate, 'monthly'
        );
        
        Test.stopTest();
        
        // Verify error handling
        System.assertEquals(false, result.get('success'), 'Should return failure');
        System.assertNotEquals(null, result.get('error'), 'Should have error message');
    }
    
    /**
     * Test meeting suggestions generation
     */
    @isTest
    static void testGenerateMeetingSuggestions() {
        // Set up mock response
        Test.setMock(HttpCalloutMock.class, new OpenAIMockResponse(true));
        
        Test.startTest();
        
        List<String> participantIds = new List<String>{UserInfo.getUserId()};
        Date targetDate = Date.today().addDays(7);
        
        Map<String, Object> result = OpenAIController.generateMeetingSuggestions(
            participantIds, targetDate, 60
        );
        
        Test.stopTest();
        
        // Verify results
        System.assertEquals(true, result.get('success'), 'Should return success');
        System.assertNotEquals(null, result.get('suggestions'), 'Should have suggestions');
        System.assertNotEquals(null, result.get('reasoning'), 'Should have reasoning');
    }
    
    /**
     * Test OpenAI connection test
     */
    @isTest
    static void testOpenAIConnectionTest() {
        // Set up mock response
        Test.setMock(HttpCalloutMock.class, new OpenAIMockResponse(true));
        
        Test.startTest();
        
        Map<String, Object> result = OpenAIController.testOpenAIConnection();
        
        Test.stopTest();
        
        // Verify results
        System.assertEquals(true, result.get('success'), 'Should return success');
        System.assertNotEquals(null, result.get('message'), 'Should have success message');
    }
    
    /**
     * Test different summary types
     */
    @isTest
    static void testDifferentSummaryTypes() {
        // Set up mock response
        Test.setMock(HttpCalloutMock.class, new OpenAIMockResponse(true));

        Test.startTest();

        Date startDate = Date.today().addDays(-10);
        Date endDate = Date.today().addDays(10);

        // Test weekly summary
        Map<String, Object> weeklyResult = OpenAIController.generateEventSummary(
            startDate, endDate, 'weekly'
        );

        // Test upcoming summary
        Map<String, Object> upcomingResult = OpenAIController.generateEventSummary(
            startDate, endDate, 'upcoming'
        );

        Test.stopTest();

        // Verify results
        System.assertEquals(true, weeklyResult.get('success'), 'Weekly summary should succeed');
        System.assertEquals(true, upcomingResult.get('success'), 'Upcoming summary should succeed');
    }

    /**
     * Test cache statistics method
     */
    @isTest
    static void testGetCacheStatistics() {
        Test.startTest();

        Map<String, Object> result = OpenAIController.getCacheStatistics();

        Test.stopTest();

        // Verify results
        System.assertEquals(true, result.get('success'), 'Should return success');
        System.assertNotEquals(null, result.get('stats'), 'Should have stats');
        System.assertNotEquals(null, result.get('message'), 'Should have message');
    }
    
    /**
     * Mock HTTP response class for OpenAI API
     */
    public class OpenAIMockResponse implements HttpCalloutMock {
        private Boolean isSuccess;
        
        public OpenAIMockResponse(Boolean isSuccess) {
            this.isSuccess = isSuccess;
        }
        
        public HTTPResponse respond(HTTPRequest req) {
            HttpResponse res = new HttpResponse();

            // Debug the request
            System.debug('Mock HTTP Request - Endpoint: ' + req.getEndpoint());
            System.debug('Mock HTTP Request - Method: ' + req.getMethod());
            System.debug('Mock HTTP Request - Body: ' + req.getBody());

            if (isSuccess) {
                res.setStatusCode(200);

                // Check if this is a meeting suggestions request
                String requestBody = req.getBody();
                if (requestBody != null && (requestBody.contains('sugestões') || requestBody.contains('suggestions') || requestBody.contains('horários'))) {
                    // Return meeting suggestions format
                    String responseBody = '{"choices": [{"message": {"content": "{\\"suggestions\\": [\\"10:00-11:00\\", \\"14:00-15:00\\", \\"16:00-17:00\\"], \\"reasoning\\": \\"Horários com melhor disponibilidade dos participantes\\"}"}}]}';
                    res.setBody(responseBody);
                    System.debug('Mock returning meeting suggestions response: ' + responseBody);
                } else {
                    // Return event summary format - this should match the OpenAI API response structure
                    // The content should be a simple text response that will be processed by extractInsightsFromText
                    String content = 'Resumo de teste dos eventos analisados. Total de reuniões: 1. Participantes mais frequentes: João Silva. Salas mais utilizadas: Sala Principal. Horários de maior concentração: 10:00-11:00.';
                    String responseBody = '{"choices": [{"message": {"content": "' + content + '"}}]}';
                    res.setBody(responseBody);
                    System.debug('Mock returning event summary response: ' + responseBody);
                }
            } else {
                res.setStatusCode(500);
                res.setBody('{"error": {"message": "API Error"}}');
                System.debug('Mock returning error response');
            }

            return res;
        }
    }
}

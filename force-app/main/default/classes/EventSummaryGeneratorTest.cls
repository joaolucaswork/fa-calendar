/**
 * Test class for EventSummaryGenerator
 * Provides comprehensive test coverage for event data aggregation and processing
 * @author Reino Capital Development Team
 * @version 1.0.0
 */
@isTest
public class EventSummaryGeneratorTest {
    
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
        
        // Create test events with various scenarios
        List<Event> testEvents = new List<Event>();
        
        DateTime baseTime = DateTime.now().addDays(-7);
        
        // Event 1: Presentation with sensitive data
        testEvents.add(new Event(
            Subject = 'Apresentação para cliente@email.com',
            Description = 'Reunião com CPF 123.456.789-00 e telefone (11) 99999-9999',
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
        
        // Event 2: Follow-up meeting
        testEvents.add(new Event(
            Subject = 'Follow-up Cliente',
            Description = 'Acompanhamento pós-venda',
            Location = 'Online',
            StartDateTime = baseTime.addHours(2),
            EndDateTime = baseTime.addHours(3),
            IsAllDayEvent = false,
            WhoId = testContact.Id,
            WhatId = testOpportunity.Id,
            salaReuniao__c = 'Outra',
            gestor__c = 'Ana Costa',
            statusReuniao__c = 'Adiado',
            reuniaoAconteceu__c = false,
            OwnerId = UserInfo.getUserId()
        ));

        // Event 3: Training session (evening)
        testEvents.add(new Event(
            Subject = 'Treinamento Equipe',
            Description = 'Capacitação em vendas',
            Location = 'Sala de Reunião 1',
            StartDateTime = baseTime.addDays(1).addHours(19), // 7 PM
            EndDateTime = baseTime.addDays(1).addHours(21), // 9 PM
            IsAllDayEvent = false,
            salaReuniao__c = 'salaPrincipal',
            liderComercial__c = 'Carlos Lima',
            sdr__c = 'Julia Mendes',
            statusReuniao__c = 'Cancelado',
            reuniaoAconteceu__c = true,
            OwnerId = UserInfo.getUserId()
        ));

        // Event 4: Demo session (morning)
        testEvents.add(new Event(
            Subject = 'Demo do produto',
            Description = 'Demonstração técnica',
            Location = 'Sala do Gabriel',
            StartDateTime = baseTime.addDays(2).addHours(9), // 9 AM
            EndDateTime = baseTime.addDays(2).addHours(10), // 10 AM
            IsAllDayEvent = false,
            salaReuniao__c = 'salaGabriel',
            gestor__c = 'Roberto Silva',
            statusReuniao__c = 'Adiado',
            reuniaoAconteceu__c = true,
            OwnerId = UserInfo.getUserId()
        ));

        // Event 5: Interview (afternoon)
        testEvents.add(new Event(
            Subject = 'Entrevista candidato',
            Description = 'Processo seletivo',
            Location = 'Sala Principal',
            StartDateTime = baseTime.addDays(3).addHours(14), // 2 PM
            EndDateTime = baseTime.addDays(3).addHours(15), // 3 PM
            IsAllDayEvent = false,
            salaReuniao__c = 'salaPrincipal',
            liderComercial__c = 'Patricia Oliveira',
            statusReuniao__c = 'Reagendado',
            reuniaoAconteceu__c = true,
            OwnerId = UserInfo.getUserId()
        ));
        
        insert testEvents;
    }
    
    /**
     * Test event aggregation with valid date range
     */
    @isTest
    static void testAggregateEventsSuccess() {
        Test.startTest();
        
        Date startDate = Date.today().addDays(-10);
        Date endDate = Date.today().addDays(10);
        
        List<Map<String, Object>> result = EventSummaryGenerator.aggregateEvents(startDate, endDate);
        
        Test.stopTest();
        
        // Verify results
        System.assert(result.size() > 0, 'Should return events');
        
        // Check first event structure
        Map<String, Object> firstEvent = result[0];
        System.assertNotEquals(null, firstEvent.get('id'), 'Should have event ID');
        System.assertNotEquals(null, firstEvent.get('subject'), 'Should have subject');
        System.assertNotEquals(null, firstEvent.get('category'), 'Should have category');
        System.assertNotEquals(null, firstEvent.get('timeSlot'), 'Should have time slot');
        System.assertNotEquals(null, firstEvent.get('room'), 'Should have room');
        
        // Verify data sanitization
        String subject = (String) firstEvent.get('subject');
        System.assert(!subject.contains('@'), 'Email should be sanitized');
        
        String description = (String) firstEvent.get('description');
        System.assert(!description.contains('123.456.789-00'), 'CPF should be sanitized');
        System.assert(!description.contains('(11) 99999-9999'), 'Phone should be sanitized');
    }
    
    /**
     * Test event aggregation with no events
     */
    @isTest
    static void testAggregateEventsNoResults() {
        Test.startTest();
        
        // Use date range with no events
        Date startDate = Date.today().addDays(100);
        Date endDate = Date.today().addDays(110);
        
        List<Map<String, Object>> result = EventSummaryGenerator.aggregateEvents(startDate, endDate);
        
        Test.stopTest();
        
        // Verify results
        System.assertEquals(0, result.size(), 'Should return empty list');
    }
    
    /**
     * Test statistics generation
     */
    @isTest
    static void testGenerateStatistics() {
        Test.startTest();
        
        Date startDate = Date.today().addDays(-10);
        Date endDate = Date.today().addDays(10);
        
        List<Map<String, Object>> events = EventSummaryGenerator.aggregateEvents(startDate, endDate);
        Map<String, Object> stats = EventSummaryGenerator.generateStatistics(events);
        
        Test.stopTest();
        
        // Verify statistics
        System.assertNotEquals(null, stats.get('totalEvents'), 'Should have total events');
        System.assertNotEquals(null, stats.get('averageDuration'), 'Should have average duration');
        System.assertNotEquals(null, stats.get('completionRate'), 'Should have completion rate');
        System.assertNotEquals(null, stats.get('categoryDistribution'), 'Should have category distribution');
        System.assertNotEquals(null, stats.get('timeSlotDistribution'), 'Should have time slot distribution');
        System.assertNotEquals(null, stats.get('roomDistribution'), 'Should have room distribution');
        
        // Verify data types
        Integer totalEvents = (Integer) stats.get('totalEvents');
        System.assert(totalEvents > 0, 'Should have events');
        
        Map<String, Integer> categories = (Map<String, Integer>) stats.get('categoryDistribution');
        System.assert(categories.size() > 0, 'Should have categories');
    }
    
    /**
     * Test statistics with empty event list
     */
    @isTest
    static void testGenerateStatisticsEmpty() {
        Test.startTest();
        
        List<Map<String, Object>> emptyEvents = new List<Map<String, Object>>();
        Map<String, Object> stats = EventSummaryGenerator.generateStatistics(emptyEvents);
        
        Test.stopTest();
        
        // Verify results
        System.assertEquals(0, stats.get('totalEvents'), 'Should have zero events');
    }
    
    /**
     * Test event categorization
     */
    @isTest
    static void testEventCategorization() {
        Test.startTest();
        
        Date startDate = Date.today().addDays(-10);
        Date endDate = Date.today().addDays(10);
        
        List<Map<String, Object>> events = EventSummaryGenerator.aggregateEvents(startDate, endDate);
        
        Test.stopTest();
        
        // Verify categories are assigned
        Boolean hasPresentation = false;
        Boolean hasFollowUp = false;
        Boolean hasTraining = false;
        Boolean hasDemo = false;
        Boolean hasInterview = false;
        
        for (Map<String, Object> event : events) {
            String category = (String) event.get('category');
            
            if (category == 'Apresentação') hasPresentation = true;
            if (category == 'Follow-up') hasFollowUp = true;
            if (category == 'Treinamento') hasTraining = true;
            if (category == 'Demonstração') hasDemo = true;
            if (category == 'Entrevista') hasInterview = true;
        }
        
        System.assert(hasPresentation, 'Should categorize presentation events');
        System.assert(hasFollowUp, 'Should categorize follow-up events');
        System.assert(hasTraining, 'Should categorize training events');
        System.assert(hasDemo, 'Should categorize demo events');
        System.assert(hasInterview, 'Should categorize interview events');
    }
    
    /**
     * Test time slot categorization
     */
    @isTest
    static void testTimeSlotCategorization() {
        Test.startTest();
        
        Date startDate = Date.today().addDays(-10);
        Date endDate = Date.today().addDays(10);
        
        List<Map<String, Object>> events = EventSummaryGenerator.aggregateEvents(startDate, endDate);
        
        Test.stopTest();
        
        // Verify time slots are assigned
        Boolean hasMorning = false;
        Boolean hasAfternoon = false;
        Boolean hasEvening = false;
        
        for (Map<String, Object> event : events) {
            String timeSlot = (String) event.get('timeSlot');
            
            if (timeSlot == 'Manhã') hasMorning = true;
            if (timeSlot == 'Tarde') hasAfternoon = true;
            if (timeSlot == 'Noite') hasEvening = true;
        }
        
        System.assert(hasMorning, 'Should have morning events');
        System.assert(hasAfternoon, 'Should have afternoon events');
        System.assert(hasEvening, 'Should have evening events');
    }
    
    /**
     * Test filtering events by category
     */
    @isTest
    static void testGetEventsByCategory() {
        Test.startTest();
        
        Date startDate = Date.today().addDays(-10);
        Date endDate = Date.today().addDays(10);
        
        List<Map<String, Object>> allEvents = EventSummaryGenerator.aggregateEvents(startDate, endDate);
        List<Map<String, Object>> presentationEvents = EventSummaryGenerator.getEventsByCategory(
            allEvents, 'Apresentação'
        );
        
        Test.stopTest();
        
        // Verify filtering
        System.assert(presentationEvents.size() > 0, 'Should find presentation events');
        
        for (Map<String, Object> event : presentationEvents) {
            System.assertEquals('Apresentação', event.get('category'), 'All events should be presentations');
        }
    }
    
    /**
     * Test filtering events by time slot
     */
    @isTest
    static void testGetEventsByTimeSlot() {
        Test.startTest();
        
        Date startDate = Date.today().addDays(-10);
        Date endDate = Date.today().addDays(10);
        
        List<Map<String, Object>> allEvents = EventSummaryGenerator.aggregateEvents(startDate, endDate);
        List<Map<String, Object>> morningEvents = EventSummaryGenerator.getEventsByTimeSlot(
            allEvents, 'Manhã'
        );
        
        Test.stopTest();
        
        // Verify filtering
        for (Map<String, Object> event : morningEvents) {
            System.assertEquals('Manhã', event.get('timeSlot'), 'All events should be morning events');
        }
    }
    
    /**
     * Test productivity insights generation
     */
    @isTest
    static void testGetProductivityInsights() {
        Test.startTest();
        
        Date startDate = Date.today().addDays(-10);
        Date endDate = Date.today().addDays(10);
        
        List<Map<String, Object>> events = EventSummaryGenerator.aggregateEvents(startDate, endDate);
        Map<String, Object> insights = EventSummaryGenerator.getProductivityInsights(events);
        
        Test.stopTest();
        
        // Verify insights
        System.assertEquals(true, insights.get('hasInsights'), 'Should have insights');
        System.assertNotEquals(null, insights.get('recommendations'), 'Should have recommendations');
        System.assertNotEquals(null, insights.get('totalMeetings'), 'Should have total meetings');
        System.assertNotEquals(null, insights.get('averageDuration'), 'Should have average duration');
        System.assertNotEquals(null, insights.get('completionRate'), 'Should have completion rate');
    }
    
    /**
     * Test productivity insights with empty events
     */
    @isTest
    static void testGetProductivityInsightsEmpty() {
        Test.startTest();
        
        List<Map<String, Object>> emptyEvents = new List<Map<String, Object>>();
        Map<String, Object> insights = EventSummaryGenerator.getProductivityInsights(emptyEvents);
        
        Test.stopTest();
        
        // Verify results
        System.assertEquals(false, insights.get('hasInsights'), 'Should not have insights for empty list');
    }
    
    /**
     * Test room display name mapping
     */
    @isTest
    static void testRoomDisplayNames() {
        Test.startTest();
        
        Date startDate = Date.today().addDays(-10);
        Date endDate = Date.today().addDays(10);
        
        List<Map<String, Object>> events = EventSummaryGenerator.aggregateEvents(startDate, endDate);
        
        Test.stopTest();
        
        // Verify room names are properly mapped
        Boolean hasSalaPrincipal = false;
        Boolean hasSalaGabriel = false;
        Boolean hasOutra = false;

        for (Map<String, Object> event : events) {
            String room = (String) event.get('room');

            if (room == 'Sala Principal') hasSalaPrincipal = true;
            if (room == 'Sala do Gabriel') hasSalaGabriel = true;
            if (room == 'Outra') hasOutra = true;
        }

        System.assert(hasSalaPrincipal, 'Should map sala principal correctly');
        System.assert(hasSalaGabriel, 'Should map sala Gabriel correctly');
        System.assert(hasOutra, 'Should map Outra correctly');
    }
}

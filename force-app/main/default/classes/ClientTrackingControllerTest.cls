/**
 * @description Test class for ClientTrackingController
 * @author Reino Capital
 * @last-modified 2025-01-18
 */
@isTest
public class ClientTrackingControllerTest {
    
    @TestSetup
    static void setupTestData() {
        // Create test leads
        List<Lead> testLeads = new List<Lead>();
        testLeads.add(new Lead(
            FirstName = 'João',
            LastName = 'Silva',
            Company = 'Empresa A',
            Email = 'joao.silva@empresa-a.com',
            Status = 'Interessado'
        ));
        testLeads.add(new Lead(
            FirstName = 'Maria',
            LastName = 'Santos',
            Company = 'Empresa B',
            Email = 'maria.santos@empresa-b.com',
            Status = 'Interessado'
        ));
        testLeads.add(new Lead(
            FirstName = 'Pedro',
            LastName = 'Costa',
            Company = 'Empresa C',
            Email = 'pedro.costa@empresa-c.com',
            Status = 'Novo'
        ));
        insert testLeads;
        
        // Create test events with various patterns
        List<Event> testEvents = new List<Event>();
        
        // João Silva - Multiple events with rescheduling pattern
        testEvents.add(new Event(
            Subject = 'Primeira Reunião - João Silva',
            StartDateTime = DateTime.now().addDays(-30),
            EndDateTime = DateTime.now().addDays(-30).addHours(1),
            WhoId = testLeads[0].Id,
            statusReuniao__c = 'Reagendado',
            fase_evento__c = 'Primeira Reunião'
        ));
        testEvents.add(new Event(
            Subject = 'Primeira Reunião - João Silva (Reagendada)',
            StartDateTime = DateTime.now().addDays(-25),
            EndDateTime = DateTime.now().addDays(-25).addHours(1),
            WhoId = testLeads[0].Id,
            statusReuniao__c = null, // No status means it happened
            fase_evento__c = 'Primeira Reunião'
        ));
        testEvents.add(new Event(
            Subject = 'Devolutiva - João Silva',
            StartDateTime = DateTime.now().addDays(-15),
            EndDateTime = DateTime.now().addDays(-15).addHours(1),
            WhoId = testLeads[0].Id,
            statusReuniao__c = null, // No status means it happened
            fase_evento__c = 'Devolutiva'
        ));
        testEvents.add(new Event(
            Subject = 'Negociação - João Silva',
            StartDateTime = DateTime.now().addDays(-5),
            EndDateTime = DateTime.now().addDays(-5).addHours(1),
            WhoId = testLeads[0].Id,
            statusReuniao__c = null, // No status means it happened
            fase_evento__c = 'Negociação'
        ));
        
        // Maria Santos - Multiple events with cancellation pattern
        testEvents.add(new Event(
            Subject = 'Primeira Reunião - Maria Santos',
            StartDateTime = DateTime.now().addDays(-20),
            EndDateTime = DateTime.now().addDays(-20).addHours(1),
            WhoId = testLeads[1].Id,
            statusReuniao__c = 'Cancelado',
            fase_evento__c = 'Primeira Reunião'
        ));
        testEvents.add(new Event(
            Subject = 'Primeira Reunião - Maria Santos (Nova)',
            StartDateTime = DateTime.now().addDays(-10),
            EndDateTime = DateTime.now().addDays(-10).addHours(1),
            WhoId = testLeads[1].Id,
            statusReuniao__c = null, // No status means it happened
            fase_evento__c = 'Primeira Reunião'
        ));
        testEvents.add(new Event(
            Subject = 'Devolutiva - Maria Santos',
            StartDateTime = DateTime.now().addDays(5),
            EndDateTime = DateTime.now().addDays(5).addHours(1),
            WhoId = testLeads[1].Id,
            fase_evento__c = 'Devolutiva'
        ));

        // Pedro Costa - Single event (should not be considered active)
        testEvents.add(new Event(
            Subject = 'Primeira Reunião - Pedro Costa',
            StartDateTime = DateTime.now().addDays(-45),
            EndDateTime = DateTime.now().addDays(-45).addHours(1),
            WhoId = testLeads[2].Id,
            statusReuniao__c = null, // No status means it happened
            fase_evento__c = 'Primeira Reunião'
        ));
        
        insert testEvents;
    }
    
    @isTest
    static void testGetActiveClients() {
        // Test getting active clients for current month
        Date startDt = Date.today().toStartOfMonth();
        Date endDt = Date.today().addMonths(1).toStartOfMonth().addDays(-1);
        String startDate = String.valueOf(startDt);
        String endDate = String.valueOf(endDt);
        
        Test.startTest();
        List<ClientTrackingController.ClientTrackingData> activeClients = 
            ClientTrackingController.getActiveClients(startDate, endDate);
        Test.stopTest();
        
        // Should return João Silva and Maria Santos as active clients
        System.assertEquals(2, activeClients.size(), 'Should identify 2 active clients');
        
        // Verify João Silva is identified as active (multiple events + phases + rescheduling)
        ClientTrackingController.ClientTrackingData joaoData = null;
        for (ClientTrackingController.ClientTrackingData client : activeClients) {
            if (client.clientName.contains('João Silva')) {
                joaoData = client;
                break;
            }
        }
        System.assertNotEquals(null, joaoData, 'João Silva should be identified as active client');
        System.assertEquals(4, joaoData.totalEvents, 'João should have 4 events');
        System.assertEquals(1, joaoData.rescheduledEvents, 'João should have 1 rescheduled event');
        System.assertEquals(3, joaoData.eventPhases.size(), 'João should have 3 different phases');
        System.assertEquals(true, joaoData.isActive, 'João should be marked as active');
        
        // Verify Maria Santos is identified as active (multiple events + cancellation pattern)
        ClientTrackingController.ClientTrackingData mariaData = null;
        for (ClientTrackingController.ClientTrackingData client : activeClients) {
            if (client.clientName.contains('Maria Santos')) {
                mariaData = client;
                break;
            }
        }
        System.assertNotEquals(null, mariaData, 'Maria Santos should be identified as active client');
        System.assertEquals(3, mariaData.totalEvents, 'Maria should have 3 events');
        System.assertEquals(1, mariaData.cancelledEvents, 'Maria should have 1 cancelled event');
        System.assertEquals(true, mariaData.isActive, 'Maria should be marked as active');
    }
    
    @isTest
    static void testGetClientEvents() {
        // Get test lead
        Lead testLead = [SELECT Id FROM Lead WHERE FirstName = 'João' LIMIT 1];
        
        Date startDt = Date.today().addDays(-35);
        Date endDt = Date.today();
        String startDate = String.valueOf(startDt);
        String endDate = String.valueOf(endDt);
        
        Test.startTest();
        List<Map<String, Object>> clientEvents = 
            ClientTrackingController.getClientEvents(testLead.Id, startDate, endDate);
        Test.stopTest();
        
        // Should return all events for João Silva
        System.assertEquals(4, clientEvents.size(), 'Should return 4 events for João Silva');
        
        // Verify event data structure
        Map<String, Object> firstEvent = clientEvents[0];
        System.assert(firstEvent.containsKey('id'), 'Event should have id');
        System.assert(firstEvent.containsKey('subject'), 'Event should have subject');
        System.assert(firstEvent.containsKey('startDateTime'), 'Event should have startDateTime');
        System.assert(firstEvent.containsKey('statusReuniao'), 'Event should have statusReuniao');
        System.assert(firstEvent.containsKey('faseEvento'), 'Event should have faseEvento');
    }
    
    @isTest
    static void testEmptyResults() {
        // Test with date range that has no events
        Date startDt = Date.today().addYears(1);
        Date endDt = Date.today().addYears(1).addDays(30);
        String startDate = String.valueOf(startDt);
        String endDate = String.valueOf(endDt);
        
        Test.startTest();
        List<ClientTrackingController.ClientTrackingData> activeClients = 
            ClientTrackingController.getActiveClients(startDate, endDate);
        Test.stopTest();
        
        // Should return empty list
        System.assertEquals(0, activeClients.size(), 'Should return no active clients for future dates');
    }
    
    @isTest
    static void testErrorHandling() {
        // Test with invalid date format - should return empty list instead of throwing exception
        Test.startTest();
        List<ClientTrackingController.ClientTrackingData> result =
            ClientTrackingController.getActiveClients('invalid-date', '2025-01-31');

        // Should return empty list on error
        System.assertEquals(0, result.size(), 'Should return empty list on invalid date');
        Test.stopTest();
    }
}

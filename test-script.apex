// Test script to debug OpenAI functionality
OpenAICacheManager.clearCache();

// Create test data
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

Date startDate = Date.today().addDays(-10);
Date endDate = Date.today().addDays(10);

// Debug: Check if events are found
List<Map<String, Object>> eventData = EventSummaryGenerator.aggregateEvents(startDate, endDate);
System.debug('Found events: ' + eventData.size());
if (!eventData.isEmpty()) {
    System.debug('First event: ' + eventData[0]);
}

// Test the OpenAI call
Map<String, Object> result = OpenAIController.generateEventSummary(
    startDate, endDate, 'monthly'
);

System.debug('Result: ' + result);
System.debug('Summary: ' + result.get('summary'));
System.debug('Success: ' + result.get('success'));
System.debug('Error: ' + result.get('error'));

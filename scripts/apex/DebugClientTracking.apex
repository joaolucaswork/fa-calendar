// Debug script to test ClientTrackingController directly and see what's happening
System.debug('=== DEBUG CLIENT TRACKING ===');

try {
    // Test with current month dates
    Date startDt = Date.today().toStartOfMonth();
    Date endDt = Date.today().addMonths(1).toStartOfMonth().addDays(-1);
    String startDate = String.valueOf(startDt);
    String endDate = String.valueOf(endDt);
    
    System.debug('Testing with dates: ' + startDate + ' to ' + endDate);
    
    // Call the controller method
    List<ClientTrackingController.ClientTrackingData> result = 
        ClientTrackingController.getActiveClients(startDate, endDate);
    
    System.debug('=== RESULTS ===');
    System.debug('Total active clients found: ' + result.size());
    
    for (ClientTrackingController.ClientTrackingData client : result) {
        System.debug('Client: ' + client.clientName);
        System.debug('  - Client ID: ' + client.clientId);
        System.debug('  - Total Events: ' + client.totalEvents);
        System.debug('  - Rescheduled Events: ' + client.rescheduledEvents);
        System.debug('  - Cancelled Events: ' + client.cancelledEvents);
        System.debug('  - Is Active: ' + client.isActive);
        System.debug('  - Event Phases: ' + client.eventPhases);
        System.debug('  ---');
    }
    
    System.debug('=== END RESULTS ===');
    
} catch (Exception e) {
    System.debug('=== ERROR ===');
    System.debug('Error Type: ' + e.getTypeName());
    System.debug('Error Message: ' + e.getMessage());
    System.debug('Stack Trace: ' + e.getStackTraceString());
    System.debug('=== END ERROR ===');
}

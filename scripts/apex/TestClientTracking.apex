// Test the ClientTrackingController directly
try {
    System.debug('=== Testing ClientTrackingController ===');
    
    Date startDt = Date.today().toStartOfMonth();
    Date endDt = Date.today().addMonths(1).toStartOfMonth().addDays(-1);
    String startDate = String.valueOf(startDt);
    String endDate = String.valueOf(endDt);
    
    System.debug('Start Date: ' + startDate);
    System.debug('End Date: ' + endDate);
    
    List<ClientTrackingController.ClientTrackingData> result = 
        ClientTrackingController.getActiveClients(startDate, endDate);
    
    System.debug('Result size: ' + result.size());
    for (ClientTrackingController.ClientTrackingData client : result) {
        System.debug('Client: ' + client.clientName + ' (' + client.totalEvents + ' events)');
    }
    
    System.debug('=== Test completed successfully ===');
} catch (Exception e) {
    System.debug('=== ERROR ===');
    System.debug('Error Type: ' + e.getTypeName());
    System.debug('Error Message: ' + e.getMessage());
    System.debug('Stack Trace: ' + e.getStackTraceString());
    System.debug('=== END ERROR ===');
}

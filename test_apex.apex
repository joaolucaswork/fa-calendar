// Teste do método getLeadEventDetailsByEventId
String eventId = '00U89000001mECzEAM';
Map<String, Object> result = LeadEventController.getLeadEventDetailsByEventId(eventId);

System.debug('=== TESTE getLeadEventDetailsByEventId ===');
System.debug('Event ID: ' + eventId);
System.debug('Result: ' + result);
System.debug('Has Lead Info: ' + result.get('hasLeadInfo'));

if ((Boolean)result.get('hasLeadInfo')) {
    System.debug('Lead Name: ' + result.get('leadName'));
    System.debug('Lead Company: ' + result.get('leadCompany'));
    System.debug('Lead Email: ' + result.get('leadEmail'));
    System.debug('Lead Phone: ' + result.get('leadPhone'));
    System.debug('Lead Status: ' + result.get('leadStatus'));
    
    System.debug('Opportunity ID: ' + result.get('opportunityId'));
    System.debug('Opportunity Name: ' + result.get('opportunityName'));
    System.debug('Opportunity Stage: ' + result.get('opportunityStage'));
    System.debug('Opportunity Probability: ' + result.get('opportunityProbability'));
    System.debug('Opportunity Close Date: ' + result.get('opportunityCloseDate'));
    System.debug('Opportunity Type: ' + result.get('opportunityType'));
    System.debug('Opportunity Amount: ' + result.get('opportunityAmount'));
} else {
    System.debug('Não é um Lead Event ou não foi encontrado');
}

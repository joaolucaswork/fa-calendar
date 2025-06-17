// Script para testar query simples com campos padrão do Event
try {
    // Query básica com apenas campos padrão
    List<Event> events = [
        SELECT Id, Subject, StartDateTime, EndDateTime, Description, Type
        FROM Event 
        LIMIT 5
    ];
    
    System.debug('✅ Query com campos padrão funcionou!');
    System.debug('Número de eventos encontrados: ' + events.size());
    
    for(Event evt : events) {
        System.debug('📅 ' + evt.Subject + ' - ' + evt.StartDateTime);
    }
    
} catch (Exception e) {
    System.debug('❌ Erro na query: ' + e.getMessage());
}

// Listar todos os campos disponíveis no objeto Event
Schema.SObjectType eventType = Schema.getGlobalDescribe().get('Event');
Schema.DescribeSObjectResult eventDescribe = eventType.getDescribe();
Map<String, Schema.SObjectField> fieldMap = eventDescribe.fields.getMap();

System.debug('=== Campos disponíveis no objeto Event ===');
for (String fieldName : fieldMap.keySet()) {
    if (fieldName.endsWith('__c')) {
        System.debug('🔧 Campo customizado: ' + fieldName);
    }
}

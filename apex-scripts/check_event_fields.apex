// Script para verificar se os campos customizados existem no objeto Event
try {
    // Tentar fazer uma query simples com os campos customizados
    List<Event> events = [
        SELECT Id, Subject, gestor__c, liderComercial__c, sdr__c, salaReuniao__c, customColor__c
        FROM Event 
        LIMIT 1
    ];
    
    System.debug('✅ Campos customizados existem no objeto Event!');
    System.debug('Número de eventos encontrados: ' + events.size());
    
} catch (Exception e) {
    System.debug('❌ Erro ao acessar campos customizados: ' + e.getMessage());
    System.debug('Tipo do erro: ' + e.getTypeName());
    
    // Tentar query básica sem campos customizados
    try {
        List<Event> basicEvents = [SELECT Id, Subject FROM Event LIMIT 1];
        System.debug('✅ Query básica funciona. Eventos encontrados: ' + basicEvents.size());
    } catch (Exception e2) {
        System.debug('❌ Erro mesmo com query básica: ' + e2.getMessage());
    }
}

// Verificar se os campos existem usando Schema
Schema.SObjectType eventType = Schema.getGlobalDescribe().get('Event');
Schema.DescribeSObjectResult eventDescribe = eventType.getDescribe();
Map<String, Schema.SObjectField> fieldMap = eventDescribe.fields.getMap();

List<String> customFields = new List<String>{
    'gestor__c', 'liderComercial__c', 'sdr__c', 'salaReuniao__c', 
    'customColor__c', 'statusReuniao__c', 'reuniaoAconteceu__c'
};

System.debug('=== Verificação de Campos Customizados ===');
for (String fieldName : customFields) {
    if (fieldMap.containsKey(fieldName)) {
        Schema.SObjectField field = fieldMap.get(fieldName);
        Schema.DescribeFieldResult fieldDescribe = field.getDescribe();
        System.debug('✅ Campo ' + fieldName + ' existe - Tipo: ' + fieldDescribe.getType());
    } else {
        System.debug('❌ Campo ' + fieldName + ' NÃO existe');
    }
}

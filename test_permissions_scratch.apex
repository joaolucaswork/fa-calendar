// Teste de permissões na scratch org - comparar com devReino
try {
    System.debug('=== TESTE DE PERMISSÕES - SCRATCH ORG ===');
    
    // Teste 1: Query básica
    List<Event> events = [SELECT Id, Subject FROM Event LIMIT 1];
    System.debug('✅ Query básica: ' + events.size() + ' eventos');
    
    if (!events.isEmpty()) {
        String eventId = events[0].Id;
        System.debug('📅 Testando com evento: ' + eventId);
        
        // Teste 2: Query completa como no AppointmentController
        try {
            Event eventToUpdate = [
                SELECT
                    Id,
                    Subject,
                    Location,
                    StartDateTime,
                    EndDateTime,
                    IsAllDayEvent,
                    Description,
                    reuniaoCriada__c,
                    statusReuniao__c,
                    WhoId,
                    WhatId,
                    gestor__c,
                    liderComercial__c,
                    sdr__c,
                    salaReuniao__c,
                    fase_evento__c,
                    produto_evento__c
                FROM Event
                WHERE Id = :eventId
                WITH SECURITY_ENFORCED
                LIMIT 1
            ];
            System.debug('✅ Query completa funcionou!');
            System.debug('📋 Campos: Subject=' + eventToUpdate.Subject);
            System.debug('📋 reuniaoCriada__c=' + eventToUpdate.reuniaoCriada__c);
            System.debug('📋 statusReuniao__c=' + eventToUpdate.statusReuniao__c);
            System.debug('📋 gestor__c=' + eventToUpdate.gestor__c);
            System.debug('📋 salaReuniao__c=' + eventToUpdate.salaReuniao__c);
            
        } catch (Exception e) {
            System.debug('❌ Erro na query completa: ' + e.getMessage());
            System.debug('🔍 Tipo: ' + e.getTypeName());
            System.debug('🔍 Linha: ' + e.getLineNumber());
        }
        
        // Teste 3: Verificar permissões de update
        try {
            if (Schema.sObjectType.Event.isUpdateable()) {
                System.debug('✅ Permissão de UPDATE no Event: OK');
            } else {
                System.debug('❌ Permissão de UPDATE no Event: NEGADA');
            }
        } catch (Exception e) {
            System.debug('❌ Erro verificando permissões: ' + e.getMessage());
        }
        
        // Teste 4: Verificar campos específicos
        Schema.DescribeSObjectResult eventDescribe = Event.SObjectType.getDescribe();
        Map<String, Schema.SObjectField> fieldMap = eventDescribe.fields.getMap();
        
        List<String> testFields = new List<String>{
            'reuniaoCriada__c', 'statusReuniao__c', 'gestor__c', 
            'liderComercial__c', 'sdr__c', 'salaReuniao__c',
            'fase_evento__c', 'produto_evento__c'
        };
        
        for (String fieldName : testFields) {
            if (fieldMap.containsKey(fieldName)) {
                Schema.DescribeFieldResult fieldDescribe = fieldMap.get(fieldName).getDescribe();
                System.debug('✅ Campo ' + fieldName + ' - Acessível: ' + fieldDescribe.isAccessible() + 
                           ', Atualizável: ' + fieldDescribe.isUpdateable());
            } else {
                System.debug('❌ Campo ' + fieldName + ' NÃO EXISTE');
            }
        }
    }
    
} catch (Exception e) {
    System.debug('❌ ERRO GERAL: ' + e.getMessage());
    System.debug('🔍 Tipo: ' + e.getTypeName());
    System.debug('🔍 Linha: ' + e.getLineNumber());
}

// Teste de permissões na devReino - comparar com scratch
try {
    System.debug('=== TESTE DE PERMISSÕES - DEVREINO ===');
    
    // Teste 1: Query básica
    List<Event> events = [SELECT Id, Subject FROM Event LIMIT 1];
    System.debug('✅ Query básica: ' + events.size() + ' eventos');
    
    if (!events.isEmpty()) {
        String eventId = events[0].Id;
        System.debug('📅 Testando com evento: ' + eventId);
        
        // Teste 2: Query completa como no AppointmentController (COM Type)
        try {
            Event eventToUpdate = [
                SELECT
                    Id,
                    Subject,
                    Location,
                    StartDateTime,
                    EndDateTime,
                    IsAllDayEvent,
                    Type,
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
            System.debug('✅ Query completa COM Type funcionou!');
            System.debug('📋 Type=' + eventToUpdate.Type);
            
        } catch (Exception e) {
            System.debug('❌ Erro na query COM Type: ' + e.getMessage());
            
            // Teste 2b: Query sem Type
            try {
                Event eventToUpdate2 = [
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
                System.debug('✅ Query SEM Type funcionou!');
            } catch (Exception e2) {
                System.debug('❌ Erro na query SEM Type: ' + e2.getMessage());
            }
        }
        
        // Teste 3: Verificar se campo Type existe
        Schema.DescribeSObjectResult eventDescribe = Event.SObjectType.getDescribe();
        Map<String, Schema.SObjectField> fieldMap = eventDescribe.fields.getMap();
        
        if (fieldMap.containsKey('type')) {
            System.debug('✅ Campo Type EXISTE na devReino');
        } else {
            System.debug('❌ Campo Type NÃO EXISTE na devReino');
        }
    }
    
} catch (Exception e) {
    System.debug('❌ ERRO GERAL: ' + e.getMessage());
    System.debug('🔍 Tipo: ' + e.getTypeName());
    System.debug('🔍 Linha: ' + e.getLineNumber());
}

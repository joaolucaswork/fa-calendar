// Test script to debug Opportunity trigger synchronization

// Get the existing Opportunity and Event
Opportunity opp = [SELECT Id, Tipo_de_produto__c, Nome_do_Lead__c FROM Opportunity LIMIT 1];
Event evt = [SELECT Id, Subject, WhoId, produto_evento__c FROM Event LIMIT 1];

System.debug('Before update:');
System.debug('Opportunity Product: ' + opp.Tipo_de_produto__c);
System.debug('Event Product: ' + evt.produto_evento__c);
System.debug('Lead Name in Opp: ' + opp.Nome_do_Lead__c);

// Get Lead info
Lead lead = [SELECT Id, FirstName, LastName FROM Lead WHERE Id = :evt.WhoId];
String leadFullName = (lead.FirstName != null ? lead.FirstName + ' ' : '') + lead.LastName;
System.debug('Lead Full Name: "' + leadFullName + '"');

// Update the Opportunity product
opp.Tipo_de_produto__c = 'Gestão de Patrimônio';
update opp;

// Check if Event was updated
Event updatedEvent = [SELECT Id, produto_evento__c FROM Event WHERE Id = :evt.Id];
System.debug('After update:');
System.debug('Event Product: ' + updatedEvent.produto_evento__c);

// Test the trigger logic manually
System.debug('Testing trigger logic:');
System.debug('Lead name matches: ' + (leadFullName == opp.Nome_do_Lead__c));

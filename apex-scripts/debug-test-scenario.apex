// Debug script to replicate the exact test scenario

// Get test Contact
List<Contact> testContacts = [SELECT Id, AccountId FROM Contact LIMIT 1];
if (testContacts.isEmpty()) {
    System.debug('No test contacts found');
    return;
}
Contact testContact = testContacts[0];
System.debug('Test Contact ID: ' + testContact.Id);
System.debug('Test Contact AccountId: ' + testContact.AccountId);

// Get Opportunity for this Contact
List<Opportunity> contactOpps = [
    SELECT Id, Tipo_de_produto__c, AccountId
    FROM Opportunity 
    WHERE AccountId != null 
    LIMIT 1
];

if (contactOpps.isEmpty()) {
    System.debug('No opportunities found');
    return;
}

Opportunity contactOpp = contactOpps[0];
System.debug('Original Opportunity ID: ' + contactOpp.Id);
System.debug('Original Opportunity AccountId: ' + contactOpp.AccountId);
System.debug('Original Opportunity Product: "' + contactOpp.Tipo_de_produto__c + '"');

// Update Opportunity with multiple products
contactOpp.Tipo_de_produto__c = 'Consultoria Societária;Gestão de Patrimônio';
update contactOpp;
System.debug('Updated Opportunity Product to: "' + contactOpp.Tipo_de_produto__c + '"');

// Verify the update
Opportunity updatedOpp = [
    SELECT Id, Tipo_de_produto__c 
    FROM Opportunity 
    WHERE Id = :contactOpp.Id
];
System.debug('Verified Opportunity Product: "' + updatedOpp.Tipo_de_produto__c + '"');

// Check OpportunityContactRole
List<OpportunityContactRole> contactRoles = [
    SELECT ContactId, OpportunityId, Opportunity.StageName, Opportunity.Tipo_de_produto__c
    FROM OpportunityContactRole
    WHERE ContactId = :testContact.Id
    ORDER BY Opportunity.CreatedDate DESC
];

System.debug('Found ' + contactRoles.size() + ' OpportunityContactRoles for Contact');
for (OpportunityContactRole role : contactRoles) {
    System.debug('Role - OpportunityId: ' + role.OpportunityId + ', Product: "' + role.Opportunity.Tipo_de_produto__c + '"');
}

// Create Event and see what happens
Event testEvent = new Event(
    Subject = 'Debug Test Event',
    StartDateTime = DateTime.now(),
    EndDateTime = DateTime.now().addHours(1),
    WhoId = testContact.Id
);
insert testEvent;

// Check the Event result
Event insertedEvent = [
    SELECT Id, produto_evento__c, fase_evento__c
    FROM Event
    WHERE Id = :testEvent.Id
];

System.debug('Event Product Result: "' + insertedEvent.produto_evento__c + '"');
System.debug('Event Phase Result: "' + insertedEvent.fase_evento__c + '"');

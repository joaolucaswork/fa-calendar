// Debug script that replicates the exact test setup and scenario

// Create test Contact and Account (like @TestSetup)
Account testAccount = new Account(Name = 'Test Account');
insert testAccount;

Contact testContact = new Contact(
    FirstName = 'Maria',
    LastName = 'Santos',
    Email = 'maria.santos@teste.com',
    AccountId = testAccount.Id
);
insert testContact;

// Create test Opportunity for Contact (like @TestSetup)
Opportunity contactOpportunity = new Opportunity(
    Name = 'Contact Opportunity',
    StageName = 'Negociação',
    CloseDate = Date.today().addMonths(1),
    AccountId = testAccount.Id,
    Tipo_de_produto__c = 'Liquidação Negociada;Consultoria Societária'
);
insert contactOpportunity;

// Create OpportunityContactRole (like @TestSetup)
OpportunityContactRole contactRole = new OpportunityContactRole(
    OpportunityId = contactOpportunity.Id,
    ContactId = testContact.Id,
    Role = 'Decision Maker'
);
insert contactRole;

System.debug('=== SETUP COMPLETE ===');
System.debug('Contact ID: ' + testContact.Id);
System.debug('Opportunity ID: ' + contactOpportunity.Id);
System.debug('Original Opportunity Product: "' + contactOpportunity.Tipo_de_produto__c + '"');

// Now replicate the failing test scenario
System.debug('=== STARTING TEST SCENARIO ===');

// Update Opportunity with multiple products (like the test)
Opportunity contactOpp = [
    SELECT Id
    FROM Opportunity
    WHERE AccountId != NULL
    LIMIT 1
];
contactOpp.Tipo_de_produto__c = 'Consultoria Societária;Gestão de Patrimônio';
update contactOpp;

System.debug('Updated Opportunity Product to: "' + contactOpp.Tipo_de_produto__c + '"');

// Verify the update
Opportunity verifiedOpp = [
    SELECT Id, Tipo_de_produto__c 
    FROM Opportunity 
    WHERE Id = :contactOpp.Id
];
System.debug('Verified Opportunity Product: "' + verifiedOpp.Tipo_de_produto__c + '"');

// Check what the trigger will see
List<OpportunityContactRole> roles = [
    SELECT ContactId, OpportunityId, Opportunity.StageName, Opportunity.Tipo_de_produto__c
    FROM OpportunityContactRole
    WHERE ContactId = :testContact.Id
    ORDER BY Opportunity.CreatedDate DESC
];

System.debug('Found ' + roles.size() + ' OpportunityContactRoles');
for (OpportunityContactRole role : roles) {
    System.debug('Role - OpportunityId: ' + role.OpportunityId + ', Product: "' + role.Opportunity.Tipo_de_produto__c + '"');
}

// Create Event with Contact WhoId (like the test)
Event testEvent = new Event(
    Subject = 'Test Multi-Product Event',
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

System.debug('=== FINAL RESULTS ===');
System.debug('Event Product Result: "' + insertedEvent.produto_evento__c + '"');
System.debug('Event Phase Result: "' + insertedEvent.fase_evento__c + '"');
System.debug('Expected Product: "Consultoria Societária"');
System.debug('Test would ' + (insertedEvent.produto_evento__c == 'Consultoria Societária' ? 'PASS' : 'FAIL'));

/**
 * @description Apex script to create comprehensive test data for Client Tracking functionality
 * This script creates various client scenarios including:
 * - Multiple leads with event progressions
 * - Rescheduled events
 * - Cancelled and rescheduled patterns
 * - Events in different phases for the same clients
 * 
 * Run this script in Developer Console or via Anonymous Apex
 * @author Reino Capital
 * @last-modified 2025-01-18
 */

// Clean up existing test data (optional - uncomment if needed)
/*
List<Event> existingEvents = [SELECT Id FROM Event WHERE Subject LIKE '%Test Client%' OR Subject LIKE '%Teste Cliente%'];
List<Lead> existingLeads = [SELECT Id FROM Lead WHERE Company LIKE '%Empresa Test%'];
List<Contact> existingContacts = [SELECT Id FROM Contact WHERE LastName LIKE '%Test%'];

if (!existingEvents.isEmpty()) {
    delete existingEvents;
}
if (!existingLeads.isEmpty()) {
    delete existingLeads;
}
if (!existingContacts.isEmpty()) {
    delete existingContacts;
}
*/

System.debug('🚀 Starting Client Tracking Test Data Creation...');

// Create Test Leads for various client scenarios
List<Lead> testLeads = new List<Lead>();

// Scenario 1: High-Activity Client (João Silva) - Multiple events with rescheduling
testLeads.add(new Lead(
    FirstName = 'João',
    LastName = 'Silva',
    Company = 'Empresa Test A Ltda',
    Email = 'joao.silva@empresatesta.com',
    Phone = '(11) 99999-1001',
    Status = 'Interessado',
    LeadSource = 'Website'
));

// Scenario 2: Cancelled/Rescheduled Pattern Client (Maria Santos)
testLeads.add(new Lead(
    FirstName = 'Maria',
    LastName = 'Santos',
    Company = 'Empresa Test B Corp',
    Email = 'maria.santos@empresatestb.com',
    Phone = '(11) 99999-1002',
    Status = 'Interessado',
    LeadSource = 'Referral'
));

// Scenario 3: Multi-Phase Progression Client (Pedro Costa)
testLeads.add(new Lead(
    FirstName = 'Pedro',
    LastName = 'Costa',
    Company = 'Empresa Test C S.A.',
    Email = 'pedro.costa@empresatestc.com',
    Phone = '(11) 99999-1003',
    Status = 'Interessado',
    LeadSource = 'Cold Call'
));

// Scenario 4: Recent Activity Client (Ana Oliveira)
testLeads.add(new Lead(
    FirstName = 'Ana',
    LastName = 'Oliveira',
    Company = 'Empresa Test D ME',
    Email = 'ana.oliveira@empresatestd.com',
    Phone = '(11) 99999-1004',
    Status = 'Interessado',
    LeadSource = 'LinkedIn'
));

// Scenario 5: Single Event Client (should NOT be active)
testLeads.add(new Lead(
    FirstName = 'Carlos',
    LastName = 'Ferreira',
    Company = 'Empresa Test E Eireli',
    Email = 'carlos.ferreira@empresateste.com',
    Phone = '(11) 99999-1005',
    Status = 'Novo',
    LeadSource = 'Website'
));

// Scenario 6: Old Activity Client (should NOT be active due to old dates)
testLeads.add(new Lead(
    FirstName = 'Lucia',
    LastName = 'Mendes',
    Company = 'Empresa Test F Ltda',
    Email = 'lucia.mendes@empresatestf.com',
    Phone = '(11) 99999-1006',
    Status = 'Não Interessado',
    LeadSource = 'Trade Show'
));

insert testLeads;
System.debug('✅ Created ' + testLeads.size() + ' test leads');

// Create comprehensive test events for each scenario
List<Event> testEvents = new List<Event>();

// SCENARIO 1: João Silva - High-Activity Client (Multiple events + rescheduling + phases)
// Event 1: Initial meeting (rescheduled)
testEvents.add(new Event(
    Subject = 'Primeira Reunião - João Silva (Test Client)',
    StartDateTime = DateTime.now().addDays(-45),
    EndDateTime = DateTime.now().addDays(-45).addHours(1),
    WhoId = testLeads[0].Id,
    statusReuniao__c = 'Reagendado',
    fase_evento__c = 'Primeira Reunião',
    tipoReuniao__c = 'Reunião Presencial',
    salaReuniao__c = 'salaPrincipal'
));

// Event 2: Rescheduled first meeting (happened)
testEvents.add(new Event(
    Subject = 'Primeira Reunião - João Silva (Reagendada)',
    StartDateTime = DateTime.now().addDays(-40),
    EndDateTime = DateTime.now().addDays(-40).addHours(1),
    WhoId = testLeads[0].Id,
    statusReuniao__c = 'Reuniao aconteceu',
    fase_evento__c = 'Primeira Reunião',
    tipoReuniao__c = 'Reunião Presencial',
    salaReuniao__c = 'salaPrincipal'
));

// Event 3: Follow-up meeting
testEvents.add(new Event(
    Subject = 'Devolutiva - João Silva',
    StartDateTime = DateTime.now().addDays(-25),
    EndDateTime = DateTime.now().addDays(-25).addHours(1),
    WhoId = testLeads[0].Id,
    statusReuniao__c = 'Reuniao aconteceu',
    fase_evento__c = 'Devolutiva',
    tipoReuniao__c = 'Reunião Online',
    salaReuniao__c = 'Online'
));

// Event 4: Negotiation phase
testEvents.add(new Event(
    Subject = 'Negociação - João Silva',
    StartDateTime = DateTime.now().addDays(-10),
    EndDateTime = DateTime.now().addDays(-10).addHours(1),
    WhoId = testLeads[0].Id,
    statusReuniao__c = 'Reuniao aconteceu',
    fase_evento__c = 'Negociação',
    tipoReuniao__c = 'Reunião Presencial',
    salaReuniao__c = 'salaGabriel'
));

// Event 5: Future client meeting
testEvents.add(new Event(
    Subject = 'Reunião Cliente - João Silva',
    StartDateTime = DateTime.now().addDays(5),
    EndDateTime = DateTime.now().addDays(5).addHours(1),
    WhoId = testLeads[0].Id,
    fase_evento__c = 'Cliente',
    tipoReuniao__c = 'Reunião Presencial',
    salaReuniao__c = 'Sala Principal'
));

// SCENARIO 2: Maria Santos - Cancelled/Rescheduled Pattern
// Event 1: Cancelled meeting
testEvents.add(new Event(
    Subject = 'Primeira Reunião - Maria Santos (Cancelada)',
    StartDateTime = DateTime.now().addDays(-30),
    EndDateTime = DateTime.now().addDays(-30).addHours(1),
    WhoId = testLeads[1].Id,
    statusReuniao__c = 'Cancelado',
    fase_evento__c = 'Primeira Reunião',
    tipoReuniao__c = 'Reunião Presencial',
    salaReuniao__c = 'Sala Principal'
));

// Event 2: Rescheduled meeting (happened)
testEvents.add(new Event(
    Subject = 'Primeira Reunião - Maria Santos (Nova Data)',
    StartDateTime = DateTime.now().addDays(-20),
    EndDateTime = DateTime.now().addDays(-20).addHours(1),
    WhoId = testLeads[1].Id,
    statusReuniao__c = 'Reuniao aconteceu',
    fase_evento__c = 'Primeira Reunião',
    tipoReuniao__c = 'Reunião Online',
    salaReuniao__c = 'Online'
));

// Event 3: Follow-up (cancelled again)
testEvents.add(new Event(
    Subject = 'Devolutiva - Maria Santos (Cancelada)',
    StartDateTime = DateTime.now().addDays(-15),
    EndDateTime = DateTime.now().addDays(-15).addHours(1),
    WhoId = testLeads[1].Id,
    statusReuniao__c = 'Cancelado',
    fase_evento__c = 'Devolutiva',
    tipoReuniao__c = 'Reunião Presencial',
    salaReuniao__c = 'Sala Gabriel'
));

// Event 4: Rescheduled follow-up (future)
testEvents.add(new Event(
    Subject = 'Devolutiva - Maria Santos (Reagendada)',
    StartDateTime = DateTime.now().addDays(3),
    EndDateTime = DateTime.now().addDays(3).addHours(1),
    WhoId = testLeads[1].Id,
    fase_evento__c = 'Devolutiva',
    tipoReuniao__c = 'Reunião Online',
    salaReuniao__c = 'Online'
));

// SCENARIO 3: Pedro Costa - Multi-Phase Progression
// Event 1: First meeting
testEvents.add(new Event(
    Subject = 'Primeira Reunião - Pedro Costa',
    StartDateTime = DateTime.now().addDays(-35),
    EndDateTime = DateTime.now().addDays(-35).addHours(1),
    WhoId = testLeads[2].Id,
    statusReuniao__c = 'Reuniao aconteceu',
    fase_evento__c = 'Primeira Reunião',
    tipoReuniao__c = 'Reunião Presencial',
    salaReuniao__c = 'Sala Principal'
));

// Event 2: Devolutiva
testEvents.add(new Event(
    Subject = 'Devolutiva - Pedro Costa',
    StartDateTime = DateTime.now().addDays(-20),
    EndDateTime = DateTime.now().addDays(-20).addHours(1),
    WhoId = testLeads[2].Id,
    statusReuniao__c = 'Reuniao aconteceu',
    fase_evento__c = 'Devolutiva',
    tipoReuniao__c = 'Reunião Online',
    salaReuniao__c = 'Online'
));

// Event 3: Negotiation
testEvents.add(new Event(
    Subject = 'Negociação - Pedro Costa',
    StartDateTime = DateTime.now().addDays(-5),
    EndDateTime = DateTime.now().addDays(-5).addHours(1),
    WhoId = testLeads[2].Id,
    statusReuniao__c = 'Reuniao aconteceu',
    fase_evento__c = 'Negociação',
    tipoReuniao__c = 'Reunião Presencial',
    salaReuniao__c = 'Sala Gabriel'
));

// SCENARIO 4: Ana Oliveira - Recent Activity
// Event 1: Recent meeting
testEvents.add(new Event(
    Subject = 'Primeira Reunião - Ana Oliveira',
    StartDateTime = DateTime.now().addDays(-5),
    EndDateTime = DateTime.now().addDays(-5).addHours(1),
    WhoId = testLeads[3].Id,
    statusReuniao__c = 'Reuniao aconteceu',
    fase_evento__c = 'Primeira Reunião',
    tipoReuniao__c = 'Reunião Online',
    salaReuniao__c = 'Online'
));

// Event 2: Very recent meeting
testEvents.add(new Event(
    Subject = 'Follow-up - Ana Oliveira',
    StartDateTime = DateTime.now().addDays(-2),
    EndDateTime = DateTime.now().addDays(-2).addHours(1),
    WhoId = testLeads[3].Id,
    statusReuniao__c = 'Reuniao aconteceu',
    fase_evento__c = 'Devolutiva',
    tipoReuniao__c = 'Reunião Presencial',
    salaReuniao__c = 'Sala Principal'
));

// Event 3: Future meeting
testEvents.add(new Event(
    Subject = 'Negociação - Ana Oliveira',
    StartDateTime = DateTime.now().addDays(7),
    EndDateTime = DateTime.now().addDays(7).addHours(1),
    WhoId = testLeads[3].Id,
    fase_evento__c = 'Negociação',
    tipoReuniao__c = 'Reunião Presencial',
    salaReuniao__c = 'Sala Gabriel'
));

// SCENARIO 5: Carlos Ferreira - Single Event (should NOT be active)
testEvents.add(new Event(
    Subject = 'Primeira Reunião - Carlos Ferreira',
    StartDateTime = DateTime.now().addDays(-60),
    EndDateTime = DateTime.now().addDays(-60).addHours(1),
    WhoId = testLeads[4].Id,
    statusReuniao__c = 'Reuniao aconteceu',
    fase_evento__c = 'Primeira Reunião',
    tipoReuniao__c = 'Reunião Presencial',
    salaReuniao__c = 'Sala Principal'
));

// SCENARIO 6: Lucia Mendes - Old Activity (should NOT be active)
testEvents.add(new Event(
    Subject = 'Primeira Reunião - Lucia Mendes',
    StartDateTime = DateTime.now().addDays(-120),
    EndDateTime = DateTime.now().addDays(-120).addHours(1),
    WhoId = testLeads[5].Id,
    statusReuniao__c = 'Reuniao aconteceu',
    fase_evento__c = 'Primeira Reunião',
    tipoReuniao__c = 'Reunião Presencial',
    salaReuniao__c = 'Sala Principal'
));

testEvents.add(new Event(
    Subject = 'Follow-up - Lucia Mendes',
    StartDateTime = DateTime.now().addDays(-100),
    EndDateTime = DateTime.now().addDays(-100).addHours(1),
    WhoId = testLeads[5].Id,
    statusReuniao__c = 'Reuniao aconteceu',
    fase_evento__c = 'Devolutiva',
    tipoReuniao__c = 'Reunião Online',
    salaReuniao__c = 'Online'
));

insert testEvents;
System.debug('✅ Created ' + testEvents.size() + ' test events');

// Summary of expected active clients
System.debug('📊 EXPECTED ACTIVE CLIENTS SUMMARY:');
System.debug('1. João Silva - Should be ACTIVE (5 events, multiple phases, rescheduling)');
System.debug('2. Maria Santos - Should be ACTIVE (4 events, cancellation/rescheduling pattern)');
System.debug('3. Pedro Costa - Should be ACTIVE (3 events, multiple phases)');
System.debug('4. Ana Oliveira - Should be ACTIVE (3 events, recent activity)');
System.debug('5. Carlos Ferreira - Should NOT be active (1 event only, old)');
System.debug('6. Lucia Mendes - Should NOT be active (2 events but very old)');

System.debug('🎉 Client Tracking Test Data Creation Complete!');
System.debug('📝 You can now test the Client Tracking Pills component with this data.');
System.debug('🔍 Expected: 4 active clients should appear in the pills component.');

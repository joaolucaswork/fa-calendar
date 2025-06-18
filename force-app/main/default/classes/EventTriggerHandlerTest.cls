/**
 * @description Test class for EventTriggerHandler
 * Tests Event field synchronization with Opportunity data
 * @author Cascade
 */
@isTest
public class EventTriggerHandlerTest {
  @TestSetup
  static void setupTestData() {
    // Create test Lead
    Lead testLead = new Lead(
      FirstName = 'João',
      LastName = 'Silva',
      Company = 'Empresa Teste Ltda',
      Email = 'joao.silva@teste.com',
      Status = 'Open - Not Contacted'
    );
    insert testLead;

    // Create test Contact and Account
    Account testAccount = new Account(Name = 'Test Account');
    insert testAccount;

    Contact testContact = new Contact(
      FirstName = 'Maria',
      LastName = 'Santos',
      Email = 'maria.santos@teste.com',
      AccountId = testAccount.Id
    );
    insert testContact;

    // Create central account for Lead opportunities
    Account centralAccount = new Account(
      Name = 'Reino Capital - Oportunidades de Leads'
    );
    insert centralAccount;

    // Create test Opportunity for Lead
    Opportunity leadOpportunity = new Opportunity(
      Name = 'Lead: João Silva - Empresa Teste Ltda',
      StageName = 'Primeira Reunião',
      CloseDate = Date.today().addMonths(1),
      AccountId = centralAccount.Id,
      Nome_do_Lead__c = 'João Silva',
      Tipo_de_produto__c = 'Gestão de Patrimônio'
    );
    insert leadOpportunity;

    // Create test Opportunity for Contact
    Opportunity contactOpportunity = new Opportunity(
      Name = 'Contact Opportunity',
      StageName = 'Negociação',
      CloseDate = Date.today().addMonths(1),
      AccountId = testAccount.Id,
      Tipo_de_produto__c = 'Liquidação Otimizada;Consultoria Societária'
    );
    insert contactOpportunity;

    // Create OpportunityContactRole
    OpportunityContactRole contactRole = new OpportunityContactRole(
      OpportunityId = contactOpportunity.Id,
      ContactId = testContact.Id,
      Role = 'Decision Maker'
    );
    insert contactRole;
  }

  @isTest
  static void testEventInsert_WithLead_ShouldSynchronizeFields() {
    // Get test data
    Lead testLead = [SELECT Id FROM Lead LIMIT 1];

    Test.startTest();

    // Create Event with Lead WhoId
    Event testEvent = new Event(
      Subject = 'Test Event with Lead',
      StartDateTime = DateTime.now(),
      EndDateTime = DateTime.now().addHours(1),
      WhoId = testLead.Id
    );
    insert testEvent;

    Test.stopTest();

    // Verify Event fields were synchronized
    Event insertedEvent = [
      SELECT Id, fase_evento__c, produto_evento__c
      FROM Event
      WHERE Id = :testEvent.Id
    ];

    // NOTE: Phase field should NOT be synchronized - left free for manual input
    System.assertEquals(
      null,
      insertedEvent.fase_evento__c,
      'Event phase should remain free for manual input'
    );
    System.assertEquals(
      'Gestão de Patrimônio',
      insertedEvent.produto_evento__c,
      'Event product should be synchronized from Opportunity'
    );
  }

  @isTest
  static void testEventInsert_WithContact_ShouldSynchronizeFields() {
    // Get test data
    Contact testContact = [SELECT Id FROM Contact LIMIT 1];

    Test.startTest();

    // Create Event with Contact WhoId
    Event testEvent = new Event(
      Subject = 'Test Event with Contact',
      StartDateTime = DateTime.now(),
      EndDateTime = DateTime.now().addHours(1),
      WhoId = testContact.Id
    );
    insert testEvent;

    Test.stopTest();

    // Verify Event fields were synchronized
    Event insertedEvent = [
      SELECT Id, fase_evento__c, produto_evento__c
      FROM Event
      WHERE Id = :testEvent.Id
    ];

    // NOTE: Phase field should NOT be synchronized - left free for manual input
    System.assertEquals(
      null,
      insertedEvent.fase_evento__c,
      'Event phase should remain free for manual input'
    );
    System.assertEquals(
      'Liquidação Otimizada',
      insertedEvent.produto_evento__c,
      'Event product should be synchronized and converted from multi-select'
    );
  }

  @isTest
  static void testEventUpdate_WhoIdChanged_ShouldSynchronizeFields() {
    // Get test data
    Lead testLead = [SELECT Id FROM Lead LIMIT 1];
    Contact testContact = [SELECT Id FROM Contact LIMIT 1];

    // Create Event without WhoId
    Event testEvent = new Event(
      Subject = 'Test Event',
      StartDateTime = DateTime.now(),
      EndDateTime = DateTime.now().addHours(1)
    );
    insert testEvent;

    Test.startTest();

    // Update Event with Lead WhoId
    testEvent.WhoId = testLead.Id;
    update testEvent;

    Test.stopTest();

    // Verify Event fields were synchronized
    Event updatedEvent = [
      SELECT Id, fase_evento__c, produto_evento__c
      FROM Event
      WHERE Id = :testEvent.Id
    ];

    // NOTE: Phase field should NOT be synchronized - left free for manual input
    System.assertEquals(
      null,
      updatedEvent.fase_evento__c,
      'Event phase should remain free for manual input'
    );
    System.assertEquals(
      'Gestão de Patrimônio',
      updatedEvent.produto_evento__c,
      'Event product should be synchronized after WhoId update'
    );
  }

  @isTest
  static void testEventInsert_NoWhoId_ShouldNotError() {
    Test.startTest();

    // Create Event without WhoId
    Event testEvent = new Event(
      Subject = 'Test Event without WhoId',
      StartDateTime = DateTime.now(),
      EndDateTime = DateTime.now().addHours(1)
    );
    insert testEvent;

    Test.stopTest();

    // Verify Event was created successfully
    Event insertedEvent = [
      SELECT Id, fase_evento__c, produto_evento__c
      FROM Event
      WHERE Id = :testEvent.Id
    ];

    System.assertEquals(
      null,
      insertedEvent.fase_evento__c,
      'Event phase should remain null when no WhoId'
    );
    System.assertEquals(
      null,
      insertedEvent.produto_evento__c,
      'Event product should remain null when no WhoId'
    );
  }

  @isTest
  static void testEventInsert_NoRelatedOpportunity_ShouldNotError() {
    // Create Lead without related Opportunity
    Lead testLeadNoOpp = new Lead(
      FirstName = 'Pedro',
      LastName = 'Costa',
      Company = 'Empresa Sem Oportunidade',
      Email = 'pedro.costa@teste.com',
      Status = 'Open - Not Contacted'
    );
    insert testLeadNoOpp;

    Test.startTest();

    // Create Event with Lead that has no Opportunity
    Event testEvent = new Event(
      Subject = 'Test Event with Lead No Opportunity',
      StartDateTime = DateTime.now(),
      EndDateTime = DateTime.now().addHours(1),
      WhoId = testLeadNoOpp.Id
    );
    insert testEvent;

    Test.stopTest();

    // Verify Event was created successfully without synchronization
    Event insertedEvent = [
      SELECT Id, fase_evento__c, produto_evento__c
      FROM Event
      WHERE Id = :testEvent.Id
    ];

    System.assertEquals(
      null,
      insertedEvent.fase_evento__c,
      'Event phase should remain null when no related Opportunity'
    );
    System.assertEquals(
      null,
      insertedEvent.produto_evento__c,
      'Event product should remain null when no related Opportunity'
    );
  }

  @isTest
  static void testProductTypeConversion_MultiSelectToSingleSelect() {
    // Get test data
    Contact testContact = [SELECT Id FROM Contact LIMIT 1];

    Test.startTest();

    // Update Opportunity with multiple products
    Opportunity contactOpp = [
      SELECT Id
      FROM Opportunity
      WHERE AccountId != NULL
      LIMIT 1
    ];
    contactOpp.Tipo_de_produto__c = 'Consultoria Societária;Gestão de Patrimônio';
    update contactOpp;

    // Create Event with Contact WhoId
    Event testEvent = new Event(
      Subject = 'Test Multi-Product Event',
      StartDateTime = DateTime.now(),
      EndDateTime = DateTime.now().addHours(1),
      WhoId = testContact.Id
    );
    insert testEvent;

    Test.stopTest();

    // Verify Event product was converted correctly (first matching product)
    Event insertedEvent = [
      SELECT Id, produto_evento__c
      FROM Event
      WHERE Id = :testEvent.Id
    ];

    System.assertEquals(
      'Consultoria Societária',
      insertedEvent.produto_evento__c,
      'Event product should be first product from multi-select: Consultoria Societária'
    );
  }

  @isTest
  static void testEventUpdate_WhoIdNotChanged_ShouldNotProcess() {
    // Get test data
    Lead testLead = [SELECT Id FROM Lead LIMIT 1];

    // Create Event with Lead WhoId
    Event testEvent = new Event(
      Subject = 'Test Event',
      StartDateTime = DateTime.now(),
      EndDateTime = DateTime.now().addHours(1),
      WhoId = testLead.Id
    );
    insert testEvent;

    Test.startTest();

    // Update Event without changing WhoId
    testEvent.Subject = 'Updated Subject';
    update testEvent;

    Test.stopTest();

    // Verify Event was updated successfully
    Event updatedEvent = [
      SELECT Id, Subject
      FROM Event
      WHERE Id = :testEvent.Id
    ];

    System.assertEquals(
      'Updated Subject',
      updatedEvent.Subject,
      'Event subject should be updated'
    );
  }

  @isTest
  static void testEventInsert_WithDirectOpportunityWhatId_ShouldSynchronizeFields() {
    // Create a direct Opportunity for testing WhatId relationship
    Account testAccount = new Account(Name = 'Direct Opportunity Test Account');
    insert testAccount;

    Opportunity directOpportunity = new Opportunity(
      Name = 'Direct WhatId Test Opportunity',
      StageName = 'Primeira Reunião',
      CloseDate = Date.today().addMonths(1),
      AccountId = testAccount.Id,
      Tipo_de_produto__c = 'Gestão de Patrimônio'
    );
    insert directOpportunity;

    Test.startTest();

    // Create Event with direct Opportunity WhatId (no WhoId)
    Event testEvent = new Event(
      Subject = 'Test Event with Direct Opportunity',
      StartDateTime = DateTime.now(),
      EndDateTime = DateTime.now().addHours(1),
      WhatId = directOpportunity.Id
    );
    insert testEvent;

    Test.stopTest();

    // Verify Event fields were synchronized from direct Opportunity
    Event insertedEvent = [
      SELECT Id, fase_evento__c, produto_evento__c
      FROM Event
      WHERE Id = :testEvent.Id
    ];

    // NOTE: Phase field should NOT be synchronized - left free for manual input
    System.assertEquals(
      null,
      insertedEvent.fase_evento__c,
      'Event phase should remain free for manual input'
    );
    System.assertEquals(
      'Gestão de Patrimônio',
      insertedEvent.produto_evento__c,
      'Event product should be synchronized from direct Opportunity WhatId'
    );
  }

  @isTest
  static void testEventUpdate_WhatIdChanged_ShouldSynchronizeFields() {
    // Create two Opportunities for testing WhatId change
    Account testAccount = new Account(Name = 'WhatId Change Test Account');
    insert testAccount;

    Opportunity opportunity1 = new Opportunity(
      Name = 'First Opportunity',
      StageName = 'Primeira Reunião',
      CloseDate = Date.today().addMonths(1),
      AccountId = testAccount.Id,
      Tipo_de_produto__c = 'Gestão de Patrimônio'
    );
    insert opportunity1;

    Opportunity opportunity2 = new Opportunity(
      Name = 'Second Opportunity',
      StageName = 'Negociação',
      CloseDate = Date.today().addMonths(1),
      AccountId = testAccount.Id,
      Tipo_de_produto__c = 'Liquidação Otimizada'
    );
    insert opportunity2;

    // Create Event with first Opportunity
    Event testEvent = new Event(
      Subject = 'Test Event',
      StartDateTime = DateTime.now(),
      EndDateTime = DateTime.now().addHours(1),
      WhatId = opportunity1.Id
    );
    insert testEvent;

    Test.startTest();

    // Update Event to second Opportunity
    testEvent.WhatId = opportunity2.Id;
    update testEvent;

    Test.stopTest();

    // Verify Event fields were synchronized from second Opportunity
    Event updatedEvent = [
      SELECT Id, fase_evento__c, produto_evento__c
      FROM Event
      WHERE Id = :testEvent.Id
    ];

    // NOTE: Phase field should NOT be synchronized - left free for manual input
    System.assertEquals(
      null,
      updatedEvent.fase_evento__c,
      'Event phase should remain free for manual input'
    );
    System.assertEquals(
      'Liquidação Otimizada',
      updatedEvent.produto_evento__c,
      'Event product should be synchronized from updated Opportunity WhatId'
    );
  }

  @isTest
  static void testEventInsert_WithBothContactAndWhatId_ShouldPrioritizeWhatId() {
    // Get test data
    Contact testContact = [SELECT Id FROM Contact LIMIT 1];

    // Create a direct Opportunity for WhatId
    Account testAccount = new Account(Name = 'Priority Test Account');
    insert testAccount;

    Opportunity directOpportunity = new Opportunity(
      Name = 'Priority Test Opportunity',
      StageName = 'Negociação',
      CloseDate = Date.today().addMonths(1),
      AccountId = testAccount.Id,
      Tipo_de_produto__c = 'Consultoria Societária'
    );
    insert directOpportunity;

    Test.startTest();

    // Create Event with both WhoId (Contact) and WhatId (Opportunity)
    Event testEvent = new Event(
      Subject = 'Test Event with Both WhoId and WhatId',
      StartDateTime = DateTime.now(),
      EndDateTime = DateTime.now().addHours(1),
      WhoId = testContact.Id,
      WhatId = directOpportunity.Id
    );
    insert testEvent;

    Test.stopTest();

    // Verify Event fields were synchronized from WhatId (should take priority)
    Event insertedEvent = [
      SELECT Id, fase_evento__c, produto_evento__c
      FROM Event
      WHERE Id = :testEvent.Id
    ];

    // NOTE: Phase field should NOT be synchronized - left free for manual input
    System.assertEquals(
      null,
      insertedEvent.fase_evento__c,
      'Event phase should remain free for manual input'
    );
    System.assertEquals(
      'Consultoria Societária',
      insertedEvent.produto_evento__c,
      'Event product should be synchronized from WhatId (priority over WhoId)'
    );
  }
}

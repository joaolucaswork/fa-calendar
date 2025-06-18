/**
 * @description Trigger handler for Opportunity object to manage field synchronization with Event data
 * Automatically synchronizes related Event Product fields when Opportunity product changes.
 * @author Cascade
 */
public class OpportunityTriggerHandler {
  // Prevent recursive trigger execution
  private static Boolean isExecuting = false;

  /**
   * @description Handles after update operations on Opportunity
   * @param newOpportunities List of updated Opportunity records
   * @param oldOpportunityMap Map of old Opportunity records
   */
  public static void handleAfterUpdate(
    List<Opportunity> newOpportunities,
    Map<Id, Opportunity> oldOpportunityMap
  ) {
    if (isExecuting)
      return;
    isExecuting = true;

    try {
      // Only process opportunities where Tipo_de_produto__c has changed
      List<Opportunity> opportunitiesToProcess = new List<Opportunity>();
      for (Opportunity opp : newOpportunities) {
        Opportunity oldOpp = oldOpportunityMap.get(opp.Id);
        if (opp.Tipo_de_produto__c != oldOpp.Tipo_de_produto__c) {
          opportunitiesToProcess.add(opp);
        }
      }

      if (!opportunitiesToProcess.isEmpty()) {
        synchronizeRelatedEvents(opportunitiesToProcess);
      }
    } finally {
      isExecuting = false;
    }
  }

  /**
   * @description Synchronizes related Events when Opportunity product changes
   * @param opportunities List of Opportunity records with product changes
   */
  private static void synchronizeRelatedEvents(List<Opportunity> opportunities) {
    try {
      Set<Id> opportunityIds = new Set<Id>();
      for (Opportunity opp : opportunities) {
        opportunityIds.add(opp.Id);
      }

      // Find Events related to these Opportunities via WhatId
      List<Event> relatedEvents = [
        SELECT Id, WhatId, WhoId, produto_evento__c
        FROM Event
        WHERE WhatId IN :opportunityIds
      ];

      // Also find Events related via WhoId (Lead/Contact relationships)
      List<Event> whoIdRelatedEvents = findEventsRelatedViaWhoId(opportunities);
      
      // Combine both lists
      Map<Id, Event> eventsToUpdate = new Map<Id, Event>();
      for (Event evt : relatedEvents) {
        eventsToUpdate.put(evt.Id, evt);
      }
      for (Event evt : whoIdRelatedEvents) {
        eventsToUpdate.put(evt.Id, evt);
      }

      if (!eventsToUpdate.isEmpty()) {
        updateEventProducts(eventsToUpdate.values(), opportunities);
      }
    } catch (Exception e) {
      System.debug(
        'OpportunityTriggerHandler: Error in synchronizeRelatedEvents: ' +
        e.getMessage()
      );
      System.debug(
        'OpportunityTriggerHandler: Stack trace: ' + e.getStackTraceString()
      );
      // Don't throw exception to avoid blocking Opportunity updates
    }
  }

  /**
   * @description Finds Events related to Opportunities via WhoId (Lead/Contact relationships)
   * @param opportunities List of Opportunity records
   * @return List of related Event records
   */
  private static List<Event> findEventsRelatedViaWhoId(List<Opportunity> opportunities) {
    List<Event> relatedEvents = new List<Event>();
    
    // Get Lead names from opportunities
    Set<String> leadNames = new Set<String>();
    for (Opportunity opp : opportunities) {
      if (String.isNotBlank(opp.Nome_do_Lead__c)) {
        leadNames.add(opp.Nome_do_Lead__c);
      }
    }

    if (!leadNames.isEmpty()) {
      // Find Leads with these names
      Map<String, Id> leadNameToIdMap = new Map<String, Id>();
      List<Lead> leads = [
        SELECT Id, FirstName, LastName
        FROM Lead
      ];

      for (Lead lead : leads) {
        String leadFullName = (lead.FirstName != null ? lead.FirstName + ' ' : '') + lead.LastName;
        if (leadNames.contains(leadFullName)) {
          leadNameToIdMap.put(leadFullName, lead.Id);
        }
      }

      if (!leadNameToIdMap.isEmpty()) {
        // Find Events with these Lead WhoIds
        List<Event> leadEvents = [
          SELECT Id, WhatId, WhoId, produto_evento__c
          FROM Event
          WHERE WhoId IN :leadNameToIdMap.values()
        ];
        relatedEvents.addAll(leadEvents);
      }
    }

    // Find Events related via Contact OpportunityContactRoles
    Set<Id> opportunityIds = new Set<Id>();
    for (Opportunity opp : opportunities) {
      opportunityIds.add(opp.Id);
    }

    List<OpportunityContactRole> contactRoles = [
      SELECT ContactId, OpportunityId
      FROM OpportunityContactRole
      WHERE OpportunityId IN :opportunityIds
    ];

    if (!contactRoles.isEmpty()) {
      Set<Id> contactIds = new Set<Id>();
      for (OpportunityContactRole role : contactRoles) {
        contactIds.add(role.ContactId);
      }

      List<Event> contactEvents = [
        SELECT Id, WhatId, WhoId, produto_evento__c
        FROM Event
        WHERE WhoId IN :contactIds
      ];
      relatedEvents.addAll(contactEvents);
    }

    return relatedEvents;
  }

  /**
   * @description Updates Event product fields based on Opportunity changes
   * @param events List of Event records to update
   * @param opportunities List of Opportunity records with changes
   */
  private static void updateEventProducts(List<Event> events, List<Opportunity> opportunities) {
    // Create map of Opportunity ID to product type
    Map<Id, String> opportunityIdToProduct = new Map<Id, String>();
    Map<String, String> leadNameToProduct = new Map<String, String>();
    
    for (Opportunity opp : opportunities) {
      opportunityIdToProduct.put(opp.Id, opp.Tipo_de_produto__c);
      if (String.isNotBlank(opp.Nome_do_Lead__c)) {
        leadNameToProduct.put(opp.Nome_do_Lead__c, opp.Tipo_de_produto__c);
      }
    }

    // Get Lead name mapping for WhoId events
    Set<Id> leadIds = new Set<Id>();
    for (Event evt : events) {
      if (evt.WhoId != null && String.valueOf(evt.WhoId).startsWith('00Q')) {
        leadIds.add(evt.WhoId);
      }
    }

    Map<Id, String> leadIdToNameMap = new Map<Id, String>();
    if (!leadIds.isEmpty()) {
      List<Lead> leads = [
        SELECT Id, FirstName, LastName
        FROM Lead
        WHERE Id IN :leadIds
      ];
      
      for (Lead lead : leads) {
        String leadFullName = (lead.FirstName != null ? lead.FirstName + ' ' : '') + lead.LastName;
        leadIdToNameMap.put(lead.Id, leadFullName);
      }
    }

    // Get Contact to Opportunity mapping
    Map<Id, String> contactIdToProduct = new Map<Id, String>();
    Set<Id> contactIds = new Set<Id>();
    for (Event evt : events) {
      if (evt.WhoId != null && String.valueOf(evt.WhoId).startsWith('003')) {
        contactIds.add(evt.WhoId);
      }
    }

    if (!contactIds.isEmpty()) {
      List<OpportunityContactRole> contactRoles = [
        SELECT ContactId, OpportunityId
        FROM OpportunityContactRole
        WHERE ContactId IN :contactIds AND OpportunityId IN :opportunityIdToProduct.keySet()
      ];
      
      for (OpportunityContactRole role : contactRoles) {
        if (opportunityIdToProduct.containsKey(role.OpportunityId)) {
          contactIdToProduct.put(role.ContactId, opportunityIdToProduct.get(role.OpportunityId));
        }
      }
    }

    // Update Events
    List<Event> eventsToUpdate = new List<Event>();
    Integer updatedCount = 0;

    for (Event evt : events) {
      String newProductType = null;
      
      // Check direct WhatId relationship first
      if (evt.WhatId != null && opportunityIdToProduct.containsKey(evt.WhatId)) {
        newProductType = opportunityIdToProduct.get(evt.WhatId);
      }
      // Check WhoId relationships
      else if (evt.WhoId != null) {
        String whoIdString = String.valueOf(evt.WhoId);
        if (whoIdString.startsWith('00Q') && leadIdToNameMap.containsKey(evt.WhoId)) {
          // Lead relationship
          String leadName = leadIdToNameMap.get(evt.WhoId);
          if (leadNameToProduct.containsKey(leadName)) {
            newProductType = leadNameToProduct.get(leadName);
          }
        } else if (whoIdString.startsWith('003') && contactIdToProduct.containsKey(evt.WhoId)) {
          // Contact relationship
          newProductType = contactIdToProduct.get(evt.WhoId);
        }
      }

      if (String.isNotBlank(newProductType)) {
        String convertedProduct = convertProductType(newProductType);
        if (String.isNotBlank(convertedProduct) && evt.produto_evento__c != convertedProduct) {
          evt.produto_evento__c = convertedProduct;
          eventsToUpdate.add(evt);
          updatedCount++;
        }
      }
    }

    if (!eventsToUpdate.isEmpty()) {
      update eventsToUpdate;
      System.debug(
        'OpportunityTriggerHandler: Updated ' + updatedCount + ' Events with new product data'
      );
    }
  }

  /**
   * @description Converts Opportunity product type (multi-select) to Event product (single-select)
   * @param opportunityProductType Multi-select picklist value from Opportunity
   * @return Single product value for Event
   */
  private static String convertProductType(String opportunityProductType) {
    // Handle multi-select picklist conversion
    if (String.isBlank(opportunityProductType)) {
      return null;
    }

    // Product mapping between Opportunity and Event
    Map<String, String> productMapping = new Map<String, String>{
      'Gestão de Patrimônio' => 'Gestão de Patrimônio',
      'Liquidação Otimizada' => 'Liquidação Otimizada',
      'Consultoria Societária' => 'Consultoria Societária'
    };

    // Split multi-select values and take the first matching one
    List<String> products = opportunityProductType.split(';');
    for (String product : products) {
      String trimmedProduct = product.trim();
      if (productMapping.containsKey(trimmedProduct)) {
        return productMapping.get(trimmedProduct);
      }
    }

    // If no mapping found, return the first product
    return products.size() > 0 ? products[0].trim() : null;
  }
}

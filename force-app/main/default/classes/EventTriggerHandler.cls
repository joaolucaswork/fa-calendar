/**
 * @description Trigger handler for Event object to manage field synchronization with Opportunity data
 * Automatically synchronizes Event Product field with corresponding Opportunity data
 * through Contact and Lead relationships. Phase field (fase_evento__c) is left free for manual input.
 * @author Cascade
 */
public class EventTriggerHandler {
  // Prevent recursive trigger execution
  private static Boolean isExecuting = false;

  /**
   * @description Handles before insert operations on Event
   * @param newEvents List of new Event records
   */
  public static void handleBeforeInsert(List<Event> newEvents) {
    if (isExecuting)
      return;
    isExecuting = true;

    try {
      synchronizeEventFieldsWithOpportunity(newEvents);
    } finally {
      isExecuting = false;
    }
  }

  /**
   * @description Handles before update operations on Event
   * @param newEvents List of updated Event records
   * @param oldEventMap Map of old Event records
   */
  public static void handleBeforeUpdate(
    List<Event> newEvents,
    Map<Id, Event> oldEventMap
  ) {
    if (isExecuting)
      return;
    isExecuting = true;

    try {
      // Only process events where WhoId has changed
      List<Event> eventsToProcess = new List<Event>();
      for (Event evt : newEvents) {
        Event oldEvent = oldEventMap.get(evt.Id);
        if (evt.WhoId != oldEvent.WhoId) {
          eventsToProcess.add(evt);
        }
      }

      if (!eventsToProcess.isEmpty()) {
        synchronizeEventFieldsWithOpportunity(eventsToProcess);
      }
    } finally {
      isExecuting = false;
    }
  }

  /**
   * @description Main method to synchronize Event fields with Opportunity data
   * @param events List of Event records to process
   */
  private static void synchronizeEventFieldsWithOpportunity(
    List<Event> events
  ) {
    try {
      // Separate events by Lead and Contact WhoId
      Set<Id> leadIds = new Set<Id>();
      Set<Id> contactIds = new Set<Id>();

      for (Event evt : events) {
        if (evt.WhoId != null) {
          String whoIdString = String.valueOf(evt.WhoId);
          if (whoIdString.startsWith('00Q')) {
            // Lead ID prefix
            leadIds.add(evt.WhoId);
          } else if (whoIdString.startsWith('003')) {
            // Contact ID prefix
            contactIds.add(evt.WhoId);
          }
          // Ignore other WhoId types (User, etc.)
        }
      }

      // Skip processing if no valid Lead or Contact IDs found
      if (leadIds.isEmpty() && contactIds.isEmpty()) {
        System.debug(
          'EventTriggerHandler: No valid Lead or Contact IDs found for synchronization'
        );
        return;
      }

      // Get opportunity data for both Lead and Contact relationships
      Map<Id, OpportunityData> whoIdToOpportunityMap = new Map<Id, OpportunityData>();

      if (!leadIds.isEmpty()) {
        whoIdToOpportunityMap.putAll(getOpportunityDataForLeads(leadIds));
      }

      if (!contactIds.isEmpty()) {
        whoIdToOpportunityMap.putAll(getOpportunityDataForContacts(contactIds));
      }

      // Update Event fields based on Opportunity data
      updateEventFields(events, whoIdToOpportunityMap);
    } catch (Exception e) {
      System.debug(
        'EventTriggerHandler: Error in synchronizeEventFieldsWithOpportunity: ' +
        e.getMessage()
      );
      System.debug(
        'EventTriggerHandler: Stack trace: ' + e.getStackTraceString()
      );
      // Don't throw exception to avoid blocking Event creation/update
    }
  }

  /**
   * @description Gets Opportunity data for Lead IDs
   * @param leadIds Set of Lead IDs
   * @return Map of Lead ID to OpportunityData
   */
  private static Map<Id, OpportunityData> getOpportunityDataForLeads(
    Set<Id> leadIds
  ) {
    Map<Id, OpportunityData> result = new Map<Id, OpportunityData>();

    // Get Lead names for lookup
    Map<Id, String> leadIdToNameMap = new Map<Id, String>();
    List<Lead> leads = [
      SELECT Id, FirstName, LastName
      FROM Lead
      WHERE Id IN :leadIds
    ];

    for (Lead lead : leads) {
      String leadFullName =
        (lead.FirstName != null ? lead.FirstName + ' ' : '') + lead.LastName;
      leadIdToNameMap.put(lead.Id, leadFullName);
    }

    // Query opportunities linked to these leads
    List<Opportunity> opportunities = [
      SELECT Id, StageName, Tipo_de_produto__c, Nome_do_Lead__c
      FROM Opportunity
      WHERE Nome_do_Lead__c IN :leadIdToNameMap.values()
      ORDER BY CreatedDate DESC
    ];

    // Map opportunities back to Lead IDs (use most recent opportunity per lead)
    Map<String, OpportunityData> leadNameToOpportunityMap = new Map<String, OpportunityData>();
    for (Opportunity opp : opportunities) {
      if (!leadNameToOpportunityMap.containsKey(opp.Nome_do_Lead__c)) {
        leadNameToOpportunityMap.put(
          opp.Nome_do_Lead__c,
          new OpportunityData(opp)
        );
      }
    }

    // Convert back to Lead ID mapping
    for (Id leadId : leadIdToNameMap.keySet()) {
      String leadName = leadIdToNameMap.get(leadId);
      if (leadNameToOpportunityMap.containsKey(leadName)) {
        result.put(leadId, leadNameToOpportunityMap.get(leadName));
      }
    }

    return result;
  }

  /**
   * @description Gets Opportunity data for Contact IDs
   * @param contactIds Set of Contact IDs
   * @return Map of Contact ID to OpportunityData
   */
  private static Map<Id, OpportunityData> getOpportunityDataForContacts(
    Set<Id> contactIds
  ) {
    Map<Id, OpportunityData> result = new Map<Id, OpportunityData>();

    // Query opportunities through OpportunityContactRole
    List<OpportunityContactRole> contactRoles = [
      SELECT
        ContactId,
        OpportunityId,
        Opportunity.StageName,
        Opportunity.Tipo_de_produto__c
      FROM OpportunityContactRole
      WHERE ContactId IN :contactIds
      ORDER BY Opportunity.CreatedDate DESC
    ];

    // Use most recent opportunity per contact
    for (OpportunityContactRole role : contactRoles) {
      if (!result.containsKey(role.ContactId)) {
        result.put(role.ContactId, new OpportunityData(role.Opportunity));
      }
    }

    return result;
  }

  /**
   * @description Updates Event fields based on Opportunity data
   * @param events List of Event records to update
   * @param whoIdToOpportunityMap Map of WhoId to OpportunityData
   */
  private static void updateEventFields(
    List<Event> events,
    Map<Id, OpportunityData> whoIdToOpportunityMap
  ) {
    Integer updatedCount = 0;

    for (Event evt : events) {
      if (evt.WhoId != null && whoIdToOpportunityMap.containsKey(evt.WhoId)) {
        OpportunityData oppData = whoIdToOpportunityMap.get(evt.WhoId);

        if (oppData != null) {
          Boolean fieldUpdated = false;

          // NOTE: Phase field (fase_evento__c) is left free for manual input
          // Only synchronize Product field (convert multi-select to single-select)
          if (String.isNotBlank(oppData.productType)) {
            String convertedProduct = convertProductType(oppData.productType);
            if (
              String.isNotBlank(convertedProduct) &&
              (String.isBlank(evt.produto_evento__c) ||
              evt.produto_evento__c != convertedProduct)
            ) {
              evt.produto_evento__c = convertedProduct;
              fieldUpdated = true;
            }
          }

          if (fieldUpdated) {
            updatedCount++;
          }
        }
      }
    }

    System.debug(
      'EventTriggerHandler: Updated ' +
        updatedCount +
        ' events with Opportunity data'
    );
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
      'Liquidação Negociada' => 'Liquidação Otimizada',
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

  /**
   * @description Inner class to hold Opportunity data
   */
  private class OpportunityData {
    public String stageName;
    public String productType;

    public OpportunityData(Opportunity opp) {
      this.stageName = opp.StageName;
      this.productType = opp.Tipo_de_produto__c;
    }
  }
}

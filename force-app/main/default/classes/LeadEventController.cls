/**
 * @description Controller for managing Lead Events and associated Opportunities
 * Handles the new process where Leads classified as "Interessado" get Events and Opportunities
 * without being converted, maintaining them in Lead status until they become actual customers
 * @author Cascade
 *
 * REACTIVATED - LEAD EVENT MANAGEMENT SYSTEM
 * This system automatically creates Events and Opportunities when Tasks are marked as "Interessado"
 * System is now active and functional
 */
public with sharing class LeadEventController {
  // Central Account name for holding Lead-stage opportunities
  private static final String CENTRAL_ACCOUNT_NAME = 'Reino Capital - Oportunidades de Leads';

  /**
   * @description Creates an Event and Opportunity for a Lead when classified as "Interessado"
   * @param leadId The Lead ID
   * @param taskId The Task ID that triggered this (optional)
   * @return Map containing the created Event and Opportunity IDs
   *
   * REACTIVATED - LEAD EVENT MANAGEMENT SYSTEM
   */
  @AuraEnabled
  public static Map<String, Object> createLeadEventAndOpportunity(
    String leadId,
    String taskId
  ) {
    // REACTIVATED - Lead Event Management System
    return createLeadEventAndOpportunityInternal(leadId, taskId, true);
  }

  /**
   * @description Internal method for creating Event and Opportunity - can be called from @future context
   * @param leadId The Lead ID
   * @param taskId The Task ID that triggered this (optional)
   * @param throwAuraException Whether to throw AuraHandledException or regular Exception
   * @return Map containing the created Event and Opportunity IDs
   *
   * REACTIVATED - LEAD EVENT MANAGEMENT SYSTEM
   */
  public static Map<String, Object> createLeadEventAndOpportunityInternal(
    String leadId,
    String taskId,
    Boolean throwAuraException
  ) {
    // REACTIVATED - Lead Event Management System
    try {
      // Get Lead details
      Lead lead = [
        SELECT
          Id,
          Name,
          FirstName,
          LastName,
          Company,
          Email,
          Phone,
          OwnerId,
          Status
        FROM Lead
        WHERE Id = :leadId
        WITH SECURITY_ENFORCED
        LIMIT 1
      ];

      // Get the full name for personal accounts (when FirstName is empty, use LastName)
      String leadFullName = getLeadFullName(lead);

      // Get or create central Account
      Account centralAccount = getCentralAccount();

      // Check if Event already exists for this Lead
      List<Event> existingEvents = [
        SELECT Id, Subject, StartDateTime, EndDateTime, WhoId, WhatId, Oportunidade_Relacionada__c
        FROM Event
        WHERE WhoId = :leadId AND Subject LIKE '%Lead:%'
        ORDER BY CreatedDate DESC
        LIMIT 1
      ];

      Event leadEvent;
      if (!existingEvents.isEmpty()) {
        leadEvent = existingEvents[0];
      } else {
        // Create new Event for the Lead
        leadEvent = new Event(
          Subject = 'Lead: ' + leadFullName + ' - Primeiro Contato',
          StartDateTime = DateTime.now(),
          EndDateTime = DateTime.now().addHours(1),
          WhoId = leadId,
          OwnerId = lead.OwnerId,
          Criado_Por_Automacao__c = true, // Mark as created by automation
          Description = 'Evento criado automaticamente para Lead classificado como Interessado.\n' +
            'Lead: ' +
            leadFullName +
            '\n' +
            'Empresa: ' +
            lead.Company +
            '\n\n[OPPORTUNITY_LINKED:true]' +
            '\n[OPPORTUNITY_STAGE:Primeiro Contato]' +
            '\n[DUAL_RELATIONSHIP:Lead+Opportunity]'
        );
        insert leadEvent;
      }

      // Check if Opportunity already exists for this Lead
      List<Opportunity> existingOpportunities = [
        SELECT Id, Name, StageName, AccountId, Nome_do_Lead__c
        FROM Opportunity
        WHERE Nome_do_Lead__c = :leadFullName AND AccountId = :centralAccount.Id
        ORDER BY CreatedDate DESC
        LIMIT 1
      ];

      Opportunity leadOpportunity;
      if (!existingOpportunities.isEmpty()) {
        leadOpportunity = existingOpportunities[0];

        // NEW: Link Event to existing Opportunity using custom lookup field
        if (leadEvent.Oportunidade_Relacionada__c != leadOpportunity.Id) {
          leadEvent.Oportunidade_Relacionada__c = leadOpportunity.Id;
          update leadEvent;
        }

        // Note: Cannot use WhatId when Event already has Lead (WhoId)
        // But we can use the custom Oportunidade_Relacionada__c field instead
      } else {
        // Create new Opportunity linked to central Account
        leadOpportunity = new Opportunity(
          Name = 'Lead: ' + leadFullName + ' - ' + lead.Company,
          StageName = 'Primeiro Contato',
          CloseDate = Date.today().addMonths(1), // 1 month from today instead of 30 days
          AccountId = centralAccount.Id,
          OwnerId = lead.OwnerId,
          Nome_do_Lead__c = leadFullName,
          Description = 'Oportunidade criada automaticamente para Lead classificado como Interessado.\n' +
            'Lead ID: ' +
            leadId +
            '\n' +
            'Lead: ' +
            leadFullName +
            '\n' +
            'Empresa: ' +
            lead.Company,
          // Tipo_de_produto__c will use default value from field definition
          Probabilidade_da_Oportunidade__c = 'treze', // Default probability 13%
          Amount = 50000.00 // Default amount R$ 50,000
        );
        insert leadOpportunity;

        // Update Event description with Opportunity ID
        String currentDescription = leadEvent.Description != null
          ? leadEvent.Description
          : '';
        leadEvent.Description =
          currentDescription +
          '\n[OPPORTUNITY_ID:' +
          leadOpportunity.Id +
          ']';

        // NEW: Link Event to Opportunity using custom lookup field
        leadEvent.Oportunidade_Relacionada__c = leadOpportunity.Id;
        update leadEvent;

        // Note: Cannot use WhatId when Event already has Lead (WhoId)
        // But we can use the custom Oportunidade_Relacionada__c field instead

        // Note: LeadStageOpportunityId__c field update removed due to permissions
        // lead.LeadStageOpportunityId__c = leadOpportunity.Id;
        // update lead;
      }

      return new Map<String, Object>{
        'success' => true,
        'eventId' => leadEvent.Id,
        'opportunityId' => leadOpportunity.Id,
        'message' => 'Event e Opportunity criados com sucesso para o Lead'
      };
    } catch (Exception e) {
      if (throwAuraException) {
        throw new AuraHandledException(
          'Erro ao criar Event e Opportunity para Lead: ' + e.getMessage()
        );
      } else {
        throw new CalloutException(
          'Erro ao criar Event e Opportunity para Lead: ' + e.getMessage()
        );
      }
    }
  }

  /**
   * @description Gets or creates the central Account for holding Lead opportunities
   * @return The central Account record
   */
  private static Account getCentralAccount() {
    List<Account> existingAccounts = [
      SELECT Id, Name
      FROM Account
      WHERE Name = :CENTRAL_ACCOUNT_NAME
      WITH SECURITY_ENFORCED
      LIMIT 1
    ];

    if (!existingAccounts.isEmpty()) {
      return existingAccounts[0];
    }

    // Create central Account if it doesn't exist
    Account centralAccount = new Account(
      Name = CENTRAL_ACCOUNT_NAME,
      Type = 'Other',
      Description = 'Conta central para armazenar oportunidades de Leads que ainda não foram convertidos'
    );
    insert centralAccount;

    return centralAccount;
  }

  /**
   * @description Updates the stage of a Lead-related Opportunity
   * @param opportunityId The Opportunity ID
   * @param newStage The new stage value
   * @return Success message
   *
   * REACTIVATED - LEAD EVENT MANAGEMENT SYSTEM
   */
  @AuraEnabled
  public static String updateLeadOpportunityStage(
    String opportunityId,
    String newStage
  ) {
    // REACTIVATED - Lead Event Management System
    try {
      Opportunity opp = [
        SELECT Id, StageName
        FROM Opportunity
        WHERE Id = :opportunityId
        WITH SECURITY_ENFORCED
        LIMIT 1
      ];

      opp.StageName = newStage;
      update opp;

      // Update related Events with the new stage
      // Note: Description field cannot be filtered, so we'll update the specific event only
      // In a real implementation, you might want to use a custom field for better querying

      return 'Stage da oportunidade atualizado para: ' + newStage;
    } catch (Exception e) {
      throw new AuraHandledException(
        'Erro ao atualizar stage da oportunidade: ' + e.getMessage()
      );
    }
  }

  /**
   * @description Updates multiple fields of an Opportunity for a Lead
   * @param opportunityId The Opportunity ID (optional if included in opportunityData)
   * @param opportunityData Map with field values to update
   * @return Success message
   */
  @AuraEnabled
  public static String updateLeadOpportunityFields(
    String opportunityId,
    Map<String, Object> opportunityData
  ) {
    // REACTIVATED - Lead Event Management System
    try {
      // If opportunityId is not provided as parameter, try to get it from data
      if (String.isBlank(opportunityId) && opportunityData.containsKey('opportunityId')) {
        opportunityId = (String) opportunityData.get('opportunityId');
      }

      if (String.isBlank(opportunityId)) {
        throw new AuraHandledException('ID da oportunidade é obrigatório');
      }

      Opportunity opp = [
        SELECT
          Id,
          StageName,
          Probabilidade_da_Oportunidade__c,
          CloseDate,
          Tipo_de_produto__c,
          Amount
        FROM Opportunity
        WHERE Id = :opportunityId
        WITH SECURITY_ENFORCED
        LIMIT 1
      ];

      // Update fields if provided - support both naming conventions
      if (opportunityData.containsKey('stageName')) {
        opp.StageName = (String) opportunityData.get('stageName');
      } else if (opportunityData.containsKey('stage')) {
        opp.StageName = (String) opportunityData.get('stage');
      }

      if (opportunityData.containsKey('probability')) {
        opp.Probabilidade_da_Oportunidade__c = (String) opportunityData.get('probability');
      }

      if (opportunityData.containsKey('closeDate')) {
        String closeDateStr = (String) opportunityData.get('closeDate');
        if (String.isNotBlank(closeDateStr)) {
          opp.CloseDate = Date.valueOf(closeDateStr);
        }
      }

      if (opportunityData.containsKey('type')) {
        // Only update Tipo_de_produto__c field (Type field is not used)
        String typeValue = (String) opportunityData.get('type');
        opp.Tipo_de_produto__c = typeValue;
      }

      if (opportunityData.containsKey('amount')) {
        Object amountValue = opportunityData.get('amount');
        if (amountValue != null && String.isNotBlank(String.valueOf(amountValue))) {
          opp.Amount = Decimal.valueOf(String.valueOf(amountValue));
        }
      }

      update opp;

      return 'Oportunidade atualizada com sucesso';
    } catch (Exception e) {
      throw new AuraHandledException(
        'Erro ao atualizar oportunidade: ' + e.getMessage()
      );
    }
  }

  /**
   * @description Updates the stage of an Opportunity through an Event
   * @param eventId The Event ID
   * @param newStage The new stage value
   * @return Success message
   */
  @AuraEnabled
  public static String updateOpportunityStageFromEvent(
    String eventId,
    String newStage
  ) {
    try {
      Event evt = [
        SELECT Id, Description, Oportunidade_Relacionada__c
        FROM Event
        WHERE Id = :eventId
        WITH SECURITY_ENFORCED
        LIMIT 1
      ];

      String opportunityId = extractOpportunityIdFromDescription(
        evt.Description
      );
      Boolean opportunityLinked = extractOpportunityLinkedFromDescription(
        evt.Description
      );

      if (!opportunityLinked || String.isBlank(opportunityId)) {
        throw new AuraHandledException(
          'Este evento não possui uma oportunidade vinculada.'
        );
      }

      // Update the Event description with new stage
      evt.Description = updateStageInDescription(evt.Description, newStage);
      update evt;

      // Update the Opportunity stage
      Opportunity opp = [
        SELECT Id, StageName
        FROM Opportunity
        WHERE Id = :opportunityId
        WITH SECURITY_ENFORCED
        LIMIT 1
      ];

      opp.StageName = newStage;
      update opp;

      return 'Stage atualizado com sucesso para: ' + newStage;
    } catch (Exception e) {
      throw new AuraHandledException(
        'Erro ao atualizar stage: ' + e.getMessage()
      );
    }
  }

  /**
   * @description Extracts opportunity ID from event description
   * @param description The event description
   * @return The opportunity ID or null
   */
  private static String extractOpportunityIdFromDescription(
    String description
  ) {
    if (String.isBlank(description))
      return null;

    Pattern p = Pattern.compile('\\[OPPORTUNITY_ID:([^\\]]+)\\]');
    Matcher m = p.matcher(description);

    if (m.find()) {
      return m.group(1);
    }

    return null;
  }

  /**
   * @description Extracts opportunity linked status from event description
   * @param description The event description
   * @return True if opportunity is linked
   */
  private static Boolean extractOpportunityLinkedFromDescription(
    String description
  ) {
    if (String.isBlank(description))
      return false;

    Pattern p = Pattern.compile('\\[OPPORTUNITY_LINKED:([^\\]]+)\\]');
    Matcher m = p.matcher(description);

    if (m.find()) {
      return Boolean.valueOf(m.group(1));
    }

    return false;
  }

  /**
   * @description Extracts opportunity stage from event description
   * @param description The event description
   * @return The opportunity stage or null
   */
  private static String extractOpportunityStageFromDescription(
    String description
  ) {
    if (String.isBlank(description))
      return null;

    Pattern p = Pattern.compile('\\[OPPORTUNITY_STAGE:([^\\]]+)\\]');
    Matcher m = p.matcher(description);

    if (m.find()) {
      return m.group(1);
    }

    return null;
  }

  /**
   * @description Updates the stage in event description
   * @param description The current description
   * @param newStage The new stage
   * @return Updated description
   */
  private static String updateStageInDescription(
    String description,
    String newStage
  ) {
    if (String.isBlank(description))
      return description;

    Pattern p = Pattern.compile('\\[OPPORTUNITY_STAGE:([^\\]]+)\\]');
    String updatedDescription = p.matcher(description)
      .replaceAll('[OPPORTUNITY_STAGE:' + newStage + ']');

    return updatedDescription;
  }

  /**
   * @description Gets Events related to a specific Opportunity using the custom lookup field
   * @param opportunityId The Opportunity ID
   * @return List of Events related to the Opportunity
   */
  @AuraEnabled(cacheable=true)
  public static List<Event> getEventsByOpportunity(String opportunityId) {
    try {
      return [
        SELECT
          Id,
          Subject,
          StartDateTime,
          EndDateTime,
          Description,
          Location,
          WhoId,
          WhatId,
          Oportunidade_Relacionada__c,
          OwnerId,
          Owner.Name,
          Who.Name
        FROM Event
        WHERE Oportunidade_Relacionada__c = :opportunityId
        ORDER BY StartDateTime DESC
      ];
    } catch (Exception e) {
      throw new AuraHandledException(
        'Erro ao recuperar eventos da oportunidade: ' + e.getMessage()
      );
    }
  }

  /**
   * @description Gets Lead Event and Opportunity details for calendar display
   * @param leadId The Lead ID
   * @return Map containing Lead, Event, and Opportunity details
   */
  @AuraEnabled(cacheable=true)
  public static Map<String, Object> getLeadEventDetails(String leadId) {
    try {
      Map<String, Object> result = new Map<String, Object>();

      // Get Lead details
      Lead lead = [
        SELECT
          Id,
          Name,
          FirstName,
          LastName,
          Company,
          Email,
          Phone,
          Status,
          OwnerId,
          Owner.Name
        FROM Lead
        WHERE Id = :leadId
        WITH SECURITY_ENFORCED
        LIMIT 1
      ];
      result.put('lead', lead);

      // Get related Events
      List<Event> events = [
        SELECT
          Id,
          Subject,
          StartDateTime,
          EndDateTime,
          Description,
          Location,
          WhoId,
          WhatId,
          Oportunidade_Relacionada__c,
          OwnerId,
          Owner.Name
        FROM Event
        WHERE WhoId = :leadId
        ORDER BY StartDateTime DESC
      ];
      result.put('events', events);

      // Get related Opportunities (through central Account)
      Account centralAccount = getCentralAccount();
      String leadFullName = getLeadFullName(lead);
      List<Opportunity> opportunities = [
        SELECT
          Id,
          Name,
          StageName,
          CloseDate,
          Amount,
          Probabilidade_da_Oportunidade__c,
          Tipo_de_produto__c,
          AccountId,
          Account.Name,
          Nome_do_Lead__c,
          OwnerId,
          Owner.Name,
          Description
        FROM Opportunity
        WHERE Nome_do_Lead__c = :leadFullName AND AccountId = :centralAccount.Id
        ORDER BY CreatedDate DESC
      ];
      result.put('opportunities', opportunities);

      return result;
    } catch (Exception e) {
      throw new AuraHandledException(
        'Erro ao recuperar detalhes do Lead: ' + e.getMessage()
      );
    }
  }

  /**
   * @description Parses a date string into DateTime, handling various formats
   * @param dateString The date string to parse
   * @return DateTime object
   */
  private static DateTime parseDateTime(String dateString) {
    if (String.isBlank(dateString)) {
      return null;
    }

    try {
      // Handle ISO format with 'T' separator
      if (dateString.contains('T')) {
        return DateTime.valueOf(dateString.replace('T', ' ').replace('Z', ''));
      }

      // Handle date-only format (YYYY-MM-DD)
      if (dateString.length() == 10 && dateString.contains('-')) {
        return DateTime.valueOf(dateString + ' 00:00:00');
      }

      // Handle datetime format with space separator
      return DateTime.valueOf(dateString);
    } catch (Exception e) {
      // If all parsing fails, try to parse as date and add time
      try {
        Date d = Date.valueOf(dateString);
        return DateTime.newInstance(d, Time.newInstance(0, 0, 0, 0));
      } catch (Exception ex) {
        throw new AuraHandledException(
          'Formato de data inválido: ' + dateString
        );
      }
    }
  }

  /**
   * @description Gets all Lead-related Events for calendar display
   * @param startDate Start date for filtering
   * @param endDate End date for filtering
   * @return List of Events related to Leads
   */
  @AuraEnabled(cacheable=true)
  public static List<Map<String, Object>> getLeadEvents(
    String startDate,
    String endDate
  ) {
    try {
      DateTime start = parseDateTime(startDate);
      DateTime endDateTime = parseDateTime(endDate);

      // Get all Events where WhoId is a Lead (Lead IDs start with '00Q')
      List<Event> events = [
        SELECT
          Id,
          Subject,
          StartDateTime,
          EndDateTime,
          Description,
          Location,
          WhoId,
          WhatId,
          Oportunidade_Relacionada__c,
          OwnerId,
          Owner.Name,
          Who.Name
        FROM Event
        WHERE
          WhoId != NULL
          AND StartDateTime >= :start
          AND EndDateTime <= :endDateTime
        ORDER BY StartDateTime ASC
      ];

      // Filter for Lead Events in Apex since SOQL doesn't support LIKE on ID fields
      List<Event> leadEvents = new List<Event>();
      for (Event evt : events) {
        if (evt.WhoId != null && String.valueOf(evt.WhoId).startsWith('00Q')) {
          leadEvents.add(evt);
        }
      }

      List<Map<String, Object>> formattedEvents = new List<Map<String, Object>>();

      for (Event evt : leadEvents) {
        // Extract opportunity information from description
        Boolean opportunityLinked = extractOpportunityLinkedFromDescription(
          evt.Description
        );
        String opportunityId = extractOpportunityIdFromDescription(
          evt.Description
        );
        String opportunityStage = extractOpportunityStageFromDescription(
          evt.Description
        );

        Map<String, Object> eventMap = new Map<String, Object>{
          'id' => evt.Id,
          'title' => evt.Subject,
          'start' => evt.StartDateTime.formatGmt(
            'yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\''
          ),
          'end' => evt.EndDateTime.formatGmt(
            'yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\''
          ),
          'description' => evt.Description,
          'location' => evt.Location,
          'whoId' => evt.WhoId,
          'whatId' => evt.WhatId,
          'oportunidadeRelacionadaId' => evt.Oportunidade_Relacionada__c,
          'ownerId' => evt.OwnerId,
          'ownerName' => evt.Owner?.Name,
          'leadName' => evt.Who?.Name,
          'isLeadEvent' => true,
          'type' => 'Lead Event',
          'opportunityLinked' => opportunityLinked || evt.Oportunidade_Relacionada__c != null,
          'opportunityId' => evt.Oportunidade_Relacionada__c != null ? evt.Oportunidade_Relacionada__c : opportunityId,
          'opportunityStage' => opportunityStage,
          'hasDualRelationship' => evt.WhoId != null && evt.Oportunidade_Relacionada__c != null
        };
        formattedEvents.add(eventMap);
      }

      return formattedEvents;
    } catch (Exception e) {
      throw new AuraHandledException(
        'Erro ao recuperar eventos de Leads: ' + e.getMessage()
      );
    }
  }

  /**
   * @description Gets Lead Event and Opportunity details by Event ID for AppointmentEditor
   * @param eventId The Event ID
   * @return Map containing Lead, Event, and Opportunity details
   */
  @AuraEnabled(cacheable=true)
  public static Map<String, Object> getLeadEventDetailsByEventId(String eventId) {
    try {
      Map<String, Object> result = new Map<String, Object>();
      result.put('hasLeadInfo', false);

      // Get Event details
      List<Event> events = [
        SELECT
          Id,
          Subject,
          StartDateTime,
          EndDateTime,
          Description,
          Location,
          WhoId,
          WhatId,
          Oportunidade_Relacionada__c,
          OwnerId,
          Owner.Name
        FROM Event
        WHERE Id = :eventId
        WITH SECURITY_ENFORCED
        LIMIT 1
      ];

      if (events.isEmpty()) {
        return result;
      }

      Event evt = events[0];
      result.put('event', evt);

      // Check if this is a Lead Event (WhoId starts with '00Q')
      if (evt.WhoId == null || !String.valueOf(evt.WhoId).startsWith('00Q')) {
        return result;
      }

      // Get Lead details
      List<Lead> leads = [
        SELECT
          Id,
          Name,
          FirstName,
          LastName,
          Company,
          Email,
          Phone,
          Status,
          OwnerId,
          Owner.Name
        FROM Lead
        WHERE Id = :evt.WhoId
        WITH SECURITY_ENFORCED
        LIMIT 1
      ];

      if (leads.isEmpty()) {
        return result;
      }

      Lead lead = leads[0];
      result.put('hasLeadInfo', true);
      result.put('leadName', lead.Name);
      result.put('leadCompany', lead.Company);
      result.put('leadEmail', lead.Email);
      result.put('leadPhone', lead.Phone);
      result.put('leadStatus', lead.Status);

      // Get related Opportunities (through central Account)
      Account centralAccount = getCentralAccount();
      String leadFullName = getLeadFullName(lead);
      List<Opportunity> opportunities = [
        SELECT
          Id,
          Name,
          StageName,
          CloseDate,
          Amount,
          Probabilidade_da_Oportunidade__c,
          Tipo_de_produto__c,
          AccountId,
          Account.Name,
          Nome_do_Lead__c,
          OwnerId,
          Owner.Name,
          Description
        FROM Opportunity
        WHERE Nome_do_Lead__c = :leadFullName AND AccountId = :centralAccount.Id
        ORDER BY CreatedDate DESC
        LIMIT 1
      ];

      if (!opportunities.isEmpty()) {
        Opportunity opp = opportunities[0];
        result.put('opportunityId', opp.Id);
        result.put('opportunityName', opp.Name);
        result.put('opportunityStage', opp.StageName);
        result.put('opportunityProbability', opp.Probabilidade_da_Oportunidade__c);
        result.put('opportunityCloseDate', opp.CloseDate?.format());
        result.put('opportunityType', opp.Tipo_de_produto__c);
        result.put('opportunityAmount', opp.Amount);
        result.put('opportunityOwner', opp.Owner.Name);
        result.put('opportunityAccount', opp.Account.Name);
        result.put('opportunityDescription', opp.Description);
      }

      return result;
    } catch (Exception e) {
      throw new AuraHandledException(
        'Erro ao recuperar detalhes do Lead Event: ' + e.getMessage()
      );
    }
  }



  /**
   * @description Gets the full name for a Lead, handling personal accounts
   * @param lead The Lead record
   * @return The full name string
   */
  private static String getLeadFullName(Lead lead) {
    // For personal accounts, FirstName might be empty and full name is in LastName
    if (String.isBlank(lead.FirstName) && String.isNotBlank(lead.LastName)) {
      return lead.LastName;
    }

    // For business accounts, use the standard Name field
    return lead.Name;
  }
}
/**
 * @description Controlador para o componente agGridDemo
 * Este controlador fornece dados de Oportunidades para o componente de grid AG-Grid
 */
public with sharing class AgGridDemoController {
  /**
   * @description Retorna a lista de oportunidades para o componente AG-Grid
   * @return List<Opportunity> Lista de oportunidades
   */
  @AuraEnabled(cacheable=true)
  public static List<Opportunity> getOpportunities() {
    return [
      SELECT
        Id,
        Name,
        StageName,
        Amount,
        CloseDate,
        Account.Id,
        Account.Name,
        Owner.Id,
        Owner.Name,
        Probability,
        Probabilidade_da_Oportunidade__c,
        (
          SELECT
            Id,
            Subject,
            StartDateTime,
            Location,
            Description,
            WhatId,
            AccountId
          FROM Events
          ORDER BY StartDateTime DESC
          LIMIT 1
        )
      FROM Opportunity
      WITH SECURITY_ENFORCED
      ORDER BY CreatedDate DESC
      LIMIT 1000
    ];
  }

  /**
   * @description Retorna eventos relacionados às oportunidades (tanto diretamente quanto via conta)
   * @param opportunityIds Lista de IDs das oportunidades
   * @return List<Event> Lista de eventos relacionados
   */
  @AuraEnabled(cacheable=true)
  public static List<Event> getEventsForOpportunities(List<Id> opportunityIds) {
    if (opportunityIds == null || opportunityIds.isEmpty()) {
      return new List<Event>();
    }

    // Primeiro, obter as contas das oportunidades
    Map<Id, Id> oppToAccountMap = new Map<Id, Id>();
    for (Opportunity opp : [
      SELECT Id, AccountId
      FROM Opportunity
      WHERE Id IN :opportunityIds
      WITH SECURITY_ENFORCED
    ]) {
      if (opp.AccountId != null) {
        oppToAccountMap.put(opp.Id, opp.AccountId);
      }
    }

    Set<Id> accountIds = new Set<Id>(oppToAccountMap.values());

    // Buscar eventos relacionados às oportunidades ou às suas contas
    return [
      SELECT
        Id,
        Subject,
        StartDateTime,
        EndDateTime,
        Location,
        Description,
        WhatId,
        AccountId,
        ActivityDate,
        ActivityDateTime,
        Type,
        IsAllDayEvent
      FROM Event
      WHERE WhatId IN :opportunityIds OR AccountId IN :accountIds
      WITH SECURITY_ENFORCED
      ORDER BY StartDateTime DESC
      LIMIT 100
    ];
  }

  /**
   * @description Retorna os valores do picklist StageName da Oportunidade
   * @return List<Map<String, String>> Lista de valores do picklist com label e value
   */
  @AuraEnabled(cacheable=true)
  public static List<Map<String, String>> getStagePicklistValues() {
    List<Map<String, String>> picklistValues = new List<Map<String, String>>();

    // Obter os valores do campo StageName da Oportunidade
    Schema.DescribeFieldResult fieldResult = Opportunity.StageName.getDescribe();
    List<Schema.PicklistEntry> entries = fieldResult.getPicklistValues();

    for (Schema.PicklistEntry entry : entries) {
      if (entry.isActive()) {
        Map<String, String> valueMap = new Map<String, String>();
        valueMap.put('label', entry.getLabel());
        valueMap.put('value', entry.getValue());
        picklistValues.add(valueMap);
      }
    }

    return picklistValues;
  }

  /**
   * @description Retorna os valores do picklist Probabilidade_da_Oportunidade__c
   * @return List<Map<String, String>> Lista de valores do picklist com label e value
   */
  @AuraEnabled(cacheable=true)
  public static List<Map<String, String>> getProbabilityPicklistValues() {
    List<Map<String, String>> picklistValues = new List<Map<String, String>>();

    // Obter os valores do campo Probabilidade_da_Oportunidade__c da Oportunidade
    Schema.DescribeFieldResult fieldResult = Opportunity.Probabilidade_da_Oportunidade__c.getDescribe();
    List<Schema.PicklistEntry> entries = fieldResult.getPicklistValues();

    for (Schema.PicklistEntry entry : entries) {
      if (entry.isActive()) {
        Map<String, String> valueMap = new Map<String, String>();
        valueMap.put('label', entry.getLabel());
        valueMap.put('value', entry.getValue());
        picklistValues.add(valueMap);
      }
    }

    return picklistValues;
  }

  /**
   * @description Atualiza o status de uma oportunidade
   * @param recordId Id da oportunidade a ser atualizada
   * @param newStatus Novo valor do status
   */
  @AuraEnabled
  public static void updateOpportunityStatus(Id recordId, String newStatus) {
    // Verificar permissões
    if (!Opportunity.SObjectType.getDescribe().isUpdateable()) {
      throw new AuraHandledException(
        'Você não tem permissão para atualizar oportunidades.'
      );
    }

    try {
      Opportunity opp = new Opportunity(Id = recordId, StageName = newStatus);
      update opp;
    } catch (Exception e) {
      throw new AuraHandledException(e.getMessage());
    }
  }
}
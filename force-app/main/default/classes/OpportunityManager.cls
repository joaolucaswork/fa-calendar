/**
 * Classe para gerenciar oportunidades criadas automaticamente pelo flow de conversão de lead
 * @author GitHub Copilot
 * @date 2025-05-08
 */
public with sharing class OpportunityManager {
  /**
   * Verifica se uma oportunidade foi criada recentemente para um lead ou conta específicos
   * @param leadId ID do lead que pode ter sido convertido
   * @param accountId ID da conta que pode ter uma oportunidade recente
   * @return Map<String, Object> com informações sobre a oportunidade encontrada
   */
  @AuraEnabled
  public static Map<String, Object> checkForNewOpportunity(
    String leadId,
    String accountId
  ) {
    Map<String, Object> result = new Map<String, Object>();
    result.put('hasOpportunity', false);

    try {
      String accountIdToCheck = null;
      
      // Se temos um leadId, verificamos se foi convertido ou está em processo de conversão
      if (String.isNotBlank(leadId)) {
        try {
          Lead leadRecord = [
            SELECT Id, IsConverted, ConvertedAccountId, classificacaoLead__c
            FROM Lead
            WHERE Id = :leadId
            LIMIT 1
          ];
          
          if (leadRecord.IsConverted && leadRecord.ConvertedAccountId != null) {
            // Se o lead já foi convertido, usamos o ID da conta convertida
            accountIdToCheck = leadRecord.ConvertedAccountId;
            result.put('leadConverted', true);
            result.put('convertedAccountId', accountIdToCheck);
          } else if (leadRecord.classificacaoLead__c == 'Interessado') {
            // Lead marcado como interessado mas ainda não convertido
            // Veremos logo em seguida se há oportunidade para este lead
            result.put('leadMarkedAsInterested', true);
          }
        } catch (Exception e) {
          // Se não conseguir encontrar o lead, pode ser que ele já tenha sido excluído após a conversão
          // Capturar a mensagem de erro para retornar ao usuário
          System.debug('Erro ao buscar lead: ' + e.getMessage());
          result.put('error', 'Erro ao buscar lead: ' + e.getMessage());
        }
      }
      
      // Se temos um accountId específico, usamos ele diretamente
      if (String.isNotBlank(accountId)) {
        accountIdToCheck = accountId;
      }
      
      // Busca oportunidades criadas nos últimos 15 minutos (aumentado de 5 para 15 minutos para dar mais janela)
      if (String.isNotBlank(accountIdToCheck)) {
        List<Opportunity> opportunities = [
          SELECT Id, Name, StageName, Amount, CloseDate, AccountId
          FROM Opportunity
          WHERE
            AccountId = :accountIdToCheck
            AND CreatedDate >= :Datetime.now().addMinutes(-15)
          ORDER BY CreatedDate DESC
          LIMIT 1
        ];

        if (!opportunities.isEmpty()) {
          result.put('hasOpportunity', true);
          result.put('opportunityId', opportunities[0].Id);
          result.put('opportunity', opportunities[0]);
        }
      }
      
      // Se ainda não encontramos uma oportunidade e temos um leadId, tentamos buscar oportunidades recentes
      // que podem ter sido criadas para qualquer conta nos últimos minutos
      // Isso é um fallback caso a conta convertida não seja detectada corretamente
      if (!result.containsKey('hasOpportunity') || !(Boolean)result.get('hasOpportunity')) {
        if (String.isNotBlank(leadId)) {
          // Tenta buscar oportunidades recentes para qualquer conta
          List<Opportunity> recentOpportunities = [
            SELECT Id, Name, StageName, Amount, CloseDate, AccountId, CreatedDate,
                   Account.Name, Account.emProspeccao__c
            FROM Opportunity
            WHERE CreatedDate >= :Datetime.now().addMinutes(-15)
            ORDER BY CreatedDate DESC
            LIMIT 5
          ];
          
          if (!recentOpportunities.isEmpty()) {
            // Vamos verificar se alguma das oportunidades recentes está associada a uma conta
            // marcada como emProspeccao__c = true, o que indicaria uma conta recém-convertida
            for (Opportunity opp : recentOpportunities) {
              if (opp.Account.emProspeccao__c == true) {
                result.put('hasOpportunity', true);
                result.put('opportunityId', opp.Id);
                result.put('opportunity', opp);
                result.put('message', 'Encontrada oportunidade recente para conta em prospecção');
                break;
              }
            }
          }
        }
      }
    } catch (Exception e) {
      result.put('error', e.getMessage());
    }

    return result;
  }

  /**
   * Obtém detalhes completos de uma oportunidade, incluindo opções para campos picklist
   * @param opportunityId ID da oportunidade a ser consultada
   * @return Map<String, Object> com detalhes da oportunidade e opções de picklist
   */
  @AuraEnabled
  public static Map<String, Object> getOpportunityDetails(
    String opportunityId
  ) {
    Map<String, Object> result = new Map<String, Object>();

    try {
      // Inicia com sucesso como true
      result.put('success', true);
      
      Opportunity opp = [
        SELECT
          Id,
          Name,
          StageName,
          Amount,
          CloseDate,
          AccountId,
          Account.Name,
          Description,
          Type,
          Probabilidade_da_Oportunidade__c
        FROM Opportunity
        WHERE Id = :opportunityId
        LIMIT 1
      ];

      result.put('opportunity', opp);

      // Obter picklist values para StageName
      Schema.DescribeFieldResult fieldResult = Opportunity.StageName.getDescribe();
      List<Schema.PicklistEntry> picklistValues = fieldResult.getPicklistValues();
      List<Map<String, String>> stageOptions = new List<Map<String, String>>();

      for (Schema.PicklistEntry entry : picklistValues) {
        if (entry.isActive()) {
          Map<String, String> option = new Map<String, String>();
          option.put('label', entry.getLabel());
          option.put('value', entry.getValue());
          stageOptions.add(option);
        }
      }

      result.put('stageOptions', stageOptions);

      // Obter picklist values para Type
      Schema.DescribeFieldResult typeFieldResult = Opportunity.Type.getDescribe();
      List<Schema.PicklistEntry> typePicklistValues = typeFieldResult.getPicklistValues();
      List<Map<String, String>> typeOptions = new List<Map<String, String>>();

      for (Schema.PicklistEntry entry : typePicklistValues) {
        if (entry.isActive()) {
          Map<String, String> option = new Map<String, String>();
          option.put('label', entry.getLabel());
          option.put('value', entry.getValue());
          typeOptions.add(option);
        }
      }

      result.put('typeOptions', typeOptions);
    } catch (Exception e) {
      result.put('success', false);
      result.put('error', e.getMessage());
    }

    return result;
  }

  /**
   * Atualiza uma oportunidade com os novos valores fornecidos
   * @param opportunityId ID da oportunidade a ser atualizada
   * @param name Novo nome para a oportunidade
   * @param stageName Novo estágio para a oportunidade
   * @param amount Novo valor para a oportunidade
   * @param closeDate Nova data de fechamento para a oportunidade
   * @param description Nova descrição para a oportunidade
   * @param type Novo tipo para a oportunidade
   * @param probabilidade Nova probabilidade para a oportunidade
   * @return Map<String, Object> com resultado da operação
   */
  @AuraEnabled
  public static Map<String, Object> updateOpportunity(
    String opportunityId,
    String name,
    String stageName,
    Decimal amount,
    Date closeDate,
    String description,
    String type,
    String probabilidade
  ) {
    Map<String, Object> result = new Map<String, Object>();

    try {
      Opportunity opp = new Opportunity(
        Id = opportunityId,
        Name = name,
        StageName = stageName,
        Amount = amount,
        CloseDate = closeDate,
        Description = description,
        Type = type,
        Probabilidade_da_Oportunidade__c = probabilidade
      );

      update opp;
      result.put('success', true);
      result.put('message', 'Oportunidade atualizada com sucesso');
    } catch (Exception e) {
      result.put('success', false);
      result.put('error', e.getMessage());
    }

    return result;
  }
}
/**
 * @description Trigger handler for Task object to manage Lead Event and Opportunity creation
 * Automatically creates Events and Opportunities when Leads are classified as "Interessado"
 * @author Cascade
 *
 * REACTIVATED - LEAD EVENT MANAGEMENT SYSTEM
 * This is our new method of tracking leads that replaces the old method
 * System is now active and functional
 */
public class TaskTriggerHandler {
  /**
   * @description Handles after insert operations on Task
   * @param newTasks List of new Task records
   */
  public static void handleAfterInsert(List<Task> newTasks) {
    // REACTIVATED - Lead Event Management System
    processInteressadoTasks(newTasks);

    // TODO: Update lead call counts when call tasks are created
    // updateLeadCallCountsFromTasks(newTasks, null);
  }

  /**
   * @description Handles after update operations on Task
   * @param newTasks List of updated Task records
   * @param oldTasksMap Map of old Task records
   */
  public static void handleAfterUpdate(
    List<Task> newTasks,
    Map<Id, Task> oldTasksMap
  ) {
    // REACTIVATED - Lead Event Management System
    List<Task> tasksToProcess = new List<Task>();

    for (Task task : newTasks) {
      Task oldTask = oldTasksMap.get(task.Id);

      // Check if classificacaoLeadAtividade__c changed to "Interessado"
      if (
        task.classificacaoLeadAtividade__c == 'Interessado' &&
        oldTask.classificacaoLeadAtividade__c != 'Interessado'
      ) {
        tasksToProcess.add(task);
      }
    }

    if (!tasksToProcess.isEmpty()) {
      processInteressadoTasks(tasksToProcess);
    }

    // TODO: Update lead call counts when call tasks are updated
    // updateLeadCallCountsFromTasks(newTasks, oldTasksMap);
  }

  /**
   * @description Handles after delete operations on Task
   * @param oldTasks List of deleted Task records
   */
  public static void handleAfterDelete(List<Task> oldTasks) {
    // TODO: Update lead call counts when call tasks are deleted
    // updateLeadCallCountsFromTasks(oldTasks, null);
  }

  /**
   * @description Handles after undelete operations on Task
   * @param newTasks List of undeleted Task records
   */
  public static void handleAfterUndelete(List<Task> newTasks) {
    // TODO: Update lead call counts when call tasks are undeleted
    // updateLeadCallCountsFromTasks(newTasks, null);
  }

  /**
   * @description Processes Tasks where Lead is classified as "Interessado"
   * Creates Events and Opportunities for these Leads
   * @param tasks List of Task records to process
   *
   * COMMENTED OUT - PAUSED LEAD EVENT MANAGEMENT SYSTEM
   */
  private static void processInteressadoTasks(List<Task> tasks) {
    // REACTIVATED - Lead Event Management System
    Set<Id> leadIds = new Set<Id>();
    Map<Id, Id> leadToTaskMap = new Map<Id, Id>();

    // Collect Lead IDs from Tasks classified as "Interessado"
    for (Task task : tasks) {
      if (
        task.classificacaoLeadAtividade__c == 'Interessado' &&
        task.WhoId != null &&
        String.valueOf(task.WhoId).startsWith('00Q')
      ) {
        // Lead ID prefix

        leadIds.add(task.WhoId);
        leadToTaskMap.put(task.WhoId, task.Id);
      }
    }

    if (leadIds.isEmpty()) {
      return;
    }

    // Process each Lead asynchronously to avoid governor limits
    for (Id leadId : leadIds) {
      Id taskId = leadToTaskMap.get(leadId);

      // Use future method to handle the Event and Opportunity creation
      createLeadEventAndOpportunityAsync(leadId, taskId);
    }
  }

  /**
   * @description Asynchronously creates Event and Opportunity for a Lead
   * @param leadId The Lead ID
   * @param taskId The Task ID that triggered this
   *
   * COMMENTED OUT - PAUSED LEAD EVENT MANAGEMENT SYSTEM
   */
  @future
  public static void createLeadEventAndOpportunityAsync(Id leadId, Id taskId) {
    // REACTIVATED - Lead Event Management System
    try {
      // Call the LeadEventController internal method (no AuraHandledException)
      Map<String, Object> result = LeadEventController.createLeadEventAndOpportunityInternal(
        String.valueOf(leadId),
        String.valueOf(taskId),
        false // Don't throw AuraHandledException in @future context
      );

      // Log success
      System.debug(
        'Successfully created Event and Opportunity for Lead: ' + leadId
      );
      System.debug('Result: ' + result);

      // Update the Task with a note about the created records
      if (taskId != null) {
        Task taskToUpdate = [
          SELECT Id, Depurar_Conversao__c
          FROM Task
          WHERE Id = :taskId
          LIMIT 1
        ];

        String additionalInfo =
          '\n\n--- Automação Reino Capital ---\n' +
          'Event ID: ' +
          result.get('eventId') +
          '\n' +
          'Opportunity ID: ' +
          result.get('opportunityId') +
          '\n' +
          'Status: ' +
          result.get('message');

        taskToUpdate.Depurar_Conversao__c =
          (taskToUpdate.Depurar_Conversao__c != null ? taskToUpdate.Depurar_Conversao__c : '') +
          additionalInfo;
        update taskToUpdate;
      }
    } catch (Exception e) {
      System.debug(
        'Error creating Event and Opportunity for Lead ' +
          leadId +
          ': ' +
          e.getMessage()
      );

      // Log error to Task if possible
      if (taskId != null) {
        try {
          Task taskToUpdate = [
            SELECT Id, Depurar_Conversao__c
            FROM Task
            WHERE Id = :taskId
            LIMIT 1
          ];

          String errorInfo =
            '\n\n--- Erro na Automação ---\n' +
            'Erro ao criar Event e Opportunity: ' +
            e.getMessage();

          taskToUpdate.Depurar_Conversao__c =
            (taskToUpdate.Depurar_Conversao__c != null ? taskToUpdate.Depurar_Conversao__c : '') +
            errorInfo;
          update taskToUpdate;
        } catch (Exception updateError) {
          System.debug(
            'Error updating Task with error message: ' +
            updateError.getMessage()
          );
        }
      }
    }
  }

  /**
   * @description Gets Lead IDs that already have Events to avoid duplicates
   * @param leadIds Set of Lead IDs to check
   * @return Set of Lead IDs that already have Events
   *
   * COMMENTED OUT - PAUSED LEAD EVENT MANAGEMENT SYSTEM
   */
  private static Set<Id> getLeadsWithExistingEvents(Set<Id> leadIds) {
    // REACTIVATED - Lead Event Management System
    Set<Id> leadsWithEvents = new Set<Id>();

    List<Event> existingEvents = [
      SELECT WhoId
      FROM Event
      WHERE WhoId IN :leadIds AND Subject LIKE '%Lead:%'
    ];

    for (Event evt : existingEvents) {
      leadsWithEvents.add(evt.WhoId);
    }

    return leadsWithEvents;
  }

  /**
   * @description Validates that the Lead exists and is not converted
   * @param leadIds Set of Lead IDs to validate
   * @return Set of valid Lead IDs
   *
   * COMMENTED OUT - PAUSED LEAD EVENT MANAGEMENT SYSTEM
   */
  private static Set<Id> validateLeads(Set<Id> leadIds) {
    // REACTIVATED - Lead Event Management System
    Set<Id> validLeadIds = new Set<Id>();

    List<Lead> validLeads = [
      SELECT Id, IsConverted
      FROM Lead
      WHERE Id IN :leadIds AND IsConverted = FALSE
    ];

    for (Lead lead : validLeads) {
      validLeadIds.add(lead.Id);
    }

    return validLeadIds;
  }

  /**
   * @description Updates lead call counts when call tasks are created/updated
   * @param newTasks List of new/updated Task records
   * @param oldTasksMap Map of old Task records (null for insert)
   *
   * TODO: TEMPORARILY DISABLED - FIELD quantasVezesLeadNaoAtendeu__c NOT AVAILABLE IN SCRATCH ORG
   */
  /*
  public static void updateLeadCallCountsFromTasks(
    List<Task> newTasks,
    Map<Id, Task> oldTasksMap
  ) {
    Set<Id> leadIds = new Set<Id>();

    for (Task task : newTasks) {
      // Check if this is a call task related to a Lead
      if (isCallTask(task) && isLeadTask(task)) {
        leadIds.add(task.WhoId);
      }

      // For updates, also check if the old task was a call task
      if (oldTasksMap != null) {
        Task oldTask = oldTasksMap.get(task.Id);
        if (oldTask != null && isCallTask(oldTask) && isLeadTask(oldTask)) {
          leadIds.add(oldTask.WhoId);
        }
      }
    }

    if (!leadIds.isEmpty()) {
      updateLeadCallCounts(leadIds);
    }
  }
  */

  /**
   * @description Updates the call count for specific leads
   * @param leadIds Set of Lead IDs to update
   *
   * TODO: TEMPORARILY DISABLED - FIELD quantasVezesLeadNaoAtendeu__c NOT AVAILABLE IN SCRATCH ORG
   */
  /*
  public static void updateLeadCallCounts(Set<Id> leadIds) {
    try {
      // Query current call counts for these leads
      Map<Id, Integer> leadCallCounts = new Map<Id, Integer>();

      // Initialize all leads with 0 count
      for (Id leadId : leadIds) {
        leadCallCounts.put(leadId, 0);
      }

      // Count call tasks for each lead
      List<Task> callTasks = [
        SELECT WhoId
        FROM Task
        WHERE
          WhoId IN :leadIds
          AND TaskSubtype = 'Call'
          AND Subject = 'Chamada'
          AND Status = 'Concluida'
          AND IsDeleted = FALSE
      ];

      // Count calls per lead
      for (Task task : callTasks) {
        Integer currentCount = leadCallCounts.get(task.WhoId);
        leadCallCounts.put(task.WhoId, currentCount + 1);
      }

      // Update leads with new counts
      List<Lead> leadsToUpdate = new List<Lead>();
      List<Lead> currentLeads = [
        SELECT Id, quantasVezesLeadNaoAtendeu__c
        FROM Lead
        WHERE Id IN :leadIds
      ];

      for (Lead lead : currentLeads) {
        Integer newCount = leadCallCounts.get(lead.Id);
        if (lead.quantasVezesLeadNaoAtendeu__c != newCount) {
          lead.quantasVezesLeadNaoAtendeu__c = newCount;
          leadsToUpdate.add(lead);
        }
      }

      if (!leadsToUpdate.isEmpty()) {
        update leadsToUpdate;
        System.debug(
          'TaskTriggerHandler: Updated ' +
            leadsToUpdate.size() +
            ' leads with new call counts'
        );
      }
    } catch (Exception e) {
      System.debug('Error updating lead call counts: ' + e.getMessage());
    }
  }
  */

  // TODO: TEMPORARILY DISABLED - FIELD quantasVezesLeadNaoAtendeu__c NOT AVAILABLE IN SCRATCH ORG
  // Call count functionality will be re-enabled when field is available
}

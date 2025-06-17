/**
 * @description Trigger for Event object to handle field synchronization with Opportunity data
 * Automatically synchronizes Event Product field with related Opportunity data.
 * Phase field (fase_evento__c) is left free for manual input.
 * @author Cascade
 */
trigger EventTrigger on Event (before insert, before update) {
    
    if (Trigger.isBefore) {
        if (Trigger.isInsert) {
            EventTriggerHandler.handleBeforeInsert(Trigger.new);
        }
        
        if (Trigger.isUpdate) {
            EventTriggerHandler.handleBeforeUpdate(Trigger.new, Trigger.oldMap);
        }
    }
}

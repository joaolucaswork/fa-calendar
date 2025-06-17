/**
 * @description Trigger for Task object to handle Lead Event and Opportunity creation
 * @author Cascade
 */
trigger TaskTrigger on Task (after insert, after update, after delete, after undelete) {
    
    if (Trigger.isAfter) {
        if (Trigger.isInsert) {
            TaskTriggerHandler.handleAfterInsert(Trigger.new);
        }
        
        if (Trigger.isUpdate) {
            TaskTriggerHandler.handleAfterUpdate(Trigger.new, Trigger.oldMap);
        }
        
        if (Trigger.isDelete) {
            TaskTriggerHandler.handleAfterDelete(Trigger.old);
        }
        
        if (Trigger.isUndelete) {
            TaskTriggerHandler.handleAfterUndelete(Trigger.new);
        }
    }
}

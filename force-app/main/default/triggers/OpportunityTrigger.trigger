/**
 * @description Trigger for Opportunity object to handle field synchronization with Event data
 * Automatically synchronizes related Event Product fields when Opportunity product changes.
 * @author Cascade
 */
trigger OpportunityTrigger on Opportunity (after update) {
    
    if (Trigger.isAfter) {
        if (Trigger.isUpdate) {
            OpportunityTriggerHandler.handleAfterUpdate(Trigger.new, Trigger.oldMap);
        }
    }
}

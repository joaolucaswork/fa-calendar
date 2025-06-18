// Get picklist values for salaReuniao__c field
Schema.DescribeFieldResult fieldResult = Event.salaReuniao__c.getDescribe();
List<Schema.PicklistEntry> picklistValues = fieldResult.getPicklistValues();

System.debug('=== salaReuniao__c Picklist Values ===');
for (Schema.PicklistEntry entry : picklistValues) {
    if (entry.isActive()) {
        System.debug('Label: ' + entry.getLabel() + ', Value: ' + entry.getValue());
    }
}
System.debug('=== End Picklist Values ===');

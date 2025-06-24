// Get picklist values for statusReuniao__c field
Schema.DescribeFieldResult fieldResult = Event.statusReuniao__c.getDescribe();
List<Schema.PicklistEntry> picklistValues = fieldResult.getPicklistValues();

System.debug('=== statusReuniao__c Picklist Values ===');
for (Schema.PicklistEntry entry : picklistValues) {
    if (entry.isActive()) {
        System.debug('Label: ' + entry.getLabel() + ', Value: ' + entry.getValue());
    }
}
System.debug('=== End Picklist Values ===');

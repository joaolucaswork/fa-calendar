// Test script to validate real-time cancellation filtering functionality
// This script creates a test event and then changes its status to verify real-time filtering

System.debug('=== REAL-TIME FILTERING TEST START ===');

// Clean up any existing test events
List<Event> existingTestEvents = [
    SELECT Id FROM Event 
    WHERE Subject LIKE 'Real-time Test%' 
    LIMIT 100
];
if (!existingTestEvents.isEmpty()) {
    delete existingTestEvents;
    System.debug('Deleted ' + existingTestEvents.size() + ' existing test events');
}

// Create a test event that is currently happening
DateTime now = DateTime.now();
Event testEvent = new Event(
    Subject = 'Real-time Test - Normal Event',
    StartDateTime = now.addMinutes(-10),
    EndDateTime = now.addMinutes(20),
    salaReuniao__c = 'salaPrincipal'
);

insert testEvent;
System.debug('Created test event: ' + testEvent.Id);

// Test 1: Verify event is initially showing as happening
List<Event> initialCheck = HappeningNowController.getCurrentlyHappeningEventsInRoom('salaPrincipal');
Boolean foundInitially = false;
for (Event evt : initialCheck) {
    if (evt.Id == testEvent.Id) {
        foundInitially = true;
        break;
    }
}

System.debug('=== INITIAL STATE ===');
System.debug('Event found in happening events: ' + foundInitially);
if (foundInitially) {
    System.debug('✅ PASS: Event initially shows as happening');
} else {
    System.debug('❌ FAIL: Event should initially show as happening');
}

// Test 2: Change event status to 'Cancelado' and verify it's filtered out
testEvent.statusReuniao__c = 'Cancelado';
update testEvent;
System.debug('Updated event status to: Cancelado');

// Check if event is now filtered out
List<Event> afterCancelCheck = HappeningNowController.getCurrentlyHappeningEventsInRoom('salaPrincipal');
Boolean foundAfterCancel = false;
for (Event evt : afterCancelCheck) {
    if (evt.Id == testEvent.Id) {
        foundAfterCancel = true;
        break;
    }
}

System.debug('=== AFTER CANCELLATION ===');
System.debug('Event found in happening events: ' + foundAfterCancel);
if (!foundAfterCancel) {
    System.debug('✅ PASS: Cancelled event correctly filtered out');
} else {
    System.debug('❌ FAIL: Cancelled event should be filtered out');
}

// Test 3: Test checkMultipleEventsHappeningNow method
List<String> eventIds = new List<String>{testEvent.Id};
Map<String, Boolean> statusCheck = HappeningNowController.checkMultipleEventsHappeningNow(eventIds);
Boolean isHappeningAfterCancel = statusCheck.get(testEvent.Id);

System.debug('=== MULTIPLE EVENTS CHECK ===');
System.debug('Event happening status: ' + isHappeningAfterCancel);
if (!isHappeningAfterCancel) {
    System.debug('✅ PASS: checkMultipleEventsHappeningNow correctly filters cancelled event');
} else {
    System.debug('❌ FAIL: checkMultipleEventsHappeningNow should filter cancelled event');
}

// Test 4: Change status to 'Adiado' and verify filtering
testEvent.statusReuniao__c = 'Adiado';
update testEvent;
System.debug('Updated event status to: Adiado');

List<Event> afterPostponeCheck = HappeningNowController.getCurrentlyHappeningEventsInRoom('salaPrincipal');
Boolean foundAfterPostpone = false;
for (Event evt : afterPostponeCheck) {
    if (evt.Id == testEvent.Id) {
        foundAfterPostpone = true;
        break;
    }
}

System.debug('=== AFTER POSTPONEMENT ===');
System.debug('Event found in happening events: ' + foundAfterPostpone);
if (!foundAfterPostpone) {
    System.debug('✅ PASS: Postponed event correctly filtered out');
} else {
    System.debug('❌ FAIL: Postponed event should be filtered out');
}

// Test 5: Change status to 'Reagendado' and verify filtering
testEvent.statusReuniao__c = 'Reagendado';
update testEvent;
System.debug('Updated event status to: Reagendado');

List<Event> afterRescheduleCheck = HappeningNowController.getCurrentlyHappeningEventsInRoom('salaPrincipal');
Boolean foundAfterReschedule = false;
for (Event evt : afterRescheduleCheck) {
    if (evt.Id == testEvent.Id) {
        foundAfterReschedule = true;
        break;
    }
}

System.debug('=== AFTER RESCHEDULING ===');
System.debug('Event found in happening events: ' + foundAfterReschedule);
if (!foundAfterReschedule) {
    System.debug('✅ PASS: Rescheduled event correctly filtered out');
} else {
    System.debug('❌ FAIL: Rescheduled event should be filtered out');
}

// Test 6: Change status back to null and verify it shows again
testEvent.statusReuniao__c = null;
update testEvent;
System.debug('Updated event status to: null (normal)');

List<Event> afterNormalCheck = HappeningNowController.getCurrentlyHappeningEventsInRoom('salaPrincipal');
Boolean foundAfterNormal = false;
for (Event evt : afterNormalCheck) {
    if (evt.Id == testEvent.Id) {
        foundAfterNormal = true;
        break;
    }
}

System.debug('=== AFTER RETURNING TO NORMAL ===');
System.debug('Event found in happening events: ' + foundAfterNormal);
if (foundAfterNormal) {
    System.debug('✅ PASS: Normal event correctly shows as happening again');
} else {
    System.debug('❌ FAIL: Normal event should show as happening again');
}

// Final summary
System.debug('=== REAL-TIME FILTERING TEST SUMMARY ===');
Integer passCount = 0;
Integer totalTests = 6;

if (foundInitially) passCount++;
if (!foundAfterCancel) passCount++;
if (!isHappeningAfterCancel) passCount++;
if (!foundAfterPostpone) passCount++;
if (!foundAfterReschedule) passCount++;
if (foundAfterNormal) passCount++;

System.debug('Tests passed: ' + passCount + '/' + totalTests);
if (passCount == totalTests) {
    System.debug('🎉 ALL TESTS PASSED - Real-time filtering is working correctly!');
} else {
    System.debug('⚠️ Some tests failed - Check implementation');
}

// Clean up test event
delete testEvent;
System.debug('Cleaned up test event');

System.debug('=== REAL-TIME FILTERING TEST COMPLETE ===');

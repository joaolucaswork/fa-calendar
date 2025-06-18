// Test script to validate cancellation filtering functionality
// This script creates test events and verifies they are properly filtered

// Clean up any existing test events
List<Event> existingTestEvents = [
    SELECT Id FROM Event 
    WHERE Subject LIKE 'Test Cancellation%' 
    LIMIT 100
];
if (!existingTestEvents.isEmpty()) {
    delete existingTestEvents;
    System.debug('Deleted ' + existingTestEvents.size() + ' existing test events');
}

// Create test events
DateTime now = DateTime.now();
List<Event> testEvents = new List<Event>();

// 1. Normal happening event (should appear)
Event normalEvent = new Event(
    Subject = 'Test Cancellation - Normal Event',
    StartDateTime = now.addMinutes(-15),
    EndDateTime = now.addMinutes(15),
    salaReuniao__c = 'salaPrincipal'
);
testEvents.add(normalEvent);

// 2. Cancelled event (should be filtered out)
Event cancelledEvent = new Event(
    Subject = 'Test Cancellation - Cancelled Event',
    StartDateTime = now.addMinutes(-10),
    EndDateTime = now.addMinutes(20),
    salaReuniao__c = 'salaPrincipal',
    statusReuniao__c = 'Cancelado'
);
testEvents.add(cancelledEvent);

// 3. Postponed event (should be filtered out)
Event postponedEvent = new Event(
    Subject = 'Test Cancellation - Postponed Event',
    StartDateTime = now.addMinutes(-5),
    EndDateTime = now.addMinutes(25),
    salaReuniao__c = 'salaGabriel',
    statusReuniao__c = 'Adiado'
);
testEvents.add(postponedEvent);

// 4. Rescheduled event (should be filtered out)
Event rescheduledEvent = new Event(
    Subject = 'Test Cancellation - Rescheduled Event',
    StartDateTime = now.addMinutes(-20),
    EndDateTime = now.addMinutes(10),
    salaReuniao__c = 'salaGabriel',
    statusReuniao__c = 'Reagendado'
);
testEvents.add(rescheduledEvent);

insert testEvents;
System.debug('Created ' + testEvents.size() + ' test events');

// Test 1: Check getCurrentlyHappeningEventsInRoom for salaPrincipal
List<Event> salaPrincipalEvents = HappeningNowController.getCurrentlyHappeningEventsInRoom('salaPrincipal');
System.debug('=== SALA PRINCIPAL EVENTS ===');
System.debug('Found ' + salaPrincipalEvents.size() + ' events in Sala Principal');
for (Event evt : salaPrincipalEvents) {
    System.debug('Event: ' + evt.Subject + ' | Status: ' + evt.statusReuniao__c);
}

// Test 2: Check getCurrentlyHappeningEventsInRoom for salaGabriel
List<Event> salaGabrielEvents = HappeningNowController.getCurrentlyHappeningEventsInRoom('salaGabriel');
System.debug('=== SALA GABRIEL EVENTS ===');
System.debug('Found ' + salaGabrielEvents.size() + ' events in Sala Gabriel');
for (Event evt : salaGabrielEvents) {
    System.debug('Event: ' + evt.Subject + ' | Status: ' + evt.statusReuniao__c);
}

// Test 3: Check checkMultipleEventsHappeningNow
List<String> eventIds = new List<String>();
for (Event evt : testEvents) {
    eventIds.add(evt.Id);
}

Map<String, Boolean> happeningStatus = HappeningNowController.checkMultipleEventsHappeningNow(eventIds);
System.debug('=== MULTIPLE EVENTS STATUS ===');
for (Event evt : testEvents) {
    Boolean isHappening = happeningStatus.get(evt.Id);
    System.debug('Event: ' + evt.Subject + ' | Status: ' + evt.statusReuniao__c + ' | Is Happening: ' + isHappening);
}

// Test 4: Check getDetailedHappeningStatus
List<HappeningNowController.EventHappeningStatus> detailedStatus = HappeningNowController.getDetailedHappeningStatus(eventIds);
System.debug('=== DETAILED STATUS ===');
for (HappeningNowController.EventHappeningStatus status : detailedStatus) {
    System.debug('Event: ' + status.eventSubject + ' | Is Happening: ' + status.isHappening + ' | Time Remaining: ' + status.timeRemaining);
}

// Validation Results
System.debug('=== VALIDATION RESULTS ===');

// Should find only 1 event in Sala Principal (the normal one)
if (salaPrincipalEvents.size() == 1 && salaPrincipalEvents[0].Subject.contains('Normal')) {
    System.debug('✅ PASS: Sala Principal correctly shows only normal event');
} else {
    System.debug('❌ FAIL: Sala Principal should show only 1 normal event, found ' + salaPrincipalEvents.size());
}

// Should find 0 events in Sala Gabriel (both are cancelled/postponed/rescheduled)
if (salaGabrielEvents.size() == 0) {
    System.debug('✅ PASS: Sala Gabriel correctly shows no events (all cancelled/postponed/rescheduled)');
} else {
    System.debug('❌ FAIL: Sala Gabriel should show 0 events, found ' + salaGabrielEvents.size());
}

// Check individual event status
Boolean normalEventHappening = happeningStatus.get(testEvents[0].Id); // Normal event
Boolean cancelledEventHappening = happeningStatus.get(testEvents[1].Id); // Cancelled event
Boolean postponedEventHappening = happeningStatus.get(testEvents[2].Id); // Postponed event
Boolean rescheduledEventHappening = happeningStatus.get(testEvents[3].Id); // Rescheduled event

if (normalEventHappening == true) {
    System.debug('✅ PASS: Normal event correctly shows as happening');
} else {
    System.debug('❌ FAIL: Normal event should be happening');
}

if (cancelledEventHappening == false) {
    System.debug('✅ PASS: Cancelled event correctly filtered out');
} else {
    System.debug('❌ FAIL: Cancelled event should be filtered out');
}

if (postponedEventHappening == false) {
    System.debug('✅ PASS: Postponed event correctly filtered out');
} else {
    System.debug('❌ FAIL: Postponed event should be filtered out');
}

if (rescheduledEventHappening == false) {
    System.debug('✅ PASS: Rescheduled event correctly filtered out');
} else {
    System.debug('❌ FAIL: Rescheduled event should be filtered out');
}

System.debug('=== TEST COMPLETE ===');

// Clean up test events
delete testEvents;
System.debug('Cleaned up ' + testEvents.size() + ' test events');

/**
 * Controller for the HappeningNow functionality
 * Provides methods to check if events are currently in progress
 * Handles timezone considerations for Brasília (UTC-3)
 */
public with sharing class HappeningNowController {
    
    /**
     * Check if a single event is currently happening
     * Note: This method only checks time range. For full cancellation filtering,
     * use checkMultipleEventsHappeningNow or getCurrentlyHappeningEventsInRoom
     * @param startDateTime The event start date/time
     * @param endDateTime The event end date/time
     * @return Boolean indicating if the event is currently in progress (time-wise only)
     */
    @AuraEnabled(cacheable=false)
    public static Boolean isEventHappeningNow(DateTime startDateTime, DateTime endDateTime) {
        try {
            if (startDateTime == null || endDateTime == null) {
                System.debug('HappeningNowController: Null datetime parameters provided');
                return false;
            }

            DateTime now = DateTime.now();

            // Event is happening now if current time is between start and end (inclusive)
            Boolean isHappening = now >= startDateTime && now <= endDateTime;

            System.debug('HappeningNowController: Event happening check - Start: ' + startDateTime +
                        ', End: ' + endDateTime + ', Now: ' + now + ', IsHappening: ' + isHappening);

            return isHappening;

        } catch (Exception e) {
            System.debug(LoggingLevel.ERROR, 'HappeningNowController: Error checking if event is happening now: ' + e.getMessage());
            return false;
        }
    }
    
    /**
     * Check multiple events and return their happening status
     * Excludes events with cancellation reasons: 'Cancelado', 'Adiado', 'Reagendado'
     * @param eventIds List of event IDs to check
     * @return Map of event ID to happening status
     */
    @AuraEnabled(cacheable=false)
    public static Map<String, Boolean> checkMultipleEventsHappeningNow(List<String> eventIds) {
        Map<String, Boolean> results = new Map<String, Boolean>();

        try {
            if (eventIds == null || eventIds.isEmpty()) {
                System.debug('HappeningNowController: No event IDs provided');
                return results;
            }

            // Define cancellation reasons that should exclude events from "happening now"
            Set<String> cancellationReasons = new Set<String>{'Cancelado', 'Adiado', 'Reagendado'};

            // Query events with their datetime information
            List<Event> events = [
                SELECT Id, StartDateTime, EndDateTime, Subject, statusReuniao__c
                FROM Event
                WHERE Id IN :eventIds
                WITH SECURITY_ENFORCED
            ];

            DateTime now = DateTime.now();

            for (Event evt : events) {
                Boolean isHappening = false;

                if (evt.StartDateTime != null && evt.EndDateTime != null) {
                    // Check if event is currently happening based on time
                    Boolean isInTimeRange = now >= evt.StartDateTime && now <= evt.EndDateTime;

                    // Check if event is not cancelled/postponed/rescheduled
                    Boolean isNotCancelled = String.isBlank(evt.statusReuniao__c) ||
                                            !cancellationReasons.contains(evt.statusReuniao__c);

                    // Event is happening only if both conditions are met
                    isHappening = isInTimeRange && isNotCancelled;
                }

                results.put(evt.Id, isHappening);

                System.debug('HappeningNowController: Event ' + evt.Id + ' (' + evt.Subject + ') - ' +
                           'Start: ' + evt.StartDateTime + ', End: ' + evt.EndDateTime +
                           ', Status: ' + evt.statusReuniao__c + ', IsHappening: ' + isHappening);
            }

        } catch (Exception e) {
            System.debug(LoggingLevel.ERROR, 'HappeningNowController: Error checking multiple events: ' + e.getMessage());
        }

        return results;
    }
    
    /**
     * Get current server time in Brasília timezone for client synchronization
     * @return Current DateTime in Brasília timezone
     */
    @AuraEnabled(cacheable=false)
    public static DateTime getCurrentBrasiliaTime() {
        try {
            // Get current UTC time
            DateTime utcNow = DateTime.now();
            
            // Brasília is UTC-3 (no daylight saving time consideration for simplicity)
            // Note: In production, you might want to handle daylight saving time
            DateTime brasiliaTime = utcNow.addHours(-3);
            
            System.debug('HappeningNowController: Current Brasília time: ' + brasiliaTime);
            
            return brasiliaTime;
            
        } catch (Exception e) {
            System.debug(LoggingLevel.ERROR, 'HappeningNowController: Error getting Brasília time: ' + e.getMessage());
            return DateTime.now(); // Fallback to server time
        }
    }
    
    /**
     * Check if current time falls within business hours (9:00 AM - 6:00 PM Brasília time)
     * @return Boolean indicating if it's currently business hours
     */
    @AuraEnabled(cacheable=false)
    public static Boolean isBusinessHours() {
        try {
            DateTime brasiliaTime = getCurrentBrasiliaTime();
            Time currentTime = brasiliaTime.time();
            
            // Business hours: 9:00 AM to 6:00 PM
            Time businessStart = Time.newInstance(9, 0, 0, 0);
            Time businessEnd = Time.newInstance(18, 0, 0, 0);
            
            Boolean isBusinessTime = currentTime >= businessStart && currentTime <= businessEnd;
            
            System.debug('HappeningNowController: Business hours check - Current: ' + currentTime + 
                        ', Start: ' + businessStart + ', End: ' + businessEnd + 
                        ', IsBusinessHours: ' + isBusinessTime);
            
            return isBusinessTime;
            
        } catch (Exception e) {
            System.debug(LoggingLevel.ERROR, 'HappeningNowController: Error checking business hours: ' + e.getMessage());
            return false;
        }
    }
    
    /**
     * Get events that are currently happening for a specific room
     * Excludes events with cancellation reasons: 'Cancelado', 'Adiado', 'Reagendado'
     * @param roomValue The internal room value (e.g., 'salaPrincipal', 'salaGabriel')
     * @return List of events currently happening in the specified room
     */
    @AuraEnabled(cacheable=false)
    public static List<Event> getCurrentlyHappeningEventsInRoom(String roomValue) {
        List<Event> happeningEvents = new List<Event>();

        try {
            if (String.isBlank(roomValue)) {
                System.debug('HappeningNowController: No room value provided');
                return happeningEvents;
            }

            DateTime now = DateTime.now();

            // Define cancellation reasons that should exclude events from "happening now"
            Set<String> cancellationReasons = new Set<String>{'Cancelado', 'Adiado', 'Reagendado'};

            happeningEvents = [
                SELECT Id, Subject, StartDateTime, EndDateTime, Location,
                       salaReuniao__c, Owner.Name, statusReuniao__c
                FROM Event
                WHERE salaReuniao__c = :roomValue
                AND StartDateTime <= :now
                AND EndDateTime >= :now
                AND (statusReuniao__c = NULL OR statusReuniao__c NOT IN :cancellationReasons)
                WITH SECURITY_ENFORCED
                ORDER BY StartDateTime ASC
            ];

            System.debug('HappeningNowController: Found ' + happeningEvents.size() +
                        ' events currently happening in room: ' + roomValue +
                        ' (excluding cancelled/postponed/rescheduled events)');

        } catch (Exception e) {
            System.debug(LoggingLevel.ERROR, 'HappeningNowController: Error getting current events in room: ' + e.getMessage());
        }

        return happeningEvents;
    }
    
    /**
     * Wrapper class for event happening status with additional metadata
     */
    public class EventHappeningStatus {
        @AuraEnabled public String eventId { get; set; }
        @AuraEnabled public String eventSubject { get; set; }
        @AuraEnabled public Boolean isHappening { get; set; }
        @AuraEnabled public DateTime startDateTime { get; set; }
        @AuraEnabled public DateTime endDateTime { get; set; }
        @AuraEnabled public String timeRemaining { get; set; }
        
        public EventHappeningStatus(String eventId, String eventSubject, Boolean isHappening, 
                                   DateTime startDateTime, DateTime endDateTime) {
            this.eventId = eventId;
            this.eventSubject = eventSubject;
            this.isHappening = isHappening;
            this.startDateTime = startDateTime;
            this.endDateTime = endDateTime;
            this.timeRemaining = calculateTimeRemaining(endDateTime);
        }
        
        private String calculateTimeRemaining(DateTime endDateTime) {
            if (endDateTime == null) return '';
            
            DateTime now = DateTime.now();
            if (now >= endDateTime) return 'Finalizado';
            
            Long diffMinutes = (endDateTime.getTime() - now.getTime()) / (1000 * 60);
            
            if (diffMinutes < 60) {
                return diffMinutes + ' min restantes';
            } else {
                Long hours = diffMinutes / 60;
                Long minutes = Math.mod(diffMinutes, 60);
                return hours + 'h ' + minutes + 'min restantes';
            }
        }
    }
    
    /**
     * Get detailed happening status for multiple events
     * Excludes events with cancellation reasons: 'Cancelado', 'Adiado', 'Reagendado'
     * @param eventIds List of event IDs to check
     * @return List of EventHappeningStatus objects with detailed information
     */
    @AuraEnabled(cacheable=false)
    public static List<EventHappeningStatus> getDetailedHappeningStatus(List<String> eventIds) {
        List<EventHappeningStatus> statusList = new List<EventHappeningStatus>();

        try {
            if (eventIds == null || eventIds.isEmpty()) {
                return statusList;
            }

            // Define cancellation reasons that should exclude events from "happening now"
            Set<String> cancellationReasons = new Set<String>{'Cancelado', 'Adiado', 'Reagendado'};

            List<Event> events = [
                SELECT Id, Subject, StartDateTime, EndDateTime, statusReuniao__c
                FROM Event
                WHERE Id IN :eventIds
                WITH SECURITY_ENFORCED
            ];

            DateTime now = DateTime.now();

            for (Event evt : events) {
                Boolean isHappening = false;

                if (evt.StartDateTime != null && evt.EndDateTime != null) {
                    // Check if event is currently happening based on time
                    Boolean isInTimeRange = now >= evt.StartDateTime && now <= evt.EndDateTime;

                    // Check if event is not cancelled/postponed/rescheduled
                    Boolean isNotCancelled = String.isBlank(evt.statusReuniao__c) ||
                                            !cancellationReasons.contains(evt.statusReuniao__c);

                    // Event is happening only if both conditions are met
                    isHappening = isInTimeRange && isNotCancelled;
                }

                statusList.add(new EventHappeningStatus(
                    evt.Id,
                    evt.Subject,
                    isHappening,
                    evt.StartDateTime,
                    evt.EndDateTime
                ));
            }

        } catch (Exception e) {
            System.debug(LoggingLevel.ERROR, 'HappeningNowController: Error getting detailed status: ' + e.getMessage());
        }

        return statusList;
    }
}
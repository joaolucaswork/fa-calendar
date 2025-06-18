/**
 * @description Controller for Client Tracking functionality in the calendar system
 * Identifies and manages active/recurring clients based on multiple events, 
 * rescheduled meetings, and phase progressions
 * @author Reino Capital
 * @last-modified 2025-01-18
 */
public with sharing class ClientTrackingController {
    
    /**
     * @description Wrapper class for client tracking data
     */
    public class ClientTrackingData {
        @AuraEnabled public String clientId { get; set; }
        @AuraEnabled public String clientName { get; set; }
        @AuraEnabled public String clientType { get; set; } // 'Lead' or 'Contact'
        @AuraEnabled public Integer totalEvents { get; set; }
        @AuraEnabled public Integer rescheduledEvents { get; set; }
        @AuraEnabled public Integer cancelledEvents { get; set; }
        @AuraEnabled public List<String> eventPhases { get; set; }
        @AuraEnabled public String lastEventDate { get; set; }
        @AuraEnabled public String trackingReason { get; set; } // Why this client is considered active
        @AuraEnabled public Boolean isActive { get; set; }
        
        public ClientTrackingData() {
            this.eventPhases = new List<String>();
            this.isActive = false;
            this.totalEvents = 0;
            this.rescheduledEvents = 0;
            this.cancelledEvents = 0;
        }
    }
    
    /**
     * @description Get active/recurring clients for the calendar date range
     * @param startDate Start date for event analysis
     * @param endDate End date for event analysis
     * @return List of active client tracking data
     */
    @AuraEnabled(cacheable=true)
    public static List<ClientTrackingData> getActiveClients(String startDate, String endDate) {
        try {
            Date startDt = Date.valueOf(startDate);
            Date endDt = Date.valueOf(endDate);

            // Extend date range to capture historical patterns (last 6 months)
            Date extendedStart = startDt.addMonths(-6);

            // Query events with client information (without polymorphic fields for security)
            List<Event> events = [
                SELECT Id, Subject, StartDateTime, EndDateTime, WhoId, WhatId,
                       statusReuniao__c, fase_evento__c, tipoReuniao__c, CreatedDate
                FROM Event
                WHERE StartDateTime >= :extendedStart
                AND StartDateTime <= :endDt
                AND WhoId != NULL
                WITH SECURITY_ENFORCED
                ORDER BY WhoId, StartDateTime ASC
            ];

            return analyzeClientPatterns(events, startDt, endDt);
            
        } catch (Exception e) {
            System.debug('Error in getActiveClients: ' + e.getMessage());
            // Return empty list on error to prevent exceptions in non-Aura contexts
            return new List<ClientTrackingData>();
        }
    }
    
    /**
     * @description Analyze client patterns to identify active/recurring clients
     * @param events List of events to analyze
     * @param currentStart Current calendar view start date
     * @param currentEnd Current calendar view end date
     * @return List of active client tracking data
     */
    private static List<ClientTrackingData> analyzeClientPatterns(List<Event> events, Date currentStart, Date currentEnd) {
        Map<String, ClientTrackingData> clientMap = new Map<String, ClientTrackingData>();

        // Get unique WhoIds to query client information separately
        Set<Id> whoIds = new Set<Id>();
        for (Event evt : events) {
            if (evt.WhoId != null) {
                whoIds.add(evt.WhoId);
            }
        }

        // Query client information separately (Leads and Contacts)
        Map<Id, String> clientNames = new Map<Id, String>();
        Map<Id, String> clientTypes = new Map<Id, String>();

        // Query Leads
        List<Lead> leads = [SELECT Id, Name FROM Lead WHERE Id IN :whoIds WITH SECURITY_ENFORCED];
        for (Lead lead : leads) {
            clientNames.put(lead.Id, lead.Name);
            clientTypes.put(lead.Id, 'Lead');
        }

        // Query Contacts
        List<Contact> contacts = [SELECT Id, Name FROM Contact WHERE Id IN :whoIds WITH SECURITY_ENFORCED];
        for (Contact contact : contacts) {
            clientNames.put(contact.Id, contact.Name);
            clientTypes.put(contact.Id, 'Contact');
        }

        // Group events by client
        for (Event evt : events) {
            if (evt.WhoId == null) continue;

            String clientKey = String.valueOf(evt.WhoId);

            if (!clientMap.containsKey(clientKey)) {
                ClientTrackingData clientData = new ClientTrackingData();
                clientData.clientId = clientKey;
                clientData.clientName = clientNames.get(evt.WhoId);
                clientData.clientType = clientTypes.get(evt.WhoId);

                // Skip if we couldn't find client information
                if (String.isBlank(clientData.clientName)) {
                    continue;
                }

                clientMap.put(clientKey, clientData);
            }
            
            ClientTrackingData clientData = clientMap.get(clientKey);
            if (clientData == null) {
                continue; // Skip if client data not found
            }
            clientData.totalEvents++;
            
            // Track event status patterns
            if (evt.statusReuniao__c == 'Reagendado') {
                clientData.rescheduledEvents++;
            } else if (evt.statusReuniao__c == 'Cancelado') {
                clientData.cancelledEvents++;
            }
            
            // Track event phases
            if (String.isNotBlank(evt.fase_evento__c) && !clientData.eventPhases.contains(evt.fase_evento__c)) {
                clientData.eventPhases.add(evt.fase_evento__c);
            }
            
            // Update last event date
            String eventDateStr = evt.StartDateTime.format('yyyy-MM-dd');
            if (String.isBlank(clientData.lastEventDate) || eventDateStr > clientData.lastEventDate) {
                clientData.lastEventDate = eventDateStr;
            }
        }
        
        // Apply client classification logic
        List<ClientTrackingData> activeClients = new List<ClientTrackingData>();
        for (ClientTrackingData clientData : clientMap.values()) {
            if (isClientActive(clientData, currentStart, currentEnd)) {
                activeClients.add(clientData);
            }
        }
        
        // Sort by total events (most active first)
        activeClients.sort(new ClientEventComparator());
        
        return activeClients;
    }
    
    /**
     * @description Determine if a client should be considered active/recurring
     * @param clientData Client tracking data to evaluate
     * @param currentStart Current calendar view start date
     * @param currentEnd Current calendar view end date
     * @return Boolean indicating if client is active
     */
    private static Boolean isClientActive(ClientTrackingData clientData, Date currentStart, Date currentEnd) {
        List<String> reasons = new List<String>();
        
        // Rule 1: Multiple events (3 or more)
        if (clientData.totalEvents >= 3) {
            reasons.add('Múltiplos eventos (' + clientData.totalEvents + ')');
        }
        
        // Rule 2: Has rescheduled events
        if (clientData.rescheduledEvents > 0) {
            reasons.add('Eventos reagendados (' + clientData.rescheduledEvents + ')');
        }
        
        // Rule 3: Multiple event phases (progression through sales funnel)
        if (clientData.eventPhases.size() >= 2) {
            reasons.add('Múltiplas fases (' + String.join(clientData.eventPhases, ', ') + ')');
        }
        
        // Rule 4: Recent activity (events in last 30 days)
        if (String.isNotBlank(clientData.lastEventDate)) {
            Date lastEventDate = Date.valueOf(clientData.lastEventDate);
            Date thirtyDaysAgo = Date.today().addDays(-30);
            if (lastEventDate >= thirtyDaysAgo) {
                reasons.add('Atividade recente');
            }
        }
        
        // Rule 5: Cancelled and rescheduled pattern
        if (clientData.cancelledEvents > 0 && clientData.totalEvents > clientData.cancelledEvents) {
            reasons.add('Padrão cancelamento/reagendamento');
        }
        
        // Client is active if meets any criteria
        Boolean isActive = !reasons.isEmpty();
        
        if (isActive) {
            clientData.trackingReason = String.join(reasons, '; ');
            clientData.isActive = true;
        }
        
        return isActive;
    }
    
    /**
     * @description Get events for a specific client within date range
     * @param clientId Client ID (WhoId)
     * @param startDate Start date for filtering
     * @param endDate End date for filtering
     * @return List of events for the client
     */
    @AuraEnabled(cacheable=true)
    public static List<Map<String, Object>> getClientEvents(String clientId, String startDate, String endDate) {
        try {
            Date startDt = Date.valueOf(startDate);
            Date endDt = Date.valueOf(endDate);
            
            List<Event> events = [
                SELECT Id, Subject, StartDateTime, EndDateTime, Location,
                       statusReuniao__c, fase_evento__c, tipoReuniao__c,
                       salaReuniao__c, WhoId, WhatId
                FROM Event
                WHERE WhoId = :clientId
                AND StartDateTime >= :startDt
                AND StartDateTime <= :endDt
                WITH SECURITY_ENFORCED
                ORDER BY StartDateTime ASC
            ];
            
            List<Map<String, Object>> eventData = new List<Map<String, Object>>();
            for (Event evt : events) {
                Map<String, Object> eventMap = new Map<String, Object>();
                eventMap.put('id', evt.Id);
                eventMap.put('subject', evt.Subject);
                eventMap.put('startDateTime', evt.StartDateTime);
                eventMap.put('endDateTime', evt.EndDateTime);
                eventMap.put('location', evt.Location);
                eventMap.put('statusReuniao', evt.statusReuniao__c);
                eventMap.put('faseEvento', evt.fase_evento__c);
                eventMap.put('tipoReuniao', evt.tipoReuniao__c);
                eventMap.put('salaReuniao', evt.salaReuniao__c);
                eventMap.put('whoId', evt.WhoId);
                eventMap.put('whatId', evt.WhatId);
                eventData.add(eventMap);
            }
            
            return eventData;
            
        } catch (Exception e) {
            System.debug('Error in getClientEvents: ' + e.getMessage());
            // Return empty list on error to prevent exceptions in non-Aura contexts
            return new List<Map<String, Object>>();
        }
    }
    
    /**
     * @description Comparator class for sorting clients by event count
     */
    public class ClientEventComparator implements Comparator<ClientTrackingData> {
        public Integer compare(ClientTrackingData a, ClientTrackingData b) {
            // Sort by total events descending, then by name ascending
            if (a.totalEvents != b.totalEvents) {
                return b.totalEvents - a.totalEvents;
            }

            // Handle null client names safely
            String nameA = a.clientName != null ? a.clientName : '';
            String nameB = b.clientName != null ? b.clientName : '';
            return nameA.compareTo(nameB);
        }
    }
}

/**
 * Service class for aggregating and formatting event data for AI processing
 * Handles data sanitization and privacy protection for OpenAI integration
 * @author Reino Capital Development Team
 * @version 1.0.0
 */
public with sharing class EventSummaryGenerator {
    
    /**
     * Aggregate events for AI analysis
     * @param startDate Start date for event range
     * @param endDate End date for event range
     * @return List of sanitized event data maps for AI processing
     */
    public static List<Map<String, Object>> aggregateEvents(Date startDate, Date endDate) {
        List<Map<String, Object>> aggregatedData = new List<Map<String, Object>>();
        
        try {
            // Convert dates to datetime for query
            DateTime startDateTime = DateTime.newInstance(startDate, Time.newInstance(0, 0, 0, 0));
            DateTime endDateTime = DateTime.newInstance(endDate.addDays(1), Time.newInstance(0, 0, 0, 0));
            
            // Query events with all relevant fields including user names
            List<Event> events = [
                SELECT Id, Subject, Description, Location, StartDateTime, EndDateTime,
                       IsAllDayEvent, WhoId, WhatId, OwnerId, Owner.Name,
                       salaReuniao__c, gestor__c, liderComercial__c, sdr__c,
                       statusReuniao__c, reuniaoAconteceu__c, customColor__c,
                       Who.Name
                FROM Event
                WHERE StartDateTime >= :startDateTime
                AND StartDateTime < :endDateTime
                ORDER BY StartDateTime ASC
                LIMIT 100
            ];
            
            // Process each event
            for (Event evt : events) {
                Map<String, Object> eventData = new Map<String, Object>();
                
                // Basic event information (sanitized)
                eventData.put('id', evt.Id);
                eventData.put('subject', sanitizeText(evt.Subject));
                eventData.put('description', sanitizeText(evt.Description));
                eventData.put('location', sanitizeText(evt.Location));
                eventData.put('startDateTime', evt.StartDateTime);
                eventData.put('endDateTime', evt.EndDateTime);
                eventData.put('duration', calculateDuration(evt.StartDateTime, evt.EndDateTime));
                eventData.put('isAllDay', evt.IsAllDayEvent);
                
                // Participants with real names for better AI analysis
                List<String> participants = new List<String>();
                List<String> participantNames = new List<String>();

                // Get user names for each role
                if (String.isNotBlank(evt.gestor__c)) {
                    participants.add('Gestor');
                    String gestorName = getUserName(evt.gestor__c);
                    if (String.isNotBlank(gestorName)) {
                        participantNames.add(gestorName + ' (Gestor)');
                    }
                }

                if (String.isNotBlank(evt.liderComercial__c)) {
                    participants.add('Líder Comercial');
                    String liderName = getUserName(evt.liderComercial__c);
                    if (String.isNotBlank(liderName)) {
                        participantNames.add(liderName + ' (Líder Comercial)');
                    }
                }

                if (String.isNotBlank(evt.sdr__c)) {
                    participants.add('SDR');
                    String sdrName = getUserName(evt.sdr__c);
                    if (String.isNotBlank(sdrName)) {
                        participantNames.add(sdrName + ' (SDR)');
                    }
                }

                // Include organizer
                if (evt.Owner != null && String.isNotBlank(evt.Owner.Name)) {
                    participantNames.add(evt.Owner.Name + ' (Organizador)');
                }

                eventData.put('participants', String.join(participants, ', '));
                eventData.put('participantNames', String.join(participantNames, ', '));
                eventData.put('participantCount', participants.size());
                
                // Meeting room information
                eventData.put('room', getMeetingRoomDisplayName(evt.salaReuniao__c));
                
                // Status and outcome
                eventData.put('status', evt.statusReuniao__c);
                eventData.put('completed', evt.reuniaoAconteceu__c);
                
                // Categorization
                eventData.put('category', categorizeEvent(evt));
                eventData.put('timeSlot', getTimeSlot(evt.StartDateTime));
                eventData.put('dayOfWeek', evt.StartDateTime.format('EEEE'));
                
                aggregatedData.add(eventData);
            }
            
        } catch (Exception e) {
            System.debug('Error aggregating events: ' + e.getMessage());
            throw new AuraHandledException('Erro ao processar eventos: ' + e.getMessage());
        }
        
        return aggregatedData;
    }
    
    /**
     * Generate summary statistics for events
     * @param events List of event data maps
     * @return Map containing statistical analysis
     */
    public static Map<String, Object> generateStatistics(List<Map<String, Object>> events) {
        Map<String, Object> stats = new Map<String, Object>();
        
        if (events.isEmpty()) {
            stats.put('totalEvents', 0);
            return stats;
        }
        
        // Basic counts
        stats.put('totalEvents', events.size());
        
        // Duration statistics
        Integer totalDuration = 0;
        Integer completedEvents = 0;
        
        // Category distribution
        Map<String, Integer> categoryCount = new Map<String, Integer>();
        Map<String, Integer> timeSlotCount = new Map<String, Integer>();
        Map<String, Integer> roomCount = new Map<String, Integer>();
        
        for (Map<String, Object> event : events) {
            // Duration
            Integer duration = (Integer) event.get('duration');
            if (duration != null) totalDuration += duration;
            
            // Completion status
            Boolean completed = (Boolean) event.get('completed');
            if (completed == true) completedEvents++;
            
            // Category distribution
            String category = (String) event.get('category');
            if (String.isNotBlank(category)) {
                categoryCount.put(category, categoryCount.get(category) != null ? 
                                 categoryCount.get(category) + 1 : 1);
            }
            
            // Time slot distribution
            String timeSlot = (String) event.get('timeSlot');
            if (String.isNotBlank(timeSlot)) {
                timeSlotCount.put(timeSlot, timeSlotCount.get(timeSlot) != null ? 
                                 timeSlotCount.get(timeSlot) + 1 : 1);
            }
            
            // Room distribution
            String room = (String) event.get('room');
            if (String.isNotBlank(room)) {
                roomCount.put(room, roomCount.get(room) != null ? 
                             roomCount.get(room) + 1 : 1);
            }
        }
        
        stats.put('averageDuration', events.size() > 0 ? totalDuration / events.size() : 0);
        stats.put('completionRate', events.size() > 0 ? (completedEvents * 100) / events.size() : 0);
        stats.put('categoryDistribution', categoryCount);
        stats.put('timeSlotDistribution', timeSlotCount);
        stats.put('roomDistribution', roomCount);
        
        return stats;
    }
    
    /**
     * Calculate meeting duration in minutes
     * @param startTime Event start time
     * @param endTime Event end time
     * @return Integer duration in minutes
     */
    private static Integer calculateDuration(DateTime startTime, DateTime endTime) {
        if (startTime == null || endTime == null) return 0;
        
        Long milliseconds = endTime.getTime() - startTime.getTime();
        return Integer.valueOf(milliseconds / (1000 * 60));
    }
    
    /**
     * Sanitize text to remove sensitive information
     * @param text Text to sanitize
     * @return String sanitized text
     */
    private static String sanitizeText(String text) {
        if (String.isBlank(text)) return '';
        
        // Remove potential sensitive information patterns
        String sanitized = text;
        
        // Remove email addresses
        sanitized = sanitized.replaceAll('\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b', '[EMAIL]');
        
        // Remove phone numbers (Brazilian format)
        sanitized = sanitized.replaceAll('\\(\\d{2}\\)\\s?\\d{4,5}-?\\d{4}', '[TELEFONE]');
        
        // Remove CPF/CNPJ patterns
        sanitized = sanitized.replaceAll('\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}', '[CPF]');
        sanitized = sanitized.replaceAll('\\d{2}\\.\\d{3}\\.\\d{3}/\\d{4}-\\d{2}', '[CNPJ]');
        
        // Remove potential credit card numbers
        sanitized = sanitized.replaceAll('\\d{4}\\s?\\d{4}\\s?\\d{4}\\s?\\d{4}', '[CARTAO]');
        
        return sanitized;
    }
    
    /**
     * Get display name for meeting room
     * @param roomCode Internal room code
     * @return String display name for room
     */
    private static String getMeetingRoomDisplayName(String roomCode) {
        if (String.isBlank(roomCode)) return 'Não especificada';
        
        Map<String, String> roomMapping = new Map<String, String>{
            'salaPrincipal' => 'Sala Principal',
            'salaGabriel' => 'Sala do Gabriel',
            'salaReuniao1' => 'Sala de Reunião 1',
            'salaReuniao2' => 'Sala de Reunião 2',
            'online' => 'Online',
            'Outra' => 'Outra'
        };
        
        return roomMapping.get(roomCode) != null ? roomMapping.get(roomCode) : roomCode;
    }
    
    /**
     * Categorize event based on content and participants
     * @param evt Event record
     * @return String event category
     */
    private static String categorizeEvent(Event evt) {
        String subject = evt.Subject != null ? evt.Subject.toLowerCase() : '';
        
        if (subject.contains('apresentação') || subject.contains('proposta')) {
            return 'Apresentação';
        } else if (subject.contains('follow') || subject.contains('acompanhamento')) {
            return 'Follow-up';
        } else if (subject.contains('reunião') || subject.contains('meeting')) {
            return 'Reunião Geral';
        } else if (subject.contains('treinamento') || subject.contains('capacitação')) {
            return 'Treinamento';
        } else if (subject.contains('entrevista') || subject.contains('interview')) {
            return 'Entrevista';
        } else if (subject.contains('demo') || subject.contains('demonstração')) {
            return 'Demonstração';
        } else {
            return 'Outros';
        }
    }
    
    /**
     * Get time slot category for event
     * @param eventTime Event start time
     * @return String time slot category
     */
    private static String getTimeSlot(DateTime eventTime) {
        if (eventTime == null) return 'Não especificado';
        
        Integer hour = eventTime.hour();
        
        if (hour >= 6 && hour < 12) {
            return 'Manhã';
        } else if (hour >= 12 && hour < 18) {
            return 'Tarde';
        } else {
            return 'Noite';
        }
    }
    
    /**
     * Get events by category for detailed analysis
     * @param events List of event data maps
     * @param category Category to filter by
     * @return List of events in specified category
     */
    public static List<Map<String, Object>> getEventsByCategory(
        List<Map<String, Object>> events, 
        String category
    ) {
        List<Map<String, Object>> filteredEvents = new List<Map<String, Object>>();
        
        for (Map<String, Object> event : events) {
            if (category.equals(event.get('category'))) {
                filteredEvents.add(event);
            }
        }
        
        return filteredEvents;
    }
    
    /**
     * Get events by time slot for analysis
     * @param events List of event data maps
     * @param timeSlot Time slot to filter by
     * @return List of events in specified time slot
     */
    public static List<Map<String, Object>> getEventsByTimeSlot(
        List<Map<String, Object>> events, 
        String timeSlot
    ) {
        List<Map<String, Object>> filteredEvents = new List<Map<String, Object>>();
        
        for (Map<String, Object> event : events) {
            if (timeSlot.equals(event.get('timeSlot'))) {
                filteredEvents.add(event);
            }
        }
        
        return filteredEvents;
    }
    
    /**
     * Get productivity insights based on event patterns
     * @param events List of event data maps
     * @return Map containing productivity insights
     */
    public static Map<String, Object> getProductivityInsights(List<Map<String, Object>> events) {
        Map<String, Object> insights = new Map<String, Object>();
        
        if (events.isEmpty()) {
            insights.put('hasInsights', false);
            return insights;
        }
        
        Map<String, Object> stats = generateStatistics(events);
        
        // Meeting frequency analysis
        Integer totalEvents = (Integer) stats.get('totalEvents');
        Integer avgDuration = (Integer) stats.get('averageDuration');
        Integer completionRate = (Integer) stats.get('completionRate');
        
        List<String> recommendations = new List<String>();
        
        // Duration recommendations
        if (avgDuration > 90) {
            recommendations.add('Considere reduzir a duração média das reuniões para melhorar a produtividade');
        }
        
        // Completion rate recommendations
        if (completionRate < 80) {
            recommendations.add('Taxa de conclusão baixa - revise o processo de agendamento');
        }
        
        // Time slot recommendations
        Map<String, Integer> timeSlots = (Map<String, Integer>) stats.get('timeSlotDistribution');
        if (timeSlots.get('Noite') != null && timeSlots.get('Noite') > totalEvents * 0.2) {
            recommendations.add('Muitas reuniões noturnas - considere reagendar para horários comerciais');
        }
        
        insights.put('hasInsights', true);
        insights.put('recommendations', recommendations);
        insights.put('totalMeetings', totalEvents);
        insights.put('averageDuration', avgDuration);
        insights.put('completionRate', completionRate);
        
        return insights;
    }

    /**
     * Get user name by user ID
     * @param userId User ID to lookup
     * @return String user name or empty string if not found
     */
    private static String getUserName(String userId) {
        if (String.isBlank(userId)) return '';

        try {
            User user = [SELECT Name FROM User WHERE Id = :userId LIMIT 1];
            return user.Name;
        } catch (Exception e) {
            System.debug('Error getting user name for ID ' + userId + ': ' + e.getMessage());
            return '';
        }
    }
}

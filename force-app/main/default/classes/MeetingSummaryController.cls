/**
 * Controller for Meeting Summary functionality
 * Provides aggregated meeting statistics for users by month
 */
public without sharing class MeetingSummaryController {
    
    /**
     * Wrapper class for meeting summary data
     */
    public class MeetingSummaryData {
        @AuraEnabled public String userId { get; set; }
        @AuraEnabled public String userName { get; set; }
        @AuraEnabled public String currentMonth { get; set; }
        @AuraEnabled public Integer totalMeetings { get; set; }
        @AuraEnabled public Integer completedMeetings { get; set; }
        @AuraEnabled public Integer cancelledPostponedMeetings { get; set; }
        @AuraEnabled public Integer pendingMeetings { get; set; }
        
        // Completed meetings by phase
        @AuraEnabled public Integer completedFirstMeetings { get; set; }
        @AuraEnabled public Integer completedFeedbackMeetings { get; set; }
        @AuraEnabled public Integer completedNegotiationMeetings { get; set; }
        
        // Cancelled/Postponed meetings by phase
        @AuraEnabled public Integer cancelledFirstMeetings { get; set; }
        @AuraEnabled public Integer cancelledFeedbackMeetings { get; set; }
        
        // Pending meetings by phase
        @AuraEnabled public Integer pendingFirstMeetings { get; set; }
        @AuraEnabled public Integer pendingFeedbackMeetings { get; set; }
        
        public MeetingSummaryData() {
            this.totalMeetings = 0;
            this.completedMeetings = 0;
            this.cancelledPostponedMeetings = 0;
            this.pendingMeetings = 0;
            this.completedFirstMeetings = 0;
            this.completedFeedbackMeetings = 0;
            this.completedNegotiationMeetings = 0;
            this.cancelledFirstMeetings = 0;
            this.cancelledFeedbackMeetings = 0;
            this.pendingFirstMeetings = 0;
            this.pendingFeedbackMeetings = 0;
        }
    }
    
    /**
     * Get meeting summary for a specific user and month
     * @param userId The user ID to get meeting summary for
     * @param year The year (e.g., 2025)
     * @param month The month (1-12)
     * @return MeetingSummaryData with aggregated meeting statistics
     */
    @AuraEnabled(cacheable=true)
    public static MeetingSummaryData getUserMeetingSummary(String userId, Integer year, Integer month) {
        try {
            if (String.isBlank(userId) || year == null || month == null) {
                return new MeetingSummaryData();
            }
            
            // Calculate month start and end dates
            Date monthStart = Date.newInstance(year, month, 1);
            Date monthEnd = monthStart.addMonths(1).addDays(-1);
            DateTime monthStartDateTime = DateTime.newInstance(monthStart, Time.newInstance(0, 0, 0, 0));
            DateTime monthEndDateTime = DateTime.newInstance(monthEnd, Time.newInstance(23, 59, 59, 999));
            
            // Query events for the user in the specified month
            List<Event> events = [
                SELECT Id, Subject, StartDateTime, EndDateTime, OwnerId, Owner.Name,
                       reuniaoAconteceu__c, statusReuniao__c, fase_evento__c,
                       gestor__c, liderComercial__c, sdr__c
                FROM Event
                WHERE StartDateTime >= :monthStartDateTime
                AND StartDateTime <= :monthEndDateTime
                AND (OwnerId = :userId OR gestor__c = :userId OR liderComercial__c = :userId OR sdr__c = :userId)
                WITH SECURITY_ENFORCED
                ORDER BY StartDateTime ASC
            ];
            
            // Get user name
            String userName = getUserName(userId, events);
            
            // Initialize summary data
            MeetingSummaryData summary = new MeetingSummaryData();
            summary.userId = userId;
            summary.userName = userName;
            summary.currentMonth = getMonthName(month) + ' de ' + year;
            summary.totalMeetings = events.size();
            
            // Process each event
            for (Event evt : events) {
                processEventForSummary(evt, summary);
            }
            
            return summary;
            
        } catch (Exception e) {
            System.debug('Error in getUserMeetingSummary: ' + e.getMessage());
            return new MeetingSummaryData();
        }
    }
    
    /**
     * Process individual event for summary statistics
     */
    private static void processEventForSummary(Event evt, MeetingSummaryData summary) {
        String faseEvento = evt.fase_evento__c;
        Boolean reuniaoAconteceu = evt.reuniaoAconteceu__c == true;
        String statusReuniao = evt.statusReuniao__c;
        
        // Determine event category
        if (reuniaoAconteceu) {
            // Meeting happened
            summary.completedMeetings++;
            
            if (faseEvento == 'Primeira Reunião') {
                summary.completedFirstMeetings++;
            } else if (faseEvento == 'Devolutiva') {
                summary.completedFeedbackMeetings++;
            } else if (faseEvento == 'Negociação') {
                summary.completedNegotiationMeetings++;
            }
            
        } else if (statusReuniao == 'Cancelado' || statusReuniao == 'Adiado' || statusReuniao == 'Reagendado') {
            // Meeting was cancelled/postponed
            summary.cancelledPostponedMeetings++;
            
            if (faseEvento == 'Primeira Reunião') {
                summary.cancelledFirstMeetings++;
            } else if (faseEvento == 'Devolutiva') {
                summary.cancelledFeedbackMeetings++;
            }
            
        } else {
            // Meeting is pending (future event that hasn't occurred and isn't cancelled)
            DateTime now = DateTime.now();
            if (evt.StartDateTime > now) {
                summary.pendingMeetings++;
                
                if (faseEvento == 'Primeira Reunião') {
                    summary.pendingFirstMeetings++;
                } else if (faseEvento == 'Devolutiva') {
                    summary.pendingFeedbackMeetings++;
                }
            }
        }
    }
    
    /**
     * Get user name from userId or from event participants
     */
    private static String getUserName(String userId, List<Event> events) {
        try {
            // First try to get from User object
            List<User> users = [SELECT Name FROM User WHERE Id = :userId WITH SECURITY_ENFORCED LIMIT 1];
            if (!users.isEmpty()) {
                return users[0].Name;
            }
            
            // If not found, try to get from event participants
            for (Event evt : events) {
                if (evt.OwnerId == userId && evt.Owner != null) {
                    return evt.Owner.Name;
                }
                if (evt.gestor__c == userId) {
                    return evt.gestor__c;
                }
                if (evt.liderComercial__c == userId) {
                    return evt.liderComercial__c;
                }
                if (evt.sdr__c == userId) {
                    return evt.sdr__c;
                }
            }
            
            return 'Usuário';
            
        } catch (Exception e) {
            System.debug('Error getting user name: ' + e.getMessage());
            return 'Usuário';
        }
    }
    
    /**
     * Get Portuguese month name
     */
    private static String getMonthName(Integer month) {
        List<String> monthNames = new List<String>{
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        };
        
        if (month >= 1 && month <= 12) {
            return monthNames[month - 1];
        }
        
        return 'Mês';
    }
}

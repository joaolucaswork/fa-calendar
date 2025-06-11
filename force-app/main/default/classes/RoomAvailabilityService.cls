/**
 * @description Service class to provide room availability information for non-admin users
 * This class provides aggregated room availability data without exposing sensitive event details
 * @author Sistema Reino Capital
 * @date 2024
 */
public with sharing class RoomAvailabilityService {
    
    /**
     * @description Get room availability information for the specified date range
     * Returns only aggregated, anonymized data about room occupancy without exposing sensitive event details
     * @param startDate The start date for the range (YYYY-MM-DD format)
     * @param endDate The end date for the range (YYYY-MM-DD format)
     * @return Map<String, Object> A map with room availability information
     */
    @AuraEnabled(cacheable=false)
    public static Map<String, Object> getRoomAvailabilityInfo(String startDate, String endDate) {
        Map<String, Object> result = new Map<String, Object>();
        Map<String, Object> roomAvailability = new Map<String, Object>();
        
        try {
            // Convert string dates to DateTime
            DateTime startDateTime = DateTime.valueOf(startDate + ' 00:00:00');
            DateTime endDateTime = DateTime.valueOf(endDate + ' 23:59:59');
            
            // Query room occupancy without exposing event details
            AggregateResult[] roomOccupancy = [
                SELECT salaReuniao__c, 
                       COUNT(Id) occupiedCount,
                       MIN(StartDateTime) earliestStart,
                       MAX(EndDateTime) latestEnd
                FROM Event
                WHERE salaReuniao__c != NULL
                AND salaReuniao__c != ''
                AND salaReuniao__c != 'Outra'
                AND salaReuniao__c != 'online'
                AND StartDateTime <= :endDateTime
                AND EndDateTime >= :startDateTime
                GROUP BY salaReuniao__c
            ];
            
            // Process room occupancy data
            for (AggregateResult ar : roomOccupancy) {
                String roomKey = (String)ar.get('salaReuniao__c');
                Integer count = (Integer)ar.get('occupiedCount');
                
                Map<String, Object> roomData = new Map<String, Object>();
                roomData.put('roomId', roomKey);
                roomData.put('isOccupied', count > 0);
                roomData.put('occupiedCount', count);
                
                // Add time blocks without exposing specific event details
                List<Map<String, Object>> timeBlocks = new List<Map<String, Object>>();
                
                // Get time blocks for this room
                List<Event> roomEvents = [
                    SELECT StartDateTime, EndDateTime
                    FROM Event
                    WHERE salaReuniao__c = :roomKey
                    AND StartDateTime <= :endDateTime
                    AND EndDateTime >= :startDateTime
                    ORDER BY StartDateTime
                ];
                
                for (Event evt : roomEvents) {
                    Map<String, Object> block = new Map<String, Object>();
                    block.put('startTime', evt.StartDateTime);
                    block.put('endTime', evt.EndDateTime);
                    // Generic title that doesn't expose confidential info
                    block.put('title', 'Sala Ocupada');
                    timeBlocks.add(block);
                }
                
                roomData.put('timeBlocks', timeBlocks);
                roomAvailability.put(roomKey, roomData);
            }
            
            // Add data for physical rooms that have no events
            List<String> physicalRooms = new List<String>{'salaPrincipal', 'salaGabriel'};
            for (String room : physicalRooms) {
                if (!roomAvailability.containsKey(room)) {
                    Map<String, Object> roomData = new Map<String, Object>();
                    roomData.put('roomId', room);
                    roomData.put('isOccupied', false);
                    roomData.put('occupiedCount', 0);
                    roomData.put('timeBlocks', new List<Map<String, Object>>());
                    roomAvailability.put(room, roomData);
                }
            }
            
            result.put('success', true);
            result.put('roomAvailability', roomAvailability);
            
        } catch (Exception e) {
            result.put('success', false);
            result.put('errorMessage', 'Erro ao buscar disponibilidade das salas: ' + e.getMessage());
            System.debug('Error getting room availability: ' + e.getMessage());
        }
        
        return result;
    }
    
    /**
     * @description Get list of physical meeting rooms
     * @return List<String> List of physical room identifiers
     */
    public static List<String> getPhysicalRooms() {
        return new List<String>{'salaPrincipal', 'salaGabriel'};
    }
    
    /**
     * @description Check if a room is considered a physical room
     * @param roomId The room identifier to check
     * @return Boolean True if the room is a physical room
     */
    public static Boolean isPhysicalRoom(String roomId) {
        return getPhysicalRooms().contains(roomId);
    }
}
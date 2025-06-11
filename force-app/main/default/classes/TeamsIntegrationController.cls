/**
 * @description Controller for Microsoft Teams integration via Microsoft Graph API
 * Handles automatic Teams meeting creation for Reino Capital calendar system
 * @author Reino Capital
 * @last-modified 2025-01-14
 */
public with sharing class TeamsIntegrationController {
    
    // Microsoft Graph API endpoints
    private static final String GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';
    private static final String TEAMS_MEETING_ENDPOINT = '/me/onlineMeetings';
    
    /**
     * Create a Microsoft Teams meeting via Graph API
     * @param meetingData JSON string containing meeting details
     * @return Map with success status and meeting details
     */
    @AuraEnabled
    public static Map<String, Object> createTeamsMeeting(String meetingData) {
        Map<String, Object> result = new Map<String, Object>();
        result.put('success', false);
        
        try {
            // Parse meeting data
            Map<String, Object> meeting = (Map<String, Object>) JSON.deserializeUntyped(meetingData);
            
            // Get access token for Microsoft Graph API
            String accessToken = getGraphApiAccessToken();
            
            if (String.isBlank(accessToken)) {
                result.put('error', 'Microsoft Graph API não configurado. Usando fallback manual.');
                return result;
            }
            
            // Prepare Teams meeting request
            Map<String, Object> meetingRequest = prepareMeetingRequest(meeting);
            
            // Make HTTP callout to Microsoft Graph API
            HttpRequest req = new HttpRequest();
            req.setEndpoint(GRAPH_API_BASE + TEAMS_MEETING_ENDPOINT);
            req.setMethod('POST');
            req.setHeader('Authorization', 'Bearer ' + accessToken);
            req.setHeader('Content-Type', 'application/json');
            req.setBody(JSON.serialize(meetingRequest));
            req.setTimeout(30000); // 30 seconds timeout
            
            Http http = new Http();
            HttpResponse res = http.send(req);
            
            if (res.getStatusCode() == 201) {
                // Success - parse response
                Map<String, Object> responseData = (Map<String, Object>) JSON.deserializeUntyped(res.getBody());
                
                result.put('success', true);
                result.put('joinUrl', responseData.get('joinWebUrl'));
                result.put('meetingId', responseData.get('id'));
                result.put('conferenceId', responseData.get('audioConferencing'));
                
                System.debug('Teams meeting created successfully: ' + responseData.get('joinWebUrl'));
                
            } else {
                // Error response
                String errorBody = res.getBody();
                System.debug(LoggingLevel.ERROR, 'Teams API Error: ' + res.getStatusCode() + ' - ' + errorBody);
                
                result.put('error', 'Erro na API do Teams: ' + res.getStatusCode());
                result.put('errorDetails', errorBody);
            }
            
        } catch (Exception e) {
            System.debug(LoggingLevel.ERROR, 'Exception in createTeamsMeeting: ' + e.getMessage());
            result.put('error', 'Erro interno: ' + e.getMessage());
        }
        
        return result;
    }
    
    /**
     * Get Microsoft Graph API access token
     * This method should be implemented based on your authentication strategy
     * Options: Named Credentials, Custom Settings, or OAuth flow
     */
    private static String getGraphApiAccessToken() {
        try {
            // Option 1: Using Named Credentials (Recommended)
            // The Named Credential should handle OAuth authentication
            // Return 'callout:Microsoft_Graph_API' and let Salesforce handle the token
            
            // Option 2: Using Custom Settings for stored tokens
            Teams_Integration_Settings__c settings = Teams_Integration_Settings__c.getOrgDefaults();
            if (settings != null && String.isNotBlank(settings.Access_Token__c)) {
                // Check if token is still valid (implement token refresh logic)
                if (isTokenValid(settings)) {
                    return settings.Access_Token__c;
                } else {
                    // Refresh token if needed
                    return refreshAccessToken(settings);
                }
            }
            
            // Option 3: Return null to use fallback URL generation
            System.debug('Teams integration not configured - using manual URL generation');
            return null;
            
        } catch (Exception e) {
            System.debug(LoggingLevel.ERROR, 'Error getting access token: ' + e.getMessage());
            return null;
        }
    }
    
    /**
     * Prepare Microsoft Teams meeting request payload
     */
    private static Map<String, Object> prepareMeetingRequest(Map<String, Object> meetingData) {
        Map<String, Object> request = new Map<String, Object>();
        
        // Basic meeting details
        request.put('subject', meetingData.get('subject'));
        
        // Meeting times
        if (meetingData.containsKey('startDateTime') && meetingData.get('startDateTime') != null) {
            request.put('startDateTime', formatDateTimeForGraph((String) meetingData.get('startDateTime')));
        }
        
        if (meetingData.containsKey('endDateTime') && meetingData.get('endDateTime') != null) {
            request.put('endDateTime', formatDateTimeForGraph((String) meetingData.get('endDateTime')));
        }
        
        // Meeting settings
        Map<String, Object> meetingSettings = new Map<String, Object>();
        meetingSettings.put('allowMeetingChat', true);
        meetingSettings.put('allowTeamworkReactions', true);
        meetingSettings.put('allowedPresenters', 'everyone');
        request.put('meetingSettings', meetingSettings);
        
        // Audio conferencing (optional)
        Map<String, Object> audioConferencing = new Map<String, Object>();
        audioConferencing.put('tollNumber', '+55 11 4935-2400'); // Brazil toll number
        audioConferencing.put('tollFreeNumber', '0800 047 4906'); // Brazil toll-free
        request.put('audioConferencing', audioConferencing);
        
        return request;
    }
    
    /**
     * Format datetime for Microsoft Graph API (ISO 8601 with timezone)
     */
    private static String formatDateTimeForGraph(String dateTimeStr) {
        try {
            DateTime dt = (DateTime) JSON.deserialize('"' + dateTimeStr + '"', DateTime.class);
            
            // Convert to Brasília timezone (UTC-3)
            DateTime brasiliaTime = dt.addHours(-3);
            
            // Format as ISO 8601 with timezone
            return brasiliaTime.formatGmt('yyyy-MM-dd\'T\'HH:mm:ss.SSS') + '-03:00';
            
        } catch (Exception e) {
            System.debug(LoggingLevel.ERROR, 'Error formatting datetime: ' + e.getMessage());
            return DateTime.now().formatGmt('yyyy-MM-dd\'T\'HH:mm:ss.SSS') + '-03:00';
        }
    }
    
    /**
     * Check if access token is still valid
     */
    private static Boolean isTokenValid(Teams_Integration_Settings__c settings) {
        if (settings.Token_Expires_At__c == null) {
            return false;
        }
        
        // Check if token expires in the next 5 minutes
        DateTime expiryTime = settings.Token_Expires_At__c.addMinutes(-5);
        return DateTime.now() < expiryTime;
    }
    
    /**
     * Refresh Microsoft Graph API access token
     */
    private static String refreshAccessToken(Teams_Integration_Settings__c settings) {
        try {
            // Implement OAuth refresh token flow
            // This is a placeholder - implement based on your OAuth setup
            
            HttpRequest req = new HttpRequest();
            req.setEndpoint('https://login.microsoftonline.com/' + settings.Tenant_Id__c + '/oauth2/v2.0/token');
            req.setMethod('POST');
            req.setHeader('Content-Type', 'application/x-www-form-urlencoded');
            
            String body = 'grant_type=refresh_token' +
                         '&refresh_token=' + EncodingUtil.urlEncode(settings.Refresh_Token__c, 'UTF-8') +
                         '&client_id=' + EncodingUtil.urlEncode(settings.Client_Id__c, 'UTF-8') +
                         '&client_secret=' + EncodingUtil.urlEncode(settings.Client_Secret__c, 'UTF-8') +
                         '&scope=https://graph.microsoft.com/OnlineMeetings.ReadWrite';
            
            req.setBody(body);
            req.setTimeout(30000);
            
            Http http = new Http();
            HttpResponse res = http.send(req);
            
            if (res.getStatusCode() == 200) {
                Map<String, Object> tokenResponse = (Map<String, Object>) JSON.deserializeUntyped(res.getBody());
                
                // Update settings with new token
                settings.Access_Token__c = (String) tokenResponse.get('access_token');
                settings.Refresh_Token__c = (String) tokenResponse.get('refresh_token');
                
                Integer expiresIn = (Integer) tokenResponse.get('expires_in');
                settings.Token_Expires_At__c = DateTime.now().addSeconds(expiresIn);
                
                update settings;
                
                return settings.Access_Token__c;
            } else {
                System.debug(LoggingLevel.ERROR, 'Token refresh failed: ' + res.getStatusCode() + ' - ' + res.getBody());
                return null;
            }
            
        } catch (Exception e) {
            System.debug(LoggingLevel.ERROR, 'Error refreshing token: ' + e.getMessage());
            return null;
        }
    }
    
    /**
     * Test method to validate Teams integration setup
     */
    @AuraEnabled
    public static Map<String, Object> testTeamsIntegration() {
        Map<String, Object> result = new Map<String, Object>();
        
        try {
            String accessToken = getGraphApiAccessToken();
            
            if (String.isNotBlank(accessToken)) {
                result.put('success', true);
                result.put('message', 'Teams integration configured successfully');
                result.put('hasToken', true);
            } else {
                result.put('success', false);
                result.put('message', 'Teams integration not configured - using manual URL generation');
                result.put('hasToken', false);
            }
            
        } catch (Exception e) {
            result.put('success', false);
            result.put('message', 'Error testing integration: ' + e.getMessage());
            result.put('hasToken', false);
        }
        
        return result;
    }
}
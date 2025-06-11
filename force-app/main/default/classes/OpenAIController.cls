/**
 * Controller for OpenAI API integration with calendar system
 * Handles AI-powered event summaries and insights
 * @author Reino Capital Development Team
 * @version 1.0.0
 */
public with sharing class OpenAIController {
    
    private static final String API_ENDPOINT = 'callout:OpenAI_API/v1/chat/completions';
    private static final Integer TIMEOUT_SECONDS = 30;
    
    /**
     * Generate AI summary for calendar events in date range
     * @param startDate Start date for event range
     * @param endDate End date for event range
     * @param summaryType Type of summary (monthly, weekly, upcoming)
     * @return Map containing AI-generated summary and insights
     */
    @AuraEnabled
    public static Map<String, Object> generateEventSummary(
        Date startDate, 
        Date endDate, 
        String summaryType
    ) {
        Map<String, Object> result = new Map<String, Object>();
        
        try {
            // Validate inputs
            if (startDate == null || endDate == null) {
                throw new AuraHandledException('Datas de início e fim são obrigatórias');
            }
            
            // Get events for the date range
            List<Map<String, Object>> eventData = EventSummaryGenerator.aggregateEvents(
                startDate, endDate
            );

            if (eventData.isEmpty()) {
                result.put('success', true);
                result.put('summary', 'Nenhum evento encontrado para o período selecionado.');
                result.put('insights', new List<String>());
                result.put('recommendations', new List<String>());
                return result;
            }

            // Generate cache key based on events data
            String eventsDataHash = OpenAICacheManager.generateEventsDataHash(eventData);
            String cacheKey = OpenAICacheManager.generateCacheKey(startDate, endDate, summaryType, eventsDataHash);

            // Check cache first - SAVE API CALLS!
            Map<String, Object> cachedResponse = OpenAICacheManager.getCachedResponse(cacheKey);
            if (cachedResponse != null) {
                System.debug('🎯 CACHE HIT! OpenAI API call saved - returning cached response');
                return cachedResponse;
            }

            // Generate AI prompt based on summary type
            String prompt = generatePrompt(eventData, summaryType);

            // Call OpenAI API
            String aiResponse = callOpenAI(prompt);

            // Process response
            Map<String, Object> processedResponse = processOpenAIResponse(aiResponse);

            result.put('success', true);
            result.put('summary', processedResponse.get('summary'));
            result.put('insights', processedResponse.get('insights'));
            result.put('recommendations', processedResponse.get('recommendations'));

            // Cache the successful response for future use
            if (result.get('success') == true) {
                OpenAICacheManager.cacheResponse(cacheKey, result, eventsDataHash);
                System.debug('💾 Response cached successfully - future identical requests will be instant!');
            }
            
        } catch (Exception e) {
            System.debug('Error generating AI summary: ' + e.getMessage());
            result.put('success', false);
            result.put('error', 'Erro ao gerar resumo: ' + e.getMessage());
            result.put('summary', 'Resumo indisponível no momento.');
        }
        
        return result;
    }
    
    /**
     * Generate intelligent meeting suggestions
     * @param participantIds List of participant user IDs
     * @param targetDate Target date for meeting
     * @param durationMinutes Meeting duration in minutes
     * @return Map containing AI-generated meeting suggestions
     */
    @AuraEnabled
    public static Map<String, Object> generateMeetingSuggestions(
        List<String> participantIds,
        Date targetDate,
        Integer durationMinutes
    ) {
        Map<String, Object> result = new Map<String, Object>();
        
        try {
            // Get participant availability
            Map<String, Object> availabilityData = AppointmentController.getOptimalMeetingTimes(
                participantIds, targetDate, durationMinutes, 9, 17
            );
            
            // Generate AI-powered suggestions
            String prompt = generateMeetingSuggestionPrompt(availabilityData, targetDate);
            String aiResponse = callOpenAI(prompt);
            
            Map<String, Object> suggestions = processMeetingSuggestions(aiResponse);
            
            result.put('success', true);
            result.put('suggestions', suggestions.get('suggestions'));
            result.put('reasoning', suggestions.get('reasoning'));
            
        } catch (Exception e) {
            result.put('success', false);
            result.put('error', e.getMessage());
        }
        
        return result;
    }
    
    /**
     * Test OpenAI API connectivity
     * @return Map containing connection test results
     */
    @AuraEnabled
    public static Map<String, Object> testOpenAIConnection() {
        Map<String, Object> result = new Map<String, Object>();

        try {
            String testPrompt = 'Responda apenas: OK';
            String response = callOpenAI(testPrompt);

            result.put('success', true);
            result.put('message', 'Conexão com OpenAI estabelecida com sucesso');
            result.put('response', response);

        } catch (Exception e) {
            result.put('success', false);
            result.put('error', 'Erro de conexão: ' + e.getMessage());
        }

        return result;
    }

    /**
     * Get cache statistics and performance metrics
     * @return Map containing cache statistics
     */
    @AuraEnabled
    public static Map<String, Object> getCacheStatistics() {
        Map<String, Object> result = new Map<String, Object>();

        try {
            Map<String, Object> stats = OpenAICacheManager.getCacheStats();
            result.put('success', true);
            result.put('stats', stats);

            // Calculate potential savings
            Integer activeEntries = (Integer) stats.get('activeEntries');
            Decimal estimatedSavings = activeEntries * 0.10; // Estimate $0.10 per cached call
            result.put('estimatedSavings', estimatedSavings);
            result.put('message', 'Cache funcionando - economizando chamadas da API!');

        } catch (Exception e) {
            result.put('success', false);
            result.put('error', 'Erro ao obter estatísticas: ' + e.getMessage());
        }

        return result;
    }
    
    /**
     * Private method to call OpenAI API
     * @param prompt The prompt to send to OpenAI
     * @return String response from OpenAI API
     */
    private static String callOpenAI(String prompt) {
        HttpRequest req = new HttpRequest();
        req.setEndpoint(API_ENDPOINT);
        req.setMethod('POST');
        req.setHeader('Content-Type', 'application/json');
        req.setTimeout(TIMEOUT_SECONDS * 1000);

        // Named Credential with Password Authentication automatically adds:
        // Authorization: Bearer {password_field_value}
        
        // Build request body
        Map<String, Object> requestBody = new Map<String, Object>{
            'model' => getConfigValue('API_Model__c', 'gpt-4'),
            'messages' => new List<Map<String, Object>>{
                new Map<String, Object>{
                    'role' => 'system',
                    'content' => 'Você é um assistente de calendário para uma empresa brasileira. ' +
                               'Analise dados de reuniões e forneça insights em português. ' +
                               'Seja conciso, profissional e focado em produtividade.'
                },
                new Map<String, Object>{
                    'role' => 'user',
                    'content' => prompt
                }
            },
            'max_tokens' => Integer.valueOf(getConfigValue('Max_Tokens__c', '1000')),
            'temperature' => Decimal.valueOf(getConfigValue('Temperature__c', '0.7'))
        };
        
        req.setBody(JSON.serialize(requestBody));
        
        Http http = new Http();
        HttpResponse res = http.send(req);
        
        if (res.getStatusCode() != 200) {
            throw new AuraHandledException('Erro na API OpenAI: ' + res.getStatusCode() + ' - ' + res.getBody());
        }
        
        return res.getBody();
    }
    
    /**
     * Get configuration value from custom metadata
     * @param fieldName Field name to retrieve
     * @param defaultValue Default value if field not found
     * @return String configuration value
     */
    private static String getConfigValue(String fieldName, String defaultValue) {
        try {
            OpenAI_Config__mdt config = [
                SELECT Id, DeveloperName, MasterLabel,
                       API_Model__c, Max_Tokens__c, Temperature__c, Enabled__c
                FROM OpenAI_Config__mdt
                WHERE DeveloperName = 'Default_Config'
                LIMIT 1
            ];

            // Check if OpenAI is enabled
            if (fieldName == 'Enabled__c') {
                return String.valueOf(config.Enabled__c);
            }

            Object fieldValue = config.get(fieldName);
            return fieldValue != null ? String.valueOf(fieldValue) : defaultValue;

        } catch (Exception e) {
            System.debug('Error retrieving config value: ' + e.getMessage());
            // Return default values if custom metadata is not available
            Map<String, String> defaultConfig = new Map<String, String>{
                'API_Model__c' => 'gpt-4',
                'Max_Tokens__c' => '1000',
                'Temperature__c' => '0.7',
                'Enabled__c' => 'true'
            };

            return defaultConfig.get(fieldName) != null ? defaultConfig.get(fieldName) : defaultValue;
        }
    }
    
    /**
     * Generate prompt for event summary
     * @param eventData List of event data maps
     * @param summaryType Type of summary to generate
     * @return String formatted prompt for OpenAI
     */
    private static String generatePrompt(List<Map<String, Object>> eventData, String summaryType) {
        String basePrompt = 'Analise os seguintes eventos de calendário e forneça um resumo detalhado:\n\n';
        
        // Add event data to prompt (limit to prevent token overflow)
        Integer eventCount = 0;
        for (Map<String, Object> event : eventData) {
            if (eventCount >= 20) break; // Limit events to prevent token overflow
            
            basePrompt += String.format(
                'Evento: {0}\nData: {1}\nParticipantes: {2}\nSala: {3}\nStatus: {4}\n\n',
                new List<String>{
                    (String) event.get('subject'),
                    String.valueOf(event.get('startDateTime')),
                    (String) event.get('participantNames') != null ?
                        (String) event.get('participantNames') : (String) event.get('participants'),
                    (String) event.get('room'),
                    (String) event.get('status')
                }
            );
            eventCount++;
        }
        
        // Add specific instructions based on summary type
        switch on summaryType {
            when 'monthly' {
                basePrompt += 'Forneça um resumo conciso dos dados mensais:\n' +
                             '1. Total de reuniões realizadas\n' +
                             '2. Participantes mais frequentes\n' +
                             '3. Salas mais utilizadas\n' +
                             '4. Horários de maior concentração\n\n' +
                             'Foque apenas nos dados apresentados.';
            }
            when 'weekly' {
                basePrompt += 'Forneça um resumo conciso dos dados semanais:\n' +
                             '1. Distribuição de reuniões por dia\n' +
                             '2. Horários mais utilizados\n' +
                             '3. Participantes envolvidos\n' +
                             '4. Salas ocupadas\n\n' +
                             'Foque apenas nos dados apresentados.';
            }
            when 'upcoming' {
                basePrompt += 'Analise os próximos eventos programados:\n' +
                             '1. Quantidade de eventos\n' +
                             '2. Participantes envolvidos\n' +
                             '3. Horários agendados\n' +
                             '4. Salas reservadas\n\n' +
                             'Foque apenas nos dados dos eventos.';
            }
        }

        basePrompt += '\n\nIMPORTANTE: Seja conciso e objetivo. ' +
                     'Analise APENAS os dados fornecidos. ' +
                     'NÃO inclua dicas de produtividade, etiqueta ou sugestões gerais. ' +
                     'NÃO inclua JSON ou formatação técnica. ' +
                     'Máximo 3-4 frases por tópico.';
        
        return basePrompt;
    }
    
    /**
     * Generate prompt for meeting suggestions
     * @param availabilityData Participant availability data
     * @param targetDate Target date for meeting
     * @return String formatted prompt for meeting suggestions
     */
    private static String generateMeetingSuggestionPrompt(
        Map<String, Object> availabilityData, 
        Date targetDate
    ) {
        String prompt = 'Com base nos dados de disponibilidade fornecidos, sugira os melhores ' +
                       'horários para uma reunião em ' + targetDate.format() + ':\n\n';
        
        prompt += JSON.serialize(availabilityData);
        
        prompt += '\n\nForneça 3-5 sugestões de horários com justificativas, considerando:\n' +
                 '1. Disponibilidade de todos os participantes\n' +
                 '2. Horários produtivos (evitar início/fim do dia)\n' +
                 '3. Duração adequada para breaks entre reuniões\n' +
                 '4. Preferências de agendamento corporativo\n\n' +
                 'Formate a resposta em JSON com as chaves: "suggestions", "reasoning"';
        
        return prompt;
    }
    
    /**
     * Process OpenAI API response for event summaries
     * @param apiResponse Raw API response from OpenAI
     * @return Map containing processed summary data
     */
    private static Map<String, Object> processOpenAIResponse(String apiResponse) {
        Map<String, Object> result = new Map<String, Object>();
        
        try {
            Map<String, Object> response = (Map<String, Object>) JSON.deserializeUntyped(apiResponse);
            List<Object> choices = (List<Object>) response.get('choices');
            
            if (choices != null && !choices.isEmpty()) {
                Map<String, Object> firstChoice = (Map<String, Object>) choices[0];
                Map<String, Object> message = (Map<String, Object>) firstChoice.get('message');
                String content = (String) message.get('content');
                
                // Try to parse as JSON first
                try {
                    Map<String, Object> parsedContent = (Map<String, Object>) JSON.deserializeUntyped(content);
                    result.put('summary', parsedContent.get('summary'));
                    result.put('insights', parsedContent.get('insights'));
                    result.put('recommendations', parsedContent.get('recommendations'));
                } catch (Exception e) {
                    // If JSON parsing fails, extract insights from natural text
                    result.put('summary', content);
                    result.put('insights', extractInsightsFromText(content));
                    result.put('recommendations', extractRecommendationsFromText(content));
                }
            }
            
        } catch (Exception e) {
            System.debug('Error processing OpenAI response: ' + e.getMessage());
            result.put('summary', 'Erro ao processar resposta da IA');
            result.put('insights', new List<String>());
            result.put('recommendations', new List<String>());
        }
        
        return result;
    }
    
    /**
     * Process meeting suggestions from OpenAI response
     * @param apiResponse Raw API response from OpenAI
     * @return Map containing processed meeting suggestions
     */
    private static Map<String, Object> processMeetingSuggestions(String apiResponse) {
        Map<String, Object> result = new Map<String, Object>();
        
        try {
            Map<String, Object> response = (Map<String, Object>) JSON.deserializeUntyped(apiResponse);
            List<Object> choices = (List<Object>) response.get('choices');
            
            if (choices != null && !choices.isEmpty()) {
                Map<String, Object> firstChoice = (Map<String, Object>) choices[0];
                Map<String, Object> message = (Map<String, Object>) firstChoice.get('message');
                String content = (String) message.get('content');
                
                // Try to parse as JSON
                try {
                    Map<String, Object> parsedContent = (Map<String, Object>) JSON.deserializeUntyped(content);
                    result.put('suggestions', parsedContent.get('suggestions'));
                    result.put('reasoning', parsedContent.get('reasoning'));
                } catch (Exception e) {
                    result.put('suggestions', new List<String>());
                    result.put('reasoning', content);
                }
            }
            
        } catch (Exception e) {
            result.put('suggestions', new List<String>());
            result.put('reasoning', 'Erro ao processar sugestões');
        }
        
        return result;
    }

    /**
     * Extract insights from natural text response
     * @param text Natural language response from OpenAI
     * @return List of insights extracted from text
     */
    private static List<String> extractInsightsFromText(String text) {
        List<String> insights = new List<String>();

        if (String.isBlank(text)) {
            return insights;
        }

        // Look for data-focused insight patterns in Portuguese
        List<String> insightKeywords = new List<String>{
            'total', 'participantes', 'reuniões', 'horário', 'sala',
            'frequente', 'concentração', 'distribuição', 'dados'
        };

        String[] sentences = text.split('\\.');
        for (String sentence : sentences) {
            sentence = sentence.trim();
            if (String.isNotBlank(sentence)) {
                for (String keyword : insightKeywords) {
                    if (sentence.toLowerCase().contains(keyword.toLowerCase())) {
                        insights.add(sentence + '.');
                        break;
                    }
                }
            }
        }

        // If no specific insights found, extract key points
        if (insights.isEmpty()) {
            String[] lines = text.split('\n');
            for (String line : lines) {
                line = line.trim();
                if (line.startsWith('•') || line.startsWith('-') ||
                    Pattern.matches('^\\d+\\..*', line) || line.contains('reuniões') ||
                    line.contains('participantes') || line.contains('horário')) {
                    insights.add(line);
                    if (insights.size() >= 3) break; // Limit to 3 insights
                }
            }
        }

        return insights;
    }

    /**
     * Extract recommendations from natural text response
     * @param text Natural language response from OpenAI
     * @return List of recommendations extracted from text
     */
    private static List<String> extractRecommendationsFromText(String text) {
        List<String> recommendations = new List<String>();

        if (String.isBlank(text)) {
            return recommendations;
        }

        // Look for data-based observation patterns (not general recommendations)
        List<String> recommendationKeywords = new List<String>{
            'próximos', 'agendados', 'programados', 'reservados',
            'ocupados', 'disponíveis', 'conflitos', 'sobreposições'
        };

        String[] sentences = text.split('\\.');
        for (String sentence : sentences) {
            sentence = sentence.trim();
            if (String.isNotBlank(sentence)) {
                for (String keyword : recommendationKeywords) {
                    if (sentence.toLowerCase().contains(keyword.toLowerCase())) {
                        recommendations.add(sentence + '.');
                        break;
                    }
                }
            }
        }

        // If no specific recommendations found, look for action-oriented text
        if (recommendations.isEmpty()) {
            String[] lines = text.split('\n');
            for (String line : lines) {
                line = line.trim();
                if (line.toLowerCase().contains('dica') ||
                    line.toLowerCase().contains('sugestão') ||
                    line.toLowerCase().contains('melhoria')) {
                    recommendations.add(line);
                    if (recommendations.size() >= 3) break; // Limit to 3 recommendations
                }
            }
        }

        return recommendations;
    }
}

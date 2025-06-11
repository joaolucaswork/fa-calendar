/**
 * Test class for OpenAICacheManager
 * Tests caching functionality and performance optimizations
 * 
 * @author Augment Agent
 * @version 1.0
 */
@isTest
public class OpenAICacheManagerTest {
    
    @isTest
    static void testGenerateEventsDataHash() {
        // Test with empty data
        List<Map<String, Object>> emptyData = new List<Map<String, Object>>();
        String emptyHash = OpenAICacheManager.generateEventsDataHash(emptyData);
        System.assertEquals('empty', emptyHash, 'Empty data should return "empty" hash');
        
        // Test with null data
        String nullHash = OpenAICacheManager.generateEventsDataHash(null);
        System.assertEquals('empty', nullHash, 'Null data should return "empty" hash');
        
        // Test with sample event data
        List<Map<String, Object>> eventData = new List<Map<String, Object>>();
        Map<String, Object> event1 = new Map<String, Object>{
            'id' => 'event1',
            'subject' => 'Test Meeting',
            'startDateTime' => DateTime.now(),
            'participantNames' => 'John Doe (Gestor)'
        };
        eventData.add(event1);
        
        String hash1 = OpenAICacheManager.generateEventsDataHash(eventData);
        System.assertNotEquals('empty', hash1, 'Event data should generate valid hash');
        System.assertEquals(16, hash1.length(), 'Hash should be 16 characters long');
        
        // Test hash consistency
        String hash2 = OpenAICacheManager.generateEventsDataHash(eventData);
        System.assertEquals(hash1, hash2, 'Same data should generate same hash');
        
        // Test different data generates different hash
        Map<String, Object> event2 = new Map<String, Object>{
            'id' => 'event2',
            'subject' => 'Different Meeting',
            'startDateTime' => DateTime.now().addHours(1),
            'participantNames' => 'Jane Smith (SDR)'
        };
        eventData.add(event2);
        
        String hash3 = OpenAICacheManager.generateEventsDataHash(eventData);
        System.assertNotEquals(hash1, hash3, 'Different data should generate different hash');
    }
    
    @isTest
    static void testGenerateCacheKey() {
        Date startDate = Date.today();
        Date endDate = Date.today().addDays(7);
        String summaryType = 'weekly';
        String eventsHash = 'test123';
        
        String cacheKey = OpenAICacheManager.generateCacheKey(startDate, endDate, summaryType, eventsHash);
        
        System.assertNotEquals(null, cacheKey, 'Cache key should not be null');
        System.assertEquals(32, cacheKey.length(), 'Cache key should be 32 characters long');
        
        // Test consistency
        String cacheKey2 = OpenAICacheManager.generateCacheKey(startDate, endDate, summaryType, eventsHash);
        System.assertEquals(cacheKey, cacheKey2, 'Same parameters should generate same cache key');
        
        // Test different parameters generate different keys
        String cacheKey3 = OpenAICacheManager.generateCacheKey(startDate, endDate, 'monthly', eventsHash);
        System.assertNotEquals(cacheKey, cacheKey3, 'Different summary type should generate different key');
    }
    
    @isTest
    static void testCacheOperations() {
        // Clear cache first
        OpenAICacheManager.clearCache();
        
        // Test cache miss
        String testKey = 'testKey123';
        Map<String, Object> cachedResult = OpenAICacheManager.getCachedResponse(testKey);
        System.assertEquals(null, cachedResult, 'Cache miss should return null');
        
        // Test cache store and hit
        Map<String, Object> testData = new Map<String, Object>{
            'success' => true,
            'summary' => 'Test summary',
            'insights' => new List<String>{'Insight 1', 'Insight 2'},
            'recommendations' => new List<String>{'Recommendation 1'}
        };
        
        OpenAICacheManager.cacheResponse(testKey, testData, 'testHash');
        
        Map<String, Object> retrievedData = OpenAICacheManager.getCachedResponse(testKey);
        System.assertNotEquals(null, retrievedData, 'Cache hit should return data');
        System.assertEquals(testData.get('summary'), retrievedData.get('summary'), 'Cached data should match original');
        
        // Test cache statistics
        Map<String, Object> stats = OpenAICacheManager.getCacheStats();
        System.assertEquals(1, stats.get('totalEntries'), 'Should have 1 cache entry');
        System.assertEquals(1, stats.get('activeEntries'), 'Should have 1 active entry');
        System.assertEquals(0, stats.get('expiredEntries'), 'Should have 0 expired entries');
    }
    
    @isTest
    static void testCacheClear() {
        // Add some test data
        OpenAICacheManager.cacheResponse('key1', new Map<String, Object>{'test' => 'data1'}, 'hash1');
        OpenAICacheManager.cacheResponse('key2', new Map<String, Object>{'test' => 'data2'}, 'hash2');
        
        Map<String, Object> statsBefore = OpenAICacheManager.getCacheStats();
        System.assertEquals(2, statsBefore.get('totalEntries'), 'Should have 2 entries before clear');
        
        // Clear cache
        OpenAICacheManager.clearCache();
        
        Map<String, Object> statsAfter = OpenAICacheManager.getCacheStats();
        System.assertEquals(0, statsAfter.get('totalEntries'), 'Should have 0 entries after clear');
        
        // Verify data is gone
        Map<String, Object> result1 = OpenAICacheManager.getCachedResponse('key1');
        Map<String, Object> result2 = OpenAICacheManager.getCachedResponse('key2');
        System.assertEquals(null, result1, 'Key1 should be null after clear');
        System.assertEquals(null, result2, 'Key2 should be null after clear');
    }
    
    @isTest
    static void testCacheStatistics() {
        OpenAICacheManager.clearCache();
        
        // Test empty cache stats
        Map<String, Object> emptyStats = OpenAICacheManager.getCacheStats();
        System.assertEquals(0, emptyStats.get('totalEntries'), 'Empty cache should have 0 total entries');
        System.assertEquals(0, emptyStats.get('activeEntries'), 'Empty cache should have 0 active entries');
        System.assertEquals(0, emptyStats.get('expiredEntries'), 'Empty cache should have 0 expired entries');
        System.assertEquals(100, emptyStats.get('maxEntries'), 'Max entries should be 100');
        System.assertEquals(60, emptyStats.get('cacheDurationMinutes'), 'Cache duration should be 60 minutes');
        
        // Add test data
        for (Integer i = 0; i < 5; i++) {
            OpenAICacheManager.cacheResponse(
                'testKey' + i, 
                new Map<String, Object>{'data' => 'value' + i}, 
                'hash' + i
            );
        }
        
        Map<String, Object> populatedStats = OpenAICacheManager.getCacheStats();
        System.assertEquals(5, populatedStats.get('totalEntries'), 'Should have 5 total entries');
        System.assertEquals(5, populatedStats.get('activeEntries'), 'Should have 5 active entries');
        System.assertEquals(0, populatedStats.get('expiredEntries'), 'Should have 0 expired entries');
    }
    
    @isTest
    static void testErrorHandling() {
        // Test with invalid cache key
        Map<String, Object> result = OpenAICacheManager.getCachedResponse(null);
        System.assertEquals(null, result, 'Null cache key should return null');
        
        // Test caching null data
        OpenAICacheManager.cacheResponse('nullDataKey', null, 'testHash');
        Map<String, Object> nullResult = OpenAICacheManager.getCachedResponse('nullDataKey');
        System.assertEquals(null, nullResult, 'Cached null data should return null');
        
        // Test with empty strings
        String emptyKey = OpenAICacheManager.generateCacheKey(null, null, '', '');
        System.assertNotEquals(null, emptyKey, 'Should handle null/empty parameters gracefully');
    }
    
    @isTest
    static void testIntegrationWithOpenAIController() {
        // Test that cache integration works with OpenAIController
        OpenAICacheManager.clearCache();
        
        // Create test events
        List<Map<String, Object>> testEvents = new List<Map<String, Object>>();
        testEvents.add(new Map<String, Object>{
            'id' => 'test1',
            'subject' => 'Test Meeting',
            'startDateTime' => DateTime.now(),
            'participantNames' => 'Test User (Gestor)'
        });
        
        // Generate hash and cache key
        String eventsHash = OpenAICacheManager.generateEventsDataHash(testEvents);
        String cacheKey = OpenAICacheManager.generateCacheKey(
            Date.today(), 
            Date.today().addDays(7), 
            'weekly', 
            eventsHash
        );
        
        // Verify cache key generation works
        System.assertNotEquals(null, cacheKey, 'Cache key should be generated');
        System.assertNotEquals('empty', eventsHash, 'Events hash should not be empty');
        
        // Test cache miss scenario
        Map<String, Object> missResult = OpenAICacheManager.getCachedResponse(cacheKey);
        System.assertEquals(null, missResult, 'Should be cache miss initially');
        
        // Simulate caching a response
        Map<String, Object> mockResponse = new Map<String, Object>{
            'success' => true,
            'summary' => 'Cached summary',
            'insights' => new List<String>{'Cached insight'},
            'recommendations' => new List<String>{'Cached recommendation'}
        };
        
        OpenAICacheManager.cacheResponse(cacheKey, mockResponse, eventsHash);
        
        // Test cache hit scenario
        Map<String, Object> hitResult = OpenAICacheManager.getCachedResponse(cacheKey);
        System.assertNotEquals(null, hitResult, 'Should be cache hit after caching');
        System.assertEquals('Cached summary', hitResult.get('summary'), 'Should return cached summary');
    }
}

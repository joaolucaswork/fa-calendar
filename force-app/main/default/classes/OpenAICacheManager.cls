/**
 * OpenAI Cache Manager
 * Manages caching of OpenAI API responses to reduce costs and improve performance
 * 
 * @author Augment Agent
 * @version 1.0
 */
public with sharing class OpenAICacheManager {
    
    // Cache duration in minutes (default: 60 minutes)
    private static final Integer CACHE_DURATION_MINUTES = 60;
    
    // Maximum cache entries to prevent memory issues
    private static final Integer MAX_CACHE_ENTRIES = 100;
    
    // Static cache storage
    private static Map<String, CacheEntry> cache = new Map<String, CacheEntry>();
    
    /**
     * Cache entry wrapper class
     */
    public class CacheEntry {
        public Map<String, Object> data;
        public DateTime timestamp;
        public String dataHash;
        
        public CacheEntry(Map<String, Object> data, String dataHash) {
            this.data = data;
            this.dataHash = dataHash;
            this.timestamp = DateTime.now();
        }
        
        public Boolean isExpired() {
            return timestamp.addMinutes(CACHE_DURATION_MINUTES) < DateTime.now();
        }
    }
    
    /**
     * Generate cache key based on parameters
     * @param startDate Start date for events
     * @param endDate End date for events
     * @param summaryType Type of summary (monthly, weekly, upcoming)
     * @param eventsData Hash of events data
     * @return String cache key
     */
    public static String generateCacheKey(Date startDate, Date endDate, String summaryType, String eventsDataHash) {
        String keyData = String.valueOf(startDate) + '_' + 
                        String.valueOf(endDate) + '_' + 
                        summaryType + '_' + 
                        eventsDataHash;
        
        // Generate hash for consistent key length
        Blob keyBlob = Blob.valueOf(keyData);
        Blob hashBlob = Crypto.generateDigest('SHA-256', keyBlob);
        return EncodingUtil.base64Encode(hashBlob).substring(0, 32);
    }
    
    /**
     * Generate hash of events data to detect changes
     * @param eventsData List of event data maps
     * @return String hash of the events data
     */
    public static String generateEventsDataHash(List<Map<String, Object>> eventsData) {
        if (eventsData == null || eventsData.isEmpty()) {
            return 'empty';
        }
        
        // Create a consistent string representation of events data
        List<String> eventStrings = new List<String>();
        for (Map<String, Object> event : eventsData) {
            String eventString = String.valueOf(event.get('id')) + '_' +
                               String.valueOf(event.get('subject')) + '_' +
                               String.valueOf(event.get('startDateTime')) + '_' +
                               String.valueOf(event.get('participantNames'));
            eventStrings.add(eventString);
        }
        
        // Sort to ensure consistent hash regardless of order
        eventStrings.sort();
        String combinedData = String.join(eventStrings, '|');
        
        // Generate hash
        Blob dataBlob = Blob.valueOf(combinedData);
        Blob hashBlob = Crypto.generateDigest('SHA-256', dataBlob);
        return EncodingUtil.base64Encode(hashBlob).substring(0, 16);
    }
    
    /**
     * Get cached response if available and not expired
     * @param cacheKey Cache key to lookup
     * @return Map<String, Object> cached response or null if not found/expired
     */
    public static Map<String, Object> getCachedResponse(String cacheKey) {
        try {
            CacheEntry entry = cache.get(cacheKey);
            
            if (entry != null && !entry.isExpired()) {
                System.debug('Cache HIT for key: ' + cacheKey);
                return entry.data;
            } else if (entry != null && entry.isExpired()) {
                // Remove expired entry
                cache.remove(cacheKey);
                System.debug('Cache EXPIRED for key: ' + cacheKey);
            } else {
                System.debug('Cache MISS for key: ' + cacheKey);
            }
            
        } catch (Exception e) {
            System.debug('Error retrieving from cache: ' + e.getMessage());
        }
        
        return null;
    }
    
    /**
     * Store response in cache
     * @param cacheKey Cache key
     * @param response Response data to cache
     * @param eventsDataHash Hash of the events data
     */
    public static void cacheResponse(String cacheKey, Map<String, Object> response, String eventsDataHash) {
        try {
            // Clean up cache if it's getting too large
            if (cache.size() >= MAX_CACHE_ENTRIES) {
                cleanupExpiredEntries();
                
                // If still too large, remove oldest entries
                if (cache.size() >= MAX_CACHE_ENTRIES) {
                    removeOldestEntries(MAX_CACHE_ENTRIES / 2);
                }
            }
            
            CacheEntry entry = new CacheEntry(response, eventsDataHash);
            cache.put(cacheKey, entry);
            
            System.debug('Cached response for key: ' + cacheKey + ' (Cache size: ' + cache.size() + ')');
            
        } catch (Exception e) {
            System.debug('Error caching response: ' + e.getMessage());
        }
    }
    
    /**
     * Clean up expired cache entries
     */
    private static void cleanupExpiredEntries() {
        List<String> expiredKeys = new List<String>();
        
        for (String key : cache.keySet()) {
            CacheEntry entry = cache.get(key);
            if (entry != null && entry.isExpired()) {
                expiredKeys.add(key);
            }
        }
        
        for (String key : expiredKeys) {
            cache.remove(key);
        }
        
        if (!expiredKeys.isEmpty()) {
            System.debug('Cleaned up ' + expiredKeys.size() + ' expired cache entries');
        }
    }
    
    /**
     * Remove oldest cache entries
     * @param count Number of entries to remove
     */
    private static void removeOldestEntries(Integer count) {
        List<String> keysToRemove = new List<String>();
        List<CacheEntry> entries = new List<CacheEntry>();
        
        // Collect all entries with their keys
        for (String key : cache.keySet()) {
            CacheEntry entry = cache.get(key);
            if (entry != null) {
                entries.add(entry);
            }
        }
        
        // Sort by timestamp (oldest first)
        entries.sort();
        
        // Remove oldest entries
        Integer removeCount = Math.min(count, entries.size());
        for (Integer i = 0; i < removeCount; i++) {
            for (String key : cache.keySet()) {
                if (cache.get(key) == entries[i]) {
                    keysToRemove.add(key);
                    break;
                }
            }
        }
        
        for (String key : keysToRemove) {
            cache.remove(key);
        }
        
        System.debug('Removed ' + keysToRemove.size() + ' oldest cache entries');
    }
    
    /**
     * Clear all cache entries (for testing or manual cleanup)
     */
    public static void clearCache() {
        cache.clear();
        System.debug('Cache cleared');
    }
    
    /**
     * Get cache statistics
     * @return Map<String, Object> cache statistics
     */
    public static Map<String, Object> getCacheStats() {
        Integer totalEntries = cache.size();
        Integer expiredEntries = 0;
        
        for (CacheEntry entry : cache.values()) {
            if (entry != null && entry.isExpired()) {
                expiredEntries++;
            }
        }
        
        return new Map<String, Object>{
            'totalEntries' => totalEntries,
            'activeEntries' => totalEntries - expiredEntries,
            'expiredEntries' => expiredEntries,
            'maxEntries' => MAX_CACHE_ENTRIES,
            'cacheDurationMinutes' => CACHE_DURATION_MINUTES
        };
    }
}

/**
 * WASM-Native Filesystem Support for yaml-cpp.wasm
 * Advanced filesystem capabilities for web applications
 * 
 * Copyright (c) 2025 Superstruct Ltd, New Zealand
 * Licensed under the same license as the underlying yaml-cpp project (MIT)
 */

#pragma once

#include <string>
#include <functional>
#include <memory>

// Enable WASM-native features if requested and in Emscripten environment
#if defined(ENABLE_WASM_NATIVE) && defined(__EMSCRIPTEN__)
#define YAML_CPP_ENABLE_WASM_NATIVE 1
#include <emscripten.h>
#else
#define YAML_CPP_ENABLE_WASM_NATIVE 0
#endif

namespace YAML {
namespace filesystem {

/**
 * WASM-Native Filesystem Capabilities
 * Provides advanced filesystem features for web applications
 */

/**
 * Initialize persistent storage using IDBFS
 * Enables YAML resources to persist across browser sessions
 * @param cache_path Virtual path for persistent cache (default: "/yaml-cache")
 * @return true if persistent storage is available
 */
bool initializePersistentStorage(const std::string& cache_path = "/yaml-cache");

/**
 * Setup virtual directory structure for YAML resources
 * Creates organized directory tree for different resource types
 */
void setupVirtualDirectories();

/**
 * Async resource loading from URLs with caching
 * @param url Remote URL to load YAML from
 * @param resource_id Unique identifier for caching
 * @param callback Completion callback (success, local_path)
 */
void asyncLoadResourceFromURL(const std::string& url, const std::string& resource_id,
                             std::function<void(bool, const std::string&)> callback);

/**
 * Load YAML schema from URL for validation
 * @param schema_url URL of YAML schema file
 * @param schema_id Unique schema identifier
 * @return true if loading initiated successfully
 */
bool loadSchemaFromURL(const std::string& schema_url, const std::string& schema_id);

/**
 * Load YAML template from URL for dynamic generation
 * @param template_url URL of YAML template file
 * @param template_id Unique template identifier
 * @return true if loading initiated successfully
 */
bool loadTemplateFromURL(const std::string& template_url, const std::string& template_id);

/**
 * Load YAML package (ZIP archive) from URL
 * @param package_url URL of ZIP package containing YAML files
 * @param package_name Unique package identifier
 * @return true if loading initiated successfully
 */
bool loadYAMLPackage(const std::string& package_url, const std::string& package_name);

/**
 * Progressive loader for priority-based resource loading
 */
class ProgressiveLoader {
public:
    enum Priority {
        LOW = 1,
        NORMAL = 2,
        HIGH = 3,
        CRITICAL = 4
    };
    
    /**
     * Add resource to progressive loading queue
     * @param url Resource URL
     * @param id Resource identifier
     * @param priority Loading priority
     * @param callback Completion callback
     */
    void addResource(const std::string& url, const std::string& id, 
                    Priority priority, std::function<void(bool, const std::string&)> callback);
    
    /**
     * Get current queue size
     * @return Number of pending resources
     */
    size_t getQueueSize() const;
    
    /**
     * Clear all pending resources
     */
    void clear();
};

/**
 * Intelligent caching system with size limits and TTL
 */
class IntelligentCache {
public:
    /**
     * Constructor
     * @param max_memory_entries Maximum entries in memory cache
     * @param max_age_ms Maximum age in milliseconds before expiry
     */
    IntelligentCache(size_t max_memory_entries = 100, uint64_t max_age_ms = 7 * 24 * 60 * 60 * 1000);
    
    /**
     * Get cached value
     * @param key Cache key
     * @param value Output value
     * @return true if found and valid
     */
    bool get(const std::string& key, std::string& value);
    
    /**
     * Set cached value
     * @param key Cache key
     * @param value Value to cache
     */
    void set(const std::string& key, const std::string& value);
    
    /**
     * Remove cached value
     * @param key Cache key
     */
    void remove(const std::string& key);
    
    /**
     * Clear all cached values
     */
    void clear();
    
    /**
     * Get cache statistics
     */
    struct CacheStats {
        size_t memory_entries;
        size_t persistent_entries;
        size_t hits;
        size_t misses;
        double hit_ratio;
    };
    
    CacheStats getStats() const;
};

/**
 * YAML-specific resource types
 */
enum class ResourceType {
    SCHEMA,     // Validation schemas
    TEMPLATE,   // Template files
    CONFIG,     // Configuration files
    DATA,       // Data files
    PACKAGE     // ZIP packages
};

/**
 * Resource metadata
 */
struct ResourceMetadata {
    std::string id;
    std::string url;
    ResourceType type;
    bool loaded;
    size_t size;
    std::string cached_path;
    uint64_t loaded_at;
    std::string version;
};

/**
 * Resource manager for organized YAML resource handling
 */
class ResourceManager {
public:
    /**
     * Register resource for loading
     * @param metadata Resource metadata
     * @param priority Loading priority
     * @return true if registration successful
     */
    bool registerResource(const ResourceMetadata& metadata, 
                         ProgressiveLoader::Priority priority = ProgressiveLoader::NORMAL);
    
    /**
     * Load registered resource
     * @param resource_id Resource identifier
     * @param callback Completion callback
     * @return true if loading initiated
     */
    bool loadResource(const std::string& resource_id,
                     std::function<void(bool, const ResourceMetadata&)> callback);
    
    /**
     * Get resource metadata
     * @param resource_id Resource identifier
     * @return Resource metadata or nullptr if not found
     */
    std::shared_ptr<ResourceMetadata> getResourceMetadata(const std::string& resource_id) const;
    
    /**
     * List all registered resources
     * @param type Optional resource type filter
     * @return Vector of resource metadata
     */
    std::vector<ResourceMetadata> listResources(ResourceType type = ResourceType::DATA) const;
    
    /**
     * Check if resource is loaded
     * @param resource_id Resource identifier
     * @return true if loaded and available
     */
    bool isResourceLoaded(const std::string& resource_id) const;
    
    /**
     * Unload resource from memory (keeps cached version)
     * @param resource_id Resource identifier
     */
    void unloadResource(const std::string& resource_id);
    
    /**
     * Get resource usage statistics
     */
    struct ResourceStats {
        size_t total_resources;
        size_t loaded_resources;
        size_t cached_resources;
        size_t total_size;
        size_t memory_usage;
    };
    
    ResourceStats getStats() const;
};

} // namespace filesystem
} // namespace YAML

// Global resource manager instance
extern YAML::filesystem::ResourceManager& getGlobalResourceManager();

// C-style API for JavaScript integration
extern "C" {

/**
 * Initialize WASM-native filesystem
 * @param cache_path Cache directory path
 * @return 1 if successful, 0 if failed
 */
EMSCRIPTEN_KEEPALIVE
int yaml_init_filesystem(const char* cache_path);

/**
 * Load YAML schema from URL
 * @param url Schema URL
 * @param schema_id Schema identifier
 * @return 1 if loading initiated, 0 if failed
 */
EMSCRIPTEN_KEEPALIVE
int yaml_load_schema_from_url(const char* url, const char* schema_id);

/**
 * Load YAML template from URL
 * @param url Template URL
 * @param template_id Template identifier
 * @return 1 if loading initiated, 0 if failed
 */
EMSCRIPTEN_KEEPALIVE
int yaml_load_template_from_url(const char* url, const char* template_id);

/**
 * Load YAML package from URL
 * @param url Package URL
 * @param package_name Package name
 * @return 1 if loading initiated, 0 if failed
 */
EMSCRIPTEN_KEEPALIVE
int yaml_load_package_from_url(const char* url, const char* package_name);

/**
 * Check if persistent storage is available
 * @return 1 if available, 0 if not
 */
EMSCRIPTEN_KEEPALIVE
int yaml_has_persistent_storage();

/**
 * Get resource loading status
 * @param resource_id Resource identifier
 * @return 1 if loaded, 0 if not loaded, -1 if not found
 */
EMSCRIPTEN_KEEPALIVE
int yaml_get_resource_status(const char* resource_id);

/**
 * Clear resource cache
 * @param resource_type Resource type (0=all, 1=schema, 2=template, etc.)
 * @return 1 if successful, 0 if failed
 */
EMSCRIPTEN_KEEPALIVE
int yaml_clear_cache(int resource_type);

/**
 * Get cache statistics
 * @param stats_buffer Buffer for statistics JSON string
 * @param buffer_size Buffer size
 * @return Length of statistics string, or 0 on error
 */
EMSCRIPTEN_KEEPALIVE
int yaml_get_cache_stats(char* stats_buffer, size_t buffer_size);

// Callback functions (called from JavaScript)
EMSCRIPTEN_KEEPALIVE
void yaml_set_persistent_storage(int available);

EMSCRIPTEN_KEEPALIVE
void yaml_async_load_complete(int success, const char* path);

EMSCRIPTEN_KEEPALIVE
void yaml_package_load_complete(int success, const char* package_name);

} // extern "C"

// Helper macros for conditional WASM-native usage
#if YAML_CPP_ENABLE_WASM_NATIVE
#define YAML_WASM_NATIVE_AVAILABLE() true
#define YAML_INIT_FILESYSTEM(path) yaml_init_filesystem(path)
#define YAML_LOAD_SCHEMA_URL(url, id) yaml_load_schema_from_url(url, id)
#define YAML_LOAD_TEMPLATE_URL(url, id) yaml_load_template_from_url(url, id)
#define YAML_LOAD_PACKAGE_URL(url, name) yaml_load_package_from_url(url, name)
#else
#define YAML_WASM_NATIVE_AVAILABLE() false
#define YAML_INIT_FILESYSTEM(path) 0
#define YAML_LOAD_SCHEMA_URL(url, id) 0
#define YAML_LOAD_TEMPLATE_URL(url, id) 0
#define YAML_LOAD_PACKAGE_URL(url, name) 0
#endif
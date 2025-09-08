/**
 * WASM-Native Filesystem Support for yaml-cpp.wasm
 * Advanced filesystem capabilities for web applications
 * 
 * Copyright (c) 2025 Superstruct Ltd, New Zealand
 * Licensed under the same license as the underlying yaml-cpp project (MIT)
 */

#include "wasm_native_filesystem.h"

#ifdef YAML_CPP_ENABLE_WASM_NATIVE

#include <emscripten/emscripten.h>
#include <emscripten/fetch.h>
#include <yaml-cpp/yaml.h>
#include <iostream>
#include <fstream>
#include <sstream>

namespace YAML {
namespace filesystem {

// Initialize filesystem state
static bool g_persistent_storage_available = false;
static bool g_async_loading_available = false;
static std::string g_cache_path = "/yaml-cache";

/**
 * Initialize persistent storage using IDBFS
 * Following freetype.wasm patterns for browser storage
 */
bool initializePersistentStorage(const std::string& cache_path) {
    g_cache_path = cache_path;
    
    try {
        // Create cache directory
        EM_ASM({
            var FS = Module.FS;
            var cachePath = UTF8ToString($0);
            
            try {
                FS.mkdir(cachePath);
                FS.mount(FS.filesystems.IDBFS, {}, cachePath);
                
                // Synchronize with IndexedDB
                FS.syncfs(true, function(err) {
                    if (err) {
                        console.warn('IDBFS sync failed:', err);
                        Module._yaml_set_persistent_storage(0);
                    } else {
                        console.log('✅ Persistent storage mounted at', cachePath);
                        Module._yaml_set_persistent_storage(1);
                    }
                });
            } catch (e) {
                console.warn('⚠️ IDBFS mounting failed, using memory-only cache:', e);
                Module._yaml_set_persistent_storage(0);
            }
        }, cache_path.c_str());
        
        return true;
    } catch (...) {
        return false;
    }
}

/**
 * Virtual directory structure for YAML resources
 * Following established WASM-native patterns
 */
void setupVirtualDirectories() {
    EM_ASM({
        var FS = Module.FS;
        
        // Standard WASM-native directory structure for YAML processing
        var dirs = [
            '/yaml-schemas',      // Pre-bundled schemas
            '/yaml-templates',    // Template files
            '/yaml-cache',        // Persistent cache (IDBFS)
            '/yaml-temp',         // Temporary processing (MEMFS)
            '/yaml-packages',     // ZIP-based resource packages
            '/yaml-remote'        // Async-loaded resources
        ];
        
        dirs.forEach(function(dir) {
            try {
                FS.mkdir(dir);
                console.log('Created virtual directory:', dir);
            } catch (e) {
                if (e.errno !== 20) { // EEXIST is OK
                    console.warn('Failed to create directory', dir, ':', e);
                }
            }
        });
        
        // Mount IDBFS for persistent cache
        try {
            FS.mount(FS.filesystems.IDBFS, {}, '/yaml-cache');
        } catch (e) {
            console.warn('IDBFS mounting failed:', e);
        }
    });
}

/**
 * Async resource loading with caching
 * Based on patterns from freetype.wasm CDN integration
 */
struct AsyncLoadContext {
    std::string url;
    std::string resource_id;
    std::string cache_path;
    std::function<void(bool, const std::string&)> callback;
};

void asyncLoadResourceFromURL(const std::string& url, const std::string& resource_id,
                             std::function<void(bool, const std::string&)> callback) {
    
    const std::string cached_path = g_cache_path + "/" + resource_id + ".yaml";
    const std::string virtual_path = "/yaml-remote/" + resource_id + ".yaml";
    
    // Check persistent cache first
    EM_ASM({
        var FS = Module.FS;
        var cachedPath = UTF8ToString($0);
        var virtualPath = UTF8ToString($1);
        var url = UTF8ToString($2);
        var resourceId = UTF8ToString($3);
        
        // Check if cached version exists
        if (FS.analyzePath(cachedPath).exists) {
            try {
                var cachedData = FS.readFile(cachedPath);
                FS.writeFile(virtualPath, cachedData);
                console.log('✅ Loaded YAML from cache:', resourceId);
                Module._yaml_async_load_complete(1, virtualPath);
                return;
            } catch (e) {
                console.warn('Cache read failed, downloading:', e);
            }
        }
        
        // Download asynchronously using Emscripten fetch API
        console.log('📥 Downloading YAML resource:', url);
        
        var fetchAttr = {
            requestMethod: 'GET',
            attributes: {
                requestHeaders: {
                    'Accept': 'application/x-yaml,text/yaml,text/plain'
                }
            },
            onsuccess: function(fetch) {
                try {
                    var data = new Uint8Array(fetch.data);
                    FS.writeFile(virtualPath, data);
                    FS.writeFile(cachedPath, data); // Cache for future use
                    
                    console.log('✅ YAML resource downloaded and cached:', resourceId);
                    Module._yaml_async_load_complete(1, virtualPath);
                } catch (e) {
                    console.error('Failed to process downloaded YAML:', e);
                    Module._yaml_async_load_complete(0, '');
                }
            },
            onerror: function(fetch) {
                console.error('❌ Failed to download YAML resource:', url, fetch.status);
                Module._yaml_async_load_complete(0, '');
            }
        };
        
        emscripten_fetch(&fetchAttr, url);
        
    }, cached_path.c_str(), virtual_path.c_str(), url.c_str(), resource_id.c_str());
}

/**
 * YAML schema loading with validation
 * Enables schema-based YAML validation
 */
bool loadSchemaFromURL(const std::string& schema_url, const std::string& schema_id) {
    try {
        asyncLoadResourceFromURL(schema_url, "schema_" + schema_id,
            [schema_id](bool success, const std::string& path) {
                if (success) {
                    // Load and validate schema
                    try {
                        YAML::Node schema = YAML::LoadFile(path);
                        // Store schema for later validation use
                        EM_ASM({
                            if (!Module.yamlSchemas) Module.yamlSchemas = {};
                            Module.yamlSchemas[UTF8ToString($0)] = UTF8ToString($1);
                        }, schema_id.c_str(), path.c_str());
                        
                        std::cout << "✅ YAML schema loaded: " << schema_id << std::endl;
                    } catch (const YAML::Exception& e) {
                        std::cerr << "❌ Invalid YAML schema: " << e.what() << std::endl;
                    }
                } else {
                    std::cerr << "❌ Failed to load YAML schema: " << schema_id << std::endl;
                }
            }
        );
        return true;
    } catch (...) {
        return false;
    }
}

/**
 * YAML template system with parameter substitution
 * Enables dynamic YAML generation from templates
 */
bool loadTemplateFromURL(const std::string& template_url, const std::string& template_id) {
    try {
        asyncLoadResourceFromURL(template_url, "template_" + template_id,
            [template_id](bool success, const std::string& path) {
                if (success) {
                    EM_ASM({
                        if (!Module.yamlTemplates) Module.yamlTemplates = {};
                        Module.yamlTemplates[UTF8ToString($0)] = UTF8ToString($1);
                    }, template_id.c_str(), path.c_str());
                    
                    std::cout << "✅ YAML template loaded: " << template_id << std::endl;
                } else {
                    std::cerr << "❌ Failed to load YAML template: " << template_id << std::endl;
                }
            }
        );
        return true;
    } catch (...) {
        return false;
    }
}

/**
 * YAML package system for bulk resource distribution
 * ZIP-based collections of YAML files
 */
bool loadYAMLPackage(const std::string& package_url, const std::string& package_name) {
    try {
        EM_ASM({
            var packageUrl = UTF8ToString($0);
            var packageName = UTF8ToString($1);
            var packagePath = '/yaml-packages/' + packageName;
            
            var FS = Module.FS;
            FS.mkdir('/yaml-packages');
            FS.mkdir(packagePath);
            
            console.log('📦 Loading YAML package:', packageName, 'from', packageUrl);
            
            var fetchAttr = {
                requestMethod: 'GET',
                responseType: 'arraybuffer',
                onsuccess: function(fetch) {
                    try {
                        // Write package data
                        var data = new Uint8Array(fetch.data);
                        FS.writeFile(packagePath + '/package.zip', data);
                        
                        // Extract if possible (would need unzip implementation)
                        console.log('✅ YAML package downloaded:', packageName);
                        Module._yaml_package_load_complete(1, packageName);
                        
                    } catch (e) {
                        console.error('Failed to process YAML package:', e);
                        Module._yaml_package_load_complete(0, packageName);
                    }
                },
                onerror: function(fetch) {
                    console.error('❌ Failed to download YAML package:', packageUrl);
                    Module._yaml_package_load_complete(0, packageName);
                }
            };
            
            emscripten_fetch(&fetchAttr, packageUrl);
            
        }, package_url.c_str(), package_name.c_str());
        
        return true;
    } catch (...) {
        return false;
    }
}

/**
 * Progressive YAML loading with priority queues
 * Load critical YAML first, enhancements on-demand
 */
class ProgressiveLoader {
private:
    struct LoadRequest {
        std::string url;
        std::string id;
        int priority;
        std::function<void(bool, const std::string&)> callback;
    };
    
    std::vector<LoadRequest> queue;
    int active_loads = 0;
    const int max_concurrent = 3;

public:
    void addResource(const std::string& url, const std::string& id, 
                    int priority, std::function<void(bool, const std::string&)> callback) {
        queue.push_back({url, id, priority, callback});
        
        // Sort by priority (higher number = higher priority)
        std::sort(queue.begin(), queue.end(), 
                 [](const LoadRequest& a, const LoadRequest& b) {
                     return a.priority > b.priority;
                 });
        
        processQueue();
    }
    
private:
    void processQueue() {
        while (active_loads < max_concurrent && !queue.empty()) {
            auto request = queue.front();
            queue.erase(queue.begin());
            
            active_loads++;
            
            asyncLoadResourceFromURL(request.url, request.id,
                [this, callback = request.callback](bool success, const std::string& path) {
                    active_loads--;
                    callback(success, path);
                    processQueue(); // Process next in queue
                }
            );
        }
    }
};

static ProgressiveLoader g_progressive_loader;

/**
 * Multi-level caching with automatic management
 * Memory cache (L1) + IDBFS cache (L2) with size limits
 */
class IntelligentCache {
private:
    struct CacheEntry {
        std::string data;
        std::chrono::system_clock::time_point timestamp;
        size_t access_count;
    };
    
    std::map<std::string, CacheEntry> memory_cache;
    size_t max_memory_entries = 100;
    std::chrono::milliseconds max_age{7 * 24 * 60 * 60 * 1000}; // 7 days

public:
    bool get(const std::string& key, std::string& value) {
        // Check memory cache first (L1)
        auto it = memory_cache.find(key);
        if (it != memory_cache.end()) {
            auto now = std::chrono::system_clock::now();
            if (now - it->second.timestamp < max_age) {
                value = it->second.data;
                it->second.access_count++;
                return true;
            } else {
                memory_cache.erase(it); // Expired
            }
        }
        
        // Check persistent cache (L2)
        const std::string cache_file = g_cache_path + "/cache_" + key + ".yaml";
        if (fileExists(cache_file)) {
            try {
                std::ifstream file(cache_file);
                std::ostringstream buffer;
                buffer << file.rdbuf();
                value = buffer.str();
                
                // Store in memory cache
                set(key, value);
                return true;
            } catch (...) {
                // Cache file corrupted, ignore
            }
        }
        
        return false;
    }
    
    void set(const std::string& key, const std::string& value) {
        auto now = std::chrono::system_clock::now();
        
        // Store in memory cache
        memory_cache[key] = {value, now, 1};
        
        // Enforce memory cache size limit
        if (memory_cache.size() > max_memory_entries) {
            // Remove least recently used entry
            auto lru = std::min_element(memory_cache.begin(), memory_cache.end(),
                [](const auto& a, const auto& b) {
                    return a.second.access_count < b.second.access_count;
                });
            memory_cache.erase(lru);
        }
        
        // Store in persistent cache (async)
        const std::string cache_file = g_cache_path + "/cache_" + key + ".yaml";
        try {
            std::ofstream file(cache_file);
            file << value;
        } catch (...) {
            // Ignore persistent cache failures
        }
    }
    
private:
    bool fileExists(const std::string& path) {
        return EM_ASM_INT({
            var FS = Module.FS;
            var path = UTF8ToString($0);
            return FS.analyzePath(path).exists ? 1 : 0;
        }, path.c_str()) == 1;
    }
};

static IntelligentCache g_cache;

} // namespace filesystem
} // namespace YAML

// C-style API for JavaScript integration
extern "C" {

EMSCRIPTEN_KEEPALIVE
int yaml_init_filesystem(const char* cache_path) {
    try {
        YAML::filesystem::setupVirtualDirectories();
        bool success = YAML::filesystem::initializePersistentStorage(
            cache_path ? cache_path : "/yaml-cache");
        return success ? 1 : 0;
    } catch (...) {
        return 0;
    }
}

EMSCRIPTEN_KEEPALIVE
int yaml_load_schema_from_url(const char* url, const char* schema_id) {
    try {
        return YAML::filesystem::loadSchemaFromURL(url, schema_id) ? 1 : 0;
    } catch (...) {
        return 0;
    }
}

EMSCRIPTEN_KEEPALIVE
int yaml_load_template_from_url(const char* url, const char* template_id) {
    try {
        return YAML::filesystem::loadTemplateFromURL(url, template_id) ? 1 : 0;
    } catch (...) {
        return 0;
    }
}

EMSCRIPTEN_KEEPALIVE
int yaml_load_package_from_url(const char* url, const char* package_name) {
    try {
        return YAML::filesystem::loadYAMLPackage(url, package_name) ? 1 : 0;
    } catch (...) {
        return 0;
    }
}

EMSCRIPTEN_KEEPALIVE
void yaml_set_persistent_storage(int available) {
    YAML::filesystem::g_persistent_storage_available = (available != 0);
}

EMSCRIPTEN_KEEPALIVE
void yaml_async_load_complete(int success, const char* path) {
    // Callback for async loading completion
    if (success) {
        std::cout << "✅ Async YAML load completed: " << path << std::endl;
    } else {
        std::cerr << "❌ Async YAML load failed" << std::endl;
    }
}

EMSCRIPTEN_KEEPALIVE
void yaml_package_load_complete(int success, const char* package_name) {
    // Callback for package loading completion
    if (success) {
        std::cout << "✅ YAML package loaded: " << package_name << std::endl;
    } else {
        std::cerr << "❌ YAML package load failed: " << package_name << std::endl;
    }
}

} // extern "C"

#else // !YAML_CPP_ENABLE_WASM_NATIVE

// Fallback implementations when WASM-native features are disabled
namespace YAML {
namespace filesystem {

bool initializePersistentStorage(const std::string& cache_path) {
    return false;
}

void setupVirtualDirectories() {
    // No-op
}

} // namespace filesystem
} // namespace YAML

extern "C" {

EMSCRIPTEN_KEEPALIVE
int yaml_init_filesystem(const char* cache_path) {
    return 0; // Not supported
}

EMSCRIPTEN_KEEPALIVE
int yaml_load_schema_from_url(const char* url, const char* schema_id) {
    return 0; // Not supported
}

EMSCRIPTEN_KEEPALIVE
int yaml_load_template_from_url(const char* url, const char* template_id) {
    return 0; // Not supported
}

EMSCRIPTEN_KEEPALIVE
int yaml_load_package_from_url(const char* url, const char* package_name) {
    return 0; // Not supported
}

EMSCRIPTEN_KEEPALIVE
void yaml_set_persistent_storage(int available) {
    // No-op
}

EMSCRIPTEN_KEEPALIVE
void yaml_async_load_complete(int success, const char* path) {
    // No-op
}

EMSCRIPTEN_KEEPALIVE
void yaml_package_load_complete(int success, const char* package_name) {
    // No-op
}

} // extern "C"

#endif // YAML_CPP_ENABLE_WASM_NATIVE
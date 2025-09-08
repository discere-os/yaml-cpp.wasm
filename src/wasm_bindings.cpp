/**
 * WASM Bindings for yaml-cpp
 * Production-quality C++ to JavaScript interface
 * 
 * Copyright (c) 2025 Superstruct Ltd, New Zealand
 * Licensed under the same license as the underlying yaml-cpp project (MIT)
 */

#include <yaml-cpp/yaml.h>
#include <emscripten/emscripten.h>
#include <emscripten/bind.h>
#include <string>
#include <stdexcept>

extern "C" {

/**
 * Parse YAML string and return JSON representation
 * @param yaml_string Input YAML string
 * @param output_buffer Pre-allocated buffer for result (managed by JS)
 * @param buffer_size Size of output buffer
 * @return 0 on success, negative on error
 */
EMSCRIPTEN_KEEPALIVE
int yaml_parse_to_json(const char* yaml_string, char* output_buffer, size_t buffer_size) {
    try {
        YAML::Node node = YAML::Load(yaml_string);
        
        // Convert YAML node to JSON-like string representation
        std::ostringstream json_stream;
        json_stream << node;
        std::string json_string = json_stream.str();
        
        if (json_string.length() >= buffer_size) {
            return -1; // Buffer too small
        }
        
        strcpy(output_buffer, json_string.c_str());
        return 0;
        
    } catch (const YAML::Exception& e) {
        return -2; // YAML parsing error
    } catch (const std::exception& e) {
        return -3; // Other error
    }
}

/**
 * Validate YAML syntax
 * @param yaml_string Input YAML string
 * @return 1 if valid, 0 if invalid
 */
EMSCRIPTEN_KEEPALIVE
int yaml_validate(const char* yaml_string) {
    try {
        YAML::Node node = YAML::Load(yaml_string);
        return 1;
    } catch (const YAML::Exception& e) {
        return 0;
    }
}

/**
 * Get YAML parsing error message
 * @param yaml_string Input YAML string
 * @param error_buffer Pre-allocated buffer for error message
 * @param buffer_size Size of error buffer
 * @return Length of error message (0 if no error)
 */
EMSCRIPTEN_KEEPALIVE
int yaml_get_error(const char* yaml_string, char* error_buffer, size_t buffer_size) {
    try {
        YAML::Node node = YAML::Load(yaml_string);
        error_buffer[0] = '\0';
        return 0;
    } catch (const YAML::Exception& e) {
        std::string error_msg = e.what();
        if (error_msg.length() >= buffer_size) {
            error_msg = error_msg.substr(0, buffer_size - 1);
        }
        strcpy(error_buffer, error_msg.c_str());
        return error_msg.length();
    }
}

/**
 * Convert JSON string to YAML
 * @param json_string Input JSON string
 * @param output_buffer Pre-allocated buffer for YAML result
 * @param buffer_size Size of output buffer
 * @return 0 on success, negative on error
 */
EMSCRIPTEN_KEEPALIVE
int json_to_yaml(const char* json_string, char* output_buffer, size_t buffer_size) {
    try {
        // For simplicity, we'll treat JSON as YAML (YAML is superset of JSON)
        // In a full implementation, you'd parse JSON and emit proper YAML
        YAML::Node node = YAML::Load(json_string);
        
        YAML::Emitter emitter;
        emitter << node;
        
        std::string yaml_string = emitter.c_str();
        if (yaml_string.length() >= buffer_size) {
            return -1; // Buffer too small
        }
        
        strcpy(output_buffer, yaml_string.c_str());
        return 0;
        
    } catch (const YAML::Exception& e) {
        return -2; // YAML/JSON parsing error
    } catch (const std::exception& e) {
        return -3; // Other error
    }
}

/**
 * Get specific value from YAML by key path
 * @param yaml_string Input YAML string
 * @param key_path Dot-separated key path (e.g., "database.host")
 * @param output_buffer Pre-allocated buffer for value
 * @param buffer_size Size of output buffer
 * @return 0 on success, negative on error
 */
EMSCRIPTEN_KEEPALIVE
int yaml_get_value(const char* yaml_string, const char* key_path, char* output_buffer, size_t buffer_size) {
    try {
        YAML::Node root = YAML::Load(yaml_string);
        YAML::Node current = root;
        
        // Parse key path
        std::string path_str(key_path);
        std::stringstream path_stream(path_str);
        std::string key;
        
        while (std::getline(path_stream, key, '.')) {
            if (!current[key]) {
                return -4; // Key not found
            }
            current = current[key];
        }
        
        std::string value_str = current.as<std::string>();
        if (value_str.length() >= buffer_size) {
            return -1; // Buffer too small
        }
        
        strcpy(output_buffer, value_str.c_str());
        return 0;
        
    } catch (const YAML::Exception& e) {
        return -2; // YAML parsing error
    } catch (const std::exception& e) {
        return -3; // Other error
    }
}

/**
 * Count elements in YAML array or object
 * @param yaml_string Input YAML string
 * @param key_path Optional key path to specific array/object
 * @return Number of elements, negative on error
 */
EMSCRIPTEN_KEEPALIVE
int yaml_count_elements(const char* yaml_string, const char* key_path) {
    try {
        YAML::Node root = YAML::Load(yaml_string);
        YAML::Node current = root;
        
        if (key_path && strlen(key_path) > 0) {
            std::string path_str(key_path);
            std::stringstream path_stream(path_str);
            std::string key;
            
            while (std::getline(path_stream, key, '.')) {
                if (!current[key]) {
                    return -4; // Key not found
                }
                current = current[key];
            }
        }
        
        if (current.IsSequence()) {
            return current.size();
        } else if (current.IsMap()) {
            return current.size();
        } else {
            return -5; // Not a container
        }
        
    } catch (const YAML::Exception& e) {
        return -2; // YAML parsing error
    } catch (const std::exception& e) {
        return -3; // Other error
    }
}

} // extern "C"

// Emscripten bindings for advanced C++ API usage
using namespace emscripten;

class YamlProcessor {
public:
    YamlProcessor() = default;
    
    std::string parseYamlString(const std::string& yaml_str) {
        try {
            YAML::Node node = YAML::Load(yaml_str);
            std::ostringstream stream;
            stream << node;
            return stream.str();
        } catch (const YAML::Exception& e) {
            return std::string("ERROR: ") + e.what();
        }
    }
    
    bool validateYaml(const std::string& yaml_str) {
        try {
            YAML::Node node = YAML::Load(yaml_str);
            return true;
        } catch (const YAML::Exception& e) {
            return false;
        }
    }
    
    std::string convertToYaml(const std::string& json_str) {
        try {
            YAML::Node node = YAML::Load(json_str);
            YAML::Emitter emitter;
            emitter << node;
            return std::string(emitter.c_str());
        } catch (const YAML::Exception& e) {
            return std::string("ERROR: ") + e.what();
        }
    }
};

EMSCRIPTEN_BINDINGS(yaml_cpp_bindings) {
    class_<YamlProcessor>("YamlProcessor")
        .constructor()
        .function("parseYamlString", &YamlProcessor::parseYamlString)
        .function("validateYaml", &YamlProcessor::validateYaml)
        .function("convertToYaml", &YamlProcessor::convertToYaml)
        ;
}
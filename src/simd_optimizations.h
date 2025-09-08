/**
 * SIMD Optimizations for yaml-cpp.wasm
 * String processing and parsing acceleration using WebAssembly SIMD
 * 
 * Copyright (c) 2025 Superstruct Ltd, New Zealand
 * Licensed under the same license as the underlying yaml-cpp project (MIT)
 */

#pragma once

#include <cstddef>
#include <cstdint>

// Enable SIMD optimizations if requested and supported
#if defined(ENABLE_SIMD) && defined(__wasm_simd128__)
#define YAML_CPP_ENABLE_SIMD 1
#include <wasm_simd128.h>
#else
#define YAML_CPP_ENABLE_SIMD 0
#endif

namespace YAML {
namespace simd {

/**
 * SIMD-accelerated character classification functions
 * These provide 2-4x speedup for common string processing operations
 */

/**
 * Fast whitespace detection using SIMD
 * @param str Input string
 * @param len Length of string
 * @param first_non_whitespace Output: position of first non-whitespace char
 * @return true if entire string is whitespace
 */
bool is_whitespace_simd(const char* str, size_t len, size_t* first_non_whitespace = nullptr);

/**
 * SIMD-accelerated numeric string validation
 * @param str Input string
 * @param len Length of string
 * @return true if string represents a valid number
 */
bool is_numeric_simd(const char* str, size_t len);

/**
 * Fast character search using SIMD
 * @param str Input string
 * @param len Length of string
 * @param target Character to find
 * @return Position of first occurrence, or len if not found
 */
size_t find_special_char_simd(const char* str, size_t len, char target);

/**
 * SIMD-optimized memory comparison
 * @param a First string
 * @param b Second string
 * @param len Length to compare
 * @return 0 if equal, negative if a < b, positive if a > b
 */
int memcmp_simd(const char* a, const char* b, size_t len);

/**
 * SIMD-accelerated string copying with UTF-8 validation
 * @param dest Destination buffer
 * @param src Source string
 * @param len Length to copy
 * @return true if copy succeeded and UTF-8 is valid
 */
bool strcopy_validate_utf8_simd(char* dest, const char* src, size_t len);

/**
 * SIMD-optimized hash function for string keys
 * @param str Input string
 * @param len Length of string
 * @return 32-bit hash value
 */
uint32_t hash_string_simd(const char* str, size_t len);

/**
 * SIMD-accelerated line ending normalization
 * Converts \r\n and \r to \n
 * @param dest Destination buffer
 * @param src Source string
 * @param len Source length
 * @return Length of normalized string
 */
size_t normalize_line_endings_simd(char* dest, const char* src, size_t len);

/**
 * Performance benchmark functions for SIMD operations
 */
#ifdef YAML_CPP_ENABLE_SIMD

/**
 * Benchmark SIMD vs scalar performance for string operations
 * @param iterations Number of test iterations
 * @return Performance improvement ratio (SIMD vs scalar)
 */
double benchmark_simd_performance(size_t iterations = 10000);

/**
 * Validate SIMD implementations against scalar equivalents
 * @return true if all SIMD implementations produce correct results
 */
bool validate_simd_implementations();

#endif // YAML_CPP_ENABLE_SIMD

/**
 * Helper macros for conditional SIMD usage
 */
#if YAML_CPP_ENABLE_SIMD
#define YAML_SIMD_AVAILABLE() true
#define YAML_SIMD_MEMCMP(a, b, len) simd::memcmp_simd(a, b, len)
#define YAML_SIMD_FIND_CHAR(str, len, c) simd::find_special_char_simd(str, len, c)
#define YAML_SIMD_IS_NUMERIC(str, len) simd::is_numeric_simd(str, len)
#define YAML_SIMD_HASH_STRING(str, len) simd::hash_string_simd(str, len)
#else
#define YAML_SIMD_AVAILABLE() false
#define YAML_SIMD_MEMCMP(a, b, len) std::memcmp(a, b, len)
#define YAML_SIMD_FIND_CHAR(str, len, c) simd::find_special_char_simd(str, len, c)
#define YAML_SIMD_IS_NUMERIC(str, len) simd::is_numeric_simd(str, len)
#define YAML_SIMD_HASH_STRING(str, len) simd::hash_string_simd(str, len)
#endif

} // namespace simd
} // namespace YAML

// Optional integration with yaml-cpp internals
#ifdef YAML_CPP_SIMD_INTEGRATION

// Include yaml-cpp headers for integration
#include <yaml-cpp/yaml.h>

namespace YAML {
namespace simd {

/**
 * SIMD-optimized YAML-specific functions
 */

/**
 * Fast YAML key comparison for map lookups
 * @param key1 First key
 * @param key2 Second key
 * @return true if keys are equal
 */
bool compare_yaml_keys_simd(const std::string& key1, const std::string& key2);

/**
 * SIMD-accelerated YAML value type detection
 * @param value String representation of value
 * @return Detected NodeType
 */
NodeType::value detect_value_type_simd(const std::string& value);

/**
 * Fast YAML escape sequence processing
 * @param input Input string with escape sequences
 * @param output Output buffer for processed string
 * @param max_output_len Maximum output buffer length
 * @return Length of processed string, or 0 on error
 */
size_t process_escape_sequences_simd(const char* input, size_t input_len, 
                                    char* output, size_t max_output_len);

} // namespace simd
} // namespace YAML

#endif // YAML_CPP_SIMD_INTEGRATION
#!/bin/bash
# Production WASM Build Script for yaml-cpp.wasm
# High-performance YAML parsing and emitting for WebAssembly
#
# Copyright (c) 2025 Superstruct Ltd, New Zealand
# Licensed under the same license as the underlying yaml-cpp project (MIT)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Building yaml-cpp.wasm${NC}"
echo "======================================================"

# Check for required tools
if ! command -v emcc &> /dev/null; then
    echo -e "${RED}❌ emcc not found. Please install and activate Emscripten SDK.${NC}"
    exit 1
fi

if ! command -v cmake &> /dev/null; then
    echo -e "${RED}❌ cmake not found. Please install CMake.${NC}"
    exit 1
fi

# Configuration
BUILD_TYPE=${BUILD_TYPE:-Release}
ENABLE_SIMD=${ENABLE_SIMD:-OFF}
ENABLE_WASM_NATIVE=${ENABLE_WASM_NATIVE:-OFF}
BUILD_DIR="build-wasm-${BUILD_TYPE,,}"
DIST_DIR="dist"

echo -e "${BLUE}Configuration:${NC}"
echo "  Build Type: ${BUILD_TYPE}"
echo "  Enable SIMD: ${ENABLE_SIMD}"
echo "  Enable WASM-Native: ${ENABLE_WASM_NATIVE}"
echo "  Build Directory: ${BUILD_DIR}"

# Clean previous builds
if [ -d "${BUILD_DIR}" ]; then
    echo -e "${YELLOW}🧹 Cleaning previous build...${NC}"
    rm -rf "${BUILD_DIR}"
fi

if [ -d "${DIST_DIR}" ]; then
    echo -e "${YELLOW}🧹 Cleaning previous distribution...${NC}"
    rm -rf "${DIST_DIR}"
fi

# Create build directory
mkdir -p "${BUILD_DIR}"
mkdir -p "${DIST_DIR}"

echo -e "${BLUE}📁 Created build directories${NC}"

# Configure CMake
echo -e "${BLUE}⚙️  Configuring CMake...${NC}"

cd "${BUILD_DIR}"

# Set CMake variables
CMAKE_ARGS=(
    "-DCMAKE_BUILD_TYPE=${BUILD_TYPE}"
    "-DCMAKE_TOOLCHAIN_FILE=${EMSDK}/upstream/emscripten/cmake/Modules/Platform/Emscripten.cmake"
    "-DYAML_BUILD_SHARED_LIBS=OFF"
    "-DYAML_CPP_BUILD_CONTRIB=ON"
    "-DYAML_CPP_BUILD_TOOLS=OFF"
    "-DYAML_CPP_BUILD_TESTS=ON"
    "-DYAML_CPP_INSTALL=ON"
    "-DECOSYSTEM_TIER=2"
)

# Add optional features
if [ "${ENABLE_SIMD}" = "ON" ]; then
    CMAKE_ARGS+=("-DENABLE_SIMD=ON")
    echo -e "${GREEN}✅ SIMD optimization enabled${NC}"
fi

if [ "${ENABLE_WASM_NATIVE}" = "ON" ]; then
    CMAKE_ARGS+=("-DENABLE_WASM_NATIVE=ON")
    echo -e "${GREEN}✅ WASM-native features enabled${NC}"
fi

# Run CMake configuration
emcmake cmake "${CMAKE_ARGS[@]}" -f ../CMakeLists.wasm.txt .. || {
    echo -e "${RED}❌ CMake configuration failed${NC}"
    exit 1
}

echo -e "${GREEN}✅ CMake configuration completed${NC}"

# Build
echo -e "${BLUE}🔨 Building yaml-cpp.wasm...${NC}"

emmake make -j$(nproc) || {
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
}

echo -e "${GREEN}✅ Build completed${NC}"

# Alternative direct emcc build for comparison
echo -e "${BLUE}🔧 Creating direct emcc build...${NC}"

EMCC_ARGS=(
    # Source files
    ../src/*.cpp
    ../src/contrib/*.cpp
    ../src/wasm_bindings.cpp
    
    # Include directories
    -I../include
    -I../src
    
    # Output
    -o yaml-cpp-direct.js
    
    # Memory Configuration
    -s INITIAL_MEMORY=64MB
    -s MAXIMUM_MEMORY=512MB
    -s ALLOW_MEMORY_GROWTH=1
    -s STACK_SIZE=5MB
    
    # Base WASM Configuration
    -s WASM=1
    -s MODULARIZE=1
    -s EXPORT_ES6=1
    -s USE_ES6_IMPORT_META=0
    -s ENVIRONMENT=web,webview,worker,node
    
    # Performance
    -O3
    -flto
    --closure 1
    -s ASSERTIONS=0
    
    # JavaScript Integration
    -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","HEAPU8","UTF8ToString","stringToUTF8"]'
    -s EXPORTED_FUNCTIONS='["_malloc","_free","_yaml_parse_to_json","_yaml_validate","_yaml_get_error","_json_to_yaml","_yaml_get_value","_yaml_count_elements"]'
    
    # C++ Standard
    -std=c++17
)

# Add SIMD if enabled
if [ "${ENABLE_SIMD}" = "ON" ]; then
    EMCC_ARGS+=(-msimd128)
    echo -e "${GREEN}✅ Added SIMD support to direct build${NC}"
fi

# Add WASM-native features if enabled
if [ "${ENABLE_WASM_NATIVE}" = "ON" ]; then
    EMCC_ARGS+=(
        -s ASYNCIFY=1
        -s FORCE_FILESYSTEM=1
        -lidbfs.js
    )
    echo -e "${GREEN}✅ Added WASM-native features to direct build${NC}"
fi

# Execute direct build
emcc "${EMCC_ARGS[@]}" || {
    echo -e "${RED}❌ Direct emcc build failed${NC}"
    exit 1
}

echo -e "${GREEN}✅ Direct emcc build completed${NC}"

# Copy artifacts to distribution directory
cd ..
echo -e "${BLUE}📦 Copying artifacts to ${DIST_DIR}...${NC}"

# Copy WASM and JS files
cp "${BUILD_DIR}"/*.wasm "${DIST_DIR}/" 2>/dev/null || true
cp "${BUILD_DIR}"/*.js "${DIST_DIR}/" 2>/dev/null || true

# Copy direct build artifacts
cp "${BUILD_DIR}"/yaml-cpp-direct.wasm "${DIST_DIR}/" 2>/dev/null || true
cp "${BUILD_DIR}"/yaml-cpp-direct.js "${DIST_DIR}/" 2>/dev/null || true

# Copy headers for integration
cp -r include/yaml-cpp "${DIST_DIR}/" 2>/dev/null || true

echo -e "${GREEN}✅ Artifacts copied${NC}"

# Generate file sizes report
echo -e "${BLUE}📊 Build Report:${NC}"
echo "======================================================"

if [ -d "${DIST_DIR}" ]; then
    for file in "${DIST_DIR}"/*.wasm "${DIST_DIR}"/*.js; do
        if [ -f "$file" ]; then
            size=$(ls -lh "$file" | awk '{print $5}')
            echo "  $(basename "$file"): $size"
        fi
    done
fi

echo "======================================================"

# Generate JavaScript wrapper with TypeScript definitions
echo -e "${BLUE}📝 Generating JavaScript wrapper...${NC}"

cat > "${DIST_DIR}/yaml-cpp.mjs" << 'EOF'
/**
 * yaml-cpp.wasm - JavaScript Wrapper
 * Production-quality YAML processing for WebAssembly
 */

let Module = null;
let modulePromise = null;

/**
 * Initialize yaml-cpp WASM module
 * @returns {Promise<Object>} Initialized module
 */
export async function init() {
    if (Module) return Module;
    
    if (!modulePromise) {
        // Try to load the available build
        modulePromise = (async () => {
            try {
                const yamlCppModule = await import('./yaml-cpp-direct.js');
                Module = await yamlCppModule.default();
                return Module;
            } catch (e) {
                console.warn('Direct build not available, trying CMake build');
                const yamlCppModule = await import('./yaml-cpp.wasm.js');
                Module = await yamlCppModule.default();
                return Module;
            }
        })();
    }
    
    return modulePromise;
}

/**
 * Parse YAML string to JavaScript object
 * @param {string} yamlString - YAML string to parse
 * @returns {Object} Parsed JavaScript object
 */
export async function parseYAML(yamlString) {
    const module = await init();
    
    const bufferSize = yamlString.length * 4; // Conservative estimate
    const outputBuffer = module._malloc(bufferSize);
    
    try {
        const yamlPtr = module.stringToUTF8OnStack(yamlString);
        const result = module._yaml_parse_to_json(yamlPtr, outputBuffer, bufferSize);
        
        if (result !== 0) {
            throw new Error(`YAML parsing failed with code: ${result}`);
        }
        
        const jsonString = module.UTF8ToString(outputBuffer);
        return JSON.parse(jsonString);
        
    } finally {
        module._free(outputBuffer);
    }
}

/**
 * Validate YAML syntax
 * @param {string} yamlString - YAML string to validate
 * @returns {boolean} True if valid YAML
 */
export async function validateYAML(yamlString) {
    const module = await init();
    const yamlPtr = module.stringToUTF8OnStack(yamlString);
    return module._yaml_validate(yamlPtr) === 1;
}

/**
 * Convert JSON object to YAML string
 * @param {Object} obj - JavaScript object to convert
 * @returns {string} YAML string representation
 */
export async function toYAML(obj) {
    const module = await init();
    
    const jsonString = JSON.stringify(obj);
    const bufferSize = jsonString.length * 4;
    const outputBuffer = module._malloc(bufferSize);
    
    try {
        const jsonPtr = module.stringToUTF8OnStack(jsonString);
        const result = module._json_to_yaml(jsonPtr, outputBuffer, bufferSize);
        
        if (result !== 0) {
            throw new Error(`JSON to YAML conversion failed with code: ${result}`);
        }
        
        return module.UTF8ToString(outputBuffer);
        
    } finally {
        module._free(outputBuffer);
    }
}

/**
 * Get value from YAML by key path
 * @param {string} yamlString - YAML string
 * @param {string} keyPath - Dot-separated key path
 * @returns {string} Value at key path
 */
export async function getValue(yamlString, keyPath) {
    const module = await init();
    
    const bufferSize = 1024; // Should be sufficient for most values
    const outputBuffer = module._malloc(bufferSize);
    
    try {
        const yamlPtr = module.stringToUTF8OnStack(yamlString);
        const keyPtr = module.stringToUTF8OnStack(keyPath);
        const result = module._yaml_get_value(yamlPtr, keyPtr, outputBuffer, bufferSize);
        
        if (result !== 0) {
            throw new Error(`Failed to get value at path "${keyPath}" with code: ${result}`);
        }
        
        return module.UTF8ToString(outputBuffer);
        
    } finally {
        module._free(outputBuffer);
    }
}

/**
 * Count elements in YAML array or object
 * @param {string} yamlString - YAML string
 * @param {string} [keyPath] - Optional key path to specific container
 * @returns {number} Number of elements
 */
export async function countElements(yamlString, keyPath = '') {
    const module = await init();
    
    const yamlPtr = module.stringToUTF8OnStack(yamlString);
    const keyPtr = keyPath ? module.stringToUTF8OnStack(keyPath) : 0;
    
    const result = module._yaml_count_elements(yamlPtr, keyPtr);
    
    if (result < 0) {
        throw new Error(`Failed to count elements with code: ${result}`);
    }
    
    return result;
}

// Default export for CommonJS compatibility
export default {
    init,
    parseYAML,
    validateYAML,
    toYAML,
    getValue,
    countElements
};
EOF

echo -e "${GREEN}✅ JavaScript wrapper generated${NC}"

# Generate TypeScript definitions
cat > "${DIST_DIR}/yaml-cpp.d.ts" << 'EOF'
/**
 * TypeScript definitions for yaml-cpp.wasm
 * High-performance YAML processing for WebAssembly
 */

/**
 * Initialize yaml-cpp WASM module
 */
export function init(): Promise<any>;

/**
 * Parse YAML string to JavaScript object
 * @param yamlString YAML string to parse
 * @returns Parsed JavaScript object
 */
export function parseYAML(yamlString: string): Promise<any>;

/**
 * Validate YAML syntax
 * @param yamlString YAML string to validate
 * @returns True if valid YAML
 */
export function validateYAML(yamlString: string): Promise<boolean>;

/**
 * Convert JavaScript object to YAML string
 * @param obj JavaScript object to convert
 * @returns YAML string representation
 */
export function toYAML(obj: any): Promise<string>;

/**
 * Get value from YAML by key path
 * @param yamlString YAML string
 * @param keyPath Dot-separated key path (e.g., "database.host")
 * @returns Value at key path
 */
export function getValue(yamlString: string, keyPath: string): Promise<string>;

/**
 * Count elements in YAML array or object
 * @param yamlString YAML string
 * @param keyPath Optional key path to specific container
 * @returns Number of elements
 */
export function countElements(yamlString: string, keyPath?: string): Promise<number>;

declare const _default: {
    init: typeof init;
    parseYAML: typeof parseYAML;
    validateYAML: typeof validateYAML;
    toYAML: typeof toYAML;
    getValue: typeof getValue;
    countElements: typeof countElements;
};

export default _default;
EOF

echo -e "${GREEN}✅ TypeScript definitions generated${NC}"

# Success message
echo ""
echo -e "${GREEN}🎉 yaml-cpp.wasm build completed successfully!${NC}"
echo ""
echo -e "${BLUE}📁 Distribution files:${NC}"
ls -la "${DIST_DIR}/"
echo ""
echo -e "${YELLOW}💡 Usage:${NC}"
echo "  import { parseYAML, validateYAML } from './dist/yaml-cpp.mjs';"
echo ""
echo -e "${BLUE}🧪 Next steps:${NC}"
echo "  1. Run tests: npm test"
echo "  2. Run benchmarks: npm run benchmark"
echo "  3. Validate with act: act -j build-test"
echo ""
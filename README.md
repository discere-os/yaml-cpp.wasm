# yaml-cpp.wasm

[![Build Status](https://github.com/superstruct/superstruct/actions/workflows/wasm-build-test.yml/badge.svg?branch=wasm)](https://github.com/superstruct/superstruct/actions/workflows/wasm-build-test.yml)
[![npm version](https://badge.fury.io/js/%40superstruct%2Fyaml-cpp.wasm.svg)](https://badge.fury.io/js/%40superstruct%2Fyaml-cpp.wasm)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

High-performance YAML parsing and emitting for WebAssembly environments.

## Features

- 🚀 **High Performance**: Production-optimized WASM build with SIMD acceleration
- 🌐 **Cross-Platform**: Works in browsers, Node.js, and Web Workers
- 📦 **Zero Dependencies**: Self-contained WASM module
- 🎯 **Production Ready**: Core service with comprehensive API surface
- ⚡ **WASM-Native**: Optional filesystem patterns for modern web applications
- 🔧 **TypeScript First**: Complete TypeScript definitions included
- 🧪 **Thoroughly Tested**: Comprehensive test suite with performance benchmarks

## Quick Start

### Installation

```bash
npm install @superstruct/yaml-cpp.wasm
```

### Basic Usage

```javascript
import { parseYAML, toYAML, validateYAML } from '@superstruct/yaml-cpp.wasm';

// Parse YAML string to JavaScript object
const config = await parseYAML(`
app:
  name: MyApp
  version: 1.0.0
  features:
    - parsing
    - validation
    - emission
`);

console.log(config.app.name); // "MyApp"

// Convert JavaScript object to YAML
const obj = { message: 'Hello, World!', count: 42 };
const yamlString = await toYAML(obj);
console.log(yamlString);
// message: Hello, World!
// count: 42

// Validate YAML syntax
const isValid = await validateYAML('key: value\nnumber: 42');
console.log(isValid); // true
```

### Browser Usage

```html
<!DOCTYPE html>
<html>
<head>
    <script type="module">
        import { parseYAML } from 'https://unpkg.com/@superstruct/yaml-cpp.wasm@latest/dist/yaml-cpp.mjs';
        
        const yaml = 'greeting: Hello, Browser!\nversion: 1.0';
        const result = await parseYAML(yaml);
        console.log(result.greeting);
    </script>
</head>
</html>
```

### Node.js Usage

```javascript
// ESM
import { parseYAML, toYAML } from '@superstruct/yaml-cpp.wasm';

// CommonJS
const { parseYAML, toYAML } = require('@superstruct/yaml-cpp.wasm');

const config = await parseYAML(`
database:
  host: localhost
  port: 5432
`);
```

## Performance

yaml-cpp.wasm is designed for high performance with production-grade targets:

- **Native Performance**: >90% of native yaml-cpp performance
- **Memory Overhead**: <20% additional memory usage
- **Startup Time**: <500ms initialization
- **SIMD Acceleration**: 2-4x speedup for string processing operations

### Benchmarks

```javascript
import { benchmark } from '@superstruct/yaml-cpp.wasm/test/performance/benchmark.mjs';

const results = await benchmark.run();
// Typical results:
// - Small documents: ~0.5ms parsing, >2000 ops/sec
// - Medium documents: ~5ms parsing, >200 ops/sec  
// - Large documents: ~50ms parsing, >20 ops/sec
```

## Advanced Features

### SIMD Optimization

Enable SIMD acceleration for improved performance:

```bash
# Build with SIMD support
ENABLE_SIMD=ON ./build-wasm.sh

# Runtime SIMD detection
import { parseYAML } from '@superstruct/yaml-cpp.wasm';
// SIMD automatically used if available
```

### WASM-Native Filesystem (Optional)

For advanced web applications, enable filesystem patterns:

```bash
# Build with WASM-native features
ENABLE_WASM_NATIVE=ON ./build-wasm.sh
```

```javascript
// Initialize persistent storage
await yamlModule._yaml_init_filesystem('/yaml-cache');

// Load YAML schemas from CDN with caching
await yamlModule._yaml_load_schema_from_url(
    'https://cdn.example.com/schema.yaml', 
    'app-config-schema'
);

// Load YAML templates
await yamlModule._yaml_load_template_from_url(
    'https://cdn.example.com/template.yaml',
    'deployment-template'
);
```

### Web Worker Support

yaml-cpp.wasm works seamlessly in Web Workers:

```javascript
// worker.js
import { parseYAML } from '@superstruct/yaml-cpp.wasm';

self.onmessage = async (e) => {
    const { yaml } = e.data;
    try {
        const result = await parseYAML(yaml);
        self.postMessage({ success: true, result });
    } catch (error) {
        self.postMessage({ success: false, error: error.message });
    }
};
```

## API Reference

### Core Functions

#### `parseYAML(yamlString: string): Promise<any>`
Parse YAML string to JavaScript object.

#### `toYAML(object: any): Promise<string>`
Convert JavaScript object to YAML string.

#### `validateYAML(yamlString: string): Promise<boolean>`
Validate YAML syntax without parsing.

#### `getValue(yamlString: string, keyPath: string): Promise<string>`
Get specific value from YAML by dot-separated key path.

#### `countElements(yamlString: string, keyPath?: string): Promise<number>`
Count elements in YAML array or object.

### Advanced Functions (WASM-Native)

Available when built with `ENABLE_WASM_NATIVE=ON`:

#### `yaml_init_filesystem(cachePath: string): number`
Initialize persistent filesystem with IDBFS.

#### `yaml_load_schema_from_url(url: string, schemaId: string): number`
Load YAML schema from URL with caching.

#### `yaml_load_template_from_url(url: string, templateId: string): number`
Load YAML template from URL with caching.

## Building from Source

### Prerequisites

- [Emscripten SDK](https://emscripten.org/docs/getting_started/downloads.html) (3.1.45+)
- [CMake](https://cmake.org/) (3.5+)
- [Node.js](https://nodejs.org/) (16+) for testing

### Build Commands

```bash
# Basic build
./build-wasm.sh

# Build with SIMD optimization
ENABLE_SIMD=ON ./build-wasm.sh

# Build with WASM-native features
ENABLE_WASM_NATIVE=ON ./build-wasm.sh

# Full feature build
ENABLE_SIMD=ON ENABLE_WASM_NATIVE=ON ./build-wasm.sh

# Debug build
BUILD_TYPE=Debug ./build-wasm.sh
```

### Testing

```bash
# Run all tests
npm test

# Run performance benchmarks
npm run benchmark

# Run browser tests
npm run test:browser

# Test with act (GitHub Actions locally)
npm run act:test
```

## Integration Examples

### Configuration Management

```javascript
import { parseYAML, toYAML } from '@superstruct/yaml-cpp.wasm';

class ConfigManager {
    async loadConfig(yamlString) {
        return await parseYAML(yamlString);
    }
    
    async saveConfig(config) {
        return await toYAML(config);
    }
    
    async validateConfig(yamlString) {
        return await validateYAML(yamlString);
    }
}
```

### Schema Validation

```javascript
import { parseYAML } from '@superstruct/yaml-cpp.wasm';

async function validateAgainstSchema(data, schema) {
    const parsedData = await parseYAML(data);
    const parsedSchema = await parseYAML(schema);
    
    // Implement custom validation logic
    return validateStructure(parsedData, parsedSchema);
}
```

### Template Processing

```javascript
import { parseYAML, toYAML } from '@superstruct/yaml-cpp.wasm';

async function processTemplate(template, variables) {
    let processed = template;
    
    // Replace template variables
    for (const [key, value] of Object.entries(variables)) {
        processed = processed.replace(
            new RegExp(`\\$\\{${key}\\}`, 'g'), 
            value
        );
    }
    
    return await parseYAML(processed);
}
```

## Integration Guide

yaml-cpp.wasm provides comprehensive YAML processing capabilities:

### Dependencies
- **Runtime**: None (self-contained WASM module)
- **Development**: Emscripten SDK, CMake, Node.js

### Integration Examples  
- **Configuration Management**: Application settings and configuration
- **Data Processing**: YAML data transformation and validation
- **Web Applications**: Dynamic configuration loading and processing

## Performance Tuning

### Memory Management

```javascript
// For large documents, consider chunked processing
async function processLargeYAML(yamlString) {
    if (yamlString.length > 1024 * 1024) { // 1MB
        console.warn('Processing large YAML document, consider chunking');
    }
    
    return await parseYAML(yamlString);
}
```

### Batch Processing

```javascript
// Batch multiple operations for better performance
async function processMultipleYAML(yamlStrings) {
    const results = await Promise.all(
        yamlStrings.map(yaml => parseYAML(yaml))
    );
    return results;
}
```

## Error Handling

```javascript
import { parseYAML, validateYAML } from '@superstruct/yaml-cpp.wasm';

async function safeParseYAML(yamlString) {
    try {
        // Validate first
        const isValid = await validateYAML(yamlString);
        if (!isValid) {
            throw new Error('Invalid YAML syntax');
        }
        
        // Parse
        return await parseYAML(yamlString);
    } catch (error) {
        console.error('YAML parsing failed:', error);
        return null;
    }
}
```

## Browser Compatibility

- **Chrome**: 91+ (SIMD support)
- **Firefox**: 89+ (SIMD support)
- **Safari**: 16.4+ (SIMD support)
- **Edge**: 91+ (SIMD support)
- **Node.js**: 16+ (all features)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes following existing code patterns
4. Add tests with >90% coverage
5. Run the full test suite including act
6. Submit a pull request

### Development Setup

```bash
git clone https://github.com/superstruct/superstruct.git
cd yaml-cpp.wasm
npm install

# Development build
./build-wasm.sh

# Run tests
npm test

# Local CI testing
./scripts/test-with-act.sh
```

## License

MIT License - see [LICENSE](../LICENSE) file for details.

## Links

- **Documentation**: [Project Documentation](../README.md)
- **Source Code**: [GitHub Repository](https://github.com/superstruct/superstruct)
- **Issues**: [Report Issues](https://github.com/superstruct/superstruct/issues)
- **NPM Package**: [@superstruct/yaml-cpp.wasm](https://www.npmjs.com/package/@superstruct/yaml-cpp.wasm)

---

**yaml-cpp.wasm** - High-performance YAML processing for the modern web 🌐
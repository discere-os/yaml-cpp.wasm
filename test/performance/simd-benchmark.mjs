/**
 * SIMD Performance Benchmarks for yaml-cpp.wasm
 * SIMD optimization validation for YAML processing
 * Advanced SIMD performance benchmarking
 * 
 * WASM Integration Copyright (c) 2025 Superstruct Ltd, New Zealand
 * Licensed under the same license as the underlying yaml-cpp project (MIT)
 */

import { performance } from 'node:perf_hooks';
import { parseYAML, validateYAML, toYAML, init } from '../../dist/yaml-cpp.mjs';

class SIMDBenchmark {
    constructor() {
        this.results = {};
        this.testData = this.generateSIMDTestData();
    }

    generateSIMDTestData() {
        // Test data optimized for SIMD operations
        const testCases = {
            // Long strings with repetitive patterns (good for SIMD)
            longString: 'a'.repeat(1024) + 'b'.repeat(1024) + 'c'.repeat(1024),
            
            // Whitespace-heavy content (whitespace detection)
            whitespaceHeavy: '   \t\n  \r  '.repeat(128) + 'content' + '   \t\n  \r  '.repeat(128),
            
            // Numeric strings (numeric validation)
            numericStrings: [
                '123456789',
                '3.14159265359',
                '-123.456',
                '+987.654',
                '0.123456789',
                '1234567890123456789'
            ],
            
            // Mixed character content (character classification)
            mixedContent: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()',
            
            // YAML with many keys (hash operations)
            manyKeys: {},
            
            // Line ending variations (normalization)
            lineEndings: 'line1\nline2\r\nline3\rline4\nline5\r\n',
            
            // UTF-8 content (validation)
            utf8Content: 'Hello 世界 🌍 Ñoël café naïve résumé'
        };
        
        // Generate many keys for hash testing
        for (let i = 0; i < 1000; i++) {
            testCases.manyKeys[`key_${i.toString().padStart(4, '0')}`] = `value_${i}`;
        }
        
        // Convert test objects to YAML strings
        return {
            ...testCases,
            longStringYaml: `long_string: "${testCases.longString}"`,
            whitespaceYaml: `content:\n${testCases.whitespaceHeavy}`,
            numericYaml: testCases.numericStrings.map((num, i) => `number_${i}: ${num}`).join('\n'),
            mixedYaml: `mixed: "${testCases.mixedContent}"`,
            manyKeysYaml: Object.entries(testCases.manyKeys).map(([k, v]) => `${k}: ${v}`).join('\n'),
            lineEndingsYaml: testCases.lineEndings.split(/[\r\n]+/).map((line, i) => `line_${i}: "${line}"`).join('\n'),
            utf8Yaml: `message: "${testCases.utf8Content}"`
        };
    }

    async measureStartupWithSIMD() {
        console.log('📊 Measuring startup time with SIMD detection...');
        
        const startTime = performance.now();
        const module = await init();
        const endTime = performance.now();
        
        // Check if SIMD is available (this would be exposed by the WASM module)
        const simdAvailable = typeof module._yaml_simd_available === 'function' ? 
            module._yaml_simd_available() : null;
        
        const startupTime = endTime - startTime;
        
        this.results.startup = {
            duration: startupTime,
            simdAvailable,
            moduleSize: typeof module.wasmBinary !== 'undefined' ? 
                module.wasmBinary.length : 'unknown'
        };
        
        console.log(`  Startup time: ${startupTime.toFixed(2)}ms`);
        console.log(`  SIMD available: ${simdAvailable !== null ? (simdAvailable ? '✅ Yes' : '❌ No') : '❓ Unknown'}`);
    }

    async benchmarkStringProcessing() {
        console.log('📊 Benchmarking string processing operations...');

        const operations = [
            { name: 'long_string', data: this.testData.longStringYaml },
            { name: 'whitespace_heavy', data: this.testData.whitespaceYaml },
            { name: 'mixed_content', data: this.testData.mixedYaml },
            { name: 'utf8_content', data: this.testData.utf8Yaml }
        ];

        for (const op of operations) {
            console.log(`  Testing ${op.name} (${op.data.length} chars)...`);
            
            const iterations = op.data.length > 1000 ? 100 : 1000;
            
            // Warmup
            for (let i = 0; i < 10; i++) {
                await parseYAML(op.data);
            }
            
            // Benchmark parsing
            const parseStart = performance.now();
            for (let i = 0; i < iterations; i++) {
                await parseYAML(op.data);
            }
            const parseEnd = performance.now();
            
            // Benchmark validation (typically faster)
            const validateStart = performance.now();
            for (let i = 0; i < iterations * 2; i++) {
                await validateYAML(op.data);
            }
            const validateEnd = performance.now();
            
            const parseTime = parseEnd - parseStart;
            const validateTime = validateEnd - validateStart;
            
            this.results[`string_processing_${op.name}`] = {
                parseTime,
                validateTime,
                parseAvg: parseTime / iterations,
                validateAvg: validateTime / (iterations * 2),
                parseThroughput: iterations / (parseTime / 1000),
                validateThroughput: (iterations * 2) / (validateTime / 1000),
                dataLength: op.data.length
            };
            
            console.log(`    Parse: ${(parseTime / iterations).toFixed(3)}ms avg, ${(iterations / (parseTime / 1000)).toFixed(0)} ops/sec`);
            console.log(`    Validate: ${(validateTime / (iterations * 2)).toFixed(3)}ms avg, ${((iterations * 2) / (validateTime / 1000)).toFixed(0)} ops/sec`);
        }
    }

    async benchmarkNumericProcessing() {
        console.log('📊 Benchmarking numeric value processing...');

        const numericYaml = this.testData.numericYaml;
        const iterations = 2000;
        
        console.log(`  Testing numeric strings (${numericYaml.length} chars, ${iterations} iterations)...`);
        
        // Warmup
        for (let i = 0; i < 10; i++) {
            await parseYAML(numericYaml);
        }
        
        // Benchmark
        const startTime = performance.now();
        for (let i = 0; i < iterations; i++) {
            await parseYAML(numericYaml);
        }
        const endTime = performance.now();
        
        const totalTime = endTime - startTime;
        const avgTime = totalTime / iterations;
        const throughput = iterations / (totalTime / 1000);
        
        this.results.numeric_processing = {
            totalTime,
            avgTime,
            throughput,
            iterations,
            numericValues: this.testData.numericStrings.length
        };
        
        console.log(`    Average time: ${avgTime.toFixed(3)}ms`);
        console.log(`    Throughput: ${throughput.toFixed(0)} ops/sec`);
        console.log(`    Numeric values processed: ${this.testData.numericStrings.length} per iteration`);
    }

    async benchmarkKeyLookupOperations() {
        console.log('📊 Benchmarking key lookup operations...');

        const manyKeysYaml = this.testData.manyKeysYaml;
        const iterations = 100;
        
        console.log(`  Testing many keys (${Object.keys(this.testData.manyKeys).length} keys, ${iterations} iterations)...`);
        
        // Warmup
        for (let i = 0; i < 5; i++) {
            await parseYAML(manyKeysYaml);
        }
        
        // Benchmark parsing (involves key hashing and lookups)
        const parseStart = performance.now();
        for (let i = 0; i < iterations; i++) {
            await parseYAML(manyKeysYaml);
        }
        const parseEnd = performance.now();
        
        // Benchmark object-to-YAML conversion (key processing)
        const emitStart = performance.now();
        for (let i = 0; i < iterations; i++) {
            await toYAML(this.testData.manyKeys);
        }
        const emitEnd = performance.now();
        
        const parseTime = parseEnd - parseStart;
        const emitTime = emitEnd - emitStart;
        
        this.results.key_lookup_operations = {
            parseTime,
            emitTime,
            parseAvg: parseTime / iterations,
            emitAvg: emitTime / iterations,
            parseThroughput: iterations / (parseTime / 1000),
            emitThroughput: iterations / (emitTime / 1000),
            keyCount: Object.keys(this.testData.manyKeys).length
        };
        
        console.log(`    Parse: ${(parseTime / iterations).toFixed(3)}ms avg, ${(iterations / (parseTime / 1000)).toFixed(0)} ops/sec`);
        console.log(`    Emit: ${(emitTime / iterations).toFixed(3)}ms avg, ${(iterations / (emitTime / 1000)).toFixed(0)} ops/sec`);
        console.log(`    Keys per operation: ${Object.keys(this.testData.manyKeys).length}`);
    }

    async benchmarkLineEndingNormalization() {
        console.log('📊 Benchmarking line ending normalization...');

        const lineEndingsYaml = this.testData.lineEndingsYaml;
        const iterations = 3000;
        
        console.log(`  Testing line endings (${lineEndingsYaml.length} chars, ${iterations} iterations)...`);
        
        // Create test data with various line ending combinations
        const mixedLineEndings = [
            'unix:\n  - line1\n  - line2\n  - line3',
            'windows:\r\n  - line1\r\n  - line2\r\n  - line3',
            'mac:\r  - line1\r  - line2\r  - line3',
            'mixed:\n  - unix\r\n  - windows\r  - mac'
        ].join('\n---\n');
        
        // Warmup
        for (let i = 0; i < 10; i++) {
            await parseYAML(mixedLineEndings);
        }
        
        // Benchmark
        const startTime = performance.now();
        for (let i = 0; i < iterations; i++) {
            await parseYAML(mixedLineEndings);
        }
        const endTime = performance.now();
        
        const totalTime = endTime - startTime;
        const avgTime = totalTime / iterations;
        const throughput = iterations / (totalTime / 1000);
        
        this.results.line_ending_normalization = {
            totalTime,
            avgTime,
            throughput,
            iterations,
            dataLength: mixedLineEndings.length
        };
        
        console.log(`    Average time: ${avgTime.toFixed(3)}ms`);
        console.log(`    Throughput: ${throughput.toFixed(0)} ops/sec`);
    }

    async benchmarkMemoryOperations() {
        console.log('📊 Benchmarking memory-intensive operations...');

        // Create large YAML document
        const largeDoc = {
            metadata: { generated: new Date().toISOString() },
            data: []
        };
        
        for (let i = 0; i < 5000; i++) {
            largeDoc.data.push({
                id: i,
                name: `item_${i}`,
                description: `This is a test item with id ${i} and some longer content for memory testing`,
                tags: [`tag_${i % 10}`, `category_${i % 5}`],
                metadata: {
                    created: new Date(Date.now() - i * 1000).toISOString(),
                    updated: new Date().toISOString(),
                    priority: i % 3
                }
            });
        }
        
        const iterations = 10;
        console.log(`  Testing large document (${JSON.stringify(largeDoc).length} chars, ${iterations} iterations)...`);
        
        // Measure memory before
        const initialMemory = typeof process !== 'undefined' && process.memoryUsage ? 
            process.memoryUsage() : null;
        
        // Warmup
        const yamlString = await toYAML(largeDoc);
        await parseYAML(yamlString);
        
        // Benchmark round-trip operations
        const startTime = performance.now();
        for (let i = 0; i < iterations; i++) {
            const yaml = await toYAML(largeDoc);
            await parseYAML(yaml);
        }
        const endTime = performance.now();
        
        // Measure memory after
        const finalMemory = typeof process !== 'undefined' && process.memoryUsage ? 
            process.memoryUsage() : null;
        
        const totalTime = endTime - startTime;
        const avgTime = totalTime / iterations;
        const throughput = iterations / (totalTime / 1000);
        
        this.results.memory_operations = {
            totalTime,
            avgTime,
            throughput,
            iterations,
            documentSize: JSON.stringify(largeDoc).length,
            yamlSize: yamlString.length,
            memoryBefore: initialMemory,
            memoryAfter: finalMemory,
            memoryDelta: initialMemory && finalMemory ? 
                finalMemory.heapUsed - initialMemory.heapUsed : null
        };
        
        console.log(`    Average time: ${avgTime.toFixed(3)}ms`);
        console.log(`    Throughput: ${throughput.toFixed(1)} ops/sec`);
        console.log(`    Document size: ${(JSON.stringify(largeDoc).length / 1024).toFixed(1)}KB`);
        console.log(`    YAML size: ${(yamlString.length / 1024).toFixed(1)}KB`);
        if (initialMemory && finalMemory) {
            const deltaMB = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;
            console.log(`    Memory delta: ${deltaMB.toFixed(2)}MB`);
        }
    }

    generateSIMDReport() {
        console.log('\n🎯 SIMD Performance Report - yaml-cpp.wasm');
        console.log('=' .repeat(60));
        
        // Startup Performance
        if (this.results.startup) {
            const startup = this.results.startup;
            console.log(`\n📈 Startup Performance:`);
            console.log(`  Time: ${startup.duration.toFixed(2)}ms`);
            console.log(`  SIMD Support: ${startup.simdAvailable !== null ? (startup.simdAvailable ? '✅ Available' : '❌ Not Available') : '❓ Unknown'}`);
        }
        
        // String Processing Performance
        console.log(`\n📈 String Processing Performance:`);
        Object.entries(this.results).forEach(([key, result]) => {
            if (key.startsWith('string_processing_')) {
                const testName = key.replace('string_processing_', '').replace(/_/g, ' ');
                console.log(`  ${testName}:`);
                console.log(`    Parse: ${result.parseAvg.toFixed(3)}ms, ${result.parseThroughput.toFixed(0)} ops/sec`);
                console.log(`    Validate: ${result.validateAvg.toFixed(3)}ms, ${result.validateThroughput.toFixed(0)} ops/sec`);
            }
        });
        
        // Numeric Processing
        if (this.results.numeric_processing) {
            const num = this.results.numeric_processing;
            console.log(`\n📈 Numeric Processing:`);
            console.log(`  Average: ${num.avgTime.toFixed(3)}ms, ${num.throughput.toFixed(0)} ops/sec`);
            console.log(`  Values per operation: ${num.numericValues}`);
        }
        
        // Key Lookup Operations
        if (this.results.key_lookup_operations) {
            const key = this.results.key_lookup_operations;
            console.log(`\n📈 Key Lookup Performance:`);
            console.log(`  Parse: ${key.parseAvg.toFixed(3)}ms, ${key.parseThroughput.toFixed(0)} ops/sec`);
            console.log(`  Emit: ${key.emitAvg.toFixed(3)}ms, ${key.emitThroughput.toFixed(0)} ops/sec`);
            console.log(`  Keys per operation: ${key.keyCount}`);
        }
        
        // Line Ending Normalization
        if (this.results.line_ending_normalization) {
            const line = this.results.line_ending_normalization;
            console.log(`\n📈 Line Ending Normalization:`);
            console.log(`  Average: ${line.avgTime.toFixed(3)}ms, ${line.throughput.toFixed(0)} ops/sec`);
        }
        
        // Memory Operations
        if (this.results.memory_operations) {
            const mem = this.results.memory_operations;
            console.log(`\n📈 Memory Operations:`);
            console.log(`  Average: ${mem.avgTime.toFixed(3)}ms, ${mem.throughput.toFixed(1)} ops/sec`);
            console.log(`  Document: ${(mem.documentSize / 1024).toFixed(1)}KB → ${(mem.yamlSize / 1024).toFixed(1)}KB YAML`);
            if (mem.memoryDelta !== null) {
                console.log(`  Memory delta: ${(mem.memoryDelta / 1024 / 1024).toFixed(2)}MB`);
            }
        }
        
        console.log('\n' + '=' .repeat(60));
        
        return this.results;
    }

    async run() {
        console.log('🚀 Starting yaml-cpp.wasm SIMD Performance Benchmark');
        console.log('YAML-cpp WASM - SIMD Optimization Validation');
        console.log('=' .repeat(60));
        
        try {
            await this.measureStartupWithSIMD();
            await this.benchmarkStringProcessing();
            await this.benchmarkNumericProcessing();
            await this.benchmarkKeyLookupOperations();
            await this.benchmarkLineEndingNormalization();
            await this.benchmarkMemoryOperations();
            
            return this.generateSIMDReport();
            
        } catch (error) {
            console.error('❌ SIMD benchmark failed:', error);
            process.exit(1);
        }
    }
}

// Run SIMD benchmark if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const benchmark = new SIMDBenchmark();
    await benchmark.run();
}
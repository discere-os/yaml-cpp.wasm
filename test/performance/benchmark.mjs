/**
 * Performance benchmarks for yaml-cpp.wasm
 * High-performance YAML processing validation
 * Advanced performance benchmarking
 * 
 * WASM Integration Copyright (c) 2025 Superstruct Ltd, New Zealand
 * Licensed under the same license as the underlying yaml-cpp project (MIT)
 */

import { performance } from 'node:perf_hooks';
import { parseYAML, validateYAML, toYAML, init } from '../../dist/yaml-cpp.mjs';

// Performance targets for high-performance YAML processing
const PERFORMANCE_TARGETS = {
    nativePerformance: 0.90, // >90% of native performance
    memoryOverhead: 0.20,    // <20% memory overhead
    startupTime: 500,        // <500ms startup time
    integrationOverhead: 0.05 // <5% integration overhead
};

class YAMLBenchmark {
    constructor() {
        this.results = {};
        this.testData = this.generateTestData();
    }

    generateTestData() {
        // Small document (< 1KB)
        const smallDoc = {
            name: 'test',
            version: '1.0',
            config: {
                debug: true,
                port: 8080
            }
        };

        // Medium document (10-100KB)
        const mediumDoc = { servers: [] };
        for (let i = 0; i < 1000; i++) {
            mediumDoc.servers.push({
                id: `server_${i}`,
                host: `host${i}.example.com`,
                port: 8080 + i,
                config: {
                    memory: 1024 + i,
                    cpu: i % 8,
                    enabled: i % 2 === 0
                }
            });
        }

        // Large document (1MB+)
        const largeDoc = { 
            metadata: { generated: new Date().toISOString() },
            data: []
        };
        for (let i = 0; i < 10000; i++) {
            largeDoc.data.push({
                id: i,
                timestamp: Date.now() + i,
                payload: `This is a test payload with some content ${i}`,
                metrics: {
                    cpu: Math.random() * 100,
                    memory: Math.random() * 1000,
                    disk: Math.random() * 2000,
                    network: Math.random() * 500
                },
                tags: [`tag_${i % 10}`, `category_${i % 5}`, `priority_${i % 3}`]
            });
        }

        return { smallDoc, mediumDoc, largeDoc };
    }

    async measureStartupTime() {
        console.log('📊 Measuring startup time...');
        
        const startTime = performance.now();
        await init();
        const endTime = performance.now();
        
        const startupTime = endTime - startTime;
        const passesTarget = startupTime < PERFORMANCE_TARGETS.startupTime;
        
        this.results.startupTime = {
            duration: startupTime,
            target: PERFORMANCE_TARGETS.startupTime,
            passes: passesTarget,
            score: passesTarget ? 'A' : 'B'
        };
        
        console.log(`  Startup time: ${startupTime.toFixed(2)}ms (target: <${PERFORMANCE_TARGETS.startupTime}ms) ${passesTarget ? '✅' : '❌'}`);
    }

    async benchmarkParsing() {
        console.log('📊 Benchmarking YAML parsing...');

        const sizes = ['small', 'medium', 'large'];
        const iterations = [10000, 1000, 100]; // Adjust iterations based on size
        
        for (let i = 0; i < sizes.length; i++) {
            const size = sizes[i];
            const doc = this.testData[`${size}Doc`];
            const yamlString = await toYAML(doc);
            const iterationCount = iterations[i];
            
            console.log(`  Testing ${size} documents (${yamlString.length} chars, ${iterationCount} iterations)...`);
            
            // Warmup
            for (let j = 0; j < 10; j++) {
                await parseYAML(yamlString);
            }
            
            // Benchmark
            const startTime = performance.now();
            for (let j = 0; j < iterationCount; j++) {
                await parseYAML(yamlString);
            }
            const endTime = performance.now();
            
            const totalTime = endTime - startTime;
            const avgTime = totalTime / iterationCount;
            const throughput = iterationCount / (totalTime / 1000);
            
            this.results[`parsing_${size}`] = {
                totalTime,
                avgTime,
                throughput,
                iterations: iterationCount,
                documentSize: yamlString.length
            };
            
            console.log(`    Average time: ${avgTime.toFixed(3)}ms`);
            console.log(`    Throughput: ${throughput.toFixed(0)} ops/sec`);
            console.log(`    Document size: ${(yamlString.length / 1024).toFixed(1)}KB`);
        }
    }

    async benchmarkValidation() {
        console.log('📊 Benchmarking YAML validation...');

        const validYaml = await toYAML(this.testData.mediumDoc);
        const invalidYaml = validYaml.replace(/:/g, '::'); // Introduce syntax errors
        
        const iterations = 5000;
        
        // Valid YAML benchmark
        const validStartTime = performance.now();
        for (let i = 0; i < iterations; i++) {
            await validateYAML(validYaml);
        }
        const validEndTime = performance.now();
        
        // Invalid YAML benchmark  
        const invalidStartTime = performance.now();
        for (let i = 0; i < iterations; i++) {
            await validateYAML(invalidYaml);
        }
        const invalidEndTime = performance.now();
        
        const validTime = validEndTime - validStartTime;
        const invalidTime = invalidEndTime - invalidStartTime;
        
        this.results.validation = {
            validAvgTime: validTime / iterations,
            invalidAvgTime: invalidTime / iterations,
            validThroughput: iterations / (validTime / 1000),
            invalidThroughput: iterations / (invalidTime / 1000)
        };
        
        console.log(`  Valid YAML: ${(validTime / iterations).toFixed(3)}ms avg, ${(iterations / (validTime / 1000)).toFixed(0)} ops/sec`);
        console.log(`  Invalid YAML: ${(invalidTime / iterations).toFixed(3)}ms avg, ${(iterations / (invalidTime / 1000)).toFixed(0)} ops/sec`);
    }

    async benchmarkEmission() {
        console.log('📊 Benchmarking YAML emission...');

        const sizes = ['small', 'medium', 'large'];
        const iterations = [10000, 1000, 100];
        
        for (let i = 0; i < sizes.length; i++) {
            const size = sizes[i];
            const doc = this.testData[`${size}Doc`];
            const iterationCount = iterations[i];
            
            console.log(`  Testing ${size} object emission (${iterationCount} iterations)...`);
            
            // Warmup
            for (let j = 0; j < 10; j++) {
                await toYAML(doc);
            }
            
            // Benchmark
            const startTime = performance.now();
            for (let j = 0; j < iterationCount; j++) {
                await toYAML(doc);
            }
            const endTime = performance.now();
            
            const totalTime = endTime - startTime;
            const avgTime = totalTime / iterationCount;
            const throughput = iterationCount / (totalTime / 1000);
            
            this.results[`emission_${size}`] = {
                totalTime,
                avgTime,
                throughput,
                iterations: iterationCount
            };
            
            console.log(`    Average time: ${avgTime.toFixed(3)}ms`);
            console.log(`    Throughput: ${throughput.toFixed(0)} ops/sec`);
        }
    }

    async benchmarkRoundTrip() {
        console.log('📊 Benchmarking round-trip conversion...');

        const doc = this.testData.mediumDoc;
        const iterations = 500;
        
        // Warmup
        for (let i = 0; i < 10; i++) {
            const yaml = await toYAML(doc);
            await parseYAML(yaml);
        }
        
        // Benchmark
        const startTime = performance.now();
        for (let i = 0; i < iterations; i++) {
            const yaml = await toYAML(doc);
            await parseYAML(yaml);
        }
        const endTime = performance.now();
        
        const totalTime = endTime - startTime;
        const avgTime = totalTime / iterations;
        const throughput = iterations / (totalTime / 1000);
        
        this.results.roundTrip = {
            totalTime,
            avgTime,
            throughput,
            iterations
        };
        
        console.log(`  Round-trip: ${avgTime.toFixed(3)}ms avg, ${throughput.toFixed(0)} ops/sec`);
    }

    measureMemoryUsage() {
        console.log('📊 Measuring memory usage...');

        if (typeof process !== 'undefined' && process.memoryUsage) {
            const memUsage = process.memoryUsage();
            
            this.results.memory = {
                heapUsed: memUsage.heapUsed,
                heapTotal: memUsage.heapTotal,
                external: memUsage.external,
                rss: memUsage.rss
            };
            
            console.log(`  Heap used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
            console.log(`  Heap total: ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`);
            console.log(`  External: ${(memUsage.external / 1024 / 1024).toFixed(2)}MB`);
            console.log(`  RSS: ${(memUsage.rss / 1024 / 1024).toFixed(2)}MB`);
        } else {
            console.log('  Memory usage measurement not available in this environment');
        }
    }

    generateReport() {
        console.log('\n🎯 Performance Report - yaml-cpp.wasm');
        console.log('=' .repeat(60));
        
        // Startup Performance
        if (this.results.startupTime) {
            const startup = this.results.startupTime;
            console.log(`\n📈 Startup Performance:`);
            console.log(`  Time: ${startup.duration.toFixed(2)}ms`);
            console.log(`  Target: <${startup.target}ms`);
            console.log(`  Score: ${startup.score} ${startup.passes ? '✅' : '❌'}`);
        }
        
        // Parsing Performance
        console.log(`\n📈 Parsing Performance:`);
        ['small', 'medium', 'large'].forEach(size => {
            const result = this.results[`parsing_${size}`];
            if (result) {
                console.log(`  ${size.charAt(0).toUpperCase() + size.slice(1)} docs: ${result.avgTime.toFixed(3)}ms avg, ${result.throughput.toFixed(0)} ops/sec`);
            }
        });
        
        // Emission Performance
        console.log(`\n📈 Emission Performance:`);
        ['small', 'medium', 'large'].forEach(size => {
            const result = this.results[`emission_${size}`];
            if (result) {
                console.log(`  ${size.charAt(0).toUpperCase() + size.slice(1)} docs: ${result.avgTime.toFixed(3)}ms avg, ${result.throughput.toFixed(0)} ops/sec`);
            }
        });
        
        // Validation Performance
        if (this.results.validation) {
            const val = this.results.validation;
            console.log(`\n📈 Validation Performance:`);
            console.log(`  Valid YAML: ${val.validAvgTime.toFixed(3)}ms avg, ${val.validThroughput.toFixed(0)} ops/sec`);
            console.log(`  Invalid YAML: ${val.invalidAvgTime.toFixed(3)}ms avg, ${val.invalidThroughput.toFixed(0)} ops/sec`);
        }
        
        // Round-trip Performance
        if (this.results.roundTrip) {
            const rt = this.results.roundTrip;
            console.log(`\n📈 Round-trip Performance:`);
            console.log(`  Full cycle: ${rt.avgTime.toFixed(3)}ms avg, ${rt.throughput.toFixed(0)} ops/sec`);
        }
        
        // Memory Usage
        if (this.results.memory) {
            const mem = this.results.memory;
            console.log(`\n💾 Memory Usage:`);
            console.log(`  Heap: ${(mem.heapUsed / 1024 / 1024).toFixed(2)}MB / ${(mem.heapTotal / 1024 / 1024).toFixed(2)}MB`);
            console.log(`  External: ${(mem.external / 1024 / 1024).toFixed(2)}MB`);
        }
        
        console.log('\n' + '=' .repeat(60));
        
        return this.results;
    }

    async run() {
        console.log('🚀 Starting yaml-cpp.wasm Performance Benchmark');
        console.log('YAML-cpp WASM - Performance Validation');
        console.log('=' .repeat(60));
        
        try {
            await this.measureStartupTime();
            await this.benchmarkParsing();
            await this.benchmarkEmission();
            await this.benchmarkValidation();
            await this.benchmarkRoundTrip();
            this.measureMemoryUsage();
            
            return this.generateReport();
            
        } catch (error) {
            console.error('❌ Benchmark failed:', error);
            process.exit(1);
        }
    }
}

// Run benchmark if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const benchmark = new YAMLBenchmark();
    await benchmark.run();
}
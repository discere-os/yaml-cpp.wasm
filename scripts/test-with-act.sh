#!/bin/bash
# Test yaml-cpp.wasm GitHub Actions locally with act
# Local testing for yaml-cpp.wasm CI workflows

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🎬 Testing yaml-cpp.wasm GitHub Actions with act${NC}"
echo "======================================================"

# Check for act installation
if ! command -v act &> /dev/null; then
    echo -e "${RED}❌ act not found. Please install act first:${NC}"
    echo "  GitHub: https://github.com/nektos/act"
    echo "  Homebrew: brew install act"
    echo "  Go: go install github.com/nektos/act@latest"
    exit 1
fi

# Check for Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not found. Act requires Docker to run.${NC}"
    exit 1
fi

# Configuration
BUILD_TYPE=${BUILD_TYPE:-Release}
ENABLE_SIMD=${ENABLE_SIMD:-false}
ENABLE_NATIVE=${ENABLE_NATIVE:-false}
JOB=${JOB:-build-test}
DRYRUN=${DRYRUN:-false}

echo -e "${BLUE}Configuration:${NC}"
echo "  Job: ${JOB}"
echo "  Build Type: ${BUILD_TYPE}"
echo "  Enable SIMD: ${ENABLE_SIMD}"
echo "  Enable Native: ${ENABLE_NATIVE}"
echo "  Dry Run: ${DRYRUN}"
echo ""

# Validate job names
VALID_JOBS=("build-test" "cross-browser-test" "performance-validation" "security-scan" "deploy" "summary")
if [[ ! " ${VALID_JOBS[@]} " =~ " ${JOB} " ]]; then
    echo -e "${YELLOW}⚠️  Available jobs:${NC}"
    printf '  %s\n' "${VALID_JOBS[@]}"
    echo ""
fi

# Create matrix environment for build-test job
if [ "$JOB" = "build-test" ]; then
    MATRIX_CONFIG="{\"config\": \"${BUILD_TYPE}\", \"enable_simd\": ${ENABLE_SIMD}, \"enable_native\": ${ENABLE_NATIVE}}"
    echo -e "${BLUE}📊 Matrix Configuration:${NC}"
    echo "  ${MATRIX_CONFIG}"
    echo ""
fi

# Check for secrets file
if [ -f ".secrets" ]; then
    echo -e "${GREEN}✅ Found .secrets file${NC}"
    SECRETS_FLAG="--secret-file .secrets"
else
    echo -e "${YELLOW}⚠️  No .secrets file found (using .secrets.example)${NC}"
    if [ -f ".secrets.example" ]; then
        cp .secrets.example .secrets.tmp
        SECRETS_FLAG="--secret-file .secrets.tmp"
        echo -e "${BLUE}ℹ️  Created temporary secrets file${NC}"
    else
        SECRETS_FLAG=""
    fi
fi

# Prepare act command
ACT_ARGS=(
    "--job" "${JOB}"
    "--verbose"
    "--bind"
    "--use-gitignore"
    "--platform" "ubuntu-latest=catthehacker/ubuntu:act-latest"
    "--container-options" "--cpus=4 --memory=8g --tmpfs /tmp:noexec,nosuid,size=1g"
)

# Add secrets if available
if [ -n "$SECRETS_FLAG" ]; then
    ACT_ARGS+=($SECRETS_FLAG)
fi

# Add matrix configuration for build-test
if [ "$JOB" = "build-test" ]; then
    ACT_ARGS+=("--matrix" "config:${BUILD_TYPE},enable_simd:${ENABLE_SIMD},enable_native:${ENABLE_NATIVE}")
fi

# Add dry-run flag if specified
if [ "$DRYRUN" = "true" ]; then
    ACT_ARGS+=("--dry-run")
fi

echo -e "${BLUE}🚀 Running act with the following command:${NC}"
echo "act ${ACT_ARGS[*]}"
echo ""

# Run act
if act "${ACT_ARGS[@]}"; then
    echo ""
    echo -e "${GREEN}✅ act execution completed successfully!${NC}"
    
    # Show results location
    if [ "$DRYRUN" != "true" ]; then
        echo ""
        echo -e "${BLUE}📁 Check results in:${NC}"
        echo "  - Build artifacts: dist/"
        echo "  - Test results: test-results/"
        echo "  - Playwright reports: playwright-report/"
        echo ""
        
        # Show quick summary if build artifacts exist
        if [ -d "dist" ] && [ "$(ls -A dist)" ]; then
            echo -e "${GREEN}📦 Build artifacts created:${NC}"
            ls -la dist/
        fi
    fi
    
else
    echo ""
    echo -e "${RED}❌ act execution failed${NC}"
    echo ""
    echo -e "${YELLOW}💡 Troubleshooting tips:${NC}"
    echo "  1. Check Docker is running: docker ps"
    echo "  2. Verify act configuration: act --list"
    echo "  3. Run with --dry-run first: DRYRUN=true $0"
    echo "  4. Check specific job: JOB=build-test $0"
    echo "  5. Enable debug: act --verbose --debug"
    
    # Clean up temporary secrets file
    if [ -f ".secrets.tmp" ]; then
        rm -f .secrets.tmp
    fi
    
    exit 1
fi

# Clean up temporary secrets file
if [ -f ".secrets.tmp" ]; then
    rm -f .secrets.tmp
    echo -e "${BLUE}🧹 Cleaned up temporary secrets file${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Local GitHub Actions testing completed!${NC}"

# Usage examples
echo ""
echo -e "${BLUE}💡 Usage examples:${NC}"
echo "  Test build with SIMD:    ENABLE_SIMD=true ./scripts/test-with-act.sh"
echo "  Test debug build:        BUILD_TYPE=Debug ./scripts/test-with-act.sh"  
echo "  Test specific job:       JOB=performance-validation ./scripts/test-with-act.sh"
echo "  Dry run:                 DRYRUN=true ./scripts/test-with-act.sh"
echo "  Full matrix test:        ./scripts/test-with-act.sh"
echo ""
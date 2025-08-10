#!/bin/bash

# OIDyssey SNMP Testing Suite with Docker Compose
# This script orchestrates the complete SNMP testing environment

set -e

COMPOSE_FILE="docker-compose.test.yml"
PROJECT_NAME="oidyssey-test"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}    OIDyssey SNMP Testing Suite${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
}

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

cleanup() {
    print_info "Cleaning up test environment..."
    docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME down -v
    rm -rf test/logs/* test/results/* 2>/dev/null || true
}

prepare_directories() {
    print_info "Preparing test directories..."
    mkdir -p test/logs test/results test/snmp-emulator/mibs test/scripts
}

build_images() {
    print_info "Building test images..."
    docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME build --no-cache
}

start_services() {
    print_info "Starting test services..."
    docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME up -d snmp-emulator trap-receiver
    
    print_info "Waiting for services to be healthy..."
    sleep 10
    
    # Check service health
    if docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME ps | grep -q "healthy"; then
        print_info "Services are healthy and ready!"
    else
        print_warning "Some services may not be fully ready. Continuing anyway..."
    fi
}

run_basic_tests() {
    print_header
    print_info "Running basic SNMP tests..."
    
    # Test SNMP GET
    print_info "Testing SNMP GET operation..."
    docker run --rm --network ${PROJECT_NAME}_snmp-test-network \
        polinux/snmpd:alpine \
        snmpget -v 2c -c public snmp-emulator 1.3.6.1.2.1.1.1.0
    
    # Test SNMP WALK
    print_info "Testing SNMP WALK operation..."
    docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME up snmp-walker
}

run_trap_tests() {
    print_header
    print_info "Running SNMP trap tests..."
    
    # Run the test runner
    docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME up test-runner
    
    # Check trap receiver logs
    print_info "Checking trap receiver logs..."
    docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME logs trap-receiver | tail -n 20
}

run_n8n_integration() {
    print_header
    print_info "Starting n8n for integration testing..."
    
    docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME up -d n8n
    
    print_info "Waiting for n8n to start (this may take a minute)..."
    sleep 30
    
    # Check if n8n is running
    if curl -s http://localhost:5678/healthz > /dev/null; then
        print_info "n8n is running at http://localhost:5678"
        print_info "You can now:"
        print_info "  1. Import the test workflow from examples/trap-trigger-test-workflow.json"
        print_info "  2. Configure SNMP credentials"
        print_info "  3. Test the SNMP nodes with the running emulator"
    else
        print_warning "n8n may not be fully ready yet. Please check http://localhost:5678"
    fi
}

show_results() {
    print_header
    print_info "Test Results Summary:"
    
    if [ -d "test/results" ] && [ "$(ls -A test/results)" ]; then
        echo -e "${GREEN}Test results saved in test/results/:${NC}"
        ls -la test/results/
    else
        print_warning "No test results found in test/results/"
    fi
    
    if [ -d "test/logs" ] && [ "$(ls -A test/logs)" ]; then
        echo -e "${GREEN}Logs saved in test/logs/:${NC}"
        ls -la test/logs/
    else
        print_warning "No logs found in test/logs/"
    fi
}

interactive_shell() {
    print_info "Starting interactive shell in test runner container..."
    docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME run --rm test-runner /bin/bash
}

monitor_traps() {
    print_info "Monitoring trap receiver (press Ctrl+C to stop)..."
    docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME logs -f trap-receiver
}

# Main menu
show_menu() {
    echo -e "\n${BLUE}Select test operation:${NC}"
    echo "1) Run complete test suite"
    echo "2) Start services only"
    echo "3) Run basic SNMP tests"
    echo "4) Run trap tests"
    echo "5) Start n8n integration"
    echo "6) Interactive shell"
    echo "7) Monitor trap receiver"
    echo "8) Show results"
    echo "9) Cleanup environment"
    echo "0) Exit"
}

# Parse command line arguments
case "$1" in
    --all)
        print_header
        cleanup
        prepare_directories
        build_images
        start_services
        run_basic_tests
        run_trap_tests
        run_n8n_integration
        show_results
        ;;
    --cleanup)
        cleanup
        ;;
    --build)
        build_images
        ;;
    --start)
        start_services
        ;;
    --test)
        run_basic_tests
        run_trap_tests
        ;;
    --n8n)
        run_n8n_integration
        ;;
    --shell)
        interactive_shell
        ;;
    --monitor)
        monitor_traps
        ;;
    *)
        # Interactive mode
        print_header
        
        while true; do
            show_menu
            read -p "Enter choice [0-9]: " choice
            
            case $choice in
                1)
                    cleanup
                    prepare_directories
                    build_images
                    start_services
                    run_basic_tests
                    run_trap_tests
                    run_n8n_integration
                    show_results
                    ;;
                2)
                    prepare_directories
                    start_services
                    ;;
                3)
                    run_basic_tests
                    ;;
                4)
                    run_trap_tests
                    ;;
                5)
                    run_n8n_integration
                    ;;
                6)
                    interactive_shell
                    ;;
                7)
                    monitor_traps
                    ;;
                8)
                    show_results
                    ;;
                9)
                    cleanup
                    ;;
                0)
                    print_info "Exiting..."
                    exit 0
                    ;;
                *)
                    print_error "Invalid option. Please try again."
                    ;;
            esac
        done
        ;;
esac

print_info "Done!"
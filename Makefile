# Makefile for OIDyssey SNMP Testing

.PHONY: help build test test-all test-basic test-traps test-validation clean logs shell n8n-start n8n-stop docker-up docker-down

# Default target
help:
	@echo "OIDyssey SNMP Testing Commands:"
	@echo ""
	@echo "  make build          - Build Docker images and Node.js project"
	@echo "  make test           - Run all tests"
	@echo "  make test-basic     - Run basic SNMP tests"
	@echo "  make test-traps     - Run trap sender tests"
	@echo "  make test-validation - Run SNMP validation tests"
	@echo "  make docker-up      - Start all Docker services"
	@echo "  make docker-down    - Stop all Docker services"
	@echo "  make n8n-start      - Start n8n for integration testing"
	@echo "  make n8n-stop       - Stop n8n"
	@echo "  make logs           - Show logs from all services"
	@echo "  make shell          - Open interactive shell in test container"
	@echo "  make clean          - Clean up test environment"
	@echo ""

# Build targets
build: node-build docker-build

node-build:
	@echo "Building Node.js project..."
	npm run build

docker-build:
	@echo "Building Docker images..."
	docker-compose -f docker-compose.test.yml build

# Docker management
docker-up:
	@echo "Starting Docker services..."
	docker-compose -f docker-compose.test.yml up -d snmp-emulator trap-receiver
	@echo "Waiting for services to be ready..."
	@sleep 10
	@echo "Services are running!"

docker-down:
	@echo "Stopping Docker services..."
	docker-compose -f docker-compose.test.yml down

docker-restart: docker-down docker-up

# Test targets
test: test-all

test-all: docker-up
	@echo "Running complete test suite..."
	docker-compose -f docker-compose.test.yml up test-runner
	docker-compose -f docker-compose.test.yml up snmp-walker
	@make test-validation

test-basic: docker-up
	@echo "Running basic SNMP tests..."
	docker run --rm \
		--network oidyssey-test_snmp-test-network \
		polinux/snmpd:alpine \
		snmpwalk -v 2c -c public snmp-emulator 1.3.6.1.2.1.1

test-traps: docker-up
	@echo "Running trap sender tests..."
	docker-compose -f docker-compose.test.yml run --rm test-runner \
		python /app/tests/trap-sender.py trap-receiver 162

test-validation: docker-up
	@echo "Running SNMP validation tests..."
	docker-compose -f docker-compose.test.yml run --rm test-runner \
		python /app/snmp-validation.py --host snmp-emulator

# n8n management
n8n-start: docker-up
	@echo "Starting n8n..."
	docker-compose -f docker-compose.test.yml up -d n8n
	@echo "Waiting for n8n to start (30 seconds)..."
	@sleep 30
	@echo "n8n is available at http://localhost:5678"

n8n-stop:
	@echo "Stopping n8n..."
	docker-compose -f docker-compose.test.yml stop n8n

# Utility targets
logs:
	docker-compose -f docker-compose.test.yml logs -f

logs-trap:
	docker-compose -f docker-compose.test.yml logs -f trap-receiver

logs-emulator:
	docker-compose -f docker-compose.test.yml logs -f snmp-emulator

shell:
	@echo "Opening shell in test runner container..."
	docker-compose -f docker-compose.test.yml run --rm test-runner /bin/bash

shell-emulator:
	@echo "Opening shell in SNMP emulator container..."
	docker-compose -f docker-compose.test.yml exec snmp-emulator /bin/sh

# Monitoring
monitor-traps:
	@echo "Monitoring trap receiver (Ctrl+C to stop)..."
	docker-compose -f docker-compose.test.yml logs -f trap-receiver

monitor-all:
	@echo "Monitoring all services (Ctrl+C to stop)..."
	docker-compose -f docker-compose.test.yml logs -f

# Clean up
clean:
	@echo "Cleaning up test environment..."
	docker-compose -f docker-compose.test.yml down -v
	rm -rf test/logs/* test/results/* 2>/dev/null || true
	@echo "Cleanup complete!"

clean-all: clean
	@echo "Removing Docker images..."
	docker-compose -f docker-compose.test.yml down --rmi all
	@echo "Full cleanup complete!"

# Development workflow
dev: docker-up n8n-start
	@echo "Development environment is ready!"
	@echo "  - SNMP Emulator: localhost:161"
	@echo "  - Trap Receiver: localhost:162"
	@echo "  - n8n: http://localhost:5678"
	@echo ""
	@echo "Run 'make test' to execute tests"
	@echo "Run 'make logs' to see service logs"
	@echo "Run 'make shell' for interactive testing"

# Quick test workflow
quick-test:
	@make docker-up
	@make test-basic
	@make test-traps
	@make docker-down

# CI/CD workflow
ci-test: build docker-up test-all
	@make docker-down
	@echo "CI tests completed successfully!"
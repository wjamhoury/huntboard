#!/bin/bash

# HuntBoard Setup Script
# This script sets up the entire project with one command

set -e  # Exit on any error

echo "========================================"
echo "  HuntBoard Setup Script"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}Error: Please run this script from the huntboard directory${NC}"
    exit 1
fi

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

echo "Checking prerequisites..."
echo ""

# Check for Docker
if command_exists docker; then
    echo -e "${GREEN}✓ Docker found${NC}"
else
    echo -e "${RED}✗ Docker not found${NC}"
    echo "  Please install Docker Desktop from: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Check if Docker is running
if docker info >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Docker is running${NC}"
else
    echo -e "${RED}✗ Docker is not running${NC}"
    echo "  Please start Docker Desktop and try again"
    exit 1
fi

# Check for Docker Compose
if docker compose version >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Docker Compose found${NC}"
else
    echo -e "${RED}✗ Docker Compose not found${NC}"
    echo "  Please ensure Docker Desktop is properly installed"
    exit 1
fi

echo ""
echo "========================================"
echo "  Building and starting containers..."
echo "========================================"
echo ""

# Build and start containers
docker compose build --no-cache

echo ""
echo "Starting services..."
docker compose up -d

echo ""
echo "Waiting for services to be ready..."
sleep 5

# Check if services are running
if docker compose ps | grep -q "running"; then
    echo -e "${GREEN}✓ Services are running${NC}"
else
    echo -e "${RED}✗ Services failed to start${NC}"
    echo "  Run 'docker compose logs' to see what went wrong"
    exit 1
fi

echo ""
echo "========================================"
echo -e "${GREEN}  Setup Complete!${NC}"
echo "========================================"
echo ""
echo "Your HuntBoard app is now running:"
echo ""
echo -e "  ${GREEN}Frontend:${NC} http://localhost:5173"
echo -e "  ${GREEN}Backend API:${NC} http://localhost:8000"
echo -e "  ${GREEN}API Docs:${NC} http://localhost:8000/docs"
echo ""
echo "Commands:"
echo "  Stop:    docker compose down"
echo "  Start:   docker compose up -d"
echo "  Logs:    docker compose logs -f"
echo "  Rebuild: docker compose build --no-cache"
echo ""

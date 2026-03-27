#!/usr/bin/env bash
#
# Verify Docker Build
#
# Validates that the Docker build completes successfully.
# Usage: ./scripts/verify-docker-build.sh [--no-cache]
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
IMAGE_NAME="ixo-ussd-server:verify-build"

# Parse arguments
NO_CACHE=""
if [[ "${1:-}" == "--no-cache" ]]; then
  NO_CACHE="--no-cache"
fi

echo "🐳 Verifying Docker build..."
echo "   Project root: $PROJECT_ROOT"
echo ""

# Check for Dockerfile
if [[ ! -f "$PROJECT_ROOT/Dockerfile" ]]; then
  echo "⚠️  No Dockerfile found at project root."
  echo "   Skipping Docker build verification."
  echo "   To enable this check, add a Dockerfile to the project root."
  exit 0
fi

# Check Docker is available
if ! command -v docker &> /dev/null; then
  echo "❌ Docker is not installed or not in PATH."
  exit 1
fi

if ! docker info &> /dev/null; then
  echo "❌ Docker daemon is not running."
  exit 1
fi

# Run the build
echo "📦 Building Docker image: $IMAGE_NAME"
if docker build $NO_CACHE -t "$IMAGE_NAME" "$PROJECT_ROOT"; then
  echo ""
  echo "✅ Docker build completed successfully!"
  echo ""

  # Show image details
  docker image inspect "$IMAGE_NAME" --format '   Image ID: {{.Id}}' 2>/dev/null || true
  docker image inspect "$IMAGE_NAME" --format '   Size: {{.Size}}' 2>/dev/null || true
  echo ""

  # Clean up verification image
  echo "🧹 Cleaning up verification image..."
  docker rmi "$IMAGE_NAME" &> /dev/null || true
  echo "   Done."
else
  echo ""
  echo "❌ Docker build FAILED!"
  echo "   Check the build output above for errors."
  exit 1
fi


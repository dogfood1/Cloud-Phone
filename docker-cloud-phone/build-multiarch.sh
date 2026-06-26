#!/usr/bin/env sh
# 构建并推送 linux/amd64 + linux/arm64 镜像（需 docker buildx 与 Docker Hub 登录）
# 用法:
#   cd docker-cloud-phone && chmod +x build-multiarch.sh
#   docker login
#   ./build-multiarch.sh
#   IMAGE_TAG=0.13.0 ./build-multiarch.sh
#   DOCKER_PLATFORMS=linux/amd64,linux/arm64,linux/arm/v7 ./build-multiarch.sh
set -e

cd "$(dirname "$0")"
ROOT="$(cd .. && pwd)"

if [ -f .env ]; then
  # shellcheck disable=SC1091
  . ./.env
elif [ -f "$ROOT/.env" ]; then
  # shellcheck disable=SC1091
  . "$ROOT/.env"
fi

NAMESPACE="${DOCKERHUB_NAMESPACE:-yiyifred}"
TAG="${IMAGE_TAG:-latest}"
PLATFORMS="${DOCKER_PLATFORMS:-linux/amd64,linux/arm64}"
BUILDER_NAME="${BUILDX_BUILDER:-cloud-phone-builder}"

docker buildx inspect "$BUILDER_NAME" >/dev/null 2>&1 \
  || docker buildx create --name "$BUILDER_NAME" --use
docker buildx use "$BUILDER_NAME"
docker buildx inspect --bootstrap

SHA_TAG="$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo local)"

build_image() {
  name="$1"
  dockerfile="$2"
  echo "==> Building $NAMESPACE/cloud-phone-$name ($PLATFORMS)"
  docker buildx build \
    --platform "$PLATFORMS" \
    --push \
    --file "$dockerfile" \
    --tag "$NAMESPACE/cloud-phone-$name:$TAG" \
    --tag "$NAMESPACE/cloud-phone-$name:$SHA_TAG" \
    "$ROOT"
}

build_image backend docker/backend.Dockerfile
build_image frontend docker/frontend.Dockerfile

echo "Done: $NAMESPACE/cloud-phone-{backend,frontend}:$TAG ($PLATFORMS)"

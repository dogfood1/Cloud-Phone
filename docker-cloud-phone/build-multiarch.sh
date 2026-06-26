#!/usr/bin/env sh
# 构建并推送 linux/amd64 + linux/arm64 镜像（需 docker buildx 与 Docker Hub 登录）
# 镜像 tag 默认使用 frontend/web/package.json 中的 version（与项目版本一致）
# 用法:
#   cd docker-cloud-phone && chmod +x build-multiarch.sh
#   docker login
#   ./build-multiarch.sh
#   IMAGE_TAG=0.13.1 ./build-multiarch.sh   # 覆盖默认版本 tag
#   DOCKER_PLATFORMS=linux/amd64,linux/arm64 ./build-multiarch.sh
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

read_app_version() {
  if command -v node >/dev/null 2>&1; then
    node -p "require('$ROOT/frontend/web/package.json').version"
    return
  fi
  sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' \
    "$ROOT/frontend/web/package.json" | head -n 1
}

NAMESPACE="${DOCKERHUB_NAMESPACE:-yiyifred}"
TAG="${IMAGE_TAG:-$(read_app_version)}"
TAG="${TAG:-latest}"
PLATFORMS="${DOCKER_PLATFORMS:-linux/amd64,linux/arm64}"
BUILDER_NAME="${BUILDX_BUILDER:-cloud-phone-builder}"

docker buildx inspect "$BUILDER_NAME" >/dev/null 2>&1 \
  || docker buildx create --name "$BUILDER_NAME" --use
docker buildx use "$BUILDER_NAME"
docker buildx inspect --bootstrap

build_image() {
  name="$1"
  dockerfile="$2"
  echo "==> Building $NAMESPACE/cloud-phone-$name:$TAG ($PLATFORMS)"
  docker buildx build \
    --platform "$PLATFORMS" \
    --push \
    --file "$dockerfile" \
    --tag "$NAMESPACE/cloud-phone-$name:$TAG" \
    --tag "$NAMESPACE/cloud-phone-$name:latest" \
    "$ROOT"
}

build_image backend docker/backend.Dockerfile
build_image frontend docker/frontend.Dockerfile

echo "Done: $NAMESPACE/cloud-phone-{backend,frontend}:$TAG (+ :latest) ($PLATFORMS)"

#!/usr/bin/env bash
# Double-clickable installer: produces release/ChayuanWPS-<version>-macos-<arch>.pkg (run on macOS).
# arch: arm64 (Apple Silicon) or x64 (Intel)，与当前构建机架构一致。
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ "$(uname -s)" != "Darwin" ]]; then
	echo "Run this script on macOS." >&2
	exit 1
fi

ARCH_RAW="$(uname -m)"
case "$ARCH_RAW" in
	arm64) ARCH_ID="arm64" ;;
	x86_64) ARCH_ID="x64" ;;
	*) ARCH_ID="$ARCH_RAW" ;;
esac

npm run build:wps-all

VERSION="$(node -p "require('./package.json').version")"
STAGING="$ROOT/release/install-staging"
if [[ ! -f "$STAGING/install.json" ]]; then
	echo "Missing release/install-staging (run build:wps-all)." >&2
	exit 1
fi

PKG_ROOT="$ROOT/release/.mac-pkg-root"
SCRIPTS_DIR="$ROOT/release/.mac-scripts"
rm -rf "$PKG_ROOT" "$SCRIPTS_DIR"
PAYLOAD="$PKG_ROOT/Library/Application Support/ChayuanWPS"
mkdir -p "$PAYLOAD"
cp -R "$STAGING/"* "$PAYLOAD/"

mkdir -p "$SCRIPTS_DIR"
sed "s|__INSTALL_ROOT__|/Library/Application Support/ChayuanWPS|g" \
	"$ROOT/scripts/macos/postinstall.template.sh" >"$SCRIPTS_DIR/postinstall"
chmod +x "$SCRIPTS_DIR/postinstall"

OUT_PKG="$ROOT/release/ChayuanWPS-${VERSION}-macos-${ARCH_ID}.pkg"
pkgbuild \
	--root "$PKG_ROOT" \
	--scripts "$SCRIPTS_DIR" \
	--identifier "com.aidooo.chayuan.wpsaddon" \
	--version "$VERSION" \
	--install-location / \
	"$OUT_PKG"

rm -rf "$PKG_ROOT" "$SCRIPTS_DIR"
node "$ROOT/scripts/write-release-manifest.mjs" "release/ChayuanWPS-${VERSION}-macos-${ARCH_ID}.pkg"
echo "Built: $OUT_PKG (macOS ${ARCH_ID}; double-click to install; may need Right-click → Open if unsigned)"

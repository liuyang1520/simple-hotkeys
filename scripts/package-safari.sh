#!/bin/sh

set -eu

DEVELOPER_DIR="${DEVELOPER_DIR:-/Applications/Xcode.app/Contents/Developer}"
SAFARI_BUNDLE_IDENTIFIER="${SAFARI_BUNDLE_IDENTIFIER:-com.liuyang.simple-hotkeys}"
export DEVELOPER_DIR
export SAFARI_BUNDLE_IDENTIFIER

xcrun safari-web-extension-packager \
  .output/safari-mv3 \
  --project-location .safari \
  --app-name "Simple Hotkeys" \
  --bundle-identifier "$SAFARI_BUNDLE_IDENTIFIER" \
  --swift \
  --macos-only \
  --copy-resources \
  --no-open \
  --no-prompt \
  --force

node scripts/configure-safari-project.mjs

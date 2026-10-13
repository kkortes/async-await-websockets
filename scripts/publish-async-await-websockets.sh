#!/bin/bash
# Publish @ape-egg/async-await-websockets to npm

set -e

echo "Publishing @ape-egg/async-await-websockets..."
echo ""

# Check if logged in to npm
if ! npm whoami &> /dev/null; then
  echo "Error: Not logged in to npm. Run 'npm login' first."
  exit 1
fi

# Show current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "Current version: $CURRENT_VERSION"
echo ""

# Ask for new version
read -p "New version (or press enter to keep $CURRENT_VERSION): " NEW_VERSION

if [ -n "$NEW_VERSION" ]; then
  npm version "$NEW_VERSION" --no-git-tag-version
  echo "Updated to version $NEW_VERSION"
fi

# Publish
echo ""
echo "Publishing..."
npm publish --access public

echo ""
echo "Done! Published @ape-egg/async-await-websockets"

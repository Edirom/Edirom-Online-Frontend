#!/bin/zsh
# Pushes the pending image-component-integration work: submodule first (if it
# has unpushed commits), then bumps the parent repo's gitlink and pushes.
set -e

cd "$(dirname "$0")"

# 1. Submodule (resources/js/edirom-image-viewer): push any pending commits.
cd resources/js/edirom-image-viewer
if [ -n "$(git log origin/main..HEAD --oneline 2>/dev/null)" ]; then
    echo "Pushing submodule commits to origin/main..."
    git push origin main
else
    echo "Submodule already up to date with origin/main."
fi
cd - > /dev/null

# 2. Parent repo: stage everything (incl. the bumped submodule pointer), commit, push.
git add -A
git commit -m "feat: merge openseadragon and digilib image servers into the image viewer component"
git push origin image-component-integration

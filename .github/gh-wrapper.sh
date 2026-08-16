#!/usr/bin/env bash
# Local wrapper for gh that forces GH to use workspace-local config dir
WORKSPACE_GH_CONFIG_DIR="$(pwd)/.github/gh-config"
export GH_CONFIG_DIR="$WORKSPACE_GH_CONFIG_DIR"

# If the user placed a token file at .github/gh-config/gh_token, use it
TOKEN_FILE="$WORKSPACE_GH_CONFIG_DIR/gh_token"
if [ -f "$TOKEN_FILE" ]; then
	export GH_TOKEN="$(cat "$TOKEN_FILE")"
fi

exec gh "$@"

Workspace `gh` config and token usage

Place a personal access token with repo access in `.github/gh-config/gh_token`.
Set file permissions to `600` to keep it private.

Example (local only):
```bash
printf "%s" "$GH_TOKEN_VALUE" > .github/gh-config/gh_token
chmod 600 .github/gh-config/gh_token
```

This file is ignored by default via `.gitignore`.

The wrapper script `.github/gh-wrapper.sh` will load this token automatically.

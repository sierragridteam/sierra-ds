# Sierra design system

Instructions for agents working in this repo. README.md says what it is and how to build, test and release it (`pnpm test`, `pnpm check`, `pnpm build`; a merge to main publishes `@sierragridteam/design-system`, so keep publishing behind an explicitly authorized merge).

## Commits

- Don't add `Co-Authored-By:` trailers naming an agent or model, or any other AI attribution (such as a "Generated with" footer), to commit messages or pull request descriptions. `.claude/settings.json` turns off Claude Code's default commit trailer; follow the same rule with any other tool.

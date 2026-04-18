# Git Conventions

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <description>

[optional body]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Rules:
- Imperative mood: "add feature", not "added feature"
- Summary under 72 characters, no period at end
- Body (if needed): explain WHY, not WHAT — the diff shows what changed
- One logical change per commit
- Reference issue numbers when applicable
- Mark breaking changes with `!` after type and `BREAKING CHANGE:` in footer:

```
feat(api)!: restructure response format

BREAKING CHANGE: All API responses now follow JSON:API spec

Previous: { "data": {...}, "status": "ok" }
New:      { "data": {...}, "meta": {...} }
```

### Scope examples

```
feat(ui): add loading spinner to dashboard
fix(api): handle null values in user profile
fix(db): resolve connection pool leak
chore(ci): update Node version to 20
refactor(core): extract validation into separate module
```

### Examples

Single change:
```
fix(api): handle null values in user profile

Prevent crashes when user profile fields are null.
Add null checks before accessing nested properties.
```

Multi-file change:
```
refactor(core): restructure authentication module

- Move auth logic from controllers to service layer
- Extract validation into separate validators
- Update tests to use new structure
```

## Branches

- `master` — stable, always deployable
- `feature/<short-description>` — new features
- `fix/<short-description>` — bug fixes
- `refactor/<short-description>` — refactoring without behavior change

## Pull Requests

- PR title follows conventional commits style
- Description includes: what changed, why, how to test
- Keep PRs focused — one concern per PR

# Code Review Standards

When reviewing code, check for:

## Correctness
- Does the code do what it claims?
- Are edge cases handled (nil/null, empty collections, boundary values)?
- Are error paths handled, not just the happy path?

## Design
- Is the change in the right place architecturally?
- Are abstractions appropriate — not too early, not too late?
- Does it follow existing patterns in the codebase?

## Readability
- Would a new team member understand this without extra context?
- Are names descriptive and consistent with the codebase?
- Is complex logic broken into understandable pieces?

## Risk
- Could this break existing functionality?
- Are there performance implications (N+1 queries, unbounded loops, large allocations)?
- Are there concurrency issues (race conditions, deadlocks)?

## Output Format
- Start with summary: X critical, Y warnings, Z suggestions
- Group findings by severity: Critical → Warning → Suggestion
- Each finding: `file:line` + what's wrong + suggested fix
- End with overall assessment

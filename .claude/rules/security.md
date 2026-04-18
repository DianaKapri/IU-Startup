# Security Rules

## Never
- Commit secrets, tokens, passwords, or API keys to the repository
- Store secrets in code — use environment variables or a secrets manager
- Disable security features (TLS verification, CSRF protection, auth checks)
- Use `eval()` or equivalent with untrusted input

## Always
- Validate and sanitize all external input (user input, API responses, file contents)
- Use parameterized queries — never string-concatenate SQL
- Apply the principle of least privilege for permissions and access
- Keep dependencies updated; check for known vulnerabilities before adding new ones

# Git Workflow Rules

## Conventional Commits

All commits must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]
[optional footer]
```

### Commit Types

| Type | Purpose | Example |
|------|---------|---------|
| `feat` | New feature | `feat(auth): add JWT refresh` |
| `fix` | Bug fix | `fix(api): resolve null pointer` |
| `chore` | Maintenance | `chore(deps): upgrade React` |
| `refactor` | Restructuring | `refactor(utils): extract validation` |
| `docs` | Documentation | `docs(readme): add setup guide` |
| `style` | Formatting | `style(css): apply indentation` |
| `test` | Tests | `test(auth): add login tests` |
| `perf` | Performance | `perf(search): optimize queries` |
| `ci` | CI/CD changes | `ci(github): add deploy workflow` |
| `build` | Build system | `build(vite): update config` |

### Description Rules
- Use imperative mood: "add" not "added"
- Start lowercase (unless scope precedes)
- No period at end
- Keep under 50 characters
- Be specific: ✅ "add retry logic" vs ❌ "update code"

### Scopes
Scopes are project-specific. Define them in the project's CLAUDE.md or CONTRIBUTING.md. Examples: `auth`, `api`, `db`, `ui`, `deps`.

---

## Atomic Commits

Break changes into small, logical commits. A good rule of thumb: if the commit message needs the word "and", it should be two commits.

### Why
- Easier debugging (`git bisect`)
- Clear history
- Safe rollbacks
- Better code reviews

### ❌ Bad: Monolithic Commit
```
fix: update lending system
  - Fixed interest calculation
  - Updated user fields
  - Refactored queries
  - Added API endpoint
  - Updated styling
```

### ✅ Good: Atomic Commits
```
feat(interest-calc): implement variable-rate formula
fix(user-profile): add email validation
refactor(queries): optimize N+1 SELECT
feat(api): add POST /loans/estimate
style(ui): align button styling
```

---

## Branch Strategy

Define your branching model per project. Common approaches:

### Simple (solo/small team)
- `main` — production, always deployable
- Feature branches optional for larger changes
- Direct commits to `main` acceptable for small fixes

### Standard (team)
- `main` — production
- `develop` — integration branch
- `feature/<name>` — new features, branch from `develop`
- `fix/<name>` — bug fixes
- PRs required for merging to `main`

### Rules (all models)
- Never force-push to `main`/`master`
- Delete branches after merge
- Keep branches short-lived (< 1 week ideally)

---

## Pre-Push Safety Checks

**Before running `git push`, verify:**

### 1. Code Quality
```bash
npm run lint          # 0 errors required
npm test              # All tests pass (if test suite exists)
npm run build         # Build succeeds
```

- **Errors**: Must be 0. Block push.
- **Warnings**: Must not increase. Fix any new warnings introduced by your changes. Pre-existing warnings are acceptable.

### 2. Security: No Secrets
```bash
git diff origin/<branch>..HEAD
```

Scan for:
- ❌ API keys (`STRIPE_SECRET`, `AWS_ACCESS_KEY`)
- ❌ Database passwords or connection strings with credentials
- ❌ JWT secrets
- ❌ Auth tokens
- ❌ `.env` files that shouldn't be committed

### 3. Git Verification
```bash
git branch      # Correct branch?
git remote -v   # Correct remote?
git log --oneline -5  # Commits look right?
```

---

## Descriptive Bodies (Complex Changes)

Add a body when:
- Changes span multiple files/domains
- Reasoning is non-obvious
- Bug fix involves subtle issues
- Refactoring has performance/security implications

### Format
```
<type>(<scope>): <description>

<motivation>
<problem being solved>
<impact/trade-offs>

Fixes #<issue>
```

### Example: Bug Fix
```
fix(payment): prevent double-charging on rapid submission

When users double-clicked the payment button, multiple charges occurred
because the frontend didn't debounce and the server had no idempotency
checks.

Solution:
- Added 500ms debounce to button
- Implemented server-side UUID deduplication
- Enhanced logging for duplicate detection

Result: Prevents duplicates even if UI debounce fails.

Fixes #1847
```

### Example: Refactoring
```
refactor(database): migrate from loop to SQL batch query

Interest calculation was O(n), causing N+1 queries and 5s latency
for users with 100+ loans. Moved to PostgreSQL window functions.

Performance gains:
- Single loan: 45ms → 12ms (73% faster)
- 100 loans: 5200ms → 280ms (95% faster)

Fixes #1602
```

---

## Anti-Patterns (Forbidden)

| Pattern | ❌ Bad | ✅ Correct |
|---------|--------|-----------|
| Vague | `chore: update stuff` | `chore(deps): upgrade typescript` |
| No type | `Fixed login bug` | `fix(auth): resolve timeout` |
| Multiple changes | `fix: payment and notifications` | Split into separate commits |
| Future tense | `will add caching` | `implement Redis caching` |
| Passive voice | `Database is updated` | `add indexes to table` |
| Emoji/caps | `🔥 CRITICAL BUG` | `fix(auth): resolve race condition` |

---

## Pre-Push Checklist

- [ ] Code quality checks pass (lint, test, build)
- [ ] No new warnings introduced
- [ ] No secrets in diff
- [ ] Correct branch and remote
- [ ] Commits follow Conventional Commits
- [ ] Commits are atomic (no "and" in messages)
- [ ] Complex changes have descriptive bodies

Then push:
```bash
git push origin <branch>
```

---

## AI Assistant Behavior

When asked to commit or push:

1. Run all available code quality checks (lint, test, build) before pushing
2. Scan `git diff` for secrets before every commit
3. One commit per logical change — split if the message needs "and"
4. Always include `Co-Authored-By` footer when AI authored/co-authored the change
5. Never force-push to `main`/`master`
6. Never skip pre-commit hooks (`--no-verify`)
7. If a pre-commit hook fails, fix the issue and create a **new** commit — never amend, as amend would modify the previous commit, not the failed one
8. Flag missing bodies for complex, multi-file changes

---

## Emergency: Pushed Secrets

**Step 1 is always: rotate the credential immediately.** Once a secret reaches a remote, consider it compromised regardless of what you do with git history.

```bash
# 1. IMMEDIATELY rotate/revoke the exposed credential in production

# 2. If NOT yet pushed — reset and recommit:
git reset --soft HEAD~1
# Remove secret, add to .gitignore
git add <files> && git commit -m "chore: remove exposed credential"

# 3. If pushed to a feature branch — rewrite and force push:
git reset --soft HEAD~1
# Remove secret, add to .gitignore
git add <files> && git commit -m "chore: remove exposed credential"
git push --force-with-lease origin <branch>

# 4. If pushed to main — do NOT rewrite history:
# Create a new commit removing the secret
# Add the file pattern to .gitignore
# The credential is already rotated (step 1), so the exposed value is useless
```

---

## References

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Atomic Commits Best Practices](https://en.wikipedia.org/wiki/Atomic_commit)
- [Chris Beams: Commit Message Style](https://chris.beams.io/posts/git-commit/)

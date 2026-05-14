# Skill Registry — centro_medico

## Project-Specific Skills (from `.agents/skills/`)

| Skill | Trigger | Description |
|---|---|---|
| `@docker-expert` | Docker tasks | Container optimization, security, multi-stage builds, orchestration |
| `@nestjs-best-practices` | NestJS code | Best practices for modules, DI, security, performance |
| `@nextjs-best-practices` | Next.js code | App Router principles, Server Components, data fetching |

## Universal Skills (from `~/.config/opencode/skills/`)

| Skill | Trigger | Description |
|---|---|---|
| `@comment-writer` | PR/Issue comments | Warm, direct, human comments for async collaboration |
| `@cognitive-doc-design` | Documentation | Reduce cognitive load via progressive disclosure, chunking, signposting |
| `@issue-creation` | GitHub issues | Issue creation following issue-first enforcement system |
| `@branch-pr` | PR creation | PR creation workflow following issue-first enforcement system |
| `@judgment-day` | Code review | Parallel adversarial review with dual judges |
| `@gentle-ai-chained-pr` | Large changes | Split >400 line changes into chained/stacked PRs |
| `@work-unit-commits` | Commits | Structure commits as deliverable work units |
| `@go-testing` | Go tests | Testing patterns for Gentleman.Dots / Bubbletea |
| `@skill-creator` | New skills | Create new AI agent skills following Agent Skills spec |
| `@skill-registry` | Registry updates | Update this skill registry file |

## SDD Skills (auto-invoked by orchestrator)

| Skill | Trigger | Description |
|---|---|---|
| `sdd-init` | SDD initialization | Initialize Spec-Driven Development context |
| `sdd-explore` | `/sdd-explore` | Explore and investigate ideas before committing |
| `sdd-propose` | `/sdd-new` proposal phase | Create change proposal with intent, scope, and approach |
| `sdd-spec` | `/sdd-new` spec phase | Write specifications with requirements and scenarios |
| `sdd-design` | `/sdd-new` design phase | Create technical design document with architecture decisions |
| `sdd-tasks` | `/sdd-new` tasks phase | Break down change into implementation task checklist |
| `sdd-apply` | `/sdd-apply` | Implement tasks from the change |
| `sdd-verify` | `/sdd-verify` | Validate implementation against specs |
| `sdd-archive` | `/sdd-archive` | Sync delta specs to main specs and archive completed change |
| `sdd-onboard` | `/sdd-onboard` | Guided end-to-end walkthrough of SDD workflow |

## Project Conventions

- **AGENTS.md** — Full project conventions, stack, architecture patterns, error list
- **CLAUDE.md** — Additional detailed information
- **PLAN.md** — Project roadmap and phases

## Compact Rules (for sub-agent injection)

### NestJS (from `@nestjs-best-practices`)
- Organize by feature modules, not technical layers
- Prefer constructor injection, avoid service locator
- Use custom repositories for complex queries
- Throw HTTP exceptions from services, use exception filters globally
- Validate all input with DTOs and ValidationPipe
- Use transactions for multi-step operations
- Never return entities directly — use response DTOs
- Use `@Exclude()` for sensitive fields in entities
- Enable graceful shutdown hooks

### Next.js (from `@nextjs-best-practices`)
- Server Components by default, `'use client'` only for interactivity
- Use TanStack Query for server state, Zustand only for client/UI state
- Thin pages — no direct HTTP calls in page.tsx
- Use service functions + hooks, never apiFetch directly in components
- react-hook-form + zod for form validation
- App Shell / Skeletons for loading UX

### Docker (from `@docker-expert`)
- All commands run inside containers via `make shell-*`
- Never run pnpm/npm/node directly on host
- Use `make deps-sync` for monorepo lockfile updates
- Prisma generate/migrate always inside API container

### SDD Rules (from `openspec/config.yaml`)
- Strict TDD: enabled
- Proposal must include rollback plan and affected modules
- Specs use Given/When/Then + RFC 2119 keywords
- Design includes schema changes and DTO contracts
- Tasks grouped by phase, hierarchical numbering, <400 line PRs
- Apply follows AGENTS.md conventions and loads relevant skills
- Verify runs typecheck + lint + compares against spec scenarios

---

*Last updated: 2026-05-14*

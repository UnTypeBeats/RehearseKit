# RehearseKit Project Rules

These rules are derived from the Cursor editor rules and must be followed strictly when working on this project.

---

## Rule 1: Context Preservation - CRITICAL

### Requirements
- **MUST maintain context across ALL interactions**
- **MUST reference previous decisions and implementations**
- **MUST connect new work to existing patterns**
- **Any loss of context = IMMEDIATE acknowledgment required**

### Before Starting ANY Task:
1. Ask: "What's the current context?"
2. Review: Previous decisions and implementations
3. Identify: How new work connects to existing patterns
4. State: "Building on previous context: [summary]"

### During Work:
- Maintain awareness of current state
- Reference previous decisions when making new ones
- Connect new implementations to existing patterns
- Document context changes as they happen

### If Context is Lost:
- MUST acknowledge immediately
- MUST review previous work
- MUST reconnect to existing patterns
- MUST document restoration process

---

## Rule 2: Documentation Management - UNBREAKABLE

### CRITICAL REQUIREMENTS
- **ALL documentation files (*.md) MUST be in `docs/` folder**
- **NEVER create .md files in project root (except README.md)**
- **Any violation MUST be fixed immediately**

### Documentation Structure:
```
docs/
├── api/          # API documentation
├── guides/       # User and developer guides
├── archive/      # Historical/completed documentation
├── ideas/        # Future features and ideas
└── rules/        # Project rules and standards
```

### Before Creating ANY .md File:
1. Ask: "Is this going in docs/ directory?"
2. State: "Creating [filename] in docs/[category]/"
3. If not in docs/, STOP and put it there

### For Short Answers:
- Provide answer directly in conversation
- Only create .md if user explicitly requests
- If creating, MUST be in docs/

### Violation Consequences:
- Immediate acknowledgment required
- Immediate fix in same response
- No "I'll fix it later"

---

## Rule 3: Long Running Commands - MANDATORY

### Requirements
- **MUST monitor ALL commands > 30 seconds**
- **MUST prevent indefinite waiting**
- **MUST estimate execution time before running**
- **MUST implement timeout protection**

### Before Running Commands:
1. Estimate execution time
2. State: "Estimated duration: [time]"
3. If > 30s: "Setting timeout to [time]"
4. Implement timeout wrapper

### Mandatory Timeout Defaults:
- **Package Management**: 5 minutes (`npm install`, `pip install`)
- **Compilation/Build**: 10 minutes (`docker build`, `webpack`)
- **Testing**: 15 minutes (`pytest`, `npm test`)
- **Deployment/CI**: 20 minutes (`docker-compose`, `kubectl`)
- **Database Operations**: 10 minutes (`migrate`, `pg_dump`)
- **AI/ML Processing**: Ask user explicitly

### Progress Monitoring:
- Show status updates every 10-30 seconds
- Display elapsed time
- Show "still running..." indicator
- Never leave user wondering

### After Command Completes:
1. Verify actual completion
2. Check exit code
3. Confirm expected outputs exist
4. Report clear status:
   - ✅ Success (exit 0)
   - ❌ Failed (exit non-zero)
   - ⚠️ Timeout (exit 124)

### Absolute Prohibitions:
- NEVER run long commands without timeout
- NEVER proceed without verifying success
- NEVER assume success without checking exit codes

---

## Rule 4: Incremental Progress

### Requirements
- Break work into small, verifiable steps
- Show progress as you work
- Verify each step before proceeding
- Provide clear status updates

### For Each Step:
1. State what you're doing
2. Execute the step
3. Verify it worked
4. Report status
5. Move to next step

### Communication:
- Use clear progress indicators (✅ ❌ ⏳ 🔄)
- Provide estimates when possible
- Show what's been done and what's next
- Keep user informed

---

## Rule 5: Pattern Consistency

### Requirements
- Follow existing code patterns
- Use established conventions
- Reference similar implementations
- Maintain architectural consistency

### Before Implementing:
1. Search for similar existing code
2. Follow the same patterns
3. Use same naming conventions
4. Match existing architecture

### When Adding New Patterns:
1. Explain why new pattern is needed
2. Ensure it doesn't conflict with existing patterns
3. Document the new pattern
4. Apply consistently

---

## Rule 6: User Experience First

### Requirements
- Prioritize user understanding
- Provide clear explanations
- Offer helpful suggestions
- Make it easy to verify work

### Communication Style:
- Be clear and concise
- Use examples when helpful
- Explain "why" not just "what"
- Anticipate questions

### Error Handling:
- Explain what went wrong
- Suggest how to fix it
- Provide alternatives if available
- Don't leave user stuck

---

## Rule 7: Bug Fix Verification

### Requirements
- MUST verify the bug before fixing
- MUST reproduce the issue
- MUST verify the fix works
- MUST test for regressions

### Protocol:
1. **Understand**: Read bug report thoroughly
2. **Reproduce**: Confirm the bug exists
3. **Diagnose**: Identify root cause
4. **Fix**: Implement solution
5. **Verify**: Test the fix works
6. **Regression Test**: Ensure nothing broke
7. **Document**: Record fix and testing

### Never:
- Fix without reproducing
- Skip verification
- Assume it works
- Create new bugs while fixing

---

## Project-Specific Context

### Technology Stack:
- **Frontend**: Next.js 14, React, TypeScript, TailwindCSS
- **Backend**: FastAPI (Python), PostgreSQL, Redis
- **Infrastructure**: Docker, TrueNAS, Cloudflare
- **Auth**: Google OAuth (client-side with ID tokens)
- **Processing**: Celery workers, Demucs for stem separation

### Deployment:
- **Staging**: https://rehearsekit.uk (10.0.0.155)
- **Cloudflare Proxy**: /api → backend:30071, /ws → websocket:30072
- **Config Path**: `/mnt/Odin/Applications/RehearseKit/config/`
- **SSH**: `ssh oleg@10.0.0.155`

### Important Files:
- **Backend Config**: `backend/app/core/config.py`
- **Backend Auth**: `backend/app/api/auth.py`
- **Frontend Providers**: `frontend/app/providers.tsx`
- **Docker Compose**: `infrastructure/truenas/docker-compose.truenas.yml`
- **Environment**: `/mnt/Odin/Applications/RehearseKit/config/.env` (on server)

### Recent Work:
- Fixed Google OAuth on staging (see `docs/guides/google-oauth-fix-handover.md`)
- Backend now has all OAuth env vars
- Frontend fetches Client ID at runtime
- Security improved: no secrets in Docker images

---

## Self-Checking Before Each Response

### Ask Yourself:
1. ✅ Am I maintaining context from previous work?
2. ✅ If creating .md file, is it in docs/ folder?
3. ✅ For commands > 30s, did I implement timeout?
4. ✅ Did I verify the last step before proceeding?
5. ✅ Am I following existing patterns?
6. ✅ Is my explanation clear and helpful?

### If Any Answer is NO:
- Stop immediately
- Fix the issue
- Acknowledge the mistake
- Then proceed correctly

---

## Remember:

**These rules exist to:**
- Maintain code quality and consistency
- Prevent common mistakes
- Keep project organized
- Provide excellent user experience
- Ensure context is never lost

**When in doubt:**
- Ask the user
- Check existing patterns
- Review documentation
- Follow these rules strictly

**These rules are UNBREAKABLE unless user explicitly overrides them.**

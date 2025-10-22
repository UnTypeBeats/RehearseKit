# Documentation Management Rule - UNBREAKABLE

## CRITICAL REQUIREMENT - NO EXCEPTIONS
- **ALL documentation files (*.md) MUST be created in the `docs/` folder**
- **NEVER create .md files in the project root directory**
- **The ONLY .md file allowed in root is README.md**
- **Any violation of this rule MUST be fixed immediately in the same response**

## ENFORCEMENT MECHANISMS

### Before Creating ANY .md File:
1. **MUST ask yourself**: "Is this going in docs/ directory?"
2. **MUST state**: "I will create this in docs/ directory"
3. **If the answer is NO, STOP and put it in docs/ instead**

### After Creating ANY .md File:
1. **MUST verify**: "This file is in docs/ directory"
2. **MUST confirm location before proceeding**

### If You Violate This Rule:
1. **MUST acknowledge the violation immediately**
2. **MUST move the file to docs/ in the same response**
3. **MUST commit the fix**
4. **MUST apologize for not following the rule**
5. **NO "I'll fix it later" - fix it NOW**

## SELF-CHECKING REQUIREMENTS

### Every Time You Create a .md File:
1. **State the location**: "Creating [filename] in docs/ directory"
2. **Verify after creation**: "Confirmed: [filename] is in docs/ directory"
3. **If you find yourself about to create one in root, STOP and put it in docs/**

### Documentation Creation Guidelines

#### For Comprehensive/Long-Form Responses:
- **MUST create in `docs/` folder**
- **MUST state location before creating**
- Use clear, descriptive filenames (e.g., `docs/api-reference.md`, `docs/deployment-guide.md`)
- Organize into subdirectories when needed:
  ```
  docs/
  ├── architecture/
  ├── api/
  ├── guides/
  └── deployment/
  ```

#### For Short Answers/Quick Questions:
- **DO NOT automatically create .md files**
- Provide the answer directly in the conversation
- After answering, ask: *"Would you like me to create documentation for this in the `docs/` folder?"*
- Only create the .md file if the user confirms
- **If creating, MUST put it in docs/ directory**

### Examples

**Short Answer (No File Creation):**
```
User: "How do I run the tests?"
Agent: "Run `npm test` for unit tests or `npm run test:e2e` for end-to-end tests.

Would you like me to create a testing guide in the docs/ folder?"
```

**Long Answer (Create Documentation):**
```
User: "Explain the entire authentication flow"
Agent: "I'll create a comprehensive authentication guide in docs/authentication-guide.md..."
[Creates detailed documentation in docs/]
```

## ABSOLUTE RULE - NO EXCEPTIONS
- **The ONLY .md file allowed in project root is README.md**
- **ALL other .md files MUST be in docs/ directory**
- **NO EXCEPTIONS for CHANGELOG.md, CONTRIBUTING.md, etc. - they go in docs/ too**
- **This rule cannot be violated under any circumstances**

## VIOLATION CONSEQUENCES
- **Immediate acknowledgment required**
- **Immediate fix required in same response**
- **No excuses accepted**
- **No "I'll fix it later" allowed**

---

**This rule ensures clean project structure and prevents documentation clutter in the root directory.**
**VIOLATION = IMMEDIATE FIX REQUIRED**
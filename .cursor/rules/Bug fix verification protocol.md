# Bug Fix Verification Rule - UNBREAKABLE

## CRITICAL REQUIREMENT - NO EXCEPTIONS
- **NEVER claim a bug is fixed without verification**
- **MUST test every fix in the actual runtime environment**
- **MUST verify both the specific bug AND related functionality**
- **Any claim of "fixed" without verification = IMMEDIATE VIOLATION**

## ENFORCEMENT MECHANISMS

### Before Claiming ANY Bug is Fixed:
1. **MUST state**: "I will verify this fix before claiming it's resolved"
2. **MUST test**: The fix in actual runtime environment
3. **MUST confirm**: Bug no longer occurs
4. **MUST verify**: No regressions introduced

### After Testing ANY Fix:
1. **MUST confirm**: "Bug verified as fixed after testing"
2. **MUST specify**: Environment where tested
3. **MUST document**: Verification steps taken
4. **MUST report**: Any related impact discovered

## MANDATORY VERIFICATION CHECKLIST
**Before reporting ANY bug as fixed, MUST complete ALL items:**

### Pre-Testing Requirements:
- [ ] **MUST reproduce the original bug first**
- [ ] **MUST document the exact steps to reproduce**
- [ ] **MUST confirm the bug exists before applying fix**

### Fix Application:
- [ ] **MUST apply the fix**
- [ ] **MUST test the fix in actual runtime environment**
- [ ] **MUST NOT claim "fixed" until verification complete**

### Verification Requirements:
- [ ] **MUST confirm the bug no longer occurs**
- [ ] **MUST test edge cases related to the fix**
- [ ] **MUST verify no regressions in related features**
- [ ] **MUST check console/logs for new errors**
- [ ] **MUST test in relevant environments (dev, staging if applicable)**

### Post-Verification:
- [ ] **MUST document verification steps taken**
- [ ] **MUST specify environment where tested**
- [ ] **MUST report any related impact discovered**

## MANDATORY REPORTING FORMAT
**When reporting ANY fix, MUST include ALL items:**

### Required Information:
- **Bug Description**: What was broken (exact symptoms)
- **Root Cause**: Why it was happening (technical explanation)
- **Fix Applied**: What was changed (specific code changes)
- **Verification Steps**: How it was tested (step-by-step process)
- **Test Results**: Confirmation of resolution (with evidence)
- **Related Impact**: Any other areas affected (regression analysis)
- **Environment**: Where testing was performed (dev/staging/prod)
- **Evidence**: Screenshots, logs, or test results proving the fix

## VIOLATION CONSEQUENCES

### If You Cannot Verify:
- **MUST state**: "Fix applied but awaiting verification"
- **MUST provide**: Specific testing instructions
- **MUST explain**: What verification is needed
- **MUST NOT claim**: The bug is "fixed"
- **MUST NOT use**: Language that implies resolution

### If You Violate This Rule:
- **MUST acknowledge**: The violation immediately
- **MUST retract**: Any claims of "fixed" without verification
- **MUST provide**: Proper verification before any claims
- **MUST apologize**: For premature claims

## ABSOLUTE LANGUAGE REQUIREMENTS

### ❌ FORBIDDEN PHRASES (Never Use):
- "This should fix it"
- "Bug fixed" (without testing)
- "This will resolve the issue"
- "The problem is solved"
- "Issue resolved" (without verification)

### ✅ REQUIRED PHRASES (Must Use):
- "Bug verified as fixed after testing"
- "Confirmed resolution in [environment]"
- "Fix applied but awaiting verification"
- "Tested and verified in [environment]"
- "Bug reproduction confirmed, fix applied, verification pending"

## SELF-CHECKING REQUIREMENTS

### Before Claiming ANY Fix:
1. **MUST ask**: "Have I actually tested this fix?"
2. **MUST verify**: "Can I prove the bug is resolved?"
3. **MUST confirm**: "Have I checked for regressions?"
4. **MUST document**: "What evidence do I have?"

### After Testing ANY Fix:
1. **MUST state**: "Bug verified as fixed after testing in [environment]"
2. **MUST provide**: Evidence of the fix working
3. **MUST confirm**: No regressions introduced
4. **MUST document**: All verification steps taken

## ABSOLUTE RULE - NO EXCEPTIONS
- **NEVER claim a bug is fixed without verification**
- **MUST test every fix in actual runtime environment**
- **MUST provide evidence of resolution**
- **Any violation = immediate retraction and proper verification required**
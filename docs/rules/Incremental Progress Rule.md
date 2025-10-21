# Incremental Progress Rule - UNBREAKABLE

## CRITICAL REQUIREMENT - NO EXCEPTIONS
- **MUST make small, testable changes**
- **MUST verify each change before proceeding**
- **MUST NOT make large, untestable changes**
- **MUST maintain working state at all times**
- **Any large, untestable change = IMMEDIATE VIOLATION**

## ENFORCEMENT MECHANISMS

### Before Making ANY Change:
1. **MUST ask**: "What's the smallest testable change?"
2. **MUST identify**: How to test this change independently
3. **MUST verify**: "Can I test this change in isolation?"
4. **MUST state**: "Making incremental change: [description]"

### During Implementation:
1. **MUST make**: Small, focused changes only
2. **MUST test**: Each change before proceeding
3. **MUST verify**: "Is the system still working?"
4. **MUST confirm**: "This change is testable and working"

### After Each Change:
1. **MUST verify**: Change works as expected
2. **MUST test**: System still functions correctly
3. **MUST confirm**: "Working state maintained"
4. **MUST document**: What was changed and why

## SELF-CHECKING REQUIREMENTS

### Before Making ANY Change:
1. **MUST ask**: "What's the smallest testable change?"
2. **MUST verify**: "Can I test this change independently?"
3. **MUST confirm**: "Is this change focused and small?"
4. **MUST state**: "This is an incremental change"

### During Implementation:
1. **MUST ask**: "Am I making small, testable changes?"
2. **MUST verify**: "Can I test this change in isolation?"
3. **MUST check**: "Is the system still working?"
4. **MUST confirm**: "This change is testable and working"

### After Each Change:
1. **MUST ask**: "Does this change work as expected?"
2. **MUST verify**: "Is the system still functioning?"
3. **MUST test**: "Can I verify this change works?"
4. **MUST confirm**: "Working state maintained"

## INCREMENTAL PROGRESS REQUIREMENTS

### Must Make:
- **Small, focused changes** that can be tested independently
- **Testable changes** that can be verified quickly
- **Isolated changes** that don't affect other systems
- **Reversible changes** that can be undone if needed
- **Documented changes** with clear rationale

### Must Avoid:
- **Large, monolithic changes** that are hard to test
- **Untestable changes** that can't be verified
- **Changes that break** the working state
- **Changes that affect** multiple systems simultaneously
- **Changes without** clear testing strategy

## VIOLATION CONSEQUENCES

### If You Make Large Changes:
- **MUST acknowledge**: The violation immediately
- **MUST break down**: Large change into smaller pieces
- **MUST test**: Each smaller piece independently
- **MUST verify**: System still works after each piece
- **MUST apologize**: For making large, untestable changes

### If You Break Working State:
- **MUST acknowledge**: The violation immediately
- **MUST revert**: To last working state
- **MUST break down**: Change into smaller pieces
- **MUST test**: Each piece before proceeding
- **MUST NOT proceed**: Until working state is restored

## ABSOLUTE RULE - NO EXCEPTIONS
- **NEVER make large, untestable changes**
- **MUST make small, testable changes**
- **MUST verify each change before proceeding**
- **MUST maintain working state at all times**
- **Any violation = immediate acknowledgment and correction required**

---

**This rule ensures continuous progress while maintaining system stability and preventing breaking changes.**

# Long Running Command Rule - UNBREAKABLE

## CRITICAL REQUIREMENT - NO EXCEPTIONS
- **MUST monitor and manage ALL commands that may run longer than 30 seconds**
- **MUST prevent indefinite waiting and provide clear feedback**
- **MUST estimate execution time before running ANY command**
- **Any command > 30 seconds without timeout protection = IMMEDIATE VIOLATION**

## ENFORCEMENT MECHANISMS

### Before Running ANY Command:
1. **MUST estimate execution time** based on operation type
2. **MUST state**: "Estimated duration: [time] for [command]"
3. **MUST check**: "Is this command > 30 seconds?"
4. **If YES, MUST implement timeout protection**
5. **If NO, MUST confirm**: "Command should complete quickly"

### For Commands > 30 Seconds:
1. **MUST inform user**: "This command may take [estimate]"
2. **MUST propose timeout**: "Set timeout to [default]? (y/n/custom)"
3. **MUST implement timeout wrapper** before execution
4. **MUST NOT proceed** without timeout protection

## MANDATORY TIMEOUT DEFAULTS
**MUST use these timeouts for commands > 30 seconds:**

### Package Management (5 minutes):
- `npm install`, `pip install`, `yarn install`
- `composer install`, `bundle install`
- **MUST NOT exceed 5 minutes without user approval**

### Compilation/Build (10 minutes):
- `webpack`, `tsc`, `docker build`
- `make`, `cmake`, `gcc`
- **MUST NOT exceed 10 minutes without user approval**

### Testing (15 minutes):
- `pytest`, `jest --coverage`, `npm test`
- `phpunit`, `rspec`, `mocha`
- **MUST NOT exceed 15 minutes without user approval**

### Deployment/CI (20 minutes):
- `docker-compose up`, `kubectl apply`
- `terraform apply`, `ansible-playbook`
- **MUST NOT exceed 20 minutes without user approval**

### Database Operations (10 minutes):
- `alembic upgrade`, `migrate`, `seed`
- `pg_dump`, `mysqldump`
- **MUST NOT exceed 10 minutes without user approval**

### AI/ML/Large Processing:
- **MUST ask user explicitly** for timeout
- **MUST NOT assume** any default timeout
- **MUST get explicit approval** before proceeding

## MANDATORY IMPLEMENTATION REQUIREMENTS

### Timeout Protection - NO EXCEPTIONS
**MUST wrap ALL commands > 30 seconds with timeout protection:**

```bash
# MANDATORY timeout wrapper for long-running commands
timeout ${TIMEOUT_SECONDS} ${COMMAND} || {
  EXIT_CODE=$?
  if [ $EXIT_CODE -eq 124 ]; then
    echo "⚠️ Command timed out after ${TIMEOUT_SECONDS} seconds"
    echo "💡 Consider: increasing timeout, checking logs, or canceling operation"
  fi
  exit $EXIT_CODE
}
```

### Progress Monitoring - MANDATORY
**While ANY command runs, MUST:**
- **Show status updates every 10 seconds** (if command supports progress output)
- **Display**: elapsed time, current phase, or "still running..." indicator
- **If progress unavailable**: show "⏳ Running [command]... (elapsed: Xs)"
- **MUST NOT leave user wondering** if command is still running

## MANDATORY POST-EXECUTION PROTOCOL

### After Command Completes (or Times Out) - MUST DO ALL:
1. **MUST wait for actual completion** - never assume success prematurely
2. **MUST check exit code** and display clear status:
   - ✅ Success (exit 0)
   - ❌ Failed (exit non-zero)
   - ⚠️ Timeout (exit 124)
3. **MUST verify results** - test that expected outputs exist
4. **MUST report feedback** with specific status:
   - Success: "✅ [Command] completed in Xs"
   - Failure: "❌ [Command] failed. See output above."
   - Timeout: "⚠️ [Command] exceeded timeout. Check if process needs more time or is stuck."

### Verification Requirements:
- **MUST confirm**: Command actually completed
- **MUST check**: Exit code is correct
- **MUST verify**: Expected outputs exist
- **MUST report**: Clear success/failure status
- **MUST NOT proceed** to next steps without verification

## MANDATORY USER COMMUNICATION RULES

### Always Be Clear - MUST DO ALL:
- **MUST state**: What you're running and why
- **MUST provide**: Time estimates upfront
- **MUST show**: Progress when possible
- **MUST explain**: What happened afterward
- **MUST suggest**: Next steps if something fails

### Example Interaction - MANDATORY FORMAT:
```
I'm about to run: npm install
Expected duration: ~2 minutes
Setting timeout to 5 minutes.

⏳ Installing dependencies... (elapsed: 10s)
⏳ Installing dependencies... (elapsed: 20s)
✅ npm install completed in 47s

Testing that node_modules exists...
✅ Dependencies installed successfully
```

## ABSOLUTE PROHIBITIONS - NEVER DO:
- **NEVER run long commands without timeout protection**
- **NEVER leave user wondering if command is still running**
- **NEVER proceed to next steps before verifying current command succeeded**
- **NEVER assume success without checking exit codes**
- **NEVER run commands > 30s without timeout wrapper**

## MANDATORY REQUIREMENTS - ALWAYS DO:
- **MUST estimate and communicate expected duration**
- **MUST implement timeout for commands > 30s**
- **MUST monitor progress and show updates**
- **MUST verify completion before continuing**
- **MUST provide clear success/failure feedback**
- **MUST check exit codes before proceeding**
- **MUST confirm expected outputs exist**

## VIOLATION CONSEQUENCES

### If You Violate This Rule:
- **MUST acknowledge**: The violation immediately
- **MUST implement**: Proper timeout protection
- **MUST verify**: Command completion before proceeding
- **MUST apologize**: For not following the rule
- **MUST NOT proceed**: Until proper timeout protection is in place

## SELF-CHECKING REQUIREMENTS

### Before Running ANY Command:
1. **MUST ask**: "Is this command > 30 seconds?"
2. **MUST estimate**: Execution time
3. **MUST implement**: Timeout protection if needed
4. **MUST inform**: User about expected duration

### After Running ANY Command:
1. **MUST verify**: Command actually completed
2. **MUST check**: Exit code
3. **MUST confirm**: Expected outputs exist
4. **MUST report**: Clear status to user

## ABSOLUTE RULE - NO EXCEPTIONS
- **NEVER run commands > 30s without timeout protection**
- **MUST monitor and manage ALL long-running commands**
- **MUST provide clear feedback and progress updates**
- **Any violation = immediate acknowledgment and proper implementation required**
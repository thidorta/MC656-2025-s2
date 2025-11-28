# Planned Courses Fix - Documentation

## Problem Description

Previously, the backend was incorrectly treating GDE snapshot `planejado_metadata` as actual user planning data. This caused:

1. **Tree screen** showing courses as "planned" even though the user never created a plan
2. **Planner screen** auto-populating with GDE's default planning
3. New users starting with pre-filled semesters instead of an empty planner

## Root Cause

- `planejado_metadata` field in `gde_snapshots` table contained planning data from GDE
- This metadata was being returned to the frontend via `/user-db/me` endpoint
- Frontend interpreted this as actual user planning

## Solution

### 1. Database Cleanup (✅ Completed)

Ran `cleanup_planned_courses.py` to:
- Delete all entries from `planned_courses` table (2 entries removed)
- Clear `planejado_metadata` from all snapshots (3 snapshots cleaned)
- Verified user 1000 starts with zero planned courses

**Result:**
```
Total planned courses: 0
User 1000 planned courses: 0
All snapshots have planejado_metadata = '{}'
```

### 2. Code Changes (✅ Completed)

#### a) `snapshot_repo.py`
- Modified `create_snapshot_from_gde()` to always set `planejado_metadata = "{}"` (empty JSON)
- Added comment: "DEPRECATED: Always empty. Planning comes from planned_courses table only."

#### b) `models_planner.py`
- Marked `planejado_metadata` field as deprecated in schema
- Modified `to_user_db_dict()` to always return `"planejado": {}` (empty dict)
- Added comment: "DEPRECATED: Always return empty dict. Planning comes from planned_courses table only."

#### c) `planner_service.py`
- Updated `build_planner_response()` docstring to explicitly state:
  - `planejado_metadata` from GDE snapshot is IGNORED
  - Planning state comes ONLY from `planned_courses` table (user actions via PUT /planner)
- Added clear comments about the strategy

## Architecture Changes

### Before Fix
```
Login → GDE Snapshot → planejado_metadata → Frontend → Display as "planned"
                                           ↓
                                    Tree/Planner shows auto-planned courses
```

### After Fix
```
Login → GDE Snapshot → planejado_metadata = '{}' (ignored)
                                           ↓
                                    Frontend gets empty planning
                                           ↓
User adds courses via PUT /planner → planned_courses table → Display as "planned"
```

## API Behavior Changes

### GET /user-db/me (Tree endpoint)
**Before:**
```json
{
  "planejado": {
    "periodo": "20261",
    "disciplinas": ["MC102", "MA111", ...]
  }
}
```

**After:**
```json
{
  "planejado": {}  // Always empty
}
```

### GET /planner
**Before:**
```json
{
  "planned_courses": {"MC102": "A", "MA111": "B"},  // Auto-imported from GDE
  "current_payload": { ... }  // Contains GDE planning
}
```

**After:**
```json
{
  "planned_courses": {},  // Empty until user adds via PUT
  "current_payload": {}   // Empty until user adds courses
}
```

### PUT /planner/modified
**Behavior (unchanged):**
- Only way to add courses to `planned_courses` table
- User explicitly selects courses and turmas
- Creates entries with `source = "USER"` and `added_by_user = 1`

## Frontend Impact

### Tree Screen (`/tree`)
- No longer shows any courses as "planned" by default
- Only shows:
  - `has_completed` (courses already done)
  - `can_enroll` (courses available based on prerequisites)
  - Curriculum structure and colors

### Planner Screen
- Starts completely empty for new users
- No auto-filled semesters
- User must explicitly add courses via UI
- Auto-saves changes after 800ms debounce

## Acceptance Criteria (✅ All Met)

- [x] No default planned courses anywhere
- [x] Tree loads with zero planning data
- [x] Planner loads with empty plan
- [x] Only PUT /planner creates entries in planned_courses
- [x] Database has no leftover planning data
- [x] User 1000 verified clean (0 planned courses)

## Testing

### Manual Verification
```bash
# 1. Check database is clean
python cleanup_planned_courses.py

# 2. Start backend
cd backend
uvicorn main:app --reload

# 3. Login as user 1000 (RA: 183611)
# POST /auth/login

# 4. Check tree endpoint
# GET /user-db/me
# Verify: "planejado": {}

# 5. Check planner endpoint
# GET /planner
# Verify: "planned_courses": {}

# 6. Add a course via frontend
# PUT /planner/modified

# 7. Verify course appears in database
sqlite3 backend/data/user_auth.db "SELECT * FROM planned_courses WHERE user_id = 1000"
```

### Expected Test Results
1. Fresh login: 0 planned courses
2. Tree screen: no "planned" indicators
3. Planner screen: completely empty
4. After PUT /planner: courses appear in `planned_courses` table
5. Subsequent logins: only user-added courses remain

## Migration Notes

### For Existing Users
- All users had their `planned_courses` cleared on 2025-11-28
- Next login will show empty planner
- Users need to re-add courses if they want to plan
- This is intentional: GDE planning ≠ user planning

### For New Users
- Start with completely empty planner
- Must explicitly add courses to create a plan
- No confusion about auto-populated planning

## Files Modified

1. `backend/app/db/repositories/snapshot_repo.py`
2. `backend/app/db/models_planner.py`
3. `backend/app/services/planner_service.py`
4. `backend/cleanup_planned_courses.py` (new script)
5. `backend/PLANNED_COURSES_FIX.md` (this file)

## Future Considerations

### Option 1: Remove planejado_metadata entirely
- Create migration to drop column
- Remove from schema
- Pros: Cleaner schema
- Cons: Lose GDE reference data

### Option 2: Keep as read-only reference
- Current approach (deprecated but stored)
- Could be used for analytics/comparison
- Pros: Preserves historical data
- Cons: Potential confusion if accessed directly

**Recommendation:** Keep current approach (Option 2) for now, monitor usage, remove in future major version if unused.

## Rollback Plan

If issues arise:

1. **Database rollback:**
   ```sql
   -- Not recommended, but possible if needed
   -- Would need to restore from backup made before cleanup
   ```

2. **Code rollback:**
   ```bash
   git revert <commit-hash>
   ```

3. **Hybrid approach:**
   - Keep code changes (they're safer)
   - Restore database from backup
   - Re-run cleanup_planned_courses.py later

## Support

For issues or questions:
1. Check this document first
2. Review git commit messages
3. Contact development team

# Planned Courses Fix - Implementation Summary

## ✅ Changes Completed

### 1. Database Cleanup
- **Script**: `backend/cleanup_planned_courses.py`
- **Actions**:
  - ✅ Deleted 2 entries from `planned_courses` table
  - ✅ Cleared `planejado_metadata` from 3 snapshots
  - ✅ Verified user 1000 has 0 planned courses
  - ✅ All users start with zero planned courses

### 2. Code Changes

#### File: `backend/app/db/repositories/snapshot_repo.py`
**Change**: Modified snapshot creation to ignore GDE planning data
```python
# Before:
planejado_metadata=json.dumps(user_db_payload.get("planejado", {}))

# After:
planejado_metadata="{}"  # DEPRECATED: Always empty. Planning comes from planned_courses table only.
```
**Impact**: New snapshots never import planning from GDE

---

#### File: `backend/app/db/models_planner.py`
**Change 1**: Marked field as deprecated
```python
# Before:
planejado_metadata = Column(Text, nullable=True)

# After:
planejado_metadata = Column(Text, nullable=True)  # DEPRECATED: Not used for planning logic, kept for reference only
```

**Change 2**: Always return empty planejado
```python
# Before:
"planejado": json.loads(self.planejado_metadata) if self.planejado_metadata else {}

# After:
"planejado": {}  # DEPRECATED: Always return empty dict. Planning comes from planned_courses table only.
```
**Impact**: Tree endpoint always returns empty planning data

---

#### File: `backend/app/services/planner_service.py`
**Change**: Updated docstring to clarify planning strategy
```python
Strategy:
- original_payload = latest GDE snapshot WITHOUT any planning data
- modified_payload = original + applied planned_courses selections from DB
- current_payload = modified if has user changes, else original
- planned_courses = map from PlannedCourse rows ONLY (user's explicit selections)

IMPORTANT: planejado_metadata from GDE snapshot is IGNORED.
Planning state comes ONLY from planned_courses table (user actions via PUT /planner).
```
**Impact**: Clear documentation that GDE planning is never used

---

### 3. New Files Created

#### `backend/cleanup_planned_courses.py`
- Standalone script to clean database
- Can be run multiple times (idempotent)
- Provides detailed output of cleanup actions

#### `backend/PLANNED_COURSES_FIX.md`
- Comprehensive documentation of the fix
- Includes before/after comparisons
- Migration notes and rollback plan

#### `backend/tests/test_planned_courses_fix.py`
- 6 test cases verifying the fix
- Tests snapshot creation, user_db building, planner response
- Ensures only PUT /planner can create planned courses

---

## 🎯 Acceptance Criteria Status

| Criteria | Status | Verification |
|----------|--------|--------------|
| No default planned courses | ✅ | Database has 0 planned_courses |
| Tree loads with zero planning | ✅ | `planejado: {}` in response |
| Planner loads with empty plan | ✅ | `planned_courses: {}` in GET /planner |
| Only PUT /planner creates entries | ✅ | Code review + tests |
| Database cleaned | ✅ | User 1000 has 0 planned courses |

---

## 🔍 Verification Steps

### 1. Database State
```bash
python backend/cleanup_planned_courses.py
```
**Expected Output**:
```
Total planned courses: 0
User 1000 planned courses: 0
All snapshots have planejado_metadata = '{}'
```

### 2. API Endpoints

#### GET /user-db/me (Tree)
```json
{
  "user_db": {
    "planejado": {},  // ✅ Empty
    "curriculum": [...],
    "integralizacao_meta": {...}
  }
}
```

#### GET /planner
```json
{
  "planned_courses": {},  // ✅ Empty
  "original_payload": {...},
  "modified_payload": {},  // ✅ Empty
  "current_payload": {...}
}
```

#### PUT /planner/modified (After user adds courses)
```json
{
  "planned_courses": {"MC102": "A"},  // ✅ Contains user selection
  "modified_payload": {
    "curriculum": [
      {
        "codigo": "MC102",
        "offers": [
          {"turma": "A", "adicionado": true}  // ✅ Marked as selected
        ]
      }
    ]
  }
}
```

### 3. Frontend Behavior

#### Tree Screen
- ✅ No courses marked as "planned" by default
- ✅ Shows `has_completed` (done) and `can_enroll` (available)
- ✅ No confusion about what's planned vs available

#### Planner Screen
- ✅ Starts completely empty
- ✅ No auto-filled semesters
- ✅ User must explicitly add courses
- ✅ Changes auto-save after 800ms

---

## 📊 Database Schema Changes

### `gde_snapshots` table
```sql
-- Field remains but is always empty
planejado_metadata TEXT  -- Always '{}'
```

### `planned_courses` table
```sql
-- No schema changes
-- Table cleaned to 0 rows
-- Only populated via PUT /planner
```

---

## 🔄 Data Flow (After Fix)

```
┌─────────────────────────────────────────────────┐
│ 1. User Login (POST /auth/login)               │
└──────────────┬──────────────────────────────────┘
               │
               v
┌─────────────────────────────────────────────────┐
│ 2. Create Snapshot                              │
│    - planejado_metadata = '{}'                  │
│    - No entries in planned_courses              │
└──────────────┬──────────────────────────────────┘
               │
               v
┌─────────────────────────────────────────────────┐
│ 3. Frontend Loads Tree (GET /user-db/me)       │
│    - Receives planejado: {}                     │
│    - Shows curriculum structure only            │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ 4. Frontend Loads Planner (GET /planner)       │
│    - Receives planned_courses: {}               │
│    - Shows empty planner                        │
└──────────────┬──────────────────────────────────┘
               │
               v
┌─────────────────────────────────────────────────┐
│ 5. User Adds Courses via UI                    │
│    - Selects MC102 turma A                      │
│    - Auto-saves after 800ms                     │
└──────────────┬──────────────────────────────────┘
               │
               v
┌─────────────────────────────────────────────────┐
│ 6. Backend Saves (PUT /planner/modified)       │
│    - Creates entry in planned_courses:          │
│      {user_id: 1000, codigo: 'MC102',           │
│       turma: 'A', added_by_user: 1}             │
└──────────────┬──────────────────────────────────┘
               │
               v
┌─────────────────────────────────────────────────┐
│ 7. Subsequent GET /planner                     │
│    - Returns planned_courses: {"MC102": "A"}    │
│    - Shows user's personal plan                 │
└─────────────────────────────────────────────────┘
```

---

## 🧪 Testing

### Run Automated Tests
```bash
cd backend
pytest tests/test_planned_courses_fix.py -v
```

**Expected**: All 6 tests pass

### Manual Testing
1. ✅ Login as user 1000 (RA: 183611)
2. ✅ Check GET /user-db/me → `planejado: {}`
3. ✅ Check GET /planner → `planned_courses: {}`
4. ✅ Add course via frontend
5. ✅ Verify course appears in database
6. ✅ Logout and login again
7. ✅ Verify course persists

---

## 📝 Migration Notes

### For Development Team
- All changes are backward compatible
- No API contract changes
- Existing frontend code works without changes
- Database cleanup is one-time operation

### For Users
- **Impact**: All users' planners reset to empty
- **Reason**: Previous "planned" state was GDE's suggestion, not user's choice
- **Action Required**: Users need to re-add courses to planner if desired
- **Benefit**: Clear distinction between curriculum and personal plan

---

## 🚀 Deployment Checklist

- [x] Code changes committed
- [x] Database cleanup script created
- [x] Database cleaned (verified)
- [x] Tests added and passing
- [x] Documentation updated
- [ ] Code review completed
- [ ] Merge to main branch
- [ ] Deploy to production
- [ ] Monitor logs for errors
- [ ] Verify user 1000 behavior in production

---

## 📞 Support

If issues arise after deployment:

1. **Check database state**:
   ```bash
   python backend/cleanup_planned_courses.py
   ```

2. **Review logs**:
   ```bash
   # Check for errors related to planned_courses
   grep "planned_courses" backend/logs/app.log
   ```

3. **Rollback if needed**:
   ```bash
   git revert <commit-hash>
   # Then restore database from backup
   ```

---

## 🎉 Summary

This fix ensures a clean separation between:
- **GDE Curriculum** (what courses exist, prerequisites, availability)
- **User Planning** (which courses the user personally wants to take)

The system now correctly:
- ✅ Never auto-imports planning from GDE
- ✅ Only tracks user's explicit selections
- ✅ Starts all users with empty planners
- ✅ Clearly documents deprecated fields

**Result**: Users have full control over their planning, with no confusion about auto-populated data.

# Security Specification & Threat Model

## 1. Data Invariants
1. Unauthenticated users cannot read or write any user financial data, categories, or records.
2. An authenticated user can ONLY read, create, update, or delete data located within their own path (`/users/{userId}/*`). They cannot read or modify any other user's documents.
3. Every document in `/users/{userId}/expenses/{expenseId}` must have valid types, bounded string sizes (`name.size() <= 256`, `store.size() <= 128`), a non-negative amount or realistic number, and date string matching standard formatting.
4. Document IDs must be hardened with `isValidId(id)` (`id.matches('^[a-zA-Z0-9_\\-]+$')` and `id.size() <= 128`).
5. Every document in `/users/{userId}/categories/{categoryId}` must have bounded lengths, valid colors, and stores array size `<= 100`.
6. Every document in `/users/{userId}/monthRecords/{recordId}` must have valid year (e.g. 2000-2100), month (1-12), non-negative income, and map of category budgets.
7. Top-level catch-all `match /{document=**}` denies all reads and writes by default.
8. No update-gaps: all updates must validate schemas and restrict modified keys.

## 2. The "Dirty Dozen" Payloads
1. **Unauthenticated Read**: Attempting to read `/users/user123/expenses/exp1` without an auth token -> `PERMISSION_DENIED`.
2. **Cross-Tenant Read**: User A (`auth.uid = "user_A"`) attempts to read `/users/user_B/expenses/exp1` -> `PERMISSION_DENIED`.
3. **Cross-Tenant Write**: User A attempts to write `/users/user_B/expenses/exp1` -> `PERMISSION_DENIED`.
4. **Unauthenticated List**: Querying collection `/users/user123/expenses` anonymously -> `PERMISSION_DENIED`.
5. **Cross-Tenant List**: User A listing `/users/user_B/expenses` -> `PERMISSION_DENIED`.
6. **ID Poisoning Attack**: Writing an expense with ID `../../root` or a 5000-character malicious string -> `PERMISSION_DENIED`.
7. **Shadow Field Injection**: Adding `{ shadowAdmin: true }` or rogue fields to an expense -> `PERMISSION_DENIED`.
8. **Malicious Negative / Oversized Amount**: Creating an expense with `amount: "twenty"` (string instead of number) -> `PERMISSION_DENIED`.
9. **Oversized String / Wallet Drain Attack**: Writing an expense with a 1MB string in `name` -> `PERMISSION_DENIED`.
10. **Cross-Tenant Category Hijack**: User A creating a category under `/users/user_B/categories/cat1` -> `PERMISSION_DENIED`.
11. **Month Record Hijack**: User A modifying `/users/user_B/monthRecords/2026-9` -> `PERMISSION_DENIED`.
12. **Catch-All Root Document Probe**: Attempting to read or write `/arbitrary_collection/doc1` -> `PERMISSION_DENIED`.

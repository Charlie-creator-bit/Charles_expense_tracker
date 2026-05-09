# Security Specification for Ledger.io

## Data Invariants
- A transaction (expense/income) must belong to a valid user (`userId` match).
- A user can only read and write their own data.
- Budget IDs are strictly formatted as `{userId}_{year}_{month}`.
- Timestamps must be server-generated on create.

## The Dirty Dozen Payloads (Rejection Tests)
1. **Identity Spoofing**: Attempt to create an expense where `userId` is NOT the auth user ID.
2. **PII Leak**: Attempt to read the `users` collection without being the owner of the document.
3. **Ghost Field Injection**: Attempt to write a transaction with an unauthorized field like `isVerified: true`.
4. **State Shortcutting**: Attempt to update a budget for a different user.
5. **Resource Poisoning**: Use a 2KB string as a transaction ID.
6. **Value Poisoning**: Set `amount` as a string instead of a number.
7. **Temporal Fraud**: Supply a manual `createdAt` date instead of `serverTimestamp()`.
8. **Orphaned Writes**: Create an account connection without being signed in.
9. **Identity Integrity update**: Attempt to change the `userId` field of an existing expense document.
10. **Unbounded List Exhaustion**: Attempt to query all expenses without a filter on `userId`.
11. **Account Poisoning**: Send a linked account with an invalid `type` (not bank or mobile_money).
12. **Out of Range data**: Set a budget month to `13`.

## The Test Runner (firestore.rules.test.ts)
```typescript
// Skeleton for security testing
// All "Dirty Dozen" payloads should return PERMISSION_DENIED
```

# Security Specification - Ledger.io

## Data Invariants
- Users can only access documents where the `userId` matches their `UID` or that reside within their own `/users/{userId}` subcollection path.
- All timestamps (`createdAt`, `updatedAt`) must be set using the server time `request.time`.
- `amount` in `Expense` and `Budget` must be a positive number.
- `month` in `Budget` must be between 0 and 11.
- `category` in `Expense` must be a non-empty string.

## Dirty Dozen Payloads (Rejection Tests)

1. **Identity Spoofing**: Attempt to create an expense for another user.
   ```json
   { "amount": 50, "userId": "victim_uid", "category": "Food", "description": "Lies", "date": "...", "createdAt": "serverTimestamp" }
   ```
2. **Accessing Other User's Data**: Authenticated User A trying to read User B's `/users/userB/expenses/expense1`.
3. **Invalid ID Poisoning**: Using a 2KB string as a document ID.
4. **Incorrect Type**: Setting `amount` as a string `"100"` instead of a number.
5. **Timestamp Replacement**: Trying to set `createdAt` to a past date instead of `request.time`.
6. **Shadow Fields**: Adding an `isVerified: true` field to the User profile that doesn't exist in schema.
7. **Budget Range Abuse**: Setting `month` to `13`.
8. **Negative Amount**: Setting `amount` to `-500`.
9. **Unauthenticated Write**: Trying to create an expense without a login token.
10. **Immutable Field Update**: User trying to change `userId` after creation of an expense.
11. **PII Leakage**: Generic `allow read: if isSignedIn()` allowing any user to scrape all emails.
12. **Status Shortcutting**: (Not applicable here as no status field, but could be "changing category to an admin-only value").

## Test Plan
- Run `firestore.rules.test.ts` to verify all rejection cases.
- Verify `isValidId` and `isValid[Entity]` helpers are applied.
- Ensure `hasOnly()` is used on updates to prevent rogue fields.

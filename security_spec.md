# Security Specification

## 1. Data Invariants
- A transaction must belong to a user and must be stored under their `/users/{userId}/transactions/{transactionId}` path.
- `userId` in the document must strictly match `request.auth.uid`.
- Timestamps (`createdAt`, `updatedAt`) must align with the server time (`request.time`).
- `userId` and `createdAt` are immutable after creation.
- A user can only access their own transactions. There is no shared access.

## 2. The "Dirty Dozen" Payloads

1. **Unauthenticated Write**: Missing `request.auth`.
2. **Identity Spoofing**: `userId` set to a different UID.
3. **Ghost Field Injection (Shadow Update)**: Sending an extra field like `isAdmin: true` or `verified: true`.
4. **Data Type Poisoning**: Providing a string for `amount` instead of a number.
5. **Path Poisoning**: Creating an extremely long string for `transactionId`.
6. **Denial of Wallet**: Array or String fields like `title` exceeding maximum allowed sizes.
7. **Missing Required Fields**: Neglecting to include `amount` or `date`.
8. **Invalid Enum**: `type` set to `DOG_COIN_PURCHASE`.
9. **Tampering with Immutable Fields**: Trying to change `createdAt` or `userId` during an update.
10. **Client-Foraged Timestamps**: Bypassing server constraints by passing an old timestamp for `createdAt`.
11. **PII Scope Leak** (N/A here as no PII besides UID, but test unauthorized listing of someone else's transactions).
12. **Incomplete Action Update**: Modifying `amount` without updating `updatedAt`.

## 3. Test Runner 

See `firestore.rules.test.ts` for full implementation.

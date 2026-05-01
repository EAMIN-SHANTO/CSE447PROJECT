# Cryptography and Security Requirements Traceability

This document traces the implementation of the 11 key security and cryptographic requirements within the backend codebase.

## 1. Login and Registration Modules
**Requirement:** The system must include Login and Registration modules for secure user authentication and account management.
**Implementation:** 
- **Registration:** Handled in `backend/controllers/auth.controller.js` (lines 229-340). The `register` function takes user details, verifies OTP if required, generates keys, encrypts profile data, hashes passwords, and saves the `User` model.
- **Login:** Handled in `backend/controllers/auth.controller.js` (lines 342-449). The `login` function validates primary credentials (email/password), handles account locking after 5 failed attempts (line 368), and initiates the 2FA challenge.

## 2. Encryption of User Information
**Requirement:** During registration, all user information (e.g., username, email, contact info) must be encrypted before storage and decrypted upon retrieval.
**Implementation:** 
- In `backend/controllers/auth.controller.js` (lines 288-299), user details (`email`, `fullName`, `contactInfo`) are sealed using the `sealProtectedRecord` method before saving to the database.
- It uses the ECC algorithm to encrypt data exclusively. The ciphertext and metadata are stored in `profileProtectedData`.

## 3. Password Hashing and Salting
**Requirement:** Passwords must be hashed and salted before storage.
**Implementation:** 
- The logic is implemented in `backend/lib/auth/password.js`.
- The `createPasswordHash` function (lines 20-34) generates a 16-byte random salt and applies PBKDF2 (`hashWithSalt`) with 120,000 iterations and SHA-512 to securely hash the password.
- Verification is done via `verifyPassword` (lines 36-53) using a timing-safe equality check (`crypto.timingSafeEqual`).

## 4. Two-Step Authentication (2FA)
**Requirement:** A verification function must enforce two-step authentication, validating both primary credentials and a second factor before granting access.
**Implementation:**
- Supported methods include Email OTP and TOTP (Authenticator App). 
- Primary credentials are verified first in the `login` function, which then returns a `challengeId` instead of an auth token (line 434).
- The `verifySecondFactor` function in `backend/controllers/auth.controller.js` (lines 451-512) completes the login by validating the TOTP code or the Email OTP challenge. 

## 5. Key Management Module
**Requirement:** A Key Management Module must handle key generation, distribution, storage, and rotation.
**Implementation:**
- Implemented in `backend/lib/crypto/key-manager.js`.
- **Generation & Storage:** `createKeyVersion` (lines 138-166) creates keys, encrypts private material using a Master RSA backup key, and stores metadata in the `KeyMetadata` collection.
- **Rotation:** `rotateKey` and `rotateKeySet` (lines 241-260) retire old keys (status `rotated`) and issue new versions for specific domains (e.g., user profiles, posts).
- **Retrieval:** `getActiveKey` (line 213) is used to distribute keys seamlessly at runtime to encryption processes.

## 6. Post and Profile Encryption
**Requirement:** Users must be able to create, view, and edit posts and view or update profiles, with all data automatically encrypted before storage and decrypted on retrieval.
**Implementation:**
- **Creation/Editing:** In `backend/controllers/post.controller.js`, the `createPost` function (lines 199-211) and `updatePost` function (lines 282-289) seal `title`, `desc`, `content`, and `img` using `sealProtectedRecord`.
- **Viewing/Retrieval:** The `openPostFields` helper function (lines 61-110) extracts the encrypted record and reconstructs plaintext safely via `openProtectedRecord` before returning it to the user.

## 7. Storage of Critical Data in Encrypted Form
**Requirement:** All critical data (user information, posts, keys, etc.) must be stored in encrypted form to prevent plaintext access even if the database is compromised.
**Implementation:**
- **Keys:** Private keys and MAC keys are encrypted via RSA Master key in `key-manager.js` (`backupEncrypt` at line 92).
- **Users/Posts:** Utilizing `sealProtectedRecord` found in `backend/lib/crypto/protected-record.js` (lines 26-56), which encrypts fields at the application layer via ECC before handing data over to MongoDB. 

## 8. Message Authentication Codes (MAC)
**Requirement:** Message Authentication Codes (MAC) such as CBC-MAC or HMAC must verify data integrity and detect unauthorized modifications.
**Implementation:**
- Implemented in `backend/lib/crypto/mac.js` (lines 19-37) via `hmacSha256`, standardizing block size and inner/outer hash padding explicitly.
- During encryption (`sealProtectedRecord`), each field and the overall record are signed with `hmacSha256Hex`.
- During decryption (`openProtectedRecord`, `protected-record.js` lines 58-78), MACs are aggressively verified before attempting decryption to prevent tampering or padding attacks.

## 9. Exclusive Use of Asymmetric Encryption
**Requirement:** The system must exclusively use asymmetric encryption algorithms (e.g., RSA and ECC); symmetric encryption is not allowed.
**Implementation:**
- Symmetric algorithms (like AES or ChaCha20) are entirely absent from the cryptography suite.
- `backend/lib/crypto/ecc.js` implements secp256k1 ECC arithmetic directly. The `eccEncrypt` function (lines 153-185) handles encryption using Elliptic Curve properties (Ephemeral Key Exchange and Keystream derivation) exclusively based on the recipient's public key.
- `backend/lib/crypto/rsa.js` handles textbook RSA encryption with arbitrary precision (`BigInt`). 

## 10. Multiple Asymmetric Algorithms Implementation
**Requirement:** The system must implement at least two different asymmetric encryption algorithms. A single algorithm cannot be used for all encryption operations.
**Implementation:**
- Both **ECC (secp256k1)** and **RSA** are built natively.
- **ECC:** Used for general payload encryption (User Profile data and Post contents in `protected-record.js` at line 34).
- **RSA:** Used to securely wrap and protect encryption Keys at rest (Backup Master Key in `key-manager.js` at line 96 via `rsaEncryptText`).

## 11. Role-Based Access Control (RBAC)
**Requirement:** Role-Based Access Control (RBAC) must define separate privileges for administrators and regular users to restrict sensitive operations.
**Implementation:**
- Implemented via the `authorizeRole` middleware in `backend/middleware/authorize-role.js` (lines 1-10).
- The system supports three roles: `user`, `staff`, and `admin`.
- Example usage restricts capabilities via `authorizeRole("admin", "staff")`. If the user's role array does not intersect with allowed roles, a `403 Forbidden` response is given.
- Hierarchical enforcement is maintained: `staff` can access moderation tools (disputes, users, post deletion) but cannot view audit logs or manage other `staff` or `admin` accounts. Only an `admin` can promote users to `staff` and view system audit logs.

## 12. Secure Session Management
**Requirement:** Secure session management must protect authentication tokens and prevent session hijacking.
**Implementation:**
- Implemented in `backend/lib/auth/session.js`.
- Upon login, an access token (JWT) and a refresh token are issued (`issueSessionTokens`, line 66).
- The `rotateRefreshToken` function (lines 111-174) verifies IP Address and User-Agent (`session.userAgent !== userAgent`). If a discrepancy or hijacking attempt is detected, the session is aggressively revoked (`session.revokedAt = new Date()`).
- The system stores token hashes to map issued tokens (`refreshTokenHash`), invalidating old tokens quickly to prevent replay attacks.

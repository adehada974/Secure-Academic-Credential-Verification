;; Credential Issuance Contract
;; Records degrees and certifications

(define-constant ERR_UNAUTHORIZED u403)
(define-constant ERR_NOT_FOUND u404)

;; Map to store credentials by hash
(define-map credentials
  { credential-hash: (buff 32) }
  {
    institution-id: (string-ascii 64),
    student-id: (string-ascii 64),
    credential-type: (string-ascii 20),
    issue-date: uint,
    expiration-date: uint,
    metadata: (string-ascii 256)
  }
)

;; Map to track institution authorization
(define-map authorized-institutions
  { institution-id: (string-ascii 64) }
  { authorized: bool }
)

;; Initialize contract with institution verification contract
(define-data-var institution-verification-contract principal tx-sender)

;; Set institution verification contract
(define-public (set-institution-verification-contract (contract-principal principal))
  (begin
    (asserts! (is-eq tx-sender (var-get institution-verification-contract)) (err ERR_UNAUTHORIZED))
    (ok (var-set institution-verification-contract contract-principal))
  )
)

;; Authorize an institution to issue credentials
(define-public (authorize-institution (institution-id (string-ascii 64)))
  (begin
    (asserts! (is-eq tx-sender (var-get institution-verification-contract)) (err ERR_UNAUTHORIZED))
    (ok (map-set authorized-institutions
      { institution-id: institution-id }
      { authorized: true }
    ))
  )
)

;; Check if institution is authorized
(define-read-only (is-institution-authorized (institution-id (string-ascii 64)))
  (default-to { authorized: false } (map-get? authorized-institutions { institution-id: institution-id }))
)

;; Issue a new credential
(define-public (issue-credential
    (credential-hash (buff 32))
    (institution-id (string-ascii 64))
    (student-id (string-ascii 64))
    (credential-type (string-ascii 20))
    (expiration-date uint)
    (metadata (string-ascii 256)))
  (begin
    (asserts! (get authorized (is-institution-authorized institution-id)) (err ERR_UNAUTHORIZED))
    (ok (map-insert credentials
      { credential-hash: credential-hash }
      {
        institution-id: institution-id,
        student-id: student-id,
        credential-type: credential-type,
        issue-date: block-height,
        expiration-date: expiration-date,
        metadata: metadata
      }
    ))
  )
)

;; Verify a credential exists and is valid
(define-read-only (verify-credential (credential-hash (buff 32)))
  (match (map-get? credentials { credential-hash: credential-hash })
    credential (ok {
      valid: (< block-height (get expiration-date credential)),
      credential: credential
    })
    (err ERR_NOT_FOUND)
  )
)

;; Revoke a credential
(define-public (revoke-credential (credential-hash (buff 32)))
  (begin
    (match (map-get? credentials { credential-hash: credential-hash })
      credential (begin
        (asserts! (is-eq tx-sender (var-get institution-verification-contract)) (err ERR_UNAUTHORIZED))
        (ok (map-set credentials
          { credential-hash: credential-hash }
          (merge credential { expiration-date: block-height })
        ))
      )
      (err ERR_NOT_FOUND)
    )
  )
)

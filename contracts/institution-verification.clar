;; Institution Verification Contract
;; This contract validates legitimate educational entities

(define-data-var admin principal tx-sender)

;; Map to store verified institutions
(define-map verified-institutions
  { institution-id: (string-ascii 64) }
  {
    name: (string-ascii 100),
    website: (string-ascii 100),
    verified: bool,
    verification-date: uint
  }
)

;; Add a new institution
(define-public (register-institution (institution-id (string-ascii 64)) (name (string-ascii 100)) (website (string-ascii 100)))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u403))
    (ok (map-insert verified-institutions
      { institution-id: institution-id }
      {
        name: name,
        website: website,
        verified: false,
        verification-date: u0
      }
    ))
  )
)

;; Verify an institution
(define-public (verify-institution (institution-id (string-ascii 64)))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u403))
    (match (map-get? verified-institutions { institution-id: institution-id })
      institution (ok (map-set verified-institutions
        { institution-id: institution-id }
        (merge institution {
          verified: true,
          verification-date: block-height
        })
      ))
      (err u404)
    )
  )
)

;; Check if an institution is verified
(define-read-only (is-institution-verified (institution-id (string-ascii 64)))
  (match (map-get? verified-institutions { institution-id: institution-id })
    institution (ok (get verified institution))
    (err u404)
  )
)

;; Get institution details
(define-read-only (get-institution-details (institution-id (string-ascii 64)))
  (map-get? verified-institutions { institution-id: institution-id })
)

;; Transfer admin rights
(define-public (transfer-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u403))
    (ok (var-set admin new-admin))
  )
)

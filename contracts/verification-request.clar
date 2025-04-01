;; Verification Request Contract
;; Manages inquiries from employers and other verifiers

(define-constant ERR_UNAUTHORIZED u403)
(define-constant ERR_NOT_FOUND u404)
(define-constant ERR_ALREADY_PROCESSED u409)

;; Map to store verification requests
(define-map verification-requests
  { request-id: uint }
  {
    requester: principal,
    credential-hash: (buff 32),
    request-date: uint,
    status: (string-ascii 10),
    response-date: uint
  }
)

;; Counter for request IDs
(define-data-var request-counter uint u0)

;; Reference to credential contract
(define-data-var credential-contract principal tx-sender)

;; Set credential contract
(define-public (set-credential-contract (contract-principal principal))
  (begin
    (asserts! (is-eq tx-sender (var-get credential-contract)) (err ERR_UNAUTHORIZED))
    (ok (var-set credential-contract contract-principal))
  )
)

;; Submit a verification request
(define-public (submit-request (credential-hash (buff 32)))
  (let ((request-id (+ (var-get request-counter) u1)))
    (var-set request-counter request-id)
    (ok (map-insert verification-requests
      { request-id: request-id }
      {
        requester: tx-sender,
        credential-hash: credential-hash,
        request-date: block-height,
        status: "pending",
        response-date: u0
      }
    ))
  )
)

;; Process a verification request
(define-public (process-request (request-id uint) (status (string-ascii 10)))
  (begin
    (asserts! (is-eq tx-sender (var-get credential-contract)) (err ERR_UNAUTHORIZED))
    (match (map-get? verification-requests { request-id: request-id })
      request (begin
        (asserts! (is-eq (get status request) "pending") (err ERR_ALREADY_PROCESSED))
        (ok (map-set verification-requests
          { request-id: request-id }
          (merge request {
            status: status,
            response-date: block-height
          })
        ))
      )
      (err ERR_NOT_FOUND)
    )
  )
)

;; Get request details
(define-read-only (get-request (request-id uint))
  (map-get? verification-requests { request-id: request-id })
)

;; Check if a request is verified
(define-read-only (is-request-verified (request-id uint))
  (match (map-get? verification-requests { request-id: request-id })
    request (ok (is-eq (get status request) "verified"))
    (err ERR_NOT_FOUND)
  )
)

# OCR & Statement Extraction Pipeline

**Status: not yet implemented.** This document is the design for Phase 5 ("Documents and extraction"), written now so the schema (already migrated — see [DATABASE.md](./DATABASE.md)) and the eventual implementation agree on the contract. Nothing in this document describes running code yet.

## Provider interface

An `OCRProvider` interface (to live in `src/services/ocr/`) will abstract three interchangeable engines, selected by platform/availability — the app must keep working with the optional/server engines disabled:

```ts
interface OCRProvider {
  extractText(input: OCRInput): Promise<OCRResult>;
  supportsCancellation: boolean;
}
```

- **Native (mobile):** on-device Google ML Kit text recognition, supporting Latin and Devanagari scripts. This requires native modules and therefore an **Expo development build** — it will never work in Expo Go, and the implementation must not pretend otherwise.
- **Web:** PDF.js for PDFs that already contain selectable text (no OCR needed — direct text extraction); Tesseract.js for image OCR and for scanned PDF pages rendered to images first. Runs in a Web Worker so the UI thread stays responsive, reports progress, and is cancellable.
- **Server fallback (optional):** a Supabase Edge Function, kept small, time-boxed, and page-count-limited, with temporary files deleted after processing. Never load-bearing — the app must function with this disabled, per the free-first architecture requirement.

All three are swappable behind the same interface so a future paid AI provider could be added as a fourth without touching call sites.

## Pipeline (maps directly to the `documents` → `extraction_jobs` → `extracted_statements` → `extracted_transactions` tables)

1. User selects/photographs a file (`expo-document-picker` / `expo-image-picker`).
2. Validate MIME type, size, and page count against `MAX_UPLOAD_MB` / `MAX_PDF_PAGES`.
3. Compute a SHA-256 hash client-side; check `documents.sha256_hash` for a duplicate before uploading.
4. Compress oversized images.
5. Upload to the private `documents` storage bucket (see [SECURITY.md](./SECURITY.md)).
6. Create a `documents` row, then an `extraction_jobs` row (`status = 'queued'`).
7. Determine whether a PDF has selectable text (PDF.js) — extract directly if so; otherwise OCR.
8. Detect document type, institution, account, statement period, opening/closing balance.
9. Detect the transaction table header row and extract rows into `extracted_transactions`.
10. Normalise dates and amounts; detect debit/credit direction and running balance.
11. Suggest a counterparty (fuzzy-matched against `counterparties`/`counterparty_aliases` — see below) and a category per row.
12. Check for duplicates against existing `financial_transactions` and flag them (`is_duplicate`, `duplicate_of_transaction_id`).
13. Reconcile: opening balance + credits − debits should equal closing balance; store the exact difference when it doesn't (`extracted_statements.reconciliation_diff_minor`).
14. Assign a confidence level (`high` / `medium` / `low` / `missing`) per field (`field_confidence` jsonb) and per row (`row_confidence`).
15. Present everything in the review queue (see below). **Nothing is written to `financial_transactions` until the user explicitly confirms it** — this is enforced by the review workflow, not just a UI convention: `extracted_transactions.confirmed_financial_transaction_id` is only ever set as a result of a user action.
16. On confirmation, insert the real `financial_transactions` + `ledger_entries` rows and mark the extracted row `review_status = 'confirmed'`. An audit trail (`audit_logs`) records that the transaction originated from an import.

## Review interface (planned)

- **Desktop:** original PDF/image on the left, extracted table on the right.
- **Mobile:** three tabs — document preview, extracted rows, validation.
- Capabilities: edit every field, bulk category/counterparty assignment, select/confirm/reject rows, merge duplicates, split one row, combine rows, mark transfers, link a row to a loan repayment, save an import rule, highlight low-confidence fields with a non-color indicator (icon + label, not color alone), show reconciliation errors with the exact mismatch amount, and undo.

## Counterparty recognition

Normalisation before matching: trim, consistent casing, strip punctuation and bank-specific filler words, strip transaction IDs while preserving meaningful account fragments. Compared first against `counterparty_aliases` (exact), then fuzzy-matched (Fuse.js) against `counterparties.display_name` and aliases, with a confidence score. **A suggested match is never auto-applied** — the user confirms it, and only then is a new row written to `counterparty_aliases` (`source = 'import_confirmed'`) so the same raw description resolves automatically next time. Two people are never merged automatically.

## Validation checks (planned, informing `extracted_statements.reconciliation_status`)

Opening balance + credits − debits = closing balance; running-balance continuity; duplicate statement/transaction/reference detection; same date+amount+description collisions; missing date/amount; both debit and credit present on one row; transaction date outside the statement period; invalid number format / wrong decimal separator; unsupported currency; suspiciously large amount; low-confidence account number; unrecognised table layout (falls back to manual mapping via an `import_profiles` row).

## Nepal-specific note

`import_profiles` is deliberately generic (institution name, column mapping, date format, decimal/thousands separator, header pattern) rather than one hardcoded bank's layout, so additional Nepali banks, wallets (eSewa, Khalti, IME Pay, ...), and cooperatives can be supported by adding a profile row, not by shipping a code change.

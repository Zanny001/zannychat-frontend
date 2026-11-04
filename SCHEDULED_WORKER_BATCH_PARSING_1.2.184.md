# Scheduled-message worker batch parsing — 1.2.184

The worker batch-size setting now accepts plain decimal digits only after trimming surrounding whitespace. Exponent notation (for example `2e2`), hexadecimal, signs, decimal fractions, non-finite values, zero, and values above 500 fall back to the safe default of 100. This prevents environment configuration from being interpreted through JavaScript's broader numeric-string syntax.

Validation: scheduled-message worker unit tests cover accepted values, whitespace normalization, and invalid syntax. This source change does not apply database migrations or deploy the worker.

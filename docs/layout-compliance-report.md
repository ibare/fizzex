# Fizzex Layout Compliance Report
Generated: 2026-09-10

## Summary
- Compliance Score: **83%**
- Passed: 34 / 53 assertions
- Failed: 7 | Known Fail: 11 | Skipped: 1

## Category Results
| Category | Pass | Fail | Known Fail | Skip | Score |
|----------|------|------|------------|------|-------|
| fraction | 7 | 0 | 3 | 1 | 100% |
| superscript | 4 | 0 | 1 | 0 | 100% |
| subscript | 3 | 0 | 0 | 0 | 100% |
| subsup | 2 | 0 | 0 | 0 | 100% |
| prescript | 4 | 0 | 0 | 0 | 100% |
| radical | 2 | 0 | 2 | 0 | 100% |
| accent | 2 | 0 | 1 | 0 | 100% |
| overline | 2 | 0 | 0 | 0 | 100% |
| delimiter | 0 | 2 | 0 | 0 | 0% |
| limits | 3 | 0 | 0 | 0 | 100% |
| integral | 5 | 5 | 0 | 0 | 50% |
| spacing | 0 | 0 | 4 | 0 | 0% |

## Top Issues
- **[delim-frac] delimiter_covers_content**: expected true, got null
- **[delim-frac] delimiter_centered_on_axis**: expected 0.25, got null
- **[int-italic-correction] sub_x_offset**: expected integral.right - italicCorr, got null
- **[int-italic-correction] sup_x_offset**: expected integral.right, got null
- **[iint-display] nolimits_style**: expected true, got null
- **[oint-display] nolimits_style**: expected true, got null
- **[int-inline] nolimits_style**: expected true, got null

## Known Failures
Total: 11 assertions

- [frac-display-num-shift] denominator_shift_down: denominator_shift_down: expected 0.6860, got 0.9460 (diff: 0.2600, tolerance: 0.02)
- [frac-text-shift] denominator_shift_down: denominator_shift_down: expected 0.3450, got 0.7048 (diff: 0.3598, tolerance: 0.02)
- [frac-nested] inner_frac_style: inner_frac_style: 측정값 없음 (expected text)
- [sup-cramped] inner_style_is_cramped: inner_style_is_cramped: expected true, got null
- [sqrt-display] content_rule_clearance_min: content_rule_clearance_min: expected 0.1477, got 0.0800 (diff: 0.0677, tolerance: 0.01)
- [sqrt-display] content_style_is_cramped: content_style_is_cramped: expected true, got null
- [hat-lowercase] content_style_is_cramped: content_style_is_cramped: expected true, got null
- [spacing-rel] space_around_rel: space_around_rel: 측정값 없음 (expected 0.2777777777777778)
- [spacing-bin] space_around_bin: space_around_bin: 측정값 없음 (expected 0.2222222222222222)
- [spacing-script-suppressed] space_around_bin: space_around_bin: 측정값 없음 (expected 0)
- [spacing-unary-minus] space_before_ord: space_before_ord: 측정값 없음 (expected 0)

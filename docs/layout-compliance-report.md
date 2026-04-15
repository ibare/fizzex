# Fizzex Layout Compliance Report
Generated: 2026-04-14

## Summary
- Compliance Score: **63%**
- Passed: 20 / 49 assertions
- Failed: 12 | Known Fail: 11 | Skipped: 6

## Category Results
| Category | Pass | Fail | Known Fail | Skip | Score |
|----------|------|------|------------|------|-------|
| fraction | 6 | 0 | 3 | 2 | 100% |
| superscript | 4 | 0 | 1 | 0 | 100% |
| subscript | 3 | 0 | 0 | 0 | 100% |
| subsup | 0 | 0 | 1 | 1 | 0% |
| radical | 1 | 0 | 1 | 2 | 100% |
| accent | 2 | 0 | 1 | 0 | 100% |
| overline | 1 | 0 | 0 | 1 | 100% |
| delimiter | 0 | 2 | 0 | 0 | 0% |
| limits | 3 | 0 | 0 | 0 | 100% |
| integral | 0 | 10 | 0 | 0 | 0% |
| spacing | 0 | 0 | 4 | 0 | 0% |

## Top Issues
- **[delim-frac] delimiter_covers_content**: expected true, got null
- **[delim-frac] delimiter_centered_on_axis**: expected 0.25, got null
- **[int-display-limits] subscript_shift_down**: expected 0.15, got null
- **[int-display-limits] superscript_shift_up**: expected 0.413, got null
- **[int-italic-correction] sub_x_offset**: expected integral.right - italicCorr, got null
- **[int-italic-correction] sup_x_offset**: expected integral.right, got null
- **[iint-display] subscript_shift_down**: expected 0.15, got null
- **[iint-display] nolimits_style**: expected true, got null
- **[oint-display] subscript_shift_down**: expected 0.15, got null
- **[oint-display] nolimits_style**: expected true, got null

## Known Failures
Total: 11 assertions

- [frac-display-num-shift] denominator_shift_down: denominator_shift_down: expected 0.6860, got 0.9460 (diff: 0.2600, tolerance: 0.02)
- [frac-text-shift] denominator_shift_down: denominator_shift_down: expected 0.3450, got 0.7048 (diff: 0.3598, tolerance: 0.02)
- [frac-nested] inner_frac_style: inner_frac_style: 측정값 없음 (expected text)
- [sup-cramped] inner_style_is_cramped: inner_style_is_cramped: expected true, got null
- [subsup-gap] sup_bottom_with_sub: sup_bottom_with_sub: expected 0.3448, got 0.2578 (diff: 0.0870, tolerance: 0.01)
- [sqrt-display] content_style_is_cramped: content_style_is_cramped: expected true, got null
- [hat-lowercase] content_style_is_cramped: content_style_is_cramped: expected true, got null
- [spacing-rel] space_around_rel: space_around_rel: 측정값 없음 (expected 0.2777777777777778)
- [spacing-bin] space_around_bin: space_around_bin: 측정값 없음 (expected 0.2222222222222222)
- [spacing-script-suppressed] space_around_bin: space_around_bin: 측정값 없음 (expected 0)
- [spacing-unary-minus] space_before_ord: space_before_ord: 측정값 없음 (expected 0)

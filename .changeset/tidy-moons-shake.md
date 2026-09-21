---
"fizzex": minor
---

feat: `\max` and friends are now limit operators, not functions

**Breaking for hosts that read the AST.** `\max`, `\min`, `\sup`, `\inf`,
`\limsup`, `\liminf`, `\det`, `\gcd` and `\Pr` used to parse as `FuncNode`.
They now produce a new `MathOpNode` (`type: 'mathop'`), exported from `fizzex`
and `fizzex/compute` alongside the other node types.

In TeX these are `\mathop`, not functions. Treating them as functions meant they
swallowed whatever followed as an argument, and their subscripts landed beside
the operator instead of under it — silently, with no error or warning:

| Input | Before | After |
| --- | --- | --- |
| `\max_{x \in S} f(x)` | subscript to the right | limits under the operator |
| `\max f(x)` | `\max(f)(x)` | `\max f(x)` |
| `\max\{1, 2\}` | `\max({)1,2}` — not valid LaTeX | `\max\{1,2\}` |
| `\limsup_{n} a_n` | rendered as `lim` | rendered as `lim sup` |

`\limsup` and `\liminf` had collapsed into `\lim`, so the two were
indistinguishable in both rendering and round-trip output.

Placement follows TeX Rule 13/18 — limits go above and below in display style,
and to the side otherwise.

### Set notation

`\{...\}`, `\left\{...\right\}` and `\lbrace...\rbrace` now parse as a brace
group instead of dropping the braces. `\left\{1,2,3\right\}` used to fail with
`Unmatched \right`. An unmatched brace still renders as a glyph, so existing
formulas keep working.

Across the corpus: parsing 74.8% → 75.6%, round-trip 65.6% → 66.9%, and
round-trip on Wikipedia formulas 45.0% → 48.2%.

### Evaluation

Extremes now compute instead of returning `unsupported`:

```
\max(3, 7, 5)                 → 7
\gcd(12, 18, 27)              → 3
\max_{i=1}^{4} i              → 4
\max_{x \in \{1,2,3\}} x^2    → 9
\max_{x \in [0,3]} x \cdot (3-x)  → 2.25   (numeric, no global optimum guarantee)
```

Addition stays outside the operator and multiplication goes inside, the way
`\sum` reads: `\max_{i=1}^{3} i + 10` is `13`.

`\det`, `\Pr`, `\limsup` and `\liminf` still return `unsupported` — determinants,
probability measures and limit points are each their own problem, and a made-up
number is worse than none. Derivatives of `max`/`min` are undefined where the
arguments cross, and complex numbers have no total order, so those paths report
`unsupported` too.

### Typesetting fixes

- SVG output honours `displayMode`. `renderLatexToSVG(latex, { displayMode: 'inline' })`
  used to return the display layout regardless; inline math no longer pushes the
  line height.
- `\sum` and `\prod` get the gap TeX asks for between the operator and its
  limits. The spacing was being written into a value the layout never read, so
  the symbol sat flush against its bounds.
- An unmatched `\{` serialises back as `\{` rather than a bare `{`, which would
  otherwise start a group when the output is handed to LaTeX or KaTeX.

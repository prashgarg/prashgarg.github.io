# Editable CV

`CV.tex` is the author-supplied LaTeX source, updated in September 2026.
It uses the existing ModernCV classic layout. Keep its papers, affiliations,
contact information, awards, and presentations synchronized with
`src/data/site.ts` and the author's updates.

This directory is stored locally and in GitHub. Astro does not publish it:
the website serves only the compiled `public/cv.pdf`. Keep TeX source,
auxiliary files, and logs outside `public/`.

## Build

Requires a TeX installation with ModernCV and its dependencies, plus latexmk.
From the repository root:

```sh
cv_build_dir="$(mktemp -d /tmp/prashantgarg-cv.XXXXXX)"
latexmk -pdf -interaction=nonstopmode -halt-on-error \
  -outdir="$cv_build_dir" documents/cv/CV.tex
cp "$cv_build_dir/CV.pdf" public/cv.pdf
```

Inspect every PDF page before publishing, and check for LaTeX overflow
warnings. Then run the normal website build and verify its PDF download.
The GitHub Pages workflow deploys the checked-in PDF; it does not compile TeX.

The 17–18 September 2026 MPWZ presentation retains the author-supplied URL,
which currently describes the 2025 workshop. Replace it in both the source
and `src/data/site.ts` when the corrected event link is available.

# sml-pereira.github.io

Source for my personal academic site: research in music theory and computational
musicology, publications, conference talks, compositions, and the code behind
them.

**Live at [sml-pereira.github.io](https://sml-pereira.github.io)**

## Structure

Static HTML, CSS and JavaScript. No frameworks, no build step, no dependencies —
the files served are the files in this repository.

```
index.html              home
research.html           publications, theses, talks, software
compositions.html       scores, recordings, video
code.html               software projects
about.html              biography, contact, CV
404.html                custom error page, served by GitHub Pages

css/style.css           single stylesheet, themed with CSS custom properties
js/main.js              theme toggle, navigation, scroll animations
assets/                 PDFs, audio, images, icons
assets/cv-source/       LaTeX source for the CV
robots.txt              crawler directives
sitemap.xml             page index for search engines
manifest.json           web app manifest
```

Light and dark themes are driven by a `data-theme` attribute on `<html>`, with
the reader's preference kept in `localStorage` and the system setting honoured
on first visit. Responsive breakpoints sit at 768px, 640px and 380px.

## Running it locally

Any static file server will do:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>. Pushing to `main` redeploys through GitHub
Pages, normally within a minute.

## The CV

`assets/cv-samuel-pereira.pdf` is compiled from
`assets/cv-source/cv-samuel-pereira.tex` with XeLaTeX. The source calls for
EB Garamond and Inter by name, so both typefaces must be visible to the TeX
installation — on a machine without them, the compile stops at a missing-font
error rather than substituting.

## Colophon

Set in EB Garamond and Inter. Built with assistance from Claude Code for cleanup and deployment; all content, research and
editorial decisions are my own.

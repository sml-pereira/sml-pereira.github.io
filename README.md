# sml-pereira.github.io

Source for my personal academic site: research in music theory and computational
musicology, publications, conference talks, compositions, and the code behind
them.

**Live at [sml-pereira.github.io](https://sml-pereira.github.io)**

## Structure

Static HTML, CSS and JavaScript. No frameworks, no build step, no dependencies (the files served are the files in this repository).

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

## Colophon

Set in EB Garamond and Inter. Built with assistance from Claude Code for cleanup and deployment; all content, research and
editorial decisions are my own.

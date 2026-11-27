# Changelog

## Unreleased

## 0.1.0 - 2026-11-28

- Initial `@fos-icons/svelte` package for Svelte 5.20 and later.
- 1,593 canonical icons in four styles (fos-icons@8f0713c), generated as 6,372 JavaScript component
  modules with one shared Svelte renderer, avoiding per-icon `.svelte` files
  and their Vite dependency-optimization overhead.
- Typed root, style, and individual imports with tree-shakeable ESM exports.
- Size, color, primary/secondary/modifier color, and stroke-width customization.
- Decorative defaults, accessible titles, and native SVG attributes and events.
- Unique, hydration-stable title, mask, and clip-path IDs.
- Digest-verified, revision-recorded source snapshot and repeatable local builds.
- Packed-package Vite checks for mixed root/subpath imports, dependency
  optimization, client/server builds, and hydration.

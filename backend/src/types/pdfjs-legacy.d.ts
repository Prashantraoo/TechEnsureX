// pdfjs-dist ships types only for its main (browser) build entrypoint,
// but Node.js must import the "legacy" build instead (the main build
// references DOM globals like DOMMatrix that don't exist in Node — see
// pdf-render.service.ts). Same API surface, so the main build's types
// apply directly.
declare module "pdfjs-dist/legacy/build/pdf.mjs" {
  export * from "pdfjs-dist";
}

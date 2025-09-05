PDF generation scripts

- generate-policy-pdf.js: reads markdown from `src/policies/*.md`, converts to HTML using `marked`, and generates a PDF into `public/policies/` using Puppeteer.

Usage:

1. Install dev dependencies (puppeteer may download a Chromium binary):

   npm install

2. Run the generator:

   npm run generate:policy

Output:

- The generated PDF will be placed at `public/policies/activities-and-social-engagement-policy.pdf`.

Notes:

- Puppeteer downloads Chromium by default; if you prefer to use an existing Chrome binary, set the `PUPPETEER_EXECUTABLE_PATH` environment variable before running the script.

# The Google Sheet is the only content store

All content (Locales, Emprendimientos, and anything added later) lives in one Google Sheet that the Curadores edit, with one tab per kind. The site reads each tab's "Publish to web" CSV directly from the browser on every page load. The repository holds code only: no content, no images, no generated data files. This lets non-developer Curadores edit with Google Sheets permissions and see changes within minutes, with no build step, at no cost. In exchange, the site depends on Google being up and on the sheet's header row staying stable.

## Consequences

- Images are out of scope until there is a place to host them other than the repo.
- Renaming or deleting a column in the sheet can break the site, so the header row is part of the site's contract.

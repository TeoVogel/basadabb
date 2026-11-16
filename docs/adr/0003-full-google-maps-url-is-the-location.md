# A Local's location is its full Google Maps URL

Each Local's location is stored in a single cell: the full desktop `google.com/maps/place/…` URL of the real business. The site reads the pin coordinates from that URL's `!3d<lat>!4d<lng>` segment and uses the URL itself as the "Abrir en Google Maps" link, so visitors land on the actual business listing. This gives Curadores one thing to paste instead of coordinates plus a link, and needs no geocoding or Places API. The trade-offs: the `!3d!4d` format is undocumented and Google could change it, and phone-shared short links (`maps.app.goo.gl`) can't be read from the browser, so they get a search link and no pin.

## Consequences

- If Google changes the URL format, pins disappear but links keep working. The fix is in the parser, not the data.
- Expanding short links (for example with an Apps Script in the sheet) is a possible later improvement.

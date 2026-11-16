// Helpers shared by every tab of the Curadores' published sheet: pure, with
// no DOM, network or Leaflet dependencies.

/**
 * Splits CSV text into rows of raw field strings. Handles quoted fields with
 * embedded commas, line breaks and doubled quotes, CRLF or LF line endings,
 * and a leading byte-order mark.
 */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  const input = text.replace(/^\uFEFF/, "");

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === '"' && input[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && input[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export function columnLookup(header) {
  const indices = new Map(header.map((nombre, i) => [normalizeHeader(nombre), i]));
  return (row, columna) => {
    const i = indices.get(normalizeHeader(columna));
    return i === undefined ? "" : (row[i] ?? "").trim();
  };
}

function normalizeHeader(nombre) {
  return nombre.trim().toLocaleUpperCase("es");
}

const INSTAGRAM_HANDLE = /^[a-z0-9._]{1,30}$/i;
const INSTAGRAM_RUTAS_RESERVADAS = new Set(["p", "reel", "reels", "stories", "tv", "explore"]);

/**
 * Accepts a full profile URL (with or without scheme, subdomain, query string
 * or fragment), an @handle or a bare handle, and returns the canonical
 * profile URL, or undefined when the cell does not name a profile.
 */
export function normalizeInstagram(valor) {
  const sinEsquema = valor.replace(/[?#].*$/, "").replace(/^[a-z]+:\/\//i, "");
  let handle;
  if (sinEsquema.includes("/")) {
    const [host, primerSegmento] = sinEsquema.split("/");
    if (!/^([a-z0-9-]+\.)*instagram\.com$/i.test(host)) return undefined;
    handle = primerSegmento;
  } else {
    handle = sinEsquema.replace(/^@/, "");
  }
  if (!INSTAGRAM_HANDLE.test(handle) || INSTAGRAM_RUTAS_RESERVADAS.has(handle.toLowerCase())) {
    return undefined;
  }
  return `https://www.instagram.com/${handle}/`;
}

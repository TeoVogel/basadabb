// The CSV-to-Locales core: pure, with no DOM, network or Leaflet
// dependencies. See GLOSSARY.md for the domain terms and docs/adr/ for why
// the sheet is shaped the way it is.
//
// parseLocales(csvText) returns the Locales sorted by nombre (Spanish
// collation). Each Local has:
//   nombre           string, always present
//   tipo             string, absent when empty
//   opcionesVeganas  string, absent when empty
//   observaciones    string, absent when empty
//   verificacion     { anio, mes }, absent when the date is empty or invalid
//   instagramUrl     "https://www.instagram.com/<handle>/", absent when empty
//   mapsUrl          the place URL from LINK MAPS, or a search URL; always present
//   coordenadas      { lat, lng }, only when LINK MAPS has a !3d!4d segment

const CIUDAD = "Bahía Blanca";
const ORDEN = new Intl.Collator("es");

const COLUMNAS = {
  nombre: "NOMBRE DEL LOCAL",
  tipo: "TIPO",
  opcionesVeganas: "QUÉ OPCIONES TIENE?",
  observaciones: "OBSERVACIONES",
  instagram: "LINK INSTAGRAM",
  maps: "LINK MAPS",
  fecha: "FECHA ACTUALIZACIÓN",
};

/** @param {string} csvText the published Locales tab, as CSV */
export function parseLocales(csvText) {
  const [header = [], ...rows] = parseCsv(csvText);
  const celda = columnLookup(header);
  const locales = [];
  for (const row of rows) {
    const nombre = celda(row, COLUMNAS.nombre);
    if (!nombre) continue;
    const local = { nombre };
    for (const campo of ["tipo", "opcionesVeganas", "observaciones"]) {
      const valor = celda(row, COLUMNAS[campo]);
      if (valor) local[campo] = valor;
    }
    const verificacion = parseVerificacion(celda(row, COLUMNAS.fecha));
    if (verificacion) local.verificacion = verificacion;
    const instagramUrl = normalizeInstagram(celda(row, COLUMNAS.instagram));
    if (instagramUrl) local.instagramUrl = instagramUrl;
    const mapsCelda = celda(row, COLUMNAS.maps);
    if (isPlaceUrl(mapsCelda)) {
      local.mapsUrl = mapsCelda;
      const coordenadas = coordinatesFromPlaceUrl(mapsCelda);
      if (coordenadas) local.coordenadas = coordenadas;
    } else {
      local.mapsUrl = searchUrl(nombre);
    }
    locales.push(local);
  }
  return locales.sort((a, b) => ORDEN.compare(a.nombre, b.nombre));
}

/**
 * Splits CSV text into rows of raw field strings. Handles quoted fields with
 * embedded commas, line breaks and doubled quotes, CRLF or LF line endings,
 * and a leading byte-order mark.
 */
function parseCsv(text) {
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

function columnLookup(header) {
  const indices = new Map(header.map((nombre, i) => [normalizeHeader(nombre), i]));
  return (row, columna) => {
    const i = indices.get(normalizeHeader(columna));
    return i === undefined ? "" : (row[i] ?? "").trim();
  };
}

function normalizeHeader(nombre) {
  return nombre.trim().toLocaleUpperCase("es");
}

/** Reads a `YYYY/MM/DD` date and keeps its year and month, if it is a real date. */
function parseVerificacion(valor) {
  const match = valor.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (!match) return undefined;
  const [anio, mes, dia] = match.slice(1).map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  if (fecha.getUTCMonth() !== mes - 1 || fecha.getUTCDate() !== dia) return undefined;
  return { anio, mes };
}

const INSTAGRAM_HANDLE = /^[a-z0-9._]{1,30}$/i;
const INSTAGRAM_RUTAS_RESERVADAS = new Set(["p", "reel", "reels", "stories", "tv", "explore"]);

/**
 * Accepts a full profile URL (with or without scheme, subdomain, query string
 * or fragment), an @handle or a bare handle, and returns the canonical
 * profile URL, or undefined when the cell does not name a profile.
 */
function normalizeInstagram(valor) {
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

/** A full desktop Google Maps place URL, e.g. https://www.google.com/maps/place/… */
function isPlaceUrl(valor) {
  let url;
  try {
    url = new URL(valor);
  } catch {
    return false;
  }
  return (
    (url.protocol === "https:" || url.protocol === "http:") &&
    /^(www\.)?google\.com(\.[a-z]{2})?$/i.test(url.hostname) &&
    url.pathname.startsWith("/maps/place/")
  );
}

/** Reads the undocumented `!3d<lat>!4d<lng>` segment (ADR-0003). */
function coordinatesFromPlaceUrl(url) {
  const match = url.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (!match) return undefined;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return undefined;
  return { lat, lng };
}

function searchUrl(nombre) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${nombre} ${CIUDAD}`)}`;
}

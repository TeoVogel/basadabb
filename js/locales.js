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
//   honoresVeganos   true when the HONORES VEGANOS checkbox is ticked, else absent
//   verificacion     { anio, mes }, absent when the date is empty or invalid
//   instagramUrl     "https://www.instagram.com/<handle>/", absent when empty
//   mapsUrl          the place URL from LINK MAPS, or a search URL; always present
//   coordenadas      { lat, lng }, only when LINK MAPS has a !3d!4d segment

import { columnLookup, normalizeInstagram, parseCsv } from "./hoja.js";

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
  honores: "HONORES VEGANOS",
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
    if (celda(row, COLUMNAS.honores).toUpperCase() === "TRUE") local.honoresVeganos = true;
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

/** Reads a `YYYY/MM/DD` date and keeps its year and month, if it is a real date. */
function parseVerificacion(valor) {
  const match = valor.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (!match) return undefined;
  const [anio, mes, dia] = match.slice(1).map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  if (fecha.getUTCMonth() !== mes - 1 || fecha.getUTCDate() !== dia) return undefined;
  return { anio, mes };
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

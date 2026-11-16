// The CSV-to-Emprendimientos core: pure, with no DOM, network or Leaflet
// dependencies. See GLOSSARY.md for the domain terms.
//
// parseEmprendimientos(csvText) returns the Emprendimientos sorted by nombre
// (Spanish collation). Each Emprendimiento has:
//   nombre           string, always present
//   tipo             string from the RUBRO column, absent when empty
//   opcionesVeganas  string from QUÉ OFRECE, absent when empty
//   instagramUrl     "https://www.instagram.com/<handle>/", absent when empty

import { columnLookup, normalizeInstagram, parseCsv } from "./hoja.js";

const ORDEN = new Intl.Collator("es");

const COLUMNAS = {
  nombre: "NOMBRE DEL EMPRENDIMIENTO",
  tipo: "RUBRO",
  opcionesVeganas: "QUÉ OFRECE",
  instagram: "INSTAGRAM",
};

/** @param {string} csvText the published Emprendimientos tab, as CSV */
export function parseEmprendimientos(csvText) {
  const [header = [], ...rows] = parseCsv(csvText);
  const celda = columnLookup(header);
  const emprendimientos = [];
  for (const row of rows) {
    const nombre = celda(row, COLUMNAS.nombre);
    if (!nombre) continue;
    const emprendimiento = { nombre };
    for (const campo of ["tipo", "opcionesVeganas"]) {
      const valor = celda(row, COLUMNAS[campo]);
      if (valor) emprendimiento[campo] = valor;
    }
    const instagramUrl = normalizeInstagram(celda(row, COLUMNAS.instagram));
    if (instagramUrl) emprendimiento.instagramUrl = instagramUrl;
    emprendimientos.push(emprendimiento);
  }
  return emprendimientos.sort((a, b) => ORDEN.compare(a.nombre, b.nombre));
}

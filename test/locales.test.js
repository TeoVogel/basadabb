import { test } from "node:test";
import assert from "node:assert/strict";
import { parseLocales } from "../js/locales.js";

const HEADER =
  "NOMBRE DEL LOCAL,TIPO,LINK MAPS,QUÉ OPCIONES TIENE?,LINK INSTAGRAM,FECHA ACTUALIZACIÓN,OBSERVACIONES";

const csv = (...lines) => lines.join("\n");

test("a row with only a name becomes a Local with a search Maps link", () => {
  const locales = parseLocales(csv(HEADER, "Café Verde,,,,,,"));
  assert.deepEqual(locales, [
    {
      nombre: "Café Verde",
      mapsUrl:
        "https://www.google.com/maps/search/?api=1&query=Caf%C3%A9%20Verde%20Bah%C3%ADa%20Blanca",
    },
  ]);
});

test("blank rows, nameless rows and trailing FALSE-only rows are skipped", () => {
  const locales = parseLocales(
    csv(HEADER, "Café Verde,,,,,,", ",,,,,,", "   ,Café,,algo,,,", ",FALSE,,,,,FALSE", "", ""),
  );
  assert.deepEqual(
    locales.map((l) => l.nombre),
    ["Café Verde"],
  );
});

test("columns are found by header name regardless of order, case and surrounding whitespace", () => {
  const locales = parseLocales(
    csv(
      "  observaciones ,ZONA, Tipo,qué opciones tiene?  ,nombre del local,NO APTO",
      " Pedir sin queso , Centro , Café , Tostado vegano ,  Café Verde  ,FALSE",
    ),
  );
  assert.equal(locales.length, 1);
  assert.equal(locales[0].nombre, "Café Verde");
  assert.equal(locales[0].tipo, "Café");
  assert.equal(locales[0].opcionesVeganas, "Tostado vegano");
  assert.equal(locales[0].observaciones, "Pedir sin queso");
});

test("unknown columns are ignored and empty or missing optional fields are absent", () => {
  const locales = parseLocales(
    csv("NOMBRE DEL LOCAL,TIPO,ZONA", "Café Verde,  ,Centro"),
  );
  assert.deepEqual(Object.keys(locales[0]).sort(), ["mapsUrl", "nombre"]);
});

test("Locales are sorted alphabetically by name, with accents and case handled the Spanish way", () => {
  const locales = parseLocales(
    csv("NOMBRE DEL LOCAL", "Zanahoria", "Ñandú", "álamo", "Nube", "Árbol", "olivo"),
  );
  assert.deepEqual(
    locales.map((l) => l.nombre),
    ["álamo", "Árbol", "Nube", "Ñandú", "olivo", "Zanahoria"],
  );
});

test("quoted fields keep embedded commas, escaped double quotes and line breaks", () => {
  const locales = parseLocales(
    csv(
      'NOMBRE DEL LOCAL,QUÉ OPCIONES TIENE?,OBSERVACIONES',
      '"Verde, Café y Más","Tostado, wrap, ensalada","Pedir el ""especial""\nsin queso"',
    ),
  );
  assert.deepEqual(locales, [
    {
      nombre: "Verde, Café y Más",
      opcionesVeganas: "Tostado, wrap, ensalada",
      observaciones: 'Pedir el "especial"\nsin queso',
      mapsUrl:
        "https://www.google.com/maps/search/?api=1&query=Verde%2C%20Caf%C3%A9%20y%20M%C3%A1s%20Bah%C3%ADa%20Blanca",
    },
  ]);
});

test("CRLF line endings and a byte-order mark are handled", () => {
  const locales = parseLocales(
    "﻿NOMBRE DEL LOCAL,TIPO\r\nCafé Verde,Café\r\nHeladería Sur,Heladería\r\n",
  );
  assert.deepEqual(
    locales.map((l) => [l.nombre, l.tipo]),
    [
      ["Café Verde", "Café"],
      ["Heladería Sur", "Heladería"],
    ],
  );
});

const instagramDe = (valor) =>
  parseLocales(csv("NOMBRE DEL LOCAL,LINK INSTAGRAM", `Café Verde,${valor}`))[0]
    .instagramUrl;

test("Instagram is normalised to a clean profile URL from every accepted form", () => {
  const limpia = "https://www.instagram.com/cafe.verde_bb/";
  for (const valor of [
    "https://www.instagram.com/cafe.verde_bb/",
    "https://www.instagram.com/cafe.verde_bb?igsh=MWx0bXZ6&utm_source=qr",
    "https://instagram.com/cafe.verde_bb/?hl=es#top",
    "http://m.instagram.com/cafe.verde_bb",
    "www.instagram.com/cafe.verde_bb/",
    "instagram.com/cafe.verde_bb",
    "@cafe.verde_bb",
    "cafe.verde_bb",
    "  @cafe.verde_bb  ",
  ]) {
    assert.equal(instagramDe(valor), limpia, `entrada: ${valor}`);
  }
});

test("an empty Instagram cell leaves the Instagram link absent", () => {
  assert.equal(instagramDe(""), undefined);
  assert.equal(instagramDe("   "), undefined);
});

const localConMaps = (valor) =>
  parseLocales(csv("NOMBRE DEL LOCAL,LINK MAPS", `Café Verde,"${valor}"`))[0];

const BUSQUEDA =
  "https://www.google.com/maps/search/?api=1&query=Caf%C3%A9%20Verde%20Bah%C3%ADa%20Blanca";

test("a full Google Maps place URL gives coordenadas and is kept as the Maps link", () => {
  const url =
    "https://www.google.com/maps/place/Caf%C3%A9+Verde/@-38.7189,-62.2701,17z/data=!3m1!4b1!4m6!3m5!1s0x95edbcabdc1d2f5f:0x1a2b3c!8m2!3d-38.7183478!4d-62.2663455!16s%2Fg%2F11c?entry=ttu";
  const local = localConMaps(url);
  assert.equal(local.mapsUrl, url);
  assert.deepEqual(local.coordenadas, { lat: -38.7183478, lng: -62.2663455 });
});

test("a place URL without the !3d!4d segment keeps the link but has no coordenadas", () => {
  const url = "https://www.google.com/maps/place/Caf%C3%A9+Verde/@-38.7189,-62.2701,17z";
  const local = localConMaps(url);
  assert.equal(local.mapsUrl, url);
  assert.equal(local.coordenadas, undefined);
});

test("a short link, plain text or empty LINK MAPS gives a search link and no coordenadas", () => {
  for (const valor of [
    "https://maps.app.goo.gl/AbCdEf123",
    "Av. Alem 1234",
    "",
    "https://www.google.com/maps/search/caf%C3%A9+verde",
  ]) {
    const local = localConMaps(valor);
    assert.equal(local.mapsUrl, BUSQUEDA, `entrada: ${valor}`);
    assert.equal(local.coordenadas, undefined, `entrada: ${valor}`);
  }
});

const verificacionDe = (valor) =>
  parseLocales(csv("NOMBRE DEL LOCAL,FECHA ACTUALIZACIÓN", `Café Verde,${valor}`))[0]
    .verificacion;

test("a YYYY/MM/DD FECHA ACTUALIZACIÓN becomes a Verificación year and month", () => {
  assert.deepEqual(verificacionDe("2026/11/03"), { anio: 2026, mes: 11 });
  assert.deepEqual(verificacionDe(" 2025/01/31 "), { anio: 2025, mes: 1 });
});

test("an empty or invalid FECHA ACTUALIZACIÓN leaves the Verificación absent", () => {
  for (const valor of ["", "ayer", "2026/13/01", "2026/00/10", "2026/02/30", "03/11/2026", "2026-11-03"]) {
    assert.equal(verificacionDe(valor), undefined, `entrada: ${valor}`);
  }
});

test("an Instagram cell that is not a profile leaves the Instagram link absent", () => {
  for (const valor of [
    "https://example.com/cafe.verde_bb",
    "https://www.instagram.com/p/C1a2b3c4/",
    "https://www.instagram.com/reel/C1a2b3c4/",
    "ver en facebook",
  ]) {
    assert.equal(instagramDe(valor), undefined, `entrada: ${valor}`);
  }
});

test("a place URL on a country Google domain is also kept as the Maps link", () => {
  const url = "https://www.google.com.ar/maps/place/Caf%C3%A9+Verde/data=!3d-38.71!4d-62.26";
  const local = localConMaps(url);
  assert.equal(local.mapsUrl, url);
  assert.deepEqual(local.coordenadas, { lat: -38.71, lng: -62.26 });
});

test("a ticked HONORES VEGANOS checkbox marks the Local; unticked or missing leaves it absent", () => {
  const locales = parseLocales(
    csv(
      "NOMBRE DEL LOCAL,HONORES VEGANOS",
      "Aleme,TRUE",
      "Bosque,FALSE",
      "Cedro,",
      "Duna, true ",
    ),
  );
  assert.deepEqual(
    locales.map((l) => [l.nombre, l.honoresVeganos]),
    [
      ["Aleme", true],
      ["Bosque", undefined],
      ["Cedro", undefined],
      ["Duna", true],
    ],
  );
  assert.equal("honoresVeganos" in locales[1], false);
});

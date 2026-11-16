// View layer (thin, checked by hand in a browser): downloads the published
// sheet, then renders one card per Local and one map pin per Local with
// coordenadas. All sheet text goes in as text, never as HTML.
import { LOCALES_CSV_URL } from "./config.js";
import { parseLocales } from "./locales.js";

const CENTRO_BAHIA_BLANCA = [-38.7183, -62.2663];
const ZOOM_INICIAL = 13;
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

main();

async function main() {
  const estado = document.getElementById("estado");
  let locales;
  try {
    if (!LOCALES_CSV_URL) throw new Error("Falta configurar LOCALES_CSV_URL");
    const respuesta = await fetch(LOCALES_CSV_URL, { cache: "no-store" });
    if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
    locales = parseLocales(await respuesta.text());
  } catch (error) {
    console.error(error);
    estado.setAttribute("role", "alert");
    estado.textContent =
      "No pudimos cargar la información de los locales. Probá de nuevo en un rato.";
    return;
  }

  estado.remove();
  document.getElementById("seccion-mapa").hidden = false;
  document.getElementById("seccion-locales").hidden = false;

  const mapa = crearMapa();
  const lista = document.getElementById("locales");
  for (const local of locales) {
    const marcador = local.coordenadas ? agregarPin(mapa, local) : undefined;
    lista.append(crearTarjeta(local, mapa, marcador));
  }
}

function crearMapa() {
  const mapa = L.map("mapa").setView(CENTRO_BAHIA_BLANCA, ZOOM_INICIAL);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(mapa);
  return mapa;
}

function agregarPin(mapa, local) {
  const popup = document.createElement("div");
  const nombre = document.createElement("strong");
  nombre.textContent = local.nombre;
  popup.append(nombre, crearAcciones(local));
  return L.marker([local.coordenadas.lat, local.coordenadas.lng], { title: local.nombre })
    .bindPopup(popup)
    .addTo(mapa);
}

function crearTarjeta(local, mapa, marcador) {
  const tarjeta = document.createElement("li");
  tarjeta.className = "local";

  const titulo = document.createElement("h3");
  titulo.textContent = local.nombre;
  tarjeta.append(titulo);

  if (local.tipo) tarjeta.append(parrafo(local.tipo, "tipo"));
  if (local.opcionesVeganas) tarjeta.append(parrafo(local.opcionesVeganas, "opciones"));
  if (local.observaciones) tarjeta.append(parrafo(`Nota: ${local.observaciones}`, "nota"));
  if (local.verificacion) {
    const { anio, mes } = local.verificacion;
    tarjeta.append(parrafo(`Verificado ${MESES[mes - 1]} ${anio}`, "verificacion"));
  }

  const acciones = crearAcciones(local);
  if (marcador) {
    const verEnMapa = document.createElement("button");
    verEnMapa.type = "button";
    verEnMapa.textContent = "Ver en el mapa";
    verEnMapa.addEventListener("click", () => {
      document.getElementById("mapa").scrollIntoView({ behavior: "smooth" });
      mapa.setView(marcador.getLatLng(), Math.max(mapa.getZoom(), 16));
      marcador.openPopup();
    });
    acciones.append(verEnMapa);
  }
  tarjeta.append(acciones);
  return tarjeta;
}

function crearAcciones(local) {
  const acciones = document.createElement("div");
  acciones.className = "acciones";
  if (local.instagramUrl) acciones.append(enlaceExterno("Instagram", local.instagramUrl));
  acciones.append(enlaceExterno("Abrir en Google Maps", local.mapsUrl));
  return acciones;
}

function enlaceExterno(texto, href) {
  const enlace = document.createElement("a");
  enlace.href = href;
  enlace.textContent = texto;
  enlace.target = "_blank";
  enlace.rel = "noopener noreferrer";
  return enlace;
}

function parrafo(texto, clase) {
  const p = document.createElement("p");
  p.className = clase;
  p.textContent = texto;
  return p;
}

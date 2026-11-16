import { test } from "node:test";
import assert from "node:assert/strict";
import { parseEmprendimientos } from "../js/emprendimientos.js";

const HEADER = "NOMBRE DEL EMPRENDIMIENTO,RUBRO,QUÉ OFRECE,INSTAGRAM";
const csv = (...lines) => lines.join("\n");

test("a full row becomes an Emprendimiento with a canonical Instagram link", () => {
  const emprendimientos = parseEmprendimientos(
    csv(HEADER, 'Vaka,Pastelería,"Tortas, desayunos",https://www.instagram.com/vaka.veg'),
  );
  assert.deepEqual(emprendimientos, [
    {
      nombre: "Vaka",
      tipo: "Pastelería",
      opcionesVeganas: "Tortas, desayunos",
      instagramUrl: "https://www.instagram.com/vaka.veg/",
    },
  ]);
});

test("empty fields are left out, nameless rows skipped, and the list sorted by nombre", () => {
  const emprendimientos = parseEmprendimientos(
    csv(HEADER, "Tiento,,,", ",Pasta,algo,@x", "Ama,,,amacocinavegana", ""),
  );
  assert.deepEqual(emprendimientos, [
    { nombre: "Ama", instagramUrl: "https://www.instagram.com/amacocinavegana/" },
    { nombre: "Tiento" },
  ]);
});

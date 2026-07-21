import fs from "node:fs";
import path from "node:path";

export const DEMO_PRODUCER_EMAIL = "produtor@napalma.app";

export function normalizeDemoIdentity(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function safeText(value) {
  return String(value || "")
    .replace(/\uFEFF/g, "")
    .replace(/ÃƒÂ§/g, "Ã§")
    .replace(/ÃƒÂ£/g, "Ã£")
    .replace(/ÃƒÂ¡/g, "Ã¡")
    .replace(/ÃƒÂ©/g, "Ã©")
    .replace(/ÃƒÂª/g, "Ãª")
    .replace(/ÃƒÂ­/g, "Ã­")
    .replace(/ÃƒÂ³/g, "Ã³")
    .replace(/ÃƒÂµ/g, "Ãµ")
    .replace(/ÃƒÂº/g, "Ãº")
    .replace(/Ãƒâ€°/g, "Ã‰")
    .replace(/Ãƒâ€œ/g, "Ã“")
    .replace(/Ãƒ/g, "Ã ")
    .trim();
}

export function parseDemoCsv(content) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    if (character === '"') {
      if (quoted && content[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(safeText(cell));
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && content[index + 1] === "\n") index += 1;
      row.push(safeText(cell));
      cell = "";
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else {
      cell += character;
    }
  }
  if (cell || row.length) {
    row.push(safeText(cell));
    if (row.some(Boolean)) rows.push(row);
  }
  if (rows.length < 2) return [];
  const headers = rows[0].map(normalizeDemoIdentity);
  return rows.slice(1).map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] || ""])));
}

export function loadDemoFixtureKeys({ cwd = process.cwd() } = {}) {
  const csvPath = path.resolve(cwd, "..", "docs", "imports", "TAB-ATRACOES.csv");
  if (!fs.existsSync(csvPath)) {
    throw new Error(`Fixture de atrações não encontrada em ${csvPath}. Atualização cancelada sem alterar eventos.`);
  }
  const rows = parseDemoCsv(fs.readFileSync(csvPath, "utf8"));
  return new Set(rows.map((row) => `${normalizeDemoIdentity(row.nomeatracao)}::${normalizeDemoIdentity(row.nomecasa)}`).filter((key) => !key.startsWith("::") && !key.endsWith("::")));
}

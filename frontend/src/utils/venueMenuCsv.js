const HEADERS = ["nome", "categoria", "descricao", "preco", "modalidade", "apresentacao", "status", "caracteristicas", "destaque"];

const PRICE_MODES = { exato: "exact", exact: "exact", "a partir de": "from", from: "from", oculto: "hidden", hidden: "hidden", "sob consulta": "consultation", consultation: "consultation" };
const STATUSES = { disponivel: "published", published: "published", indisponivel: "unavailable", unavailable: "unavailable", rascunho: "draft", draft: "draft", arquivado: "archived", archived: "archived" };

function normalize(value) {
  return String(value || "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function parseLine(line, delimiter) {
  const cells = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') { current += '"'; index += 1; }
      else quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      cells.push(current.trim()); current = "";
    } else current += char;
  }
  cells.push(current.trim());
  return cells;
}

function logicalLines(text) {
  const lines = [];
  let current = "";
  let quoted = false;
  const source = String(text || "").replace(/^\uFEFF/, "");
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === '"') {
      current += char;
      if (quoted && source[index + 1] === '"') { current += source[index + 1]; index += 1; }
      else quoted = !quoted;
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && source[index + 1] === "\n") index += 1;
      if (current.trim()) lines.push(current);
      current = "";
    } else current += char;
  }
  if (current.trim()) lines.push(current);
  return lines;
}

function safeCell(value) {
  let text = value == null ? "" : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function parseVenueMenuCsv(text, options) {
  const lines = logicalLines(text);
  if (lines.length < 2) return { items: [], errors: ["O arquivo precisa ter cabecalho e ao menos um item."] };
  const delimiter = (lines[0].match(/;/g) || []).length >= (lines[0].match(/,/g) || []).length ? ";" : ",";
  const headers = parseLine(lines[0], delimiter).map(normalize);
  const missing = HEADERS.filter((header) => !headers.includes(header));
  if (missing.length) return { items: [], errors: [`Colunas ausentes: ${missing.join(", ")}.`] };
  const categories = new Set(options.categories || []);
  const servings = new Set(options.servings || []);
  const tags = new Set(options.tags || []);
  const errors = [];
  const items = lines.slice(1).map((line, rowIndex) => {
    const values = parseLine(line, delimiter);
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]));
    const lineNumber = rowIndex + 2;
    const category = normalize(row.categoria).replaceAll(" ", "_");
    const priceMode = PRICE_MODES[normalize(row.modalidade)] || normalize(row.modalidade);
    const status = STATUSES[normalize(row.status)] || normalize(row.status);
    const servingLabel = normalize(row.apresentacao).replaceAll(" ", "_") || null;
    const itemTags = row.caracteristicas ? row.caracteristicas.split("|").map((tag) => normalize(tag).replaceAll(" ", "_")).filter(Boolean) : [];
    const rawPrice = String(row.preco || "").trim();
    const priceNumber = rawPrice === "" ? null : Number(rawPrice.includes(",") ? rawPrice.replaceAll(".", "").replace(",", ".") : rawPrice);
    if (row.nome.trim().length < 2) errors.push(`Linha ${lineNumber}: informe um nome com ao menos 2 caracteres.`);
    if (!categories.has(category)) errors.push(`Linha ${lineNumber}: categoria "${row.categoria}" nao reconhecida.`);
    if (!["exact", "from", "hidden", "consultation"].includes(priceMode)) errors.push(`Linha ${lineNumber}: modalidade invalida.`);
    if (!["published", "unavailable", "draft"].includes(status)) errors.push(`Linha ${lineNumber}: status invalido ou arquivado.`);
    if (servingLabel && !servings.has(servingLabel)) errors.push(`Linha ${lineNumber}: apresentacao invalida.`);
    if (itemTags.length > 4 || itemTags.some((tag) => !tags.has(tag))) errors.push(`Linha ${lineNumber}: caracteristicas invalidas ou acima do limite de 4.`);
    if (["exact", "from"].includes(priceMode) && (!Number.isFinite(priceNumber) || priceNumber < 0)) errors.push(`Linha ${lineNumber}: informe um preco valido.`);
    return {
      name: row.nome.trim(), category, description: row.descricao.trim() || null,
      priceCents: priceNumber == null || !Number.isFinite(priceNumber) ? null : Math.round(priceNumber * 100),
      priceMode, servingLabel, status, tags: itemTags,
      isHighlight: ["sim", "true", "1"].includes(normalize(row.destaque)), sortOrder: rowIndex * 10
    };
  });
  if (items.length > 30) errors.push("O arquivo excede o limite de 30 itens.");
  const names = new Set();
  items.forEach((item, index) => {
    const key = normalize(item.name);
    if (names.has(key)) errors.push(`Linha ${index + 2}: nome repetido no arquivo.`);
    names.add(key);
  });
  return { items, errors };
}

export function venueMenuCsv(items = []) {
  const rows = items.map((item) => [
    item.name, item.category, item.description || "", item.priceCents == null ? "" : (item.priceCents / 100).toFixed(2).replace(".", ","),
    item.priceMode, item.servingLabel || "", item.status, (item.tags || []).join("|"), item.isHighlight ? "sim" : "nao"
  ]);
  return `\uFEFF${[HEADERS, ...rows].map((row) => row.map(safeCell).join(";")).join("\r\n")}`;
}

export function downloadVenueMenuCsv(filename, items) {
  const blob = new Blob([venueMenuCsv(items)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = filename; anchor.click();
  URL.revokeObjectURL(url);
}

export const VENUE_MENU_TEMPLATE_ITEM = {
  name: "Bolinho de feijoada", category: "petiscos", description: "Porcao com 6 unidades", priceCents: 3200,
  priceMode: "exact", servingLabel: "porcao", status: "published", tags: ["especialidade_da_casa"], isHighlight: true
};

export const RESERVED_USERNAME_MESSAGE = "Este nome parece estar relacionado à marca 77gira e é reservado para contas oficiais. Escolha outro nome de usuário.";
const institutional = ["admin", "suporte", "oficial", "moderador", "verificado", "equipe", "staff", "security", "help", "atendimento"];
const similarCharacters = { "0": "o", "1": "i", "4": "a" };

export function normalizeUsername(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[014]/g, (character) => similarCharacters[character] || character)
    .replace(/[._-]/g, "").replace(/[^a-z0-9]/g, "");
}

export function isUsernameSyntaxValid(value) {
  return /^[a-zA-Z0-9._-]{3,40}$/.test(String(value || ""));
}

function distance(left, right) {
  const rows = Array.from({ length: left.length + 1 }, () => Array(right.length + 1).fill(0));
  for (let i = 0; i <= left.length; i += 1) rows[i][0] = i;
  for (let j = 0; j <= right.length; j += 1) rows[0][j] = j;
  for (let i = 1; i <= left.length; i += 1) for (let j = 1; j <= right.length; j += 1) rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1));
  return rows[left.length][right.length];
}

export function isReservedUsername(value) {
  const normalized = normalizeUsername(value);
  if (institutional.includes(normalized) || normalized.includes("77gira")) return true;
  for (const size of [5, 6, 7]) for (let index = 0; index <= normalized.length - size; index += 1) if (distance(normalized.slice(index, index + size), "77gira") <= 1) return true;
  return false;
}

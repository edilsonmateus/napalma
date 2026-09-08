export const EXPLORE_TIME_ZONE = "America/Sao_Paulo";

const datePartsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: EXPLORE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

const hourFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: EXPLORE_TIME_ZONE,
  hour: "2-digit",
  hourCycle: "h23"
});

function validDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function saoPauloDateKey(value) {
  const date = validDate(value);
  if (!date) return "";
  const parts = Object.fromEntries(
    datePartsFormatter.formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function saoPauloHour(value) {
  const date = validDate(value);
  if (!date) return "";
  const hour = hourFormatter.formatToParts(date).find((part) => part.type === "hour");
  return hour?.value || "";
}

export function addCalendarDays(dateKey, amount) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateKey || ""));
  if (!match) return "";
  const cursor = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
  cursor.setUTCDate(cursor.getUTCDate() + amount);
  return cursor.toISOString().slice(0, 10);
}

function weekdayForDateKey(dateKey) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateKey || ""));
  if (!match) return null;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12)).getUTCDay();
}

export function getUpcomingWeekendRange(nowValue = Date.now()) {
  const todayKey = saoPauloDateKey(nowValue);
  const weekday = weekdayForDateKey(todayKey);
  if (weekday === null) return { startKey: "", endKey: "" };

  let daysToFriday;
  if (weekday >= 1 && weekday <= 4) daysToFriday = 5 - weekday;
  else if (weekday === 5) daysToFriday = 0;
  else if (weekday === 6) daysToFriday = -1;
  else daysToFriday = -2;

  const startKey = addCalendarDays(todayKey, daysToFriday);
  return { startKey, endKey: addCalendarDays(startKey, 2) };
}

function isKeyInRange(targetKey, startKey, endKey) {
  return Boolean(targetKey && startKey && endKey && targetKey >= startKey && targetKey <= endKey);
}

export function isEventInExploreScope(dateValue, scope, nowValue = Date.now()) {
  const targetKey = saoPauloDateKey(dateValue);
  const todayKey = saoPauloDateKey(nowValue);
  if (!targetKey || !todayKey) return false;

  if (scope === "hoje") return targetKey === todayKey;
  if (scope === "fim_de_semana") {
    const { startKey, endKey } = getUpcomingWeekendRange(nowValue);
    return isKeyInRange(targetKey, startKey, endKey);
  }

  return isKeyInRange(targetKey, todayKey, addCalendarDays(todayKey, 7));
}

export function exploreScopeLabel(scope) {
  if (scope === "hoje") return "Hoje";
  if (scope === "fim_de_semana") return "Fim de semana";
  return "Semana";
}

export function groupExploreEventRows(rows, expandedDayKeys = new Set(), perDay = 8) {
  const groups = [];
  const groupByKey = new Map();

  for (const row of rows) {
    const key = saoPauloDateKey(row?.event?.startsAt);
    if (!key) continue;
    let group = groupByKey.get(key);
    if (!group) {
      group = { key, items: [] };
      groupByKey.set(key, group);
      groups.push(group);
    }
    group.items.push(row);
  }

  return groups.map((group) => {
    const expanded = expandedDayKeys.has(group.key);
    return {
      ...group,
      visibleItems: expanded ? group.items : group.items.slice(0, perDay),
      hiddenCount: expanded ? 0 : Math.max(0, group.items.length - perDay)
    };
  });
}

export const DEMO_DAY_OFFSETS = [0, 0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 4];

export const DEMO_START_TIMES = [
  [14, 0],
  [18, 0],
  [20, 0],
  [22, 0],
  [13, 0],
  [18, 30],
  [21, 0],
  [16, 0],
  [20, 0],
  [23, 0],
  [15, 30],
  [21, 30],
  [22, 0]
];

export const DEMO_DURATIONS_MINUTES = [180, 180, 180, 180, 180, 210, 180, 180, 180, 180, 150, 180, 120];

export function buildDemoEventWindow(index, now = new Date()) {
  const position = Math.abs(Number(index) || 0);
  const offsetDays = DEMO_DAY_OFFSETS[position % DEMO_DAY_OFFSETS.length];
  const [hours, minutes] = DEMO_START_TIMES[position % DEMO_START_TIMES.length];
  const durationMinutes = DEMO_DURATIONS_MINUTES[position % DEMO_DURATIONS_MINUTES.length];
  const startDate = new Date(now);
  startDate.setHours(0, 0, 0, 0);
  startDate.setDate(startDate.getDate() + offsetDays);
  startDate.setHours(hours, minutes, 0, 0);
  const endDate = new Date(startDate.getTime() + durationMinutes * 60_000);
  return { startDate, endDate };
}

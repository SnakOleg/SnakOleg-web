export const shiftDay = (day: string, delta: number) =>
  new Date(Date.parse(`${day}T12:00:00Z`) + delta * 864e5).toISOString().slice(0, 10);

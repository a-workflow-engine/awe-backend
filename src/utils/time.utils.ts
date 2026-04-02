export const TimeConstants = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
} as const;

export function convertToMilliseconds(delay: number, unit: "millisecond" | "second" | "minute"): number {
  console.log(delay, unit);
  switch (unit) {
    case "millisecond":
      return delay;
    case "second":
      return delay * TimeConstants.SECOND;
    case "minute":
      return delay * TimeConstants.MINUTE;
  }
}


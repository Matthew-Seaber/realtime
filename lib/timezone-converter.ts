const UK_TIME_ZONE = "Europe/London";

function getDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: UK_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value),
  };
}

function getUKOffsetMilliseconds(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: UK_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return (
    Date.UTC(
      values.year,
      values.month - 1,
      values.day,
      values.hour,
      values.minute,
      values.second,
    ) - date.getTime()
  );
}

export function getUKTimeAt(hour: number, minute = 0): Date {
  const { year, month, day } = getDateParts(new Date());
  const localTimeAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  const offset = getUKOffsetMilliseconds(new Date(localTimeAsUtc));

  return new Date(localTimeAsUtc - offset);
}

export function parseUKDateTime(date: string, time: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute, second = "0"] = time.split(":");
  const localTimeAsUtc = Date.UTC(
    year,
    month - 1,
    day,
    Number(hour),
    Number(minute),
    Number(second),
  );
  const offset = getUKOffsetMilliseconds(new Date(localTimeAsUtc));

  return new Date(localTimeAsUtc - offset);
}
import { minitz } from "./deps.ts";

export function toJakartaDate(
  date: Date,
) {
  const remote = minitz.toTZ(date, "Asia/Jakarta");
  return [
    remote.y,
    String(remote.m).padStart(2, "0"),
    String(remote.d).padStart(2, "0"),
  ].join("-");
}

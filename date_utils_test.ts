import { assertEquals } from "https://deno.land/std@0.200.0/assert/mod.ts";
import { toJakartaDate } from "./date_utils.ts";

Deno.test("toJakartaDate", () => {
  const midnightUtc = new Date("2021-08-01T00:00:00.000Z");
  assertEquals(toJakartaDate(midnightUtc), "2021-08-01");

  const middayUtc = new Date("2023-08-01T12:00:00.000Z");
  assertEquals(toJakartaDate(middayUtc), "2023-08-01");

  const utcDayOverflow = new Date("2023-09-01T23:00:00.000Z");
  assertEquals(toJakartaDate(utcDayOverflow), "2023-09-02");
});

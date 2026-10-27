import { describe, it, expect } from "vitest";
import { escapeRegex } from "@/lib/escape-regex";

describe("lib/escape-regex", () => {
  it("escapes all regex special characters", () => {
    const specials = ".*+?^${}()|[]\\";
    const escaped = escapeRegex(specials);
    expect(escaped).toBe("\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\");
  });

  it("leaves standard alphanumeric strings untouched", () => {
    expect(escapeRegex("Frontend Developer 2026")).toBe("Frontend Developer 2026");
  });

  it("safely searches using RegExp without crashing or unexpected matching", () => {
    const rawQuery = "Senior (React/Node.js) [Remote]";
    const escaped = escapeRegex(rawQuery);
    const regex = new RegExp(escaped, "i");

    expect(regex.test("Senior (React/Node.js) [Remote]")).toBe(true);
    expect(regex.test("Senior React Node js Remote")).toBe(false);
  });
});

import { describe, it, expect } from "vitest";
import { inferJobSource, isJobSource, JOB_SOURCES } from "@/lib/job-source";

describe("lib/job-source", () => {
  describe("isJobSource", () => {
    it("returns true for all valid JOB_SOURCES", () => {
      for (const source of JOB_SOURCES) {
        expect(isJobSource(source)).toBe(true);
      }
    });

    it("returns false for invalid strings and non-strings", () => {
      expect(isJobSource("invalid-source")).toBe(false);
      expect(isJobSource("")).toBe(false);
      expect(isJobSource(null)).toBe(false);
      expect(isJobSource(undefined)).toBe(false);
      expect(isJobSource(123)).toBe(false);
      expect(isJobSource({})).toBe(false);
    });
  });

  describe("inferJobSource", () => {
    it("returns 'other' for empty or missing inputs", () => {
      expect(inferJobSource()).toBe("other");
      expect(inferJobSource("")).toBe("other");
      expect(inferJobSource("   ")).toBe("other");
      expect(inferJobSource(null)).toBe("other");
    });

    it("identifies LinkedIn URLs", () => {
      expect(inferJobSource("https://www.linkedin.com/jobs/view/123456")).toBe("linkedin");
      expect(inferJobSource("linkedin.com/in/test")).toBe("linkedin");
      expect(inferJobSource("http://cn.linkedin.cn/jobs")).toBe("linkedin");
    });

    it("identifies JobStreet URLs", () => {
      expect(inferJobSource("https://www.jobstreet.co.id/en/job/123")).toBe("jobstreet");
      expect(inferJobSource("https://jobstreet.com/job/456")).toBe("jobstreet");
    });

    it("identifies Indeed URLs", () => {
      expect(inferJobSource("https://id.indeed.com/viewjob?jk=123")).toBe("indeed");
      expect(inferJobSource("https://www.indeed.com/cmp/company")).toBe("indeed");
    });

    it("identifies Glints URLs", () => {
      expect(inferJobSource("https://glints.com/id/opportunities/jobs/123")).toBe("glints");
      expect(inferJobSource("glints.com/jobs")).toBe("glints");
    });

    it("falls back to 'other' for unknown or malformed URLs", () => {
      expect(inferJobSource("https://example.com/careers/software-engineer")).toBe("other");
      expect(inferJobSource("not a valid url :// oops")).toBe("other");
      expect(inferJobSource("ftp://files.example.com")).toBe("other");
    });
  });
});

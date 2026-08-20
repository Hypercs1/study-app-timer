import { SESSIONS, studyColors, breakColor } from "../sessions";

describe("SESSIONS templates", () => {
  it("exposes 1hr and 2hr templates with labels", () => {
    expect(SESSIONS["1hr"].label).toBe("1-Hour Session");
    expect(SESSIONS["2hr"].label).toBe("2-Hour Session");
  });

  describe("1hr", () => {
    const phases = SESSIONS["1hr"].phases;

    it("has 4 study phases, 3 breaks, 7 total", () => {
      expect(phases.filter((p) => !p.isBreak)).toHaveLength(4);
      expect(phases.filter((p) => p.isBreak)).toHaveLength(3);
      expect(phases).toHaveLength(7);
    });

    it("alternates study / break and does not end on a break", () => {
      // Even indices are study, odd indices are breaks: s b s b s b s
      phases.forEach((p, i) => {
        expect(Boolean(p.isBreak)).toBe(i % 2 === 1);
      });
      expect(phases[phases.length - 1].isBreak).toBeFalsy();
    });
  });

  describe("2hr", () => {
    const phases = SESSIONS["2hr"].phases;

    it("has 5 study phases, 2 breaks, 7 total", () => {
      expect(phases.filter((p) => !p.isBreak)).toHaveLength(5);
      expect(phases.filter((p) => p.isBreak)).toHaveLength(2);
      expect(phases).toHaveLength(7);
    });

    it("places breaks only after the 2nd and 3rd study phases", () => {
      // Order: s0, s1, BREAK, s2, BREAK, s3, s4
      const breakIndexes = phases
        .map((p, i) => (p.isBreak ? i : -1))
        .filter((i) => i >= 0);
      expect(breakIndexes).toEqual([2, 4]);
    });
  });

  it("exposes color palettes", () => {
    expect(Array.isArray(studyColors)).toBe(true);
    expect(studyColors.length).toBeGreaterThan(0);
    expect(typeof breakColor).toBe("string");
  });
});

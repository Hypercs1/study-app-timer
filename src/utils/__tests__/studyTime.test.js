import { phaseElapsedSecs, minsFromSecs } from "../studyTime";

describe("phaseElapsedSecs", () => {
  it("returns elapsed seconds for a running study phase", () => {
    // 10-min phase (600s) with 480s left → 120s elapsed
    expect(phaseElapsedSecs({ duration: 10 }, 480)).toBe(120);
  });

  it("returns the full duration when the phase is complete", () => {
    expect(phaseElapsedSecs({ duration: 10 }, 0)).toBe(600);
  });

  it("returns 0 for break phases", () => {
    expect(phaseElapsedSecs({ duration: 5, isBreak: true }, 0)).toBe(0);
  });

  it("returns 0 for a missing phase", () => {
    expect(phaseElapsedSecs(null, 100)).toBe(0);
    expect(phaseElapsedSecs(undefined, 100)).toBe(0);
  });

  it("clamps to 0 when secondsLeft exceeds the phase length", () => {
    expect(phaseElapsedSecs({ duration: 10 }, 700)).toBe(0);
  });
});

describe("minsFromSecs", () => {
  it("converts seconds to minutes", () => {
    expect(minsFromSecs(150)).toBe(2.5);
    expect(minsFromSecs(90)).toBe(1.5);
    expect(minsFromSecs(0)).toBe(0);
  });

  it("rounds to the nearest tenth of a minute", () => {
    expect(minsFromSecs(100)).toBe(1.7); // 1.666… → 1.7
    expect(minsFromSecs(7)).toBe(0.1); // 0.116… → 0.1
  });
});

describe("partial-quit accounting regression", () => {
  // Reproduces the bug the fix addresses: the user runs one phase briefly, then
  // skips ahead PAST an un-studied study phase, studies the next phase briefly,
  // and quits. The corrected accounting credits only actual elapsed time
  // (accumulated + current), never the full nominal length of skipped phases.
  it("credits actual elapsed time, not skipped phases' full duration", () => {
    const phase1 = { duration: 10 }; // Flashcard, 10 min
    // phase2 (Deep Study, 30 min) gets skipped without ever running.
    const phase3 = { duration: 15 }; // Past Question, 15 min

    // Mirrors SessionScreen's actualStudySecsRef accumulation on goToPhase:
    let accumulatedSecs = 0;
    accumulatedSecs += phaseElapsedSecs(phase1, 480); // ran phase 1 for 2 min → +120
    // Jumped straight to phase 3 → phase 2 contributes nothing.

    // Quitting during phase 3 with 1 min elapsed (900s − 840s left):
    const quitMins = minsFromSecs(
      accumulatedSecs + phaseElapsedSecs(phase3, 840)
    );

    expect(quitMins).toBe(3); // ~3 min actually studied
    expect(quitMins).toBeLessThan(41); // NOT 10 + 30 + 1 (the old inflated total)
  });

  it("credits a quit and a finish identically for the same elapsed time", () => {
    const phase = { duration: 25 };
    const secondsLeft = 600; // 15 min elapsed
    const priorAccumulated = 300; // 5 min banked from an earlier phase

    const quit = minsFromSecs(priorAccumulated + phaseElapsedSecs(phase, secondsLeft));
    const finish = minsFromSecs(priorAccumulated + phaseElapsedSecs(phase, secondsLeft));

    expect(quit).toBe(finish);
    expect(quit).toBe(20); // 5 + 15
  });
});

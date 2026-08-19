import { generateId } from "../generateId";

describe("generateId", () => {
  it("matches the <timestamp>_<suffix> shape", () => {
    // Pin Date.now / Math.random so the shape assertion is deterministic
    // (a real Math.random() === 0 would yield an empty suffix).
    const dnow = jest.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    const rnd = jest.spyOn(Math, "random").mockReturnValue(0.123456789);

    const id = generateId();

    dnow.mockRestore();
    rnd.mockRestore();

    expect(id).toMatch(/^[a-z0-9]+_[a-z0-9]+$/);
    expect(id.split("_")).toHaveLength(2);
  });

  it("produces unique ids across many calls", () => {
    // Advance the clock by 1ms per call so the timestamp prefix alone
    // guarantees uniqueness regardless of the random suffix.
    let t = 1_700_000_000_000;
    const dnow = jest.spyOn(Date, "now").mockImplementation(() => (t += 1));

    const ids = new Set(Array.from({ length: 500 }, () => generateId()));

    dnow.mockRestore();
    expect(ids.size).toBe(500);
  });
});

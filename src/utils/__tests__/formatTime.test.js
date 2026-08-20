import { formatTime } from "../formatTime";

describe("formatTime", () => {
  it("formats zero as 00:00", () => {
    expect(formatTime(0)).toBe("00:00");
  });

  it("pads minutes and seconds", () => {
    expect(formatTime(65)).toBe("01:05");
    expect(formatTime(9)).toBe("00:09");
  });

  it("handles the largest sub-hour value", () => {
    expect(formatTime(599)).toBe("09:59");
  });

  it("does not cap minutes at 60", () => {
    expect(formatTime(3600)).toBe("60:00");
  });
});

import { describe, expect, it } from "vitest";
import { gradeAnswer, computeGradeFromAttempts } from "./grading";

describe("gradeAnswer", () => {
  it("grades numeric with tolerance", () => {
    const q = {
      _id: "1",
      type: "numeric",
      marks: 2,
      answerSpec: { value: 0.5, tolerance: 0.01 },
    };
    expect(gradeAnswer(q, "1/2").isCorrect).toBe(true);
    expect(gradeAnswer(q, "0.6").isCorrect).toBe(false);
  });

  it("grades mcq single", () => {
    const q = {
      _id: "1",
      type: "mcq_single",
      marks: 1,
      answerSpec: { correctOptionId: "b" },
    };
    expect(gradeAnswer(q, "b").marksAwarded).toBe(1);
    expect(gradeAnswer(q, "a").isCorrect).toBe(false);
  });

  it("grades mcq multi", () => {
    const q = {
      _id: "2",
      type: "mcq_multi",
      marks: 2,
      answerSpec: { correctOptionIds: ["opt_1", "opt_3"], partialCredit: false },
    };
    expect(gradeAnswer(q, ["opt_1", "opt_3"]).isCorrect).toBe(true);
    expect(gradeAnswer(q, ["opt_3", "opt_1"]).isCorrect).toBe(true);
    expect(gradeAnswer(q, ["opt_1"]).isCorrect).toBe(false);
    expect(gradeAnswer(q, ["opt_1", "opt_2", "opt_3"]).isCorrect).toBe(false);
  });

  it("grades short text", () => {
    const q = {
      _id: "3",
      type: "short_text",
      marks: 1,
      answerSpec: { accepted: ["2pi", "2*pi", "6.28"] },
    };
    expect(gradeAnswer(q, "2pi").isCorrect).toBe(true);
    expect(gradeAnswer(q, "  2*PI  ").isCorrect).toBe(true);
    expect(gradeAnswer(q, "6.28").isCorrect).toBe(true);
    expect(gradeAnswer(q, "3.14").isCorrect).toBe(false);
  });
});

describe("computeGradeFromAttempts", () => {
  it("uses best by default policy", () => {
    expect(computeGradeFromAttempts([3, 8, 5], "best")).toBe(8);
    expect(computeGradeFromAttempts([3, 8, 5], "latest")).toBe(5);
    expect(computeGradeFromAttempts([3, 8, 5], "average")).toBeCloseTo(16 / 3);
  });
});

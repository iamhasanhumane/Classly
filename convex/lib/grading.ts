import { create, all } from "mathjs";

const math = create(all, {});

export type QuestionForGrading = {
  _id: string;
  type: string;
  marks: number;
  answerSpec: unknown;
  options?: { id: string; text: string }[];
};

export type GradedAnswer = {
  isCorrect: boolean;
  marksAwarded: number;
  needsReview: boolean;
};

function parseNumeric(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const frac = trimmed.match(/^(-?\d+)\s*\/\s*(-?\d+)$/);
  if (frac) {
    const den = Number(frac[2]);
    if (den === 0) return null;
    return Number(frac[1]) / den;
  }
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function evaluateExpression(
  expr: string,
  variable: string,
  value: number,
): number | null {
  try {
    const node = math.parse(expr.replace(/\^/g, "**"));
    const result = node.evaluate({ [variable]: value });
    if (typeof result === "number" && Number.isFinite(result)) return result;
    return null;
  } catch {
    return null;
  }
}

export function gradeAnswer(
  question: QuestionForGrading,
  response: unknown,
): GradedAnswer {
  const spec = question.answerSpec as Record<string, unknown>;

  switch (question.type) {
    case "mcq_single": {
      const correct = spec.correctOptionId as string;
      const isCorrect = response === correct;
      return {
        isCorrect,
        marksAwarded: isCorrect ? question.marks : 0,
        needsReview: false,
      };
    }
    case "mcq_multi": {
      const correct = new Set(spec.correctOptionIds as string[]);
      const selected = new Set(
        Array.isArray(response) ? (response as string[]) : [],
      );
      let isCorrect =
        correct.size === selected.size &&
        [...correct].every((id) => selected.has(id));
      let marksAwarded = isCorrect ? question.marks : 0;
      if (!isCorrect && spec.partialCredit && Array.isArray(response)) {
        const hits = (response as string[]).filter((id) => correct.has(id))
          .length;
        const wrong = (response as string[]).filter((id) => !correct.has(id))
          .length;
        if (wrong === 0 && hits > 0) {
          marksAwarded = (hits / correct.size) * question.marks;
          isCorrect = hits === correct.size;
        }
      }
      return { isCorrect, marksAwarded, needsReview: false };
    }
    case "numeric": {
      const student = parseNumeric(response);
      const correct = parseNumeric(spec.value);
      const tolerance = (spec.tolerance as number) ?? 0;
      const relative = Boolean(spec.relativeTolerance);
      if (student === null || correct === null) {
        return { isCorrect: false, marksAwarded: 0, needsReview: false };
      }
      const diff = Math.abs(student - correct);
      const ok = relative
        ? diff <= Math.abs(correct) * tolerance
        : diff <= tolerance;
      return {
        isCorrect: ok,
        marksAwarded: ok ? question.marks : 0,
        needsReview: false,
      };
    }
    case "expression": {
      const variable = (spec.variable as string) ?? "x";
      const min = (spec.min as number) ?? -5;
      const max = (spec.max as number) ?? 5;
      const reference = spec.expression as string;
      const studentExpr = String(response ?? "");
      const relTol = (spec.relativeTolerance as number) ?? 1e-6;
      let samples = 0;
      let matches = 0;
      for (let i = 0; i < 10; i++) {
        const x = min + Math.random() * (max - min);
        const refVal = evaluateExpression(reference, variable, x);
        const stuVal = evaluateExpression(studentExpr, variable, x);
        if (refVal === null || stuVal === null) continue;
        if (!Number.isFinite(refVal) || !Number.isFinite(stuVal)) continue;
        samples++;
        const diff = Math.abs(refVal - stuVal);
        const scale = Math.max(Math.abs(refVal), 1);
        if (diff <= scale * relTol) matches++;
      }
      const ok = samples >= 3 && matches === samples;
      return {
        isCorrect: ok,
        marksAwarded: ok ? question.marks : 0,
        needsReview: false,
      };
    }
    case "short_text": {
      const accepted = (spec.accepted as string[]) ?? [];
      const normalized = String(response ?? "")
        .trim()
        .toLowerCase();
      const isCorrect = accepted.some(
        (a) => a.trim().toLowerCase() === normalized,
      );
      return {
        isCorrect,
        marksAwarded: isCorrect ? question.marks : 0,
        needsReview: false,
      };
    }
    case "file":
      return { isCorrect: false, marksAwarded: 0, needsReview: true };
    default:
      return { isCorrect: false, marksAwarded: 0, needsReview: false };
  }
}

export function computeGradeFromAttempts(
  scores: number[],
  policy: "best" | "latest" | "average",
): number {
  if (scores.length === 0) return 0;
  if (policy === "best") return Math.max(...scores);
  if (policy === "latest") return scores[scores.length - 1];
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

export function studentCanSeeSolutions(
  assignment: {
    kind: string;
    feedbackMode: string;
    solutionsRelease: string;
  },
  pastDeadline: boolean,
  afterAttempt: boolean,
): boolean {
  if (assignment.kind === "practice" && afterAttempt) return true;
  if (assignment.solutionsRelease === "immediate") return afterAttempt;
  if (assignment.solutionsRelease === "manual") return false;
  if (assignment.solutionsRelease === "after_deadline") return pastDeadline;
  return (
    pastDeadline &&
    (assignment.feedbackMode === "full" ||
      assignment.feedbackMode === "per_question")
  );
}

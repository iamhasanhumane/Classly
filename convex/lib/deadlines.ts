import type { Doc } from "../_generated/dataModel";

export function getEffectiveDeadlineMs(
  assignment: Doc<"assignments">,
  override: Doc<"deadlineOverrides"> | null,
): number | null {
  if (override?.dueAt) return override.dueAt;
  if (assignment.dueAt) return assignment.dueAt;
  return null;
}

export function isPastDeadline(
  assignment: Doc<"assignments">,
  override: Doc<"deadlineOverrides"> | null,
  now = Date.now(),
): boolean {
  const due = getEffectiveDeadlineMs(assignment, override);
  if (!due) return false;
  if (assignment.latePolicy === "open") return false;
  if (assignment.latePolicy === "grace" && assignment.lateCutoffAt) {
    return now > assignment.lateCutoffAt;
  }
  return now > due;
}

export function canStartNewAttempt(
  assignment: Doc<"assignments">,
  override: Doc<"deadlineOverrides"> | null,
  attemptCount: number,
  now = Date.now(),
): { ok: boolean; reason?: string } {
  if (assignment.kind === "practice") {
    if (
      assignment.maxAttempts !== undefined &&
      attemptCount >= assignment.maxAttempts
    ) {
      return { ok: false, reason: "Maximum attempts reached" };
    }
    return { ok: true };
  }

  if (isPastDeadline(assignment, override, now)) {
    if (assignment.latePolicy === "strict") {
      return { ok: false, reason: "Deadline has passed" };
    }
  }

  if (
    assignment.maxAttempts !== undefined &&
    attemptCount >= assignment.maxAttempts
  ) {
    return { ok: false, reason: "Maximum attempts reached" };
  }

  return { ok: true };
}

export function applyLatePenalty(
  score: number,
  assignment: Doc<"assignments">,
  isLate: boolean,
): number {
  if (!isLate || assignment.latePolicy !== "grace") return score;
  const pct = assignment.latePenaltyPercent ?? 0;
  return Math.max(0, score * (1 - pct / 100));
}

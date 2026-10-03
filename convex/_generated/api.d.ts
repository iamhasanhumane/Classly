/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activityQuestions from "../activityQuestions.js";
import type * as adminUsers from "../adminUsers.js";
import type * as assignments from "../assignments.js";
import type * as attempts from "../attempts.js";
import type * as auth from "../auth.js";
import type * as bootstrap from "../bootstrap.js";
import type * as courses from "../courses.js";
import type * as enrollments from "../enrollments.js";
import type * as files from "../files.js";
import type * as http from "../http.js";
import type * as lib_deadlines from "../lib/deadlines.js";
import type * as lib_drive from "../lib/drive.js";
import type * as lib_env from "../lib/env.js";
import type * as lib_grading from "../lib/grading.js";
import type * as lib_permissions from "../lib/permissions.js";
import type * as progress from "../progress.js";
import type * as sections from "../sections.js";
import type * as sessions from "../sessions.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activityQuestions: typeof activityQuestions;
  adminUsers: typeof adminUsers;
  assignments: typeof assignments;
  attempts: typeof attempts;
  auth: typeof auth;
  bootstrap: typeof bootstrap;
  courses: typeof courses;
  enrollments: typeof enrollments;
  files: typeof files;
  http: typeof http;
  "lib/deadlines": typeof lib_deadlines;
  "lib/drive": typeof lib_drive;
  "lib/env": typeof lib_env;
  "lib/grading": typeof lib_grading;
  "lib/permissions": typeof lib_permissions;
  progress: typeof progress;
  sections: typeof sections;
  sessions: typeof sessions;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};

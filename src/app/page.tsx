import { redirect } from "next/navigation";
import { isAuthenticatedNextjs } from "@convex-dev/auth/nextjs/server";

export default async function HomePage() {
  if (await isAuthenticatedNextjs()) {
    redirect("/courses");
  }
  redirect("/login");
}

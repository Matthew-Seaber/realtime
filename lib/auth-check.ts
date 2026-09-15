import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export async function checkAuth(expectation: boolean) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    if (expectation === false) {
      redirect("/");
    }

    return true;
  }

  if (expectation === true) {
    redirect("/login");
  }

  return false;
}

import { checkAuth } from "@/lib/auth-check";

export default async function ProtectedLayout({ children }: LayoutProps<"/">) {
  await checkAuth(true);

  return children;
}

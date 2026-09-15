import { checkAuth } from "@/lib/auth-check";

export default async function LoginLayout({ children }: LayoutProps<"/">) {
  await checkAuth(false);

  return children;
}

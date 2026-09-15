"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      toast.info("One or more required fields are empty.");
      return;
    }

    setLoading(true);

    const response = await authClient.signIn.email({
      email,
      password,
    });

    if (response.error) {
      toast.error(
        response.error.message ||
          "An error has occured, please try again later.",
      );
      setLoading(false);

      return;
    }

    toast.success("Success! Redirecting you now...");
    router.push("/");
  }

  return (
    <>
      <div className="matrix-dots flex flex-col gap-8 items-center justify-center min-h-screen p-6 font-mono">
        <h1 className="font-semibold text-4xl">Login Portal</h1>

        <div className="min-w-96 flex flex-col gap-4 p-6 border rounded-lg bg-background">
          <Field>
            <FieldLabel htmlFor="email" className="text-md">
              Email
            </FieldLabel>
            <Input
              id="email"
              placeholder="Enter your email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="px-3 py-5"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="password" className="text-md">
              Password
            </FieldLabel>
            <Input
              id="password"
              placeholder="Enter your password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="px-3 py-5"
            />
          </Field>

          <Button disabled={loading} onClick={handleLogin} className="mt-2 p-4">
            Login
          </Button>
        </div>
      </div>

      <Toaster position="top-center" />
    </>
  );
}

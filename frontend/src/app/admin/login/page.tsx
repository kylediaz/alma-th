"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ApiError, login } from "@/lib/api";

const formSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "Username is required.")
    .max(64, "Username must be at most 64 characters."),
  password: z
    .string()
    .min(1, "Password is required.")
    .max(256, "Password must be at most 256 characters."),
});

type FormValues = z.infer<typeof formSchema>;

export default function AdminLoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  async function onSubmit(data: FormValues) {
    setServerError(null);
    try {
      await login(data.username, data.password);
      router.replace("/admin/dashboard/leads");
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else {
        setServerError("Unable to sign in. Try again.");
      }
    }
  }

  const pending = form.formState.isSubmitting;

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Admin login</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            id="admin-login-form"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <FieldGroup>
              {serverError ? (
                <Alert variant="destructive">
                  <AlertDescription>{serverError}</AlertDescription>
                </Alert>
              ) : null}

              <Controller
                name="username"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="admin-login-username">
                      Username
                    </FieldLabel>
                    <Input
                      {...field}
                      id="admin-login-username"
                      autoComplete="username"
                      disabled={pending}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name="password"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="admin-login-password">
                      Password
                    </FieldLabel>
                    <Input
                      {...field}
                      id="admin-login-password"
                      type="password"
                      autoComplete="current-password"
                      disabled={pending}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Field>
                <Button
                  type="submit"
                  form="admin-login-form"
                  className="w-full"
                  disabled={pending}
                  size="lg"
                >
                  {pending ? "Signing in…" : "Sign in"}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

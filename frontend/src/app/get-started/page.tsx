"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useCreateLead } from "@/features/leads/hooks/use-create-lead";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const RESUME_MAX_BYTES = 5 * 1024 * 1024;

const formSchema = z.object({
  first_name: z
    .string()
    .trim()
    .min(1, "First name is required.")
    .max(100, "First name must be at most 100 characters."),
  last_name: z
    .string()
    .trim()
    .min(1, "Last name is required.")
    .max(100, "Last name must be at most 100 characters."),
  email: z
    .string()
    .trim()
    .min(1, "Email is required.")
    .email("Enter a valid email address.")
    .max(320, "Email must be at most 320 characters."),
  resume: z
    .instanceof(File, { message: "Resume is required." })
    .refine((file) => file.size > 0, "Resume is required.")
    .refine(
      (file) => file.size <= RESUME_MAX_BYTES,
      "Resume must be at most 5MB.",
    )
    .refine((file) => {
      const name = file.name.toLowerCase();
      return name.endsWith(".pdf") || name.endsWith(".docx");
    }, "Resume must be a PDF or Word document (.pdf, .docx)."),
});

type FormValues = z.infer<typeof formSchema>;

export default function GetStartedPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const createLead = useCreateLead();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      resume: undefined,
    },
  });

  function onSubmit(data: FormValues) {
    setServerError(null);
    createLead.mutate(data, {
      onSuccess: () => {
        setSubmitted(true);
        form.reset();
      },
      onError: (err) => {
        if (err instanceof ApiError) {
          setServerError(err.message);
        } else {
          setServerError("Unable to submit. Try again.");
        }
      },
    });
  }

  const pending = createLead.isPending;

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-3xl overflow-hidden p-0">
        <div className="grid md:grid-cols-2 md:items-stretch">
          <div className="flex flex-col gap-3 bg-[#E0F0BC] px-(--card-spacing) py-(--card-spacing) md:border-r">
            <h2 className="text-balance text-xl font-medium tracking-tight my-auto">
              Schedule a free immigration consultation
            </h2>
          </div>

          <div className="flex flex-col py-(--card-spacing)">
            <CardContent className="relative">
              <form
                id="get-started-form"
                className={cn(submitted && "invisible")}
                onSubmit={form.handleSubmit(onSubmit)}
                aria-hidden={submitted}
              >
                <FieldGroup>
                  <Controller
                    name="first_name"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="get-started-first-name">
                          First name
                        </FieldLabel>
                        <Input
                          {...field}
                          id="get-started-first-name"
                          autoComplete="given-name"
                          disabled={pending || submitted}
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />

                  <Controller
                    name="last_name"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="get-started-last-name">
                          Last name
                        </FieldLabel>
                        <Input
                          {...field}
                          id="get-started-last-name"
                          autoComplete="family-name"
                          disabled={pending || submitted}
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />

                  <Controller
                    name="email"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="get-started-email">
                          Email
                        </FieldLabel>
                        <Input
                          {...field}
                          id="get-started-email"
                          type="email"
                          autoComplete="email"
                          disabled={pending || submitted}
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />

                  <Controller
                    name="resume"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="get-started-resume">
                          Resume
                        </FieldLabel>
                        <Input
                          id="get-started-resume"
                          type="file"
                          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          disabled={pending || submitted}
                          aria-invalid={fieldState.invalid}
                          onChange={(event) => {
                            field.onChange(event.target.files?.[0]);
                          }}
                        />
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />

                  <div
                    className={cn(!serverError && "invisible")}
                    aria-hidden={!serverError}
                  >
                    <Alert variant="destructive">
                      <AlertDescription>
                        {serverError ?? "Placeholder"}
                      </AlertDescription>
                    </Alert>
                  </div>

                  <Field>
                    <Button
                      type="submit"
                      form="get-started-form"
                      className="w-full"
                      disabled={pending || submitted}
                      size="lg"
                    >
                      {pending ? "Submitting…" : "Submit"}
                    </Button>
                  </Field>
                </FieldGroup>
              </form>

              {submitted ? (
                <p className="absolute inset-0 flex items-center px-(--card-spacing) text-sm">
                  Thanks — your application was submitted successfully.
                </p>
              ) : null}
            </CardContent>
          </div>
        </div>
      </Card>
    </main>
  );
}

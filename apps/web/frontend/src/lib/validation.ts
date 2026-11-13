// Shared field validators — use in every client form for consistent messages.
import { z } from "zod";

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isBlank = (v: string) => v.trim() === "";
export const isEmail = (v: string) => EMAIL_RE.test(v.trim());

export type FieldErrors = Record<string, string | undefined>;

export function hasErrors(errors: FieldErrors) {
  return Object.values(errors).some(Boolean);
}

export function clearField(errors: FieldErrors, key: string): FieldErrors {
  return { ...errors, [key]: undefined };
}

// Zod schemas for react-hook-form — single source of truth for FE validation.
export const emailSchema = z.string().trim().min(1, "Email is required").email("Enter a valid email address");
export const passwordSchema = z.string().min(1, "Password is required");
export const newPasswordSchema = z
  .string()
  .min(1, "Password is required")
  .min(8, "Password must be at least 8 characters");

export const loginFormSchema = z.object({ email: emailSchema, password: passwordSchema });
export const forgotPasswordSchema = z.object({ email: emailSchema });
export const resetPasswordSchema = z.object({ token: z.string(), password: newPasswordSchema });

const adminRowSchema = z.object({
  name: z.string().trim().min(1, "Admin Name is required").max(100, "Admin Name must be 100 characters or less"),
  email: emailSchema.max(200, "Email must be 200 characters or less"),
  password: z
    .string()
    .min(8, "Admin Password must be at least 8 characters")
    .max(100, "Admin Password must be 100 characters or less")
    .or(z.literal("")),
});

export const createCompanySchema = z.object({
  name: z.string().trim().min(1, "Company Name is required").max(100, "Company Name must be 100 characters or less"),
  admins: z.array(adminRowSchema).min(1, "At least one admin is required").max(3, "Maximum 3 admins allowed"),
});

export const agentLoginSchema = z.object({
  clientCode: z.string().trim().min(1, "Client code is required").max(50),
  username: z.string().trim().min(1, "Username is required").max(100),
  password: z.string().min(1, "Password is required"),
});

const indianPhone = z
  .string()
  .trim()
  .max(20, "Phone must be 20 characters or less")
  .refine(
    (v) => {
      if (!v) return true;
      const d = v.replace(/\D/g, "");
      const n = d.length === 12 && d.startsWith("91") ? d.slice(2) : d.length === 11 && d.startsWith("0") ? d.slice(1) : d;
      return /^[6-9]\d{9}$/.test(n);
    },
    "Enter a valid 10-digit Indian phone number",
  )
  .optional();

export const leadRequestSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  phone: indianPhone,
  email: z.string().trim().email("Enter a valid email").max(200).or(z.literal("")).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const leadFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  phone: indianPhone,
  email: z.string().trim().email("Enter a valid email").max(200).or(z.literal("")).optional(),
  notes: z.string().trim().max(2000).optional(),
  status: z.string().optional(),
  assignedAgentId: z.string().optional(),
});

export const createAgentSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
  username: z
    .string()
    .trim()
    .min(1, "Username is required")
    .regex(/^[a-z0-9._-]{3,30}$/, "Username must be 3-30 letters, digits, . _ or -"),
  phone: z.string().trim().min(1, "Phone is required").max(20, "Phone must be 20 characters or less"),
  password: z.string().min(6, "Password must be at least 6 characters").max(100, "Password must be 100 characters or less"),
});

export const resetAgentPasswordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters").max(100, "Password must be 100 characters or less"),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
export type CreateCompanyValues = z.infer<typeof createCompanySchema>;
export type AgentLoginValues = z.infer<typeof agentLoginSchema>;
export type LeadRequestValues = z.infer<typeof leadRequestSchema>;
export type LeadFormValues = z.infer<typeof leadFormSchema>;
export type CreateAgentValues = z.infer<typeof createAgentSchema>;
export type ResetAgentPasswordValues = z.infer<typeof resetAgentPasswordSchema>;

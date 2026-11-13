<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project conventions

- **Architecture**: `src/app/(marketing)` public pages stay server-rendered (SEO). Everything under `admin/` and `company/` (and the `(crm)` portal) uses client components for interactive functionality; `page.tsx` files may stay thin server wrappers for metadata.
- **Auth forms**: use the shared client components in `src/components/auth/` (`LoginForm`, `ForgotForm`, `ResetForm`, `EmailField`, `PasswordField`). Server actions return `{ error?, sent? }` state objects (see `src/lib/auth-actions.ts`) — never redirect with `?error=`/`?sent=` query params on validation failures.
- **Styling**: Tailwind CSS v4 is installed (`@import "tailwindcss"` at top of `globals.css`, `postcss.config.mjs`). Use Tailwind utility classes for ALL new UI — do not add new custom CSS classes to `globals.css` (it is legacy, being migrated page by page). Auth pages/forms are already migrated; `.auth`, `.card`, `.form`, `.error`, `.notice`, `.muted` classes still exist only for unmigrated pages.
- **UI library**: Mantine (`@mantine/core`, `@mantine/form`, `@mantine/hooks`, `@mantine/notifications`) is installed with `MantineProvider` in the root layout (primaryColor: indigo). Prefer Mantine components (Modal, Menu, Table, etc.) for new UI; keep existing custom CSS for layout/cards.
- **Form fields**: always use the shared field components from `src/components/fields.tsx` (`TextField`, `EmailField`, `PasswordField`, `SelectField`, `TextareaField`) — they wrap Mantine inputs and provide label, icon slot, placeholder, error message, and `onClearError`. Never hand-write raw `<label>/<input>` in new forms.
- **Forms**: use `react-hook-form` + `zodResolver` for ALL forms. Zod schemas live in `src/lib/validation.ts` (single source of truth — `loginFormSchema`, `forgotPasswordSchema`, `resetPasswordSchema`, etc.). Wire fields via `Controller` into the shared field components; map `fieldState.error?.message` to the `error` prop and `clearErrors` to `onClearError`. Simple helpers (`isBlank`, `isEmail`) remain for non-RHF cases.
- **Validation**: use shared validators from `src/lib/validation.ts` (`isBlank`, `isEmail`, `hasErrors`, `clearField`). Field errors show in red under each input via the `error` prop.
- **Toasts**: success/error/info messages use `notify.success/error/info` from `src/lib/notify.ts` (Mantine notifications, top-right, auto-close 4s).
- **Submit buttons**: EVERY form submit/action button must show a loading spinner AND be disabled while the action is pending (`useActionState`/`useFormStatus` pending state). Use the `<Spinner />` component from `src/components/spinner.tsx` inside the button — never leave a submit button clickable during submission.

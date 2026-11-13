"use client";

import type { ReactNode } from "react";
import { TextInput, PasswordInput, Select, Textarea } from "@mantine/core";
import type { TextInputProps, PasswordInputProps, SelectProps, TextareaProps } from "@mantine/core";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";

const iconProps = { size: 16, strokeWidth: 2 } as const;

export function ReqMark() {
  return <span className="ml-0.5 text-red-400">*</span>;
}

function EyeToggleIcon({ reveal }: { reveal?: boolean }) {
  const Icon = reveal ? EyeOff : Eye;
  return <Icon {...iconProps} size={20} aria-hidden="true" />;
}

type CommonProps = {
  name: string;
  label: ReactNode;
  error?: string;
  onClearError?: () => void;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function wrapChange(onChange: ((...args: any[]) => void) | undefined, onClearError?: () => void) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (...args: any[]) => {
    onClearError?.();
    onChange?.(...args);
  };
}

export function TextField({ label, error, onClearError, icon, onChange, ...rest }: CommonProps & Omit<TextInputProps, "name" | "label" | "error"> & { icon?: ReactNode }) {
  return (
    <TextInput
      {...rest}
      label={label}
      error={error}
      withErrorStyles={false}
      leftSection={icon}
      onChange={wrapChange(onChange, onClearError)}
    />
  );
}

export function EmailField(props: CommonProps & Omit<TextInputProps, "name" | "label" | "error" | "type">) {
  return <TextField {...props} type="email" icon={<Mail {...iconProps} />} placeholder={props.placeholder ?? "you@example.com"} />;
}

export function PasswordField({ label = "Password", error, onClearError, onChange, ...rest }: CommonProps & Omit<PasswordInputProps, "name" | "label" | "error">) {
  return (
    <PasswordInput
      {...rest}
      label={label}
      error={error}
      withErrorStyles={false}
      leftSection={<Lock {...iconProps} />}
      placeholder={rest.placeholder ?? "Enter your password"}
      visibilityToggleIcon={EyeToggleIcon}
      visibilityToggleButtonProps={{
        variant: "transparent",
        size: "sm",
        color: "gray",
        radius: 0,
        styles: { root: { boxShadow: "none" } },
      }}
      onChange={wrapChange(onChange, onClearError)}
    />
  );
}

export function SelectField({ label, error, onClearError, onChange, ...rest }: CommonProps & Omit<SelectProps, "name" | "label" | "error">) {
  return (
    <Select
      {...rest}
      label={label}
      error={error}
      withErrorStyles={false}
      onChange={wrapChange(onChange, onClearError)}
    />
  );
}

export function TextareaField({ label, error, onClearError, onChange, ...rest }: CommonProps & Omit<TextareaProps, "name" | "label" | "error">) {
  return (
    <Textarea
      {...rest}
      label={label}
      error={error}
      withErrorStyles={false}
      onChange={wrapChange(onChange, onClearError)}
    />
  );
}

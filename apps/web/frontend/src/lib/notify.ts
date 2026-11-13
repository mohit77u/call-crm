"use client";

// Toast helpers — sonner-style notifications via Mantine.
// usage: notify.success("Saved"); notify.error("Failed");
import { notifications } from "@mantine/notifications";

const base = { position: "top-right" as const, autoClose: 4000 };

export const notify = {
  success: (message: React.ReactNode, title?: string) =>
    notifications.show({ ...base, color: "green", title, message }),
  error: (message: React.ReactNode, title?: string) =>
    notifications.show({ ...base, color: "red", title, message }),
  info: (message: React.ReactNode, title?: string) =>
    notifications.show({ ...base, color: "blue", title, message }),
};

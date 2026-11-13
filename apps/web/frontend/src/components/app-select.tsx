"use client";

import { Select } from "@mantine/core";
import type { SelectProps } from "@mantine/core";

// Common select — Mantine Select, no check icon, scrollable dropdown,
// selected option highlighted. `className` applies to the wrapper div (use for width).
export function AppSelect({ className, ...props }: SelectProps & { className?: string }) {
  return (
    <div className={className}>
      <Select
        size="sm"
        w="100%"
        allowDeselect={false}
        withCheckIcon
        withAlignedLabels
        checkIconPosition="left"
        scrollAreaProps={{ mah: 180, type: "auto" }}
        {...props}
      />
    </div>
  );
}

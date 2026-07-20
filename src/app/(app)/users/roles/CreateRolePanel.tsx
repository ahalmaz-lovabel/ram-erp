"use client";

import { useState } from "react";
import { RoleForm } from "./RoleForm";

interface PermDef {
  key: string;
  module: string;
  label: string;
}

export function CreateRolePanel({ allPermissions }: { allPermissions: PermDef[] }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{ background: "var(--color-brand)" }}
        className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
      >
        + دور جديد
      </button>
    );
  }

  return <RoleForm allPermissions={allPermissions} onDone={() => setOpen(false)} />;
}

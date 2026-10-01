import type { Metadata } from "next";

import { PageHeader } from "@/components/ui/primitives";
import { CreateForm } from "./CreateForm";

export const metadata: Metadata = { title: "Create" };

export default function CreatePage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="New presentation"
        title="Create"
        description="Describe what you need to teach. The form mirrors the structured request the AI orchestrator will accept once a provider is implemented."
      />
      <CreateForm />
    </div>
  );
}

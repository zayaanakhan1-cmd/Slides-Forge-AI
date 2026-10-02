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
        description="Describe what you need. SlidesForge AI understands the request, gathers background, builds a narrative, plans the slides and generates a structured presentation that conforms to the canonical model."
      />
      <CreateForm />
    </div>
  );
}

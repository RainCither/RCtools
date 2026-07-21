import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { findTool, isToolId, TOOLS, type ToolId } from "../tool-registry";
import { ToolboxApp } from "../toolbox-app";

type ToolRoutePageProps = {
  params: Promise<{ toolId: string }>;
};

export const dynamic = "force-static";
export const dynamicParams = true;

function resolveToolId(value: string): ToolId | null {
  return isToolId(value) ? value : null;
}

export function generateStaticParams() {
  return TOOLS.map((tool) => ({ toolId: tool.id }));
}

export async function generateMetadata({
  params,
}: ToolRoutePageProps): Promise<Metadata> {
  const toolId = resolveToolId((await params).toolId);
  const tool = toolId ? findTool(toolId) : null;

  return tool
    ? {
        title: tool.title,
        description: tool.summary,
      }
    : {};
}

export default async function ToolRoutePage({ params }: ToolRoutePageProps) {
  const toolId = resolveToolId((await params).toolId);

  if (!toolId) redirect("/");

  return (
    <ToolboxApp
      initialToolId={toolId}
      basePath={process.env.PAGES_BASE_PATH ?? "/"}
    />
  );
}

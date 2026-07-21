import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

function readStringField(source, fieldName, configPath) {
  const match = source.match(
    new RegExp(`\\b${fieldName}:\\s*("(?:\\\\.|[^"\\\\])*")`),
  );
  if (!match) {
    throw new Error(`Missing ${fieldName} in ${configPath}.`);
  }
  return JSON.parse(match[1]);
}

export async function readRegisteredTools(projectRoot) {
  const registryPath = resolve(projectRoot, "app", "tool-registry.ts");
  const registrySource = await readFile(registryPath, "utf8");
  const imports = new Map(
    Array.from(
      registrySource.matchAll(
        /import\s+\{\s*([A-Za-z_$][\w$]*)\s*\}\s+from\s+"\.\/tools\/([^"/]+)\/config";/g,
      ),
      (match) => [match[1], match[2]],
    ),
  );
  const toolsBlock = registrySource.match(
    /export const TOOLS = \[([\s\S]*?)\]\s+as const satisfies/,
  )?.[1];

  if (!toolsBlock) {
    throw new Error("Unable to find the TOOLS registry.");
  }

  const configNames = Array.from(
    toolsBlock.matchAll(/\b([A-Za-z_$][\w$]*ToolConfig)\b/g),
    (match) => match[1],
  );

  if (!configNames.length || new Set(configNames).size !== configNames.length) {
    throw new Error("TOOLS must contain unique registered tool configs.");
  }

  return Promise.all(
    configNames.map(async (configName) => {
      const directory = imports.get(configName);
      if (!directory) {
        throw new Error(`Missing config import for ${configName}.`);
      }

      const configPath = resolve(
        projectRoot,
        "app",
        "tools",
        directory,
        "config.ts",
      );
      const configSource = await readFile(configPath, "utf8");
      const id = readStringField(configSource, "id", configPath);

      if (id !== directory) {
        throw new Error(
          `Tool id ${id} must match its registry directory ${directory}.`,
        );
      }

      return {
        id,
        title: readStringField(configSource, "title", configPath),
        summary: readStringField(configSource, "summary", configPath),
      };
    }),
  );
}

import { mkdtemp, mkdir, readdir, realpath, rename, rmdir } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
/** Pages mounts an artifact at the repository base, so emitted basename folders must be flattened. */
export async function flattenPages(output: string, basename: string) {
  if (basename === "/") return;
  const dist = resolve(dirname(output));
  const source = resolve(output, basename.replace(/^\/+|\/+$/g, ""));
  const physicalDist = await realpath(dist);
  function within(parent: string, path: string) {
    const child = relative(parent, path);
    if (
      !child ||
      child === ".." ||
      child.startsWith(`..${sep}`) ||
      resolve(parent, child) !== resolve(path)
    )
      throw new Error(`Unsafe generated path: ${path}`);
  }
  within(dist, source);
  within(physicalDist, await realpath(source));
  within(physicalDist, await realpath(output));
  const stage = await mkdtemp(join(dist, ".pages-stage-"));
  within(dist, stage);
  const staged = join(stage, "pages");
  within(stage, staged);
  await rename(source, staged);
  async function merge(from: string, to: string) {
    within(stage, from);
    if (to !== resolve(output)) within(resolve(output), to);
    await mkdir(to, { recursive: true });
    for (const entry of await readdir(from, { withFileTypes: true })) {
      const input = join(from, entry.name),
        target = join(to, entry.name);
      within(stage, input);
      within(resolve(output), target);
      if (entry.isSymbolicLink())
        throw new Error("Generated Pages output cannot contain symbolic links.");
      if (entry.isDirectory()) await merge(input, target);
      else await rename(input, target);
    }
    await rmdir(from);
  }
  await merge(staged, resolve(output));
  await rmdir(stage);
}

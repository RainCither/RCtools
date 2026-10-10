/** @file 子路径部署时调整预渲染产物的目录层级，使文件能在 GitHub Pages 的挂载路径下正确访问；同时校验移动范围和符号链接。 */
import { mkdtemp, mkdir, readdir, realpath, rename, rmdir } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
/** 将 output 内按 basename 生成的页面移到发布根目录，使 Pages 挂载子路径后地址不会重复。 */
export async function flattenPages(output: string, basename: string) {
  if (basename === "/") return;
  const dist = resolve(dirname(output));
  const source = resolve(output, basename.replace(/^\/+|\/+$/g, ""));
  // 同时检查逻辑路径和真实路径，防止生成目录中的链接把移动操作带到外部。
  const physicalDist = await realpath(dist);
  /** 校验 path 是 parent 内的子路径，否则中止产物移动，避免越过生成目录边界。 */
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
  // 先移到独立暂存目录，再合并回客户端根目录，兼容基础路径与工具目录同名。
  const stage = await mkdtemp(join(dist, ".pages-stage-"));
  within(dist, stage);
  const staged = join(stage, "pages");
  within(stage, staged);
  await rename(source, staged);
  /** 递归将暂存 from 的文件合并到 to，逐级校验路径并拒绝符号链接，完成后移除空暂存目录。 */
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

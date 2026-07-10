import type { Metadata } from "next";
import { ToolboxApp } from "./toolbox-app";

export const metadata: Metadata = {
  title: {
    absolute: "工具匣｜常用小工具，一开即用",
  },
  description:
    "一个简洁、快速、可持续扩展的个人工具站，所有处理默认在浏览器本地完成。",
};

export default function Home() {
  return <ToolboxApp />;
}

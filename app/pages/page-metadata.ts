import type { ToolCategory } from "../tool-types";

export type PageMetadata = {
  id: string;
  title: string;
  description: string;
  homeCard?: {
    category: ToolCategory;
    mark: string;
    searchTerms: readonly string[];
  };
};

export const PAGE_METADATA = [
  {
    id: "sts2saveedit",
    title: "杀戮尖塔 2 存档修改器",
    description:
      "纯前端的杀戮尖塔 2 存档修改器，在浏览器本地编辑卡牌、遗物、属性与地图节点。",
    homeCard: {
      category: "other",
      mark: "S2",
      searchTerms: [
        "杀戮尖塔",
        "STS2",
        "Slay the Spire 2",
        "存档修改器",
        "save editor",
      ],
    },
  },
] as const satisfies readonly PageMetadata[];

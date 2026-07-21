import type { RegexFlag } from "./regex-core";

export type RegexView = "tester" | "syntax" | "common";

export type RegexSyntaxEntry = {
  id: string;
  syntax: string;
  title: string;
  description: string;
  example: string;
};

export type RegexSyntaxSection = {
  id: string;
  title: string;
  description: string;
  entries: readonly RegexSyntaxEntry[];
};

export type CommonRegexCategory =
  | "text"
  | "number"
  | "network"
  | "datetime"
  | "development";

export type CommonRegexCategoryDefinition = {
  id: CommonRegexCategory;
  title: string;
  description: string;
};

export type CommonRegexEntry = {
  id: string;
  category: CommonRegexCategory;
  title: string;
  pattern: string;
  flags: readonly RegexFlag[];
  description: string;
  positiveExample: string;
  negativeExample: string;
  note?: string;
};

export const REGEX_SYNTAX_SECTIONS = [
  {
    id: "characters",
    title: "字符与字符类",
    description: "描述要匹配的单个字符或字符集合。",
    entries: [
      { id: "any", syntax: ".", title: "任意字符", description: "默认匹配除换行符之外的任意字符；启用 s 后也匹配换行。", example: "a.b → a1b" },
      { id: "digit", syntax: "\\d / \\D", title: "数字与非数字", description: "\\d 匹配 ASCII 数字，\\D 匹配其补集。", example: "\\d+ → 2026" },
      { id: "word", syntax: "\\w / \\W", title: "单词字符", description: "匹配 ASCII 字母、数字和下划线，或匹配其补集。", example: "\\w+ → user_01" },
      { id: "space", syntax: "\\s / \\S", title: "空白与非空白", description: "匹配空格、制表符、换行等空白字符，或匹配其补集。", example: "\\s+ → 连续空白" },
      { id: "set", syntax: "[abc]", title: "字符集合", description: "匹配方括号中列出的任意一个字符。", example: "[aeiou] → 元音" },
      { id: "negative-set", syntax: "[^abc]", title: "排除集合", description: "匹配未在方括号中列出的任意一个字符。", example: "[^0-9] → 非数字" },
      { id: "range", syntax: "[a-z]", title: "字符范围", description: "匹配范围内的一个字符；多个范围可以写在同一集合中。", example: "[A-Za-z0-9]" },
      { id: "unicode-property", syntax: "\\p{…} / \\P{…}", title: "Unicode 属性", description: "按 Unicode 属性匹配字符或其补集，必须启用 u 标志。", example: "\\p{Script=Han}+ → 中文" },
      { id: "escape", syntax: "\\.", title: "转义特殊字符", description: "反斜杠可让点号、星号、括号等特殊字符按字面量匹配。", example: "\\. → ." },
    ],
  },
  {
    id: "anchors",
    title: "锚点与边界",
    description: "限定匹配位置，本身不消耗字符。",
    entries: [
      { id: "start", syntax: "^", title: "开头", description: "匹配文本开头；启用 m 后也匹配每一行的开头。", example: "^标题" },
      { id: "end", syntax: "$", title: "结尾", description: "匹配文本结尾；启用 m 后也匹配每一行的结尾。", example: "结束$" },
      { id: "word-boundary", syntax: "\\b", title: "单词边界", description: "匹配单词字符与非单词字符之间的位置。", example: "\\bcat\\b" },
      { id: "not-word-boundary", syntax: "\\B", title: "非单词边界", description: "匹配不是单词边界的位置。", example: "\\Bcat\\B" },
    ],
  },
  {
    id: "quantifiers",
    title: "量词",
    description: "控制前一项允许出现的次数。",
    entries: [
      { id: "zero-more", syntax: "*", title: "零次或多次", description: "前一项可以不出现，也可以连续出现任意多次。", example: "ab*c → ac / abbc" },
      { id: "one-more", syntax: "+", title: "一次或多次", description: "前一项至少出现一次。", example: "ab+c → abc / abbc" },
      { id: "optional", syntax: "?", title: "零次或一次", description: "前一项是可选的。", example: "colou?r → color / colour" },
      { id: "exact", syntax: "{n}", title: "恰好 n 次", description: "前一项必须连续出现指定次数。", example: "\\d{4} → 2026" },
      { id: "at-least", syntax: "{n,}", title: "至少 n 次", description: "前一项出现不少于指定次数。", example: "a{2,} → aa / aaa" },
      { id: "range-count", syntax: "{n,m}", title: "n 到 m 次", description: "前一项出现次数位于闭区间内。", example: "\\d{2,4}" },
      { id: "lazy", syntax: "*? / +? / {n,m}?", title: "惰性量词", description: "在满足后续条件的前提下尽可能少地匹配。", example: "<.*?> → 单个标签" },
    ],
  },
  {
    id: "groups",
    title: "分组、引用与断言",
    description: "组织子表达式、保存匹配内容或检查上下文。",
    entries: [
      { id: "capture", syntax: "(…)", title: "编号捕获组", description: "保存子表达式匹配的内容，可通过编号引用。", example: "(\\d{4})-(\\d{2})" },
      { id: "non-capture", syntax: "(?:…)", title: "非捕获组", description: "只组织子表达式，不创建捕获结果。", example: "(?:http|https)" },
      { id: "named-capture", syntax: "(?<name>…)", title: "命名捕获组", description: "使用可读名称保存捕获内容。", example: "(?<year>\\d{4})" },
      { id: "number-reference", syntax: "\\1", title: "编号反向引用", description: "再次匹配先前编号捕获组捕获到的文本。", example: "([a-z])\\1 → letter" },
      { id: "named-reference", syntax: "\\k<name>", title: "命名反向引用", description: "再次匹配指定命名捕获组捕获到的文本。", example: "(?<q>['\"]).*?\\k<q>" },
      { id: "alternation", syntax: "a|b", title: "分支选择", description: "匹配竖线左侧或右侧的表达式。", example: "cat|dog" },
      { id: "lookahead", syntax: "(?=…) / (?!…)", title: "正向与负向前瞻", description: "检查后续文本是否满足条件，但不把它计入完整匹配。", example: "\\d+(?=px)" },
      { id: "lookbehind", syntax: "(?<=…) / (?<!…)", title: "正向与负向后顾", description: "检查前置文本是否满足条件，但不把它计入完整匹配。", example: "(?<=￥)\\d+" },
    ],
  },
  {
    id: "flags",
    title: "匹配标志",
    description: "本工具支持浏览器原生 RegExp 的五个常用标志。",
    entries: [
      { id: "global", syntax: "g", title: "全局匹配", description: "继续查找后续匹配，而不是在第一项后停止。", example: "查找全部结果" },
      { id: "ignore-case", syntax: "i", title: "忽略大小写", description: "匹配时不区分大写与小写。", example: "hello → Hello" },
      { id: "multiline", syntax: "m", title: "多行模式", description: "让 ^ 和 $ 同时作用于每一行。", example: "^item 匹配每行开头" },
      { id: "dot-all", syntax: "s", title: "点匹配换行", description: "让点号也能匹配换行符。", example: "开始.*结束" },
      { id: "unicode", syntax: "u", title: "Unicode 模式", description: "按 Unicode 代码点解释模式并启用 Unicode 属性转义。", example: "\\p{Emoji}" },
    ],
  },
  {
    id: "replacement",
    title: "替换占位符",
    description: "替换文本遵循 JavaScript String.replace 的原生字符串语义。",
    entries: [
      { id: "dollar", syntax: "$$", title: "美元符号", description: "在替换结果中插入一个字面量 $。", example: "$$ → $" },
      { id: "whole-match", syntax: "$&", title: "完整匹配", description: "插入当前完整匹配的文本。", example: "[$&]" },
      { id: "before-match", syntax: "$`", title: "匹配前文本", description: "插入源文本中当前匹配之前的部分。", example: "前缀：$`" },
      { id: "after-match", syntax: "$'", title: "匹配后文本", description: "插入源文本中当前匹配之后的部分。", example: "后缀：$'" },
      { id: "numbered-replacement", syntax: "$1 / $2", title: "编号捕获组", description: "插入对应编号捕获组的内容。", example: "$2-$1" },
      { id: "named-replacement", syntax: "$<name>", title: "命名捕获组", description: "插入对应命名捕获组的内容。", example: "$<year>" },
    ],
  },
] as const satisfies readonly RegexSyntaxSection[];

export const COMMON_REGEX_CATEGORIES = [
  { id: "text", title: "文本处理", description: "空白、空行与常用字符范围。" },
  { id: "number", title: "数字格式", description: "整数、小数、百分比与千分位。" },
  { id: "network", title: "网络与联系信息", description: "常见网络地址和联系信息的格式检查。" },
  { id: "datetime", title: "日期与时间", description: "常见日期时间字符串的格式检查。" },
  { id: "development", title: "开发标识", description: "代码和配置中常见的标识格式。" },
] as const satisfies readonly CommonRegexCategoryDefinition[];

export const COMMON_REGEXES: readonly CommonRegexEntry[] = [
  {
    id: "non-empty-line",
    category: "text",
    title: "包含内容的行",
    pattern: "^.*\\S.*$",
    flags: ["g", "m"],
    description: "查找至少包含一个非空白字符的整行文本。",
    positiveExample: "订单号：RC-2026",
    negativeExample: "   ",
  },
  {
    id: "han-characters",
    category: "text",
    title: "仅汉字",
    pattern: "^\\p{Script=Han}+$",
    flags: ["u"],
    description: "检查字符串是否全部由 Unicode Han 脚本字符组成。",
    positiveExample: "正则表达式",
    negativeExample: "正则Regex",
    note: "覆盖 Han 脚本字符，不等同于语言或姓名的业务校验。",
  },
  {
    id: "edge-whitespace",
    category: "text",
    title: "首尾空白",
    pattern: "^\\s+|\\s+$",
    flags: ["g"],
    description: "查找字符串开头或结尾的连续空白，常用于清理输入。",
    positiveExample: "  hello ",
    negativeExample: "hello",
  },
  {
    id: "blank-lines",
    category: "text",
    title: "空白行",
    pattern: "^[\\t ]*\\r?\\n",
    flags: ["g", "m"],
    description: "查找只包含空格或制表符的空行及其换行符。",
    positiveExample: "\n下一行",
    negativeExample: "第一行\n第二行",
  },
  {
    id: "repeated-horizontal-space",
    category: "text",
    title: "连续横向空白",
    pattern: "[^\\S\\r\\n]{2,}",
    flags: ["g"],
    description: "查找两个及以上连续空格或制表符，不跨越换行。",
    positiveExample: "名称  数量",
    negativeExample: "名称 数量",
  },
  {
    id: "integer",
    category: "number",
    title: "有符号整数",
    pattern: "^[+-]?\\d+$",
    flags: [],
    description: "检查可带正负号的十进制整数。",
    positiveExample: "-42",
    negativeExample: "4.2",
  },
  {
    id: "positive-integer",
    category: "number",
    title: "正整数",
    pattern: "^[1-9]\\d*$",
    flags: [],
    description: "检查不含前导零且大于零的十进制整数。",
    positiveExample: "128",
    negativeExample: "0",
  },
  {
    id: "decimal",
    category: "number",
    title: "整数或小数",
    pattern: "^[+-]?(?:\\d+(?:\\.\\d+)?|\\.\\d+)$",
    flags: [],
    description: "检查可带符号的整数或至少含一位小数数字的十进制数。",
    positiveExample: "-0.75",
    negativeExample: "1.",
  },
  {
    id: "percentage",
    category: "number",
    title: "0–100 百分比",
    pattern: "^(?:100(?:\\.0+)?|(?:0|[1-9]\\d?)(?:\\.\\d+)?)%$",
    flags: [],
    description: "检查带百分号且数值位于 0 到 100 的常见格式。",
    positiveExample: "99.5%",
    negativeExample: "100.1%",
  },
  {
    id: "thousands-number",
    category: "number",
    title: "千分位数字",
    pattern: "^[+-]?(?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d+)?$",
    flags: [],
    description: "检查可带符号、小数和正确三位分组逗号的数字。",
    positiveExample: "1,234.56",
    negativeExample: "12,34",
  },
  {
    id: "email",
    category: "network",
    title: "常见邮箱地址",
    pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
    flags: [],
    description: "检查常见的本地部分、@ 和带点域名结构。",
    positiveExample: "dev@example.com",
    negativeExample: "dev@example",
    note: "这是实用格式检查，不覆盖 RFC 允许的所有邮箱写法，也不能确认邮箱存在。",
  },
  {
    id: "http-url",
    category: "network",
    title: "HTTP(S) URL",
    pattern: "^https?:\\/\\/(?:[A-Za-z0-9-]+\\.)+[A-Za-z]{2,}(?::\\d{1,5})?(?:[/?#][^\\s]*)?$",
    flags: ["i"],
    description: "检查带 http 或 https 协议和公开域名的常见 URL。",
    positiveExample: "https://example.com/path?q=1",
    negativeExample: "ftp://example.com",
    note: "不包含 localhost、IP 主机和所有国际化域名情况；完整解析应使用 URL API。",
  },
  {
    id: "ipv4",
    category: "network",
    title: "IPv4 地址",
    pattern: "^(?:(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)$",
    flags: [],
    description: "检查四段十进制 IPv4 地址，并限制每段为 0 到 255。",
    positiveExample: "192.168.1.1",
    negativeExample: "256.168.1.1",
  },
  {
    id: "domain-name",
    category: "network",
    title: "常见域名",
    pattern: "^(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\\.)+[A-Za-z]{2,63}$",
    flags: ["i"],
    description: "检查由点分标签组成的 ASCII 域名。",
    positiveExample: "tools.example.com",
    negativeExample: "-example.com",
    note: "不处理 Unicode 国际化域名；应先转换为规范化的 ASCII/Punycode。",
  },
  {
    id: "mac-address",
    category: "network",
    title: "MAC 地址",
    pattern: "^(?:[0-9A-F]{2}[:-]){5}[0-9A-F]{2}$",
    flags: ["i"],
    description: "检查六组十六进制字节组成的冒号或短横线格式。",
    positiveExample: "00:1A:2B:3C:4D:5E",
    negativeExample: "00:1A:2B:3C:4D",
  },
  {
    id: "mainland-mobile",
    category: "network",
    title: "中国大陆手机号",
    pattern: "^(?:\\+?86[- ]?)?1[3-9]\\d{9}$",
    flags: [],
    description: "检查可带 +86、86、空格或短横线前缀的常见大陆手机号格式。",
    positiveExample: "+86 13800138000",
    negativeExample: "12800138000",
    note: "号段会随运营规则变化；格式匹配不能确认号码归属或有效性。",
  },
  {
    id: "calendar-date",
    category: "datetime",
    title: "YYYY-MM-DD 日期",
    pattern: "^\\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\\d|3[01])$",
    flags: [],
    description: "检查四位年份、01–12 月和 01–31 日的日期外观。",
    positiveExample: "2026-07-21",
    negativeExample: "2026-13-01",
    note: "只检查格式和基础范围，不判断闰年或 2 月 31 日等真实日历日期。",
  },
  {
    id: "hour-minute",
    category: "datetime",
    title: "24 小时时分",
    pattern: "^(?:[01]\\d|2[0-3]):[0-5]\\d$",
    flags: [],
    description: "检查 HH:mm 格式的 24 小时时间。",
    positiveExample: "23:59",
    negativeExample: "24:00",
  },
  {
    id: "hour-minute-second",
    category: "datetime",
    title: "24 小时时分秒",
    pattern: "^(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d$",
    flags: [],
    description: "检查 HH:mm:ss 格式的 24 小时时间。",
    positiveExample: "08:30:45",
    negativeExample: "08:60:00",
  },
  {
    id: "iso-datetime",
    category: "datetime",
    title: "ISO 风格日期时间",
    pattern: "^\\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\\d|3[01])T(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d{1,3})?(?:Z|[+-](?:[01]\\d|2[0-3]):[0-5]\\d)$",
    flags: [],
    description: "检查带 T 分隔符、可选毫秒和时区的常见 ISO 风格时间。",
    positiveExample: "2026-07-21T14:30:00+08:00",
    negativeExample: "2026-07-21 14:30:00",
    note: "仅检查常见字符串格式，不替代 Date 或 Temporal 的实际日期解析。",
  },
  {
    id: "javascript-identifier",
    category: "development",
    title: "JavaScript 标识符（ASCII）",
    pattern: "^[A-Za-z_$][\\w$]*$",
    flags: [],
    description: "检查以 ASCII 字母、下划线或 $ 开头的常见标识符。",
    positiveExample: "_result2",
    negativeExample: "2result",
    note: "JavaScript 还允许大量 Unicode 标识符；此表达式只覆盖常见 ASCII 写法。",
  },
  {
    id: "uuid-v4",
    category: "development",
    title: "UUID v4",
    pattern: "^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
    flags: ["i"],
    description: "检查版本位和变体位符合 UUID v4 的标准文本外观。",
    positiveExample: "550e8400-e29b-41d4-a716-446655440000",
    negativeExample: "550e8400-e29b-11d4-a716-446655440000",
  },
  {
    id: "semantic-version",
    category: "development",
    title: "语义化版本",
    pattern: "^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-((?:0|[1-9]\\d*|\\d*[A-Za-z-][0-9A-Za-z-]*)(?:\\.(?:0|[1-9]\\d*|\\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\\+([0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*))?$",
    flags: [],
    description: "检查 SemVer 的主版本、次版本、修订号以及可选先行和构建标识。",
    positiveExample: "2.1.0-beta.1+build.7",
    negativeExample: "01.2.3",
  },
  {
    id: "hex-color",
    category: "development",
    title: "十六进制颜色",
    pattern: "^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$",
    flags: ["i"],
    description: "检查 CSS 常见的 RGB、RGBA、RRGGBB 或 RRGGBBAA 十六进制颜色。",
    positiveExample: "#ff7a59",
    negativeExample: "#12gh56",
  },
];

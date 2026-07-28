import type { SVGProps } from "react";
import type { EditorSection, MapNodeType } from "./types";

type IconName =
  | "back"
  | "cards"
  | "check"
  | "download"
  | "map"
  | "minus"
  | "misc"
  | "plus"
  | "relics"
  | "reset"
  | "search"
  | "trash"
  | "upload"
  | "warning";

const SECTION_ICON_NAMES: Record<EditorSection, IconName> = {
  cards: "cards",
  map: "map",
  misc: "misc",
  relics: "relics",
};

const paths: Record<IconName, React.ReactNode> = {
  back: <path d="m15 18-6-6 6-6M9 12h11" />,
  cards: (
    <>
      <path d="m5.4 3.8 9.8 2.6a2 2 0 0 1 1.4 2.5l-2.8 10.3a2 2 0 0 1-2.5 1.4l-7.6-2a2 2 0 0 1-1.4-2.5L5.4 3.8Z" />
      <path d="m9 7.5 4.7 1.3M8 11l4.7 1.3" />
      <path d="m16.5 5.5 2-.6a2 2 0 0 1 2.5 1.4l1.8 6.8a2 2 0 0 1-1.4 2.5l-4.5 1.2" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  download: (
    <>
      <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
      <path d="M5 19h14" />
    </>
  ),
  map: (
    <>
      <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z" />
      <path d="M9 3v15m6-12v15" />
    </>
  ),
  minus: <path d="M5 12h14" />,
  misc: (
    <>
      <path d="M7 4h10l1 4-2 2v9H8v-9L6 8l1-4Z" />
      <path d="M9 4c0 2 1 3 3 3s3-1 3-3M9 14h6" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  relics: (
    <>
      <path d="m12 2 3 5 5 1-3.5 4 1 6L12 15l-5.5 3 1-6L4 8l5-1 3-5Z" />
      <circle cx="12" cy="10" r="2" />
    </>
  ),
  reset: (
    <>
      <path d="M4 4v6h6" />
      <path d="M5.5 15a7 7 0 1 0 .7-7.8L4 10" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="m16 16 4 4" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M9 7V4h6v3m-9 0 1 14h10l1-14" />
      <path d="M10 11v6m4-6v6" />
    </>
  ),
  upload: (
    <>
      <path d="M12 15V3m0 0 4 4m-4-4L8 7" />
      <path d="M5 19h14" />
    </>
  ),
  warning: (
    <>
      <path d="M12 3 2.8 20h18.4L12 3Z" />
      <path d="M12 9v5m0 3h.01" />
    </>
  ),
};

export function Icon({
  name,
  ...props
}: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="20"
      viewBox="0 0 24 24"
      width="20"
      {...props}
    >
      <g
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      >
        {paths[name]}
      </g>
    </svg>
  );
}

export function SectionIcon({
  section,
  ...props
}: { section: EditorSection } & SVGProps<SVGSVGElement>) {
  return <Icon {...props} name={SECTION_ICON_NAMES[section]} />;
}

export function MapNodeIcon({
  type,
  ...props
}: { type: string } & SVGProps<SVGSVGElement>) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.8,
  };

  let content: React.ReactNode;

  switch (type) {
    case "monster":
      content = (
        <>
          <path d="m6 18 12-12M7 7l10 10M5 19l3-1-2-2-1 3Zm14 0-3-1 2-2 1 3Z" />
        </>
      );
      break;
    case "elite":
      content = (
        <>
          <path d="m5 9 3 3 4-7 4 7 3-3-1 10H6L5 9Z" />
          <path d="M8 16h8" />
        </>
      );
      break;
    case "unknown":
      content = (
        <>
          <path d="M9.5 9a2.8 2.8 0 1 1 4.6 2.1c-1.4 1-2.1 1.5-2.1 3" />
          <path d="M12 18h.01" />
        </>
      );
      break;
    case "rest_site":
      content = (
        <>
          <path d="M8 20c-2-4 1-5 2-8 2 2 2-4 3-7 4 4 5 8 3 11" />
          <path d="M7 20h10M10 20c0-2 1-4 3-6 1 2 2 4 1 6" />
        </>
      );
      break;
    case "shop":
      content = (
        <>
          <path d="M7 8h10l2 12H5L7 8Z" />
          <path d="M9 9V6a3 3 0 0 1 6 0v3" />
        </>
      );
      break;
    case "treasure":
      content = (
        <>
          <path d="M4 10h16v10H4V10Zm1-5h14l1 5H4l1-5Z" />
          <path d="M10 10v10m4-10v10M9 5c-1-3-5-2-4 0m10 0c1-3 5-2 4 0" />
        </>
      );
      break;
    case "ancient":
      content = (
        <>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 4v16M4 12h16m-13.7-5.7 11.4 11.4m0-11.4L6.3 17.7" />
        </>
      );
      break;
    case "boss":
      content = (
        <>
          <path d="m12 3 3 5 5 2-3 4v6H7v-6l-3-4 5-2 3-5Z" />
          <path d="m9 13 3 2 3-2" />
        </>
      );
      break;
    default:
      content = <circle cx="12" cy="12" r="7" />;
  }

  return (
    <svg
      aria-hidden="true"
      height="22"
      viewBox="0 0 24 24"
      width="22"
      {...props}
    >
      <g {...common}>{content}</g>
    </svg>
  );
}

export function isEditableMapNodeType(
  value: string,
): value is MapNodeType {
  return [
    "monster",
    "elite",
    "unknown",
    "rest_site",
    "shop",
    "treasure",
  ].includes(value);
}

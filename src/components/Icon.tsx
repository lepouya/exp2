import { PropsWithChildren } from "react";

import Arr from "../utils/arrays";

export type IconProps = {
  icon: string;
  pack?: string;

  color?: string;
  size?: string;
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";

  className?: string;
  style?: React.CSSProperties;
};

export default function Icon(props: PropsWithChildren<IconProps>) {
  const icon = autoCompleteIconStyle(props);

  return (
    <div className="icon-wrapper">
      <svg
        className={icon.className}
        width={icon.size}
        height={icon.size}
        color={icon.color}
        style={props.style}
      >
        <use href={icon.icon} />
      </svg>
      {props.children}
    </div>
  );
}

export function IconBadge(props: IconProps) {
  const icon = autoCompleteIconStyle(props);
  return (
    <svg
      className={Arr.className(
        "icon-badge",
        `icon-badge-${props.position}`,
        icon.className,
      )}
      width={icon.size}
      height={icon.size}
      color={icon.color}
      style={props.style}
    >
      <use href={icon.icon} />
    </svg>
  );
}

function autoCompleteIconStyle(iconStyle: IconProps): IconProps {
  const parts = iconStyle.icon.split(/\s+/).filter((s) => s.trim().length > 0);
  let pack = iconStyle.pack || "";
  let icon = parts.pop() ?? iconStyle.icon;
  let color = parts.pop() ?? iconStyle.color;

  if (icon.includes(":")) {
    [pack, icon] = icon.split(":", 2);
  }

  const className = [
    "icon",
    pack && `icon-${pack}`,
    icon && `icon-${icon}`,
    color && !color.startsWith("#") && color,
    iconStyle.className,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    icon: `${pack ? `sprites/${pack}.svg` : ""}#${icon}`,
    color: color?.startsWith("#") ? color : undefined,
    size: iconStyle.size,
    className,
  };
}

import { PropsWithChildren } from "react";
import { useLocation } from "react-router";
import { NavLink } from "react-router-dom";

import Icon, { IconProps } from "./Icon";

export type LinkProps = PropsWithChildren<{
  to: string;
  condition?: boolean;
  heading?: string;
  icon?: string | IconProps;
}>;

export default function Link(props: LinkProps) {
  if (!(props.condition ?? true)) {
    return null;
  }

  const location = useLocation();
  const icon =
    typeof props.icon === "object"
      ? props.icon
      : props.icon
      ? { icon: props.icon }
      : undefined;

  return (
    <div id={`tab-${props.to.replace(/\W/g, "") || "main"}`}>
      <NavLink
        className={(p) => (p.isActive ? "active" : undefined)}
        to={{ pathname: props.to, search: location.search }}
      >
        {icon && <Icon {...icon} />}
        {props.heading && <span>{props.heading}</span>}
        {props.children}
      </NavLink>
    </div>
  );
}

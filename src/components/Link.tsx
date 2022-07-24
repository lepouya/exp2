import { PropsWithChildren } from "react";
import { useLocation } from "react-router";
import { NavLink } from "react-router-dom";

export type LinkProps = PropsWithChildren<{
  to: string;
  condition?: boolean;
}>;

export default function Link(props: LinkProps) {
  if (!(props.condition ?? true)) {
    return null;
  }

  const location = useLocation();
  return (
    <div id={`tab-${props.to.replace(/\W/g, "") || "main"}`}>
      <NavLink
        className={({ isActive }) => (isActive ? "active" : undefined)}
        to={{ pathname: props.to, search: location.search }}
      >
        {props.children}
      </NavLink>
    </div>
  );
}

import tablerIcons from "../../assets/sprites/tabler-sprite-nostroke.svg";
import Arr from "../utils/arrays";
import { getHTMLElement } from "../utils/document";

export type IconProps = {
  icon: string;

  color?: string;
  size?: string;

  className?: string;
};

export default function Icon(props: IconProps) {
  const parts = props.icon.split(/\s+/).filter((s) => s.trim().length > 0);
  const icon = parts.pop() ?? props.icon;
  let color = parts.pop() ?? props.color;

  const classNames = ["icon", icon && "icon-" + icon, props.className];
  if (color && !color.startsWith("#")) {
    classNames.push(color);
    color = undefined;
  }

  return (
    <svg
      className={Arr.className(classNames)}
      width={props.size}
      height={props.size}
      color={color}
    >
      <use xlinkHref={`#tabler-${icon}`} />
    </svg>
  );
}

window.addEventListener(
  "load",
  () => (getHTMLElement("icon").innerHTML = tablerIcons),
  false,
);

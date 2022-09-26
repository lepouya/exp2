import Arr from "../utils/arrays";

const ICONS_FILE = "sprites/tabler-icons.svg";

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
      <use xlinkHref={`${ICONS_FILE}#tabler-${icon}`} />
    </svg>
  );
}

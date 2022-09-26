import Arr from "../utils/arrays";

export type IconProps = {
  icon: string;

  color?: string;
  size?: string;

  className?: string;
};

export default function Icon(props: IconProps) {
  const parts = props.icon.split(/\s+/).filter((s) => s.trim().length > 0);
  let pack = "";
  let icon = parts.pop() ?? props.icon;
  let color = parts.pop() ?? props.color;

  if (icon.includes(":")) {
    [pack, icon] = icon.split(":", 2);
  }

  const classNames = [
    "icon",
    pack && "icon-" + pack,
    icon && "icon-" + icon,
    props.className,
  ];
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
      <use href={`${pack ? `sprites/${pack}.svg` : ""}#${icon}`} />
    </svg>
  );
}

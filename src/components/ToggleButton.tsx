import {
  MouseEvent,
  PropsWithChildren,
  ReactNode,
  useEffect,
  useState,
} from "react";

import Arr from "../utils/arrays";

export type ToggleButtonProps = {
  enabled?: boolean;
  checked?: boolean;

  checkedContents?: ReactNode;
  unCheckedContents?: ReactNode;

  className?: string;
  style?: React.CSSProperties;

  onChange?: (checked: boolean) => void;
};

export default function ToggleButton({
  enabled = true,
  checked = false,
  onChange,
  checkedContents,
  unCheckedContents,
  className,
  style,
  children,
}: PropsWithChildren<ToggleButtonProps>) {
  const [toggle, setToggle] = useState(false);
  useEffect(() => setToggle(checked), [checked]);

  function triggerToggle(event: MouseEvent) {
    event.preventDefault();
    if (!enabled) {
      return;
    }

    setToggle(!toggle);
    if (onChange) {
      onChange(!toggle);
    }
  }

  return (
    <div
      onClick={triggerToggle}
      className={Arr.className([
        className,
        "toggle-button",
        `${enabled ? "en" : "dis"}abled`,
        `${checked ? "" : "un"}checked`,
      ])}
      style={style}
    >
      <div className="check">
        <div>{checkedContents}</div>
      </div>
      <div className="contents">{children}</div>
      <div className="uncheck">
        <div>{unCheckedContents}</div>
      </div>
      <div className="circle"></div>
    </div>
  );
}

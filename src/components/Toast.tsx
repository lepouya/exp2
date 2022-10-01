// Inspired by github:Cogoport/cogo-toast

import {
  MouseEventHandler,
  PropsWithChildren,
  ReactNode,
  useEffect,
  useState,
} from "react";
import { createRoot, Root } from "react-dom/client";

import Arr from "../utils/arrays";
import { getHTMLElement } from "../utils/document";
import { Expansion, KeysUnion } from "../utils/types";
import Icon, { IconProps } from "./Icon";

export type ToastProps = PropsWithChildren<{
  id?: number;

  heading?: string;
  icon?: string | IconProps;
  message?: ReactNode;

  position?: KeysUnion<keyof typeof rows, keyof typeof groups>;
  duration?: number;
  type?: keyof typeof icons;

  onClick?: MouseEventHandler;
  onHide?: (toast: ToastProps) => void;

  className?: string;
  style?: React.CSSProperties;
}>;

export default function toast(props?: ToastProps | string) {
  return genToast(typeof props === "string" ? { message: props } : props ?? {});
}
toast.info = (message: string, props?: ToastProps) =>
  genToast({ ...props, message, type: "info" });
toast.success = (message: string, props?: ToastProps) =>
  genToast({ ...props, message, type: "success" });
toast.fail = (message: string, props?: ToastProps) =>
  genToast({ ...props, message, type: "fail" });

const rows = { top: "top", bottom: "bottom" };
const groups = { left: "left", center: "center", right: "right" };
const icons = {
  info: "ti:info-circle",
  success: "ti:circle-check",
  fail: "ti:alert-circle",
};
let all_toasts: Expansion<string, ToastProps[]>;
let root: Root;
let idx = 0;

window.addEventListener(
  "load",
  () => (root = createRoot(getHTMLElement("toasts-root"))),
  false,
);

function genToast(props: ToastProps) {
  props = { ...props };
  props.id = props.id ?? idx++;

  const position = props.position ?? "top-right";
  all_toasts = all_toasts ?? {};
  all_toasts[position] = all_toasts[position] ?? [];
  if (position.includes("bottom")) {
    all_toasts[position].unshift(props);
  } else {
    all_toasts[position].push(props);
  }

  const onToastHide = props.onHide;
  props.onHide = (toast) => {
    const position = toast.position ?? "top-right";
    all_toasts[position] = all_toasts[position].filter(
      (item) => item.id !== toast.id,
    );
    renderAllToasts();
    if (onToastHide) {
      onToastHide(toast);
    }
  };

  renderAllToasts();
  return {
    ...new Promise((resolve) =>
      setTimeout(resolve, (props.duration ?? 3) * 1000),
    ),
    hide: () => props.onHide!(props),
  };
}

function renderAllToasts() {
  root.render(
    Object.keys(rows).map((row) => (
      <div key={row} className={Arr.className("row", row)}>
        {Object.keys(groups).map((group) => {
          const type = `${row}-${group}`;
          return (
            <div key={type} className={Arr.className("group", group)}>
              {(all_toasts[type] ?? []).map((toast) => (
                <Toast key={`toast_${type}_${toast.id}`} {...toast} />
              ))}
            </div>
          );
        })}
      </div>
    )),
  );
}

function Toast(props: ToastProps) {
  const [shown, setShown] = useState("hidden");

  function hide() {
    setShown("hidden");
    setTimeout(() => {
      if (props.onHide) {
        props.onHide(props);
      }
    }, 300);
  }

  useEffect(() => {
    const animTimeout = setTimeout(() => setShown("shown"), 50);
    const hideTimeout = setTimeout(() => {
      if (props.duration !== 0) {
        hide();
      }
    }, (props.duration ?? 3) * 1000);

    return () => {
      clearTimeout(animTimeout);
      clearTimeout(hideTimeout);
    };
  }, []);

  const icon =
    typeof props.icon === "object"
      ? props.icon
      : props.icon
      ? { icon: props.icon }
      : props.type
      ? { icon: icons[props.type] }
      : undefined;

  return (
    <div
      className={Arr.className("toast", shown, props.type, props.className)}
      onClick={props.onClick ?? hide}
      style={props.style}
    >
      {icon && <Icon {...icon} />}
      <div>
        {props.heading && <h4>{props.heading}</h4>}
        {props.message && <div className="message">{props.message}</div>}
        {props.children && <div className="children">{props.children}</div>}
      </div>
    </div>
  );
}

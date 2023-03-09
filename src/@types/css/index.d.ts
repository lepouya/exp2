import { CSSProperties } from "react";

import { BaseType } from "../../utils/types";

declare module "react" {
  interface CSSProperties {
    [key: `--${string}`]: BaseType;
  }
}

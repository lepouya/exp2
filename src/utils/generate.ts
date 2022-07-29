import Obj from "./objects";
import { FunctionType, Optional, TypeEquals } from "./types";

export type Generator<T, Self = T, GenArgs extends unknown[] = []> =
  | (NonNullable<T> extends FunctionType ? never : Optional<T>)
  | ((self: Self, ...args: GenArgs) => Optional<T>);

export type Generative<T, GenArgs extends unknown[] = []> = {
  [K in keyof T]?: TypeEquals<
    { [Q in K]: T[K] },
    { -readonly [Q in K]: T[K] },
    Generator<T[K], Optional<T>, GenArgs>,
    T[K]
  >;
};

export default function generate<
  T extends Record<any, unknown>,
  GenArgs extends unknown[] = any[],
>(
  generator?: Generative<T, GenArgs>,
  defaultValue?: Optional<T>,
  ...args: GenArgs
): T {
  const generated: any = { ...defaultValue };

  if (generator) {
    let key: keyof T;
    for (key in generator) {
      let value = generator[key];
      Obj.assign(
        generated,
        key,
        typeof value === "function" ? value(generated, ...args) : value,
      );
    }
  }

  return generated;
}

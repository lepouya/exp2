// Inspired by github:RonPenton/tsc-utils

import Decimal from "break_eternity.js";
import { ReactNode } from "react";

export type Null<T> = T extends null ? T : never;
export type Undefined<T> = T extends undefined ? T : never;
export type Nullable<T> = T | null | undefined;

export type BaseType =
  | null
  | undefined
  | string
  | number
  | boolean
  | symbol
  | bigint;

export type AtomicType =
  | String
  | Number
  | Boolean
  | Symbol
  | BigInt
  | Date
  | Decimal
  | RegExp
  | JSON
  | Error
  | Element
  | ReactNode;

export type FunctionType<
  Arguments extends unknown[] = any[],
  Return = unknown,
> = (...args: Arguments) => Return;

export type Expansion<Union extends string, Type> = {
  [Key in Union]: Type;
};

export type KeysUnion<
  T1 extends string,
  T2 extends string,
  Separator extends string = "-",
> = `${T1}${Separator}${T2}`;

export type Optional<T> = Nullable<
  T extends BaseType | AtomicType | FunctionType
    ? T
    : T extends any[]
    ? OptionalArray<T>
    : { [P in keyof T]?: Optional<T[P]> }
>;

type OptionalArray<T> = T extends [infer Head]
  ? [Optional<Head>]
  : T extends [infer Head, ...infer Rest]
  ? [Optional<Head>, ...OptionalArray<Rest>]
  : never;

export type Replace<T, From, To> = T extends From
  ? To | Null<T> | Undefined<T>
  : T extends BaseType | AtomicType
  ? T | Null<T> | Undefined<T>
  : T extends FunctionType<infer Arguments, infer Return>
  ? FunctionType<ReplaceArray<Arguments, From, To>, Replace<Return, From, To>>
  : T extends any[]
  ? ReplaceArray<T, From, To>
  : { [P in keyof T]: Replace<T[P], From, To> };

type ReplaceArray<T, From, To> = T extends [infer Head]
  ? [Replace<Head, From, To>]
  : T extends [infer Head, ...infer Rest]
  ? [Replace<Head, From, To>, ...ReplaceArray<Rest, From, To>]
  : never;

export type TypeEquals<One, Two, Then = One, Else = never> = (<
  T,
>() => T extends One ? 1 : 2) extends <T>() => T extends Two ? 1 : 2
  ? Then
  : Else;

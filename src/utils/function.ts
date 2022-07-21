export default function Fn() {
  return Fn;
}

Fn.apply = function <T extends unknown[], U extends unknown[], R>(
  fn: (..._: [...T, ...U]) => R,
  ...front: T
) {
  return (...tail: U) => fn(...front, ...tail);
};

Fn.compose = function <T extends ((_: any) => any)[]>(...fns: T) {
  return (
    args: T extends [..._: any, _: (_: infer P) => any] ? P : never,
  ): T[0] extends (_: any) => infer R ? R : never =>
    fns.reduceRight((val: any, fn: any) => fn(val), args);
};

Fn.chain = function <T extends ((_: any) => any)[]>(...fns: T) {
  return (
    args: T[0] extends Function ? Parameters<T[0]> : never,
  ): T extends [..._: any, _: (_: any) => infer R] ? R : never =>
    fns.reduce((val: any, fn: any) => fn(val), args);
};

Fn.map = function <P extends unknown[], R>(...fns: ((..._: P) => R)[]) {
  return (...args: P): R[] => fns.map((fn) => fn(...args));
};

Fn.mapReduce = function <P extends unknown[], R, F>(
  reduce: (_: R[]) => F,
  ...fns: ((..._: P) => R)[]
) {
  const map = Fn.map(...fns);
  return (...args: P): F => reduce(map(...args));
};

Fn.compile = function <A extends unknown[], R = unknown>(
  body: string,
  thisBind?: any,
  args: string[] = [],
  globals: Record<string, any> = {},
  reserved: string[] = [],
  forceArgs = false,
  forceGlobals = false,
): (...args: A) => R {
  let fnBody = body.replace(/\b\w+\b/gim, function (token) {
    if (!token || token === "this" || reserved.includes(token)) {
      return token;
    } else if (args.includes(token)) {
      forceArgs = true;
      return "___param_" + token;
    } else if (globals[token]) {
      forceGlobals = true;
      return "___globals." + token;
    } else {
      return token;
    }
  });

  if (forceArgs) {
    fnBody = `(function (${args
      .map((arg) => "___param_" + arg)
      .join(",")}) { return ${fnBody}; })`;
  }

  if (forceGlobals) {
    fnBody = `(function (___globals) { return (${fnBody}); })`;
  }

  let fn: any;
  try {
    fn = eval(fnBody);
  } catch (_) {
    fn = null;
  }

  if (thisBind && typeof fn === "function") {
    fn = fn.bind(thisBind);
  }

  if (forceGlobals && typeof fn === "function") {
    fn = fn(globals);
    if (thisBind && typeof fn === "function") {
      fn = fn.bind(thisBind);
    }
  }

  if (typeof fn !== "function") {
    if (!forceArgs) {
      return Fn.compile(
        body,
        thisBind,
        args,
        globals,
        reserved,
        true,
        forceGlobals,
      );
    } else {
      return () => fn;
    }
  } else {
    return fn;
  }
};

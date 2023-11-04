export default function Obj(...args: any) {
  return { ...args };
}

Obj.assign = function <
  T,
  Key extends keyof T = keyof T,
  Value extends T[Key] = T[Key],
>(obj?: T, key?: Key, value?: Value) {
  const newObj: any = obj || {};

  if (
    key != null &&
    newObj[key] &&
    value != null &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    newObj[key] = { ...newObj[key], ...value };
  } else if (key != null && value != null) {
    newObj[key] = value;
  }

  return newObj;
};

Obj.copy = function <T>(from?: Partial<T>, to?: Partial<T>) {
  from ||= {};
  to ||= {};

  for (let key in from) {
    Obj.assign(to, key, from[key]);
  }

  return to;
};

Obj.map = function <
  Key1 extends string | number | symbol,
  Value1,
  Key2 extends string | number | symbol = Key1,
  Value2 = Value1,
>(
  obj: Record<Key1, Value1>,
  valueMap?: (value?: Value1, key?: Key1) => Value2,
  keyMap?: (key: Key1) => Key2,
): Record<Key2, Value2> {
  const newObject: any = {};

  for (const key in obj) {
    const newKey = keyMap ? keyMap(key) : key;
    const value = obj[key];
    const newValue = valueMap ? valueMap(value, key) : value;
    newObject[newKey] = newValue;
  }

  return newObject;
};

Obj.filter = function <Key extends string | number | symbol, Value>(
  obj: Record<Key, Value>,
  valueFilter?: (value?: Value, key?: Key) => boolean,
  keyFilter?: (key?: Key) => boolean,
): Record<Key, Value> {
  const newObject: any = {};

  for (const key in obj) {
    const keyPass = keyFilter ? keyFilter(key) : true;
    const valuePass = valueFilter ? valueFilter(obj[key], key) : true;
    if (keyPass && valuePass) {
      newObject[key] = obj[key];
    }
  }

  return newObject;
};

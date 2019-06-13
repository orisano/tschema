type Foo = {
  bar: string;
  foo?: string;
  a: number;
  b: string[];
  c: Array<string>;
  d: "A";
  e: 1;
  f: "A" | "B";
  g: Omit<{ a: string } & { b: number }, "a">;
  h: Bar;
  i: Array<Bar>;
};

/**
 * @description foo
 */
type Bar = {
  /**
   * @description bar
   */
  x: number;
  y: number;
};

type FooBar<T> = T extends string ? { a: string } : { a: number };
// type Baz = FooBar<string>;

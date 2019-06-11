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

type FooBar = "string" extends number ? { a: string } : { a: number };

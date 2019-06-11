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
};

type Bar = {
  x: number;
  y: number;
};

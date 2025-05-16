export type GLSLType = 'float' | 'vec2' | 'vec3' | 'vec4' | 'mat4';
let varCounter = 0;

class Expression {
  constructor(public code: string, public type: GLSLType) {}

  private emit(line: string) {
    GLSLBuilder.lines.push(line);
  }

  private binary(op: string, rhs: Expression | number) {
    const rCode = typeof rhs === 'number' ? rhs.toFixed(1) : rhs.code;
    const name = `v${varCounter++}`;
    this.emit(`${this.type} ${name} = ${this.code} ${op} ${rCode};`);
    return new Expression(name, this.type);
  }

  add(r: Expression | number) {
    return this.binary('+', r);
  }
  sub(r: Expression | number) {
    return this.binary('-', r);
  }
  mul(r: Expression | number) {
    return this.binary('*', r);
  }
  div(r: Expression | number) {
    return this.binary('/', r);
  }

  private unary(fn: string) {
    const name = `v${varCounter++}`;
    this.emit(`${this.type} ${name} = ${fn}(${this.code});`);
    return new Expression(name, this.type);
  }

  sin() {
    return this.unary('sin');
  }
  cos() {
    return this.unary('cos');
  }
  normalize() {
    return this.unary('normalize');
  }

  private ternary(fn: string, b: Expression | number, c: Expression | number) {
    const bCode = typeof b === 'number' ? b.toFixed(1) : b.code;
    const cCode = typeof c === 'number' ? c.toFixed(1) : c.code;
    const name = `v${varCounter++}`;
    this.emit(
      `${this.type} ${name} = ${fn}(${this.code}, ${bCode}, ${cCode});`
    );
    return new Expression(name, this.type);
  }

  step(edge: Expression | number) {
    return this.ternary('step', edge, this);
  }
  smoothstep(edge0: Expression | number, edge1: Expression | number) {
    return this.ternary('smoothstep', edge0, edge1);
  }

  // Swizzle getters for vector components
  get x(): Expression {
    const name = `v${varCounter++}`;
    this.emit(`float ${name} = ${this.code}.x;`);
    return new Expression(name, 'float');
  }

  get y(): Expression {
    const name = `v${varCounter++}`;
    this.emit(`float ${name} = ${this.code}.y;`);
    return new Expression(name, 'float');
  }
}

class GLSLBuilder {
  static lines: string[] = [];
  static functions: string[] = [];
  static uniforms: Array<{ name: string; type: GLSLType }> = [];

  static emit(line: string) {
    this.lines.push(line);
  }

  static ifBlock(cond: string, t: () => void, f?: () => void) {
    this.emit(`if(${cond}){`);
    t();
    this.emit('}');
    if (f) {
      this.emit('else{');
      f();
      this.emit('}');
    }
  }

  static defineFunction(
    name: string,
    ret: GLSLType,
    params: Array<{ name: string; type: GLSLType }>,
    body: () => Expression
  ) {
    const paramStr = params.map((p) => `${p.type} ${p.name}`).join(', ');
    const save = this.lines;
    this.lines = [];
    const retExpr = body();
    this.emit(`return ${retExpr.code};`);
    const block = this.lines.map((l) => `  ${l}`).join('\n');
    this.functions.push(`${ret} ${name}(${paramStr}) {\n${block}\n}`);
    this.lines = save;
  }

  static build(
    uniforms: Record<string, GLSLType>,
    mainFn: (vars: any) => Expression
  ): string {
    this.lines = [];
    this.functions = [];
    this.uniforms = [];

    Object.entries(uniforms).forEach(([name, type]) => {
      this.uniforms.push({ name, type });
    });

    const vars = {
      gl_FragCoord: { xy: new Expression('gl_FragCoord.xy', 'vec2') },
      uniform: (n: string) => new Expression(n, uniforms[n]),
    };

    const result = mainFn(vars);
    this.emit(`gl_FragColor = vec4(${result.code}, 0.0, 1.0);`);

    const uLines = this.uniforms.map((u) => `uniform ${u.type} ${u.name};`);
    return `${uLines.join('\n')}\n\n${this.functions.join(
      '\n\n'
    )}\n\nvoid main(){\n  ${this.lines.join('\n  ')}\n}`;
  }
}

export const vec2 = (x: number, y?: number) =>
  new Expression(`vec2(${x.toFixed(1)}, ${(y ?? x).toFixed(1)})`, 'vec2');
export const uniform = (n: string, t: GLSLType = 'float') =>
  new Expression(n, t);
export const glsl = ({
  uniforms,
  main,
}: {
  uniforms: Record<string, GLSLType>;
  main: (vars: any) => Expression;
}) => GLSLBuilder.build(uniforms, main);
export const glslIf = GLSLBuilder.ifBlock.bind(GLSLBuilder);
export const glslFunction = GLSLBuilder.defineFunction.bind(GLSLBuilder);

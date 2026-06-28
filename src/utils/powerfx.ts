/**
 * A pragmatic Power Fx interpreter for the Canvas App Renderer.
 *
 * This is NOT a complete Power Fx implementation. It supports the subset of
 * the language that real exported canvas apps use heavily: tables (arrays of
 * records), the data functions (Filter / LookUp / Sort / ForAll / CountRows /
 * Collect / Patch ...), record + table literals, the `As` scope operator,
 * enums (Align.Center, Icon.ChevronRight, 'ButtonCanvas.Appearance'.Transparent),
 * string/number/boolean logic, and the behavior functions used in OnSelect /
 * OnChange / OnVisible / App.OnStart.
 *
 * Values:
 *   number | string | boolean | null (Blank) | Record (plain object) | Table (array of Records)
 */

// ----------------------------------------------------------------------------
// Tokenizer
// ----------------------------------------------------------------------------

type TokType = 'num' | 'str' | 'istr' | 'id' | 'qid' | 'op' | 'eof';
interface Tok { type: TokType; value: string; }

const OPS3 = ['<=>']; // none, placeholder
const OPS2 = ['&&', '||', '<=', '>=', '<>'];
const OPS1 = ['+', '-', '*', '/', '&', '=', '<', '>', '(', ')', '{', '}', ',', '.', ';', '!', '%'];

const isIdStart = (c: string) => /[A-Za-z_]/.test(c) || c.charCodeAt(0) > 127;
const isIdPart = (c: string) => /[A-Za-z0-9_]/.test(c) || c.charCodeAt(0) > 127;

function tokenize(src: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    // whitespace
    if (c === ' ' || c === '\t' || c === '\r' || c === '\n') { i++; continue; }
    // interpolated string $"..."
    if (c === '$' && src[i + 1] === '"') {
      i += 2;
      let buf = '';
      while (i < n) {
        if (src[i] === '"') {
          if (src[i + 1] === '"') { buf += '"'; i += 2; continue; }
          i++; break;
        }
        buf += src[i++];
      }
      toks.push({ type: 'istr', value: buf });
      continue;
    }
    // string "..."
    if (c === '"') {
      i++;
      let buf = '';
      while (i < n) {
        if (src[i] === '"') {
          if (src[i + 1] === '"') { buf += '"'; i += 2; continue; }
          i++; break;
        }
        buf += src[i++];
      }
      toks.push({ type: 'str', value: buf });
      continue;
    }
    // quoted identifier '...'
    if (c === "'") {
      i++;
      let buf = '';
      while (i < n) {
        if (src[i] === "'") {
          if (src[i + 1] === "'") { buf += "'"; i += 2; continue; }
          i++; break;
        }
        buf += src[i++];
      }
      toks.push({ type: 'qid', value: buf });
      continue;
    }
    // number
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
      let buf = '';
      while (i < n && /[0-9.]/.test(src[i])) buf += src[i++];
      toks.push({ type: 'num', value: buf });
      continue;
    }
    // identifier
    if (isIdStart(c)) {
      let buf = '';
      while (i < n && isIdPart(src[i])) buf += src[i++];
      toks.push({ type: 'id', value: buf });
      continue;
    }
    // operators
    let matched = false;
    for (const op of OPS3) { if (src.startsWith(op, i)) { toks.push({ type: 'op', value: op }); i += op.length; matched = true; break; } }
    if (matched) continue;
    for (const op of OPS2) { if (src.startsWith(op, i)) { toks.push({ type: 'op', value: op }); i += op.length; matched = true; break; } }
    if (matched) continue;
    if (OPS1.includes(c)) { toks.push({ type: 'op', value: c }); i++; continue; }
    // unknown char, skip
    i++;
  }
  toks.push({ type: 'eof', value: '' });
  return toks;
}

// ----------------------------------------------------------------------------
// AST
// ----------------------------------------------------------------------------

type Node =
  | { k: 'num'; v: number }
  | { k: 'str'; v: string }
  | { k: 'istr'; v: string }
  | { k: 'bool'; v: boolean }
  | { k: 'id'; v: string }
  | { k: 'enumref'; path: string } // dotted enum path built lazily; not used directly
  | { k: 'member'; obj: Node; name: string }
  | { k: 'call'; name: string; args: Node[]; rawArgs: { node: Node; alias?: string }[] }
  | { k: 'mcall'; obj: Node; name: string; args: Node[]; rawArgs: { node: Node; alias?: string }[] } // connector method call: Office365Users.MyProfile(...)
  | { k: 'record'; fields: { key: string; value: Node }[] }
  | { k: 'unary'; op: string; e: Node }
  | { k: 'binary'; op: string; l: Node; r: Node }
  | { k: 'seq'; items: Node[] };

// ----------------------------------------------------------------------------
// Parser (recursive descent w/ precedence)
// ----------------------------------------------------------------------------

class Parser {
  toks: Tok[];
  p = 0;
  constructor(toks: Tok[]) { this.toks = toks; }
  peek(o = 0) { return this.toks[this.p + o]; }
  next() { return this.toks[this.p++]; }
  isOp(v: string) { const t = this.peek(); return t.type === 'op' && t.value === v; }
  eatOp(v: string) { if (this.isOp(v)) { this.p++; return true; } return false; }
  isId(v: string) { const t = this.peek(); return t.type === 'id' && t.value.toLowerCase() === v.toLowerCase(); }

  parseProgram(): Node { return this.parseSequence(); }

  // sequence of statements separated by ';'
  parseSequence(): Node {
    const items: Node[] = [this.parseExpr()];
    while (this.isOp(';')) { this.next(); if (this.peek().type === 'eof' || this.isOp(')') || this.isOp(',')) break; items.push(this.parseExpr()); }
    return items.length === 1 ? items[0] : { k: 'seq', items };
  }

  parseExpr(): Node { return this.parseOr(); }

  parseOr(): Node {
    let l = this.parseAnd();
    while (this.isOp('||') || this.isId('Or')) { this.next(); const r = this.parseAnd(); l = { k: 'binary', op: '||', l, r }; }
    return l;
  }
  parseAnd(): Node {
    let l = this.parseCompare();
    while (this.isOp('&&') || this.isId('And')) { this.next(); const r = this.parseCompare(); l = { k: 'binary', op: '&&', l, r }; }
    return l;
  }
  parseCompare(): Node {
    let l = this.parseInOp();
    while (this.isOp('=') || this.isOp('<>') || this.isOp('<') || this.isOp('>') || this.isOp('<=') || this.isOp('>=')) {
      const op = this.next().value; const r = this.parseInOp(); l = { k: 'binary', op, l, r };
    }
    return l;
  }
  parseInOp(): Node {
    let l = this.parseConcat();
    while (this.isId('in') || this.isId('exactin')) { const op = this.next().value.toLowerCase(); const r = this.parseConcat(); l = { k: 'binary', op, l, r }; }
    return l;
  }
  parseConcat(): Node {
    let l = this.parseAdd();
    while (this.isOp('&')) { this.next(); const r = this.parseAdd(); l = { k: 'binary', op: '&', l, r }; }
    return l;
  }
  parseAdd(): Node {
    let l = this.parseMul();
    while (this.isOp('+') || this.isOp('-')) { const op = this.next().value; const r = this.parseMul(); l = { k: 'binary', op, l, r }; }
    return l;
  }
  parseMul(): Node {
    let l = this.parseUnary();
    while (this.isOp('*') || this.isOp('/')) { const op = this.next().value; const r = this.parseUnary(); l = { k: 'binary', op, l, r }; }
    return l;
  }
  parseUnary(): Node {
    if (this.isOp('-')) { this.next(); return { k: 'unary', op: '-', e: this.parseUnary() }; }
    if (this.isOp('!') || this.isId('Not')) { /* Not handled as func too */ }
    if (this.isOp('!')) { this.next(); return { k: 'unary', op: '!', e: this.parseUnary() }; }
    return this.parsePostfix();
  }
  parsePostfix(): Node {
    let e = this.parsePrimary();
    for (;;) {
      if (this.isOp('.')) {
        this.next();
        const t = this.peek();
        let name: string;
        if (t.type === 'id' || t.type === 'qid') { name = t.value; this.next(); }
        else break;
        // method call form: Namespace.Operation(args)  (e.g. Office365Users.MyProfile())
        if (this.isOp('(')) {
          this.next();
          const rawArgs = this.parseArgs();
          this.eatOp(')');
          e = { k: 'mcall', obj: e, name, args: rawArgs.map(a => a.node), rawArgs };
        } else {
          e = { k: 'member', obj: e, name };
        }
      } else break;
    }
    return e;
  }
  parsePrimary(): Node {
    const t = this.peek();
    if (t.type === 'num') { this.next(); return { k: 'num', v: parseFloat(t.value) }; }
    if (t.type === 'str') { this.next(); return { k: 'str', v: t.value }; }
    if (t.type === 'istr') { this.next(); return { k: 'istr', v: t.value }; }
    if (this.isOp('(')) { this.next(); const e = this.parseSequence(); this.eatOp(')'); return e; }
    if (this.isOp('{')) { return this.parseRecord(); }
    if (t.type === 'qid') { this.next(); return { k: 'id', v: t.value }; }
    if (t.type === 'id') {
      // boolean / blank literals
      if (t.value.toLowerCase() === 'true') { this.next(); return { k: 'bool', v: true }; }
      if (t.value.toLowerCase() === 'false') { this.next(); return { k: 'bool', v: false }; }
      // function call?
      if (this.peek(1).type === 'op' && this.peek(1).value === '(') {
        const name = t.value; this.next(); this.next(); // id and '('
        const rawArgs = this.parseArgs();
        this.eatOp(')');
        return { k: 'call', name, args: rawArgs.map(a => a.node), rawArgs };
      }
      this.next();
      return { k: 'id', v: t.value };
    }
    // fallback
    this.next();
    return { k: 'str', v: '' };
  }
  parseArgs(): { node: Node; alias?: string }[] {
    const args: { node: Node; alias?: string }[] = [];
    if (this.isOp(')')) return args;
    for (;;) {
      const node = this.parseSequence();
      let alias: string | undefined;
      if (this.isId('As')) { this.next(); const a = this.peek(); if (a.type === 'id' || a.type === 'qid') { alias = a.value; this.next(); } }
      args.push({ node, alias });
      if (this.eatOp(',')) continue;
      break;
    }
    return args;
  }
  parseRecord(): Node {
    this.eatOp('{');
    const fields: { key: string; value: Node }[] = [];
    if (this.isOp('}')) { this.eatOp('}'); return { k: 'record', fields }; }
    for (;;) {
      const kt = this.peek();
      let key: string;
      if (kt.type === 'id' || kt.type === 'qid' || kt.type === 'str') { key = kt.value; this.next(); }
      else { key = String(kt.value); this.next(); }
      this.eatOp(':');
      const value = this.parseExpr();
      fields.push({ key, value });
      if (this.eatOp(',')) continue;
      break;
    }
    this.eatOp('}');
    return { k: 'record', fields };
  }
}

const astCache = new Map<string, Node>();
export function parseFormula(src: string): Node {
  let s = src.trim();
  if (s.startsWith('=')) s = s.slice(1);
  const cached = astCache.get(s);
  if (cached) return cached;
  const ast = new Parser(tokenize(s)).parseProgram();
  astCache.set(s, ast);
  return ast;
}

// ----------------------------------------------------------------------------
// Runtime
// ----------------------------------------------------------------------------

/**
 * A fake/local stand-in for a tabular connector data source (SharePoint list,
 * SQL table, Dataverse table, Excel table…). Behaves like an in-memory Table
 * for Filter/LookUp/Sort/Patch/Collect/Remove so apps that bind to real data
 * run locally with no backend. Mirrors the connector model mined from the
 * Power Apps portal: a data source is bound to a connector + dataset + table
 * and carries seeded rows plus a primary key for Patch/Collect identity.
 */
export interface DataSource {
  name: string;                 // the Power Fx identifier, e.g. "Tasks" or 'My List'
  rows: any[];                  // seeded records (the live, mutable table)
  primaryKey: string;           // "ID" (SharePoint/SQL) or "<entity>id" (Dataverse)
  idKind?: 'int' | 'guid';      // how to mint new keys on insert
  connector?: string;           // e.g. "shared_sharepointonline"
  datasetName?: string;         // SharePoint site URL / SQL server,db
  tableName?: string;           // list GUID / table name
  schema?: Record<string, string>; // column -> Power Fx type name (advisory)
}

/** A single connector operation handler (e.g. Office365Users.MyProfile). */
export type ConnectorOp = (args: any[], ev: Evaluator) => any;

/**
 * A fake connector exposed as a Power Fx namespace object so that
 * `Office365Users.MyProfile()` / `Office365Outlook.SendEmailV2(...)` resolve
 * locally. Operations are keyed by lower-cased operationId.
 */
export interface Connector {
  name: string;                 // "shared_office365users"
  namespace: string;            // "Office365Users" (the Power Fx identifier)
  ops: Record<string, ConnectorOp>;
}

export interface Store {
  vars: Record<string, any>;       // Set variables + collections (arrays)
  controls: Record<string, any>;   // registered control evaluated props
  onSelects: Record<string, string>; // control name -> raw OnSelect formula
  dataSources: Record<string, DataSource>; // fake tabular connections, keyed by name
  connectors: Record<string, Connector>;   // fake connectors, keyed by lower-cased namespace
  outbox: any[];                   // log of side-effecting connector calls (SendEmail, Notify, …)
}

export interface Host {
  navigate?: (screen?: string) => void;
  notify?: (msg: string) => void;
  back?: () => void;
  selectControl?: (name: string) => void;
}

export function createStore(): Store {
  return { vars: {}, controls: {}, onSelects: {}, dataSources: {}, connectors: {}, outbox: [] };
}

interface Frame { fields?: Record<string, any>; binds?: Record<string, any>; }

const isRecord = (v: any) => v != null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date);
const isTable = (v: any) => Array.isArray(v);

function truthy(v: any): boolean {
  if (v === true) return true;
  if (v === false || v == null) return false;
  if (typeof v === 'string') return v.length > 0 && v.toLowerCase() !== 'false';
  if (typeof v === 'number') return v !== 0;
  return !!v;
}

function asNum(v: any): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v == null) return 0;
  const n = parseFloat(String(v));
  return isNaN(n) ? 0 : n;
}

function rgbaString(args: any[]): string {
  const [r, g, b, a] = args;
  return `rgba(${Math.round(asNum(r))}, ${Math.round(asNum(g))}, ${Math.round(asNum(b))}, ${a == null ? 1 : asNum(a)})`;
}

function fmtNum(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return String(n);
}

function pad(n: number, w = 2): string { return String(n).padStart(w, '0'); }
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function textFn(value: any, format?: string): string {
  if (value == null) return '';
  if (value instanceof Date && format) {
    const f = format.toLowerCase();
    return f
      .replace(/yyyy/g, String(value.getFullYear()))
      .replace(/mmm/g, MONTHS[value.getMonth()])
      .replace(/mm/g, pad(value.getMonth() + 1))
      .replace(/dd/g, pad(value.getDate()))
      .replace(/\bd\b/g, String(value.getDate()));
  }
  if (typeof value === 'number') return fmtNum(value);
  return String(value);
}

export class Evaluator {
  store: Store;
  host: Host;
  stack: Frame[] = [];
  root: Record<string, any>;

  constructor(store: Store, host: Host, root: Record<string, any> = {}) {
    this.store = store;
    this.host = host;
    this.root = root;
  }

  resolve(name: string): any {
    for (let i = this.stack.length - 1; i >= 0; i--) {
      const f = this.stack[i];
      if (f.binds && Object.prototype.hasOwnProperty.call(f.binds, name)) return f.binds[name];
      if (f.fields && Object.prototype.hasOwnProperty.call(f.fields, name)) return f.fields[name];
    }
    if (Object.prototype.hasOwnProperty.call(this.root, name)) return this.root[name];
    if (Object.prototype.hasOwnProperty.call(this.store.vars, name)) return this.store.vars[name];
    if (Object.prototype.hasOwnProperty.call(this.store.controls, name)) return this.store.controls[name];
    // A bound data source resolves to its (live) rows so Filter/LookUp/etc. work.
    if (Object.prototype.hasOwnProperty.call(this.store.dataSources, name)) return this.store.dataSources[name].rows;
    return UNDEFINED;
  }

  /**
   * Resolves a name to a mutable table for behavior functions (Collect/Patch/…):
   * a bound data source's rows, or an in-memory collection (created on demand).
   */
  targetTable(node: Node): { arr: any[]; ds?: DataSource } {
    const name = node.k === 'id' ? node.v : null;
    if (name != null) {
      if (this.store.dataSources[name]) { const ds = this.store.dataSources[name]; return { arr: ds.rows, ds }; }
      if (!isTable(this.store.vars[name])) this.store.vars[name] = [];
      return { arr: this.store.vars[name] };
    }
    const v = this.eval(node);
    return { arr: isTable(v) ? v : [] };
  }

  evalSrc(src: string): any {
    try { return this.eval(parseFormula(src)); }
    catch (e) { return src; }
  }

  eval(node: Node): any {
    switch (node.k) {
      case 'num': return node.v;
      case 'str': return node.v;
      case 'bool': return node.v;
      case 'istr': return this.evalInterp(node.v);
      case 'id': {
        const v = this.resolve(node.v);
        return v === UNDEFINED ? null : v;
      }
      case 'record': {
        const o: Record<string, any> = {};
        for (const f of node.fields) o[f.key] = this.eval(f.value);
        return o;
      }
      case 'unary': {
        if (node.op === '-') return -asNum(this.eval(node.e));
        if (node.op === '!') return !truthy(this.eval(node.e));
        return null;
      }
      case 'member': return this.evalMember(node);
      case 'binary': return this.evalBinary(node);
      case 'seq': { let last: any = null; for (const it of node.items) last = this.eval(it); return last; }
      case 'call': return this.evalCall(node);
      case 'mcall': return this.evalMethodCall(node);
    }
    return null;
  }

  /**
   * Evaluates a connector method call like `Office365Users.MyProfile()` or
   * `Office365Outlook.SendEmailV2({To:...})` against the fake connector registry.
   * Falls back to the dotted enum string (old behavior) when the namespace is
   * not a registered connector, so existing enum-ish references don't regress.
   */
  evalMethodCall(node: Node & { k: 'mcall' }): any {
    const nsPath = this.enumPath(node.obj); // e.g. "Office365Users"
    const conn = nsPath ? this.store.connectors[nsPath.toLowerCase()] : undefined;
    if (conn) {
      const op = conn.ops[node.name.toLowerCase()];
      const args = node.args.map(a => this.eval(a));
      if (op) { try { return op(args, this); } catch { return null; } }
      return null; // unknown operation on a known connector -> Blank
    }
    // Not a connector: maybe a record field that happens to be callable.
    const obj = this.evalMaybe(node.obj);
    if (isRecord(obj) && typeof obj[node.name] === 'function') {
      return (obj[node.name] as any)(...node.args.map(a => this.eval(a)));
    }
    return null;
  }

  evalInterp(raw: string): string {
    // replace {expr} holes
    let out = '';
    let i = 0;
    while (i < raw.length) {
      const c = raw[i];
      if (c === '{') {
        let depth = 1; let j = i + 1; let inner = '';
        while (j < raw.length && depth > 0) {
          if (raw[j] === '{') depth++;
          else if (raw[j] === '}') { depth--; if (depth === 0) break; }
          inner += raw[j]; j++;
        }
        try { out += String(this.eval(parseFormula(inner))); } catch { /* ignore */ }
        i = j + 1;
      } else { out += c; i++; }
    }
    return out;
  }

  enumPath(node: Node): string | null {
    if (node.k === 'id') return node.v;
    if (node.k === 'member') { const base = this.enumPath(node.obj); return base ? base + '.' + node.name : null; }
    return null;
  }

  /** True for a sort-order arg written as `Descending` or `SortOrder.Descending`. */
  isDescending(node: Node): boolean {
    const s = node.k === 'id' ? node.v : (node.k === 'member' ? (this.enumPath(node) || '') : stringify(this.eval(node)));
    return String(s).toLowerCase().includes('descending');
  }

  evalMember(node: Node & { k: 'member' }): any {
    const obj = this.evalMaybe(node.obj);
    if (isRecord(obj)) {
      return Object.prototype.hasOwnProperty.call(obj, node.name) ? obj[node.name] : null;
    }
    if (obj === UNDEFINED || obj == null) {
      // enum reference like Align.Center / Icon.ChevronRight / 'ButtonCanvas.Appearance'.Transparent
      const path = this.enumPath(node);
      if (path) return path;
      return null;
    }
    return null;
  }

  // eval but return UNDEFINED sentinel for unresolved ids (used by member for enums)
  evalMaybe(node: Node): any {
    if (node.k === 'id') return this.resolve(node.v);
    if (node.k === 'member') {
      const obj = this.evalMaybe(node.obj);
      if (isRecord(obj)) return Object.prototype.hasOwnProperty.call(obj, node.name) ? obj[node.name] : null;
      return UNDEFINED;
    }
    return this.eval(node);
  }

  evalBinary(node: Node & { k: 'binary' }): any {
    const op = node.op;
    if (op === '&&') return truthy(this.eval(node.l)) && truthy(this.eval(node.r));
    if (op === '||') return truthy(this.eval(node.l)) || truthy(this.eval(node.r));
    if (op === '&') return stringify(this.eval(node.l)) + stringify(this.eval(node.r));
    const l = this.eval(node.l);
    const r = this.eval(node.r);
    switch (op) {
      case '+': return asNum(l) + asNum(r);
      case '-': return asNum(l) - asNum(r);
      case '*': return asNum(l) * asNum(r);
      case '/': { const d = asNum(r); return d === 0 ? 0 : asNum(l) / d; }
      case '=': return eq(l, r);
      case '<>': return !eq(l, r);
      case '<': return asNum(l) < asNum(r);
      case '>': return asNum(l) > asNum(r);
      case '<=': return asNum(l) <= asNum(r);
      case '>=': return asNum(l) >= asNum(r);
      case 'in':
      case 'exactin': {
        if (isTable(r)) return r.some((row: any) => eq(isRecord(row) ? firstVal(row) : row, l));
        const hs = stringify(r); const needle = stringify(l);
        return op === 'in' ? hs.toLowerCase().includes(needle.toLowerCase()) : hs.includes(needle);
      }
    }
    return null;
  }

  // push a row scope and run fn
  withRow<T>(row: any, alias: string | undefined, fn: () => T): T {
    const frame: Frame = { fields: isRecord(row) ? row : { Value: row, Result: row } };
    if (alias) frame.binds = { [alias]: row };
    this.stack.push(frame);
    try { return fn(); } finally { this.stack.pop(); }
  }

  evalCall(node: Node & { k: 'call' }): any {
    const name = node.name.toLowerCase();
    const raw = node.rawArgs;

    // ---- lazy / special forms -------------------------------------------
    switch (name) {
      case 'if': {
        // If(cond, then, [cond, then,]... [else])
        const a = node.args;
        let i = 0;
        while (i + 1 < a.length) {
          if (truthy(this.eval(a[i]))) return this.eval(a[i + 1]);
          i += 2;
        }
        return i < a.length ? this.eval(a[i]) : null;
      }
      case 'switch': {
        const a = node.args;
        const subject = this.eval(a[0]);
        let i = 1;
        while (i + 1 < a.length) { if (eq(subject, this.eval(a[i]))) return this.eval(a[i + 1]); i += 2; }
        return i < a.length ? this.eval(a[i]) : null;
      }
      case 'and': return node.args.every(x => truthy(this.eval(x)));
      case 'or': return node.args.some(x => truthy(this.eval(x)));
      case 'not': return !truthy(this.eval(node.args[0]));
      case 'coalesce': { for (const x of node.args) { const v = this.eval(x); if (v != null && v !== '') return v; } return null; }
      case 'filter': {
        const src = toTable(this.eval(raw[0].node));
        const alias = raw[0].alias;
        const preds = raw.slice(1);
        return src.filter(row => this.withRow(row, alias, () => preds.every(p => truthy(this.eval(p.node)))));
      }
      case 'lookup': {
        const src = toTable(this.eval(raw[0].node));
        const alias = raw[0].alias;
        const pred = raw[1];
        const resultExpr = raw[2];
        for (const row of src) {
          const hit = this.withRow(row, alias, () => truthy(this.eval(pred.node)));
          if (hit) return resultExpr ? this.withRow(row, alias, () => this.eval(resultExpr.node)) : row;
        }
        return null;
      }
      case 'sort': {
        const src = toTable(this.eval(raw[0].node)).slice();
        const alias = raw[0].alias;
        const keyExpr = raw[1];
        const desc = raw[2] ? this.isDescending(raw[2].node) : false;
        src.sort((x, y) => {
          const kx = this.withRow(x, alias, () => this.eval(keyExpr.node));
          const ky = this.withRow(y, alias, () => this.eval(keyExpr.node));
          const c = cmp(kx, ky);
          return desc ? -c : c;
        });
        return src;
      }
      case 'sortbycolumns': {
        const src = toTable(this.eval(raw[0].node)).slice();
        const col = stringify(this.eval(raw[1].node));
        const desc = raw[2] ? this.isDescending(raw[2].node) : false;
        src.sort((x, y) => { const c = cmp(x?.[col], y?.[col]); return desc ? -c : c; });
        return src;
      }
      case 'defaults': {
        // Defaults(DS) — a blank record for the data source (canonical with Patch insert).
        const node0 = raw[0].node;
        const ds = node0.k === 'id' ? this.store.dataSources[node0.v] : undefined;
        const rec: any = {};
        if (ds?.schema) for (const [col, ty] of Object.entries(ds.schema)) { if (col === ds.primaryKey) continue; rec[col] = defaultForType(ty); }
        return rec;
      }
      case 'forall': {
        const src = toTable(this.eval(raw[0].node));
        const alias = raw[0].alias;
        const body = raw[1];
        return src.map(row => this.withRow(row, alias, () => this.eval(body.node)));
      }
      case 'with': {
        const ctx = this.eval(raw[0].node);
        return this.withRow(isRecord(ctx) ? ctx : {}, raw[0].alias, () => this.eval(raw[1].node));
      }
      case 'countif': {
        const src = toTable(this.eval(raw[0].node));
        const alias = raw[0].alias;
        const preds = raw.slice(1);
        return src.filter(row => this.withRow(row, alias, () => preds.every(p => truthy(this.eval(p.node))))).length;
      }
      case 'max': case 'min': case 'sum': case 'average': {
        const first = this.eval(raw[0].node);
        if (isTable(first) && raw[1]) {
          const alias = raw[0].alias;
          const vals = first.map(row => asNum(this.withRow(row, alias, () => this.eval(raw[1].node))));
          return aggregate(name, vals);
        }
        const vals = node.args.map(a => asNum(this.eval(a)));
        return aggregate(name, vals);
      }
      case 'concat': {
        const src = toTable(this.eval(raw[0].node));
        const alias = raw[0].alias;
        const sep = raw[2] ? stringify(this.eval(raw[2].node)) : '';
        return src.map(row => this.withRow(row, alias, () => stringify(this.eval(raw[1].node)))).join(sep);
      }
      // ---- table-shaping (column projection over a row scope) --------------
      case 'addcolumns': {
        const src = toTable(this.eval(raw[0].node));
        const alias = raw[0].alias;
        return src.map(row => this.withRow(row, alias, () => {
          const out = { ...row };
          for (let i = 1; i + 1 < raw.length; i += 2) out[stringify(this.eval(raw[i].node))] = this.eval(raw[i + 1].node);
          return out;
        }));
      }
      case 'dropcolumns': {
        const src = toTable(this.eval(raw[0].node));
        const cols = raw.slice(1).map(a => stringify(this.eval(a.node)));
        return src.map(row => { const o = { ...row }; for (const c of cols) delete o[c]; return o; });
      }
      case 'showcolumns': {
        const src = toTable(this.eval(raw[0].node));
        const cols = raw.slice(1).map(a => stringify(this.eval(a.node)));
        return src.map(row => { const o: any = {}; for (const c of cols) o[c] = row?.[c]; return o; });
      }
      case 'renamecolumns': {
        const src = toTable(this.eval(raw[0].node));
        const pairs: [string, string][] = [];
        for (let i = 1; i + 1 < raw.length; i += 2) pairs.push([stringify(this.eval(raw[i].node)), stringify(this.eval(raw[i + 1].node))]);
        return src.map(row => { const o = { ...row }; for (const [oldN, newN] of pairs) if (oldN in o) { o[newN] = o[oldN]; delete o[oldN]; } return o; });
      }
      case 'distinct': {
        const src = toTable(this.eval(raw[0].node));
        const alias = raw[0].alias;
        const seen = new Set<string>(); const out: any[] = [];
        for (const row of src) {
          const v = this.withRow(row, alias, () => this.eval(raw[1].node));
          const key = stringify(v);
          if (!seen.has(key)) { seen.add(key); out.push({ Value: v, Result: v }); }
        }
        return out;
      }
      case 'search': {
        const src = toTable(this.eval(raw[0].node));
        const term = stringify(this.eval(raw[1].node)).toLowerCase();
        if (!term) return src;
        const cols = raw.slice(2).map(a => stringify(this.eval(a.node)));
        return src.filter(row => cols.some(c => stringify(row?.[c]).toLowerCase().includes(term)));
      }
      case 'iferror': {
        // IfError(value, fallback [,value, fallback]... [,default]). We rarely
        // throw, so treat Blank/NaN as the error signal.
        const a = node.args;
        for (let i = 0; i + 1 < a.length; i += 2) {
          let v: any; try { v = this.eval(a[i]); } catch { v = null; }
          const isErr = v == null || (typeof v === 'number' && isNaN(v));
          if (!isErr) return v;
          if (i + 2 >= a.length) return this.eval(a[i + 1]);
        }
        return a.length % 2 === 1 ? this.eval(a[a.length - 1]) : null;
      }
    }

    // ---- behavior (side-effecting) --------------------------------------
    switch (name) {
      case 'set': { const target = (raw[0].node as any).v; this.store.vars[target] = this.eval(raw[1].node); return null; }
      case 'updatecontext': { const rec = this.eval(raw[0].node); if (isRecord(rec)) Object.assign(this.store.vars, rec); return null; }
      case 'collect': case 'clearcollect': {
        const { arr, ds } = this.targetTable(raw[0].node);
        if (name === 'clearcollect') arr.length = 0;
        let lastPushed: any = null;
        for (let i = 1; i < raw.length; i++) {
          const v = this.eval(raw[i].node);
          if (isTable(v)) for (const r of v) { const rec = ds ? mintKey(ds, { ...r }) : r; arr.push(rec); lastPushed = rec; }
          else if (v != null) { const rec = ds && isRecord(v) ? mintKey(ds, { ...v }) : v; arr.push(rec); lastPushed = rec; }
        }
        return ds ? lastPushed ?? arr : arr;
      }
      case 'clear': { const { arr } = this.targetTable(raw[0].node); arr.length = 0; return null; }
      case 'patch': {
        const { arr, ds } = this.targetTable(raw[0].node);
        const base = this.eval(raw[1].node);
        const changes = this.eval(raw[2].node);
        if (isRecord(base)) {
          const row = arr.find(r => r === base) || arr.find(r => recordMatch(r, base, ds?.primaryKey));
          if (row) { Object.assign(row, changes); return row; }
          const nr = mintKey(ds, { ...base, ...(isRecord(changes) ? changes : {}) }); arr.push(nr); return nr;
        }
        return base;
      }
      case 'updateif': {
        const { arr } = this.targetTable(raw[0].node);
        for (const row of arr) {
          const match = this.withRow(row, undefined, () => truthy(this.eval(raw[1].node)));
          if (match) { const ch = this.withRow(row, undefined, () => this.eval(raw[2].node)); if (isRecord(ch)) Object.assign(row, ch); }
        }
        return null;
      }
      case 'removeif': {
        const { arr } = this.targetTable(raw[0].node);
        for (let i = arr.length - 1; i >= 0; i--) {
          const match = this.withRow(arr[i], undefined, () => raw.slice(1).every(p => truthy(this.eval(p.node))));
          if (match) arr.splice(i, 1);
        }
        return null;
      }
      case 'remove': {
        const { arr, ds } = this.targetTable(raw[0].node);
        const base = this.eval(raw[1].node);
        const idx = arr.findIndex(r => r === base || recordMatch(r, base, ds?.primaryKey));
        if (idx >= 0) arr.splice(idx, 1);
        return null;
      }
      case 'select': {
        const ctrl = (raw[0].node as any).v || (raw[0].node.k === 'member' ? null : null);
        if (typeof ctrl === 'string' && this.host.selectControl) this.host.selectControl(ctrl);
        return null;
      }
      case 'navigate': { const screen = raw[0] ? this.enumPath(raw[0].node) || stringify(this.eval(raw[0].node)) : undefined; this.host.navigate?.(screen || undefined); return null; }
      case 'back': { this.host.back?.(); return null; }
      case 'notify': { this.host.notify?.(stringify(this.eval(raw[0].node))); return null; }
      case 'reset': case 'setfocus': case 'refresh': case 'newform': case 'editform': case 'viewform': case 'submitform': case 'resetform': case 'trace': case 'launch': case 'disabled': return null;
    }

    // ---- eager scalar functions -----------------------------------------
    const args = node.args.map(a => this.eval(a));
    switch (name) {
      case 'countrows': return isTable(args[0]) ? args[0].length : 0;
      case 'isempty': return !isTable(args[0]) || args[0].length === 0;
      case 'isblank': return args[0] == null || args[0] === '';
      case 'isblankoreror': case 'isblankorerror': return args[0] == null || args[0] === '';
      case 'blank': return null;
      case 'first': return isTable(args[0]) && args[0].length ? args[0][0] : null;
      case 'last': return isTable(args[0]) && args[0].length ? args[0][args[0].length - 1] : null;
      case 'firstn': return isTable(args[0]) ? args[0].slice(0, asNum(args[1] ?? 1)) : [];
      case 'lastn': return isTable(args[0]) ? args[0].slice(-asNum(args[1] ?? 1)) : [];
      case 'index': return isTable(args[0]) ? args[0][asNum(args[1]) - 1] ?? null : null;
      case 'text': return textFn(args[0], args[1] != null ? stringify(args[1]) : undefined);
      case 'value': return asNum(args[0]);
      case 'len': return stringify(args[0] ?? '').length;
      case 'left': return stringify(args[0] ?? '').slice(0, asNum(args[1]));
      case 'right': { const s = stringify(args[0] ?? ''); return s.slice(s.length - asNum(args[1])); }
      case 'mid': { const s = stringify(args[0] ?? ''); const start = asNum(args[1]) - 1; const len = args[2] != null ? asNum(args[2]) : undefined; return len != null ? s.substr(start, len) : s.substr(start); }
      case 'upper': return stringify(args[0] ?? '').toUpperCase();
      case 'lower': return stringify(args[0] ?? '').toLowerCase();
      case 'trim': return stringify(args[0] ?? '').trim();
      case 'concatenate': return args.map(stringify).join('');
      case 'substitute': { const s = stringify(args[0] ?? ''); return s.split(stringify(args[1])).join(stringify(args[2])); }
      case 'startswith': return stringify(args[0] ?? '').toLowerCase().startsWith(stringify(args[1] ?? '').toLowerCase());
      case 'endswith': return stringify(args[0] ?? '').toLowerCase().endsWith(stringify(args[1] ?? '').toLowerCase());
      case 'abs': return Math.abs(asNum(args[0]));
      case 'round': { const f = Math.pow(10, asNum(args[1] ?? 0)); return Math.round(asNum(args[0]) * f) / f; }
      case 'roundup': { const f = Math.pow(10, asNum(args[1] ?? 0)); return Math.ceil(asNum(args[0]) * f) / f; }
      case 'rounddown': { const f = Math.pow(10, asNum(args[1] ?? 0)); return Math.floor(asNum(args[0]) * f) / f; }
      case 'int': return Math.floor(asNum(args[0]));
      case 'mod': return asNum(args[0]) % asNum(args[1]);
      case 'sqrt': return Math.sqrt(asNum(args[0]));
      case 'power': return Math.pow(asNum(args[0]), asNum(args[1]));
      case 'table': return args.filter(a => a != null);
      case 'rgba': return rgbaString(args);
      case 'colorvalue': return stringify(args[0]);
      case 'datevalue': { const s = stringify(args[0] ?? ''); if (!s) return null; const d = new Date(s); return isNaN(d.getTime()) ? null : d; }
      case 'datetimevalue': { const s = stringify(args[0] ?? ''); const d = new Date(s); return isNaN(d.getTime()) ? null : d; }
      case 'year': return args[0] instanceof Date ? args[0].getFullYear() : 0;
      case 'month': return args[0] instanceof Date ? args[0].getMonth() + 1 : 0;
      case 'day': return args[0] instanceof Date ? args[0].getDate() : 0;
      case 'split': { const s = stringify(args[0] ?? ''); const sep = stringify(args[1] ?? ''); return s.split(sep).map(x => ({ Result: x, Value: x })); }
      case 'user': return this.root.User || { Email: '', FullName: '', Image: '' };
      case 'color': return args[0];
      // ---- date / time ----------------------------------------------------
      case 'now': return new Date();
      case 'today': { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
      case 'date': return new Date(asNum(args[0]), asNum(args[1]) - 1, asNum(args[2]));
      case 'time': return new Date(1970, 0, 1, asNum(args[0]), asNum(args[1]), asNum(args[2] ?? 0));
      case 'hour': return args[0] instanceof Date ? args[0].getHours() : 0;
      case 'minute': return args[0] instanceof Date ? args[0].getMinutes() : 0;
      case 'second': return args[0] instanceof Date ? args[0].getSeconds() : 0;
      case 'weekday': return args[0] instanceof Date ? args[0].getDay() + 1 : 0;
      case 'istoday': { if (!(args[0] instanceof Date)) return false; const n = new Date(); return args[0].toDateString() === n.toDateString(); }
      case 'dateadd': return dateAdd(args[0], asNum(args[1]), args[2] != null ? stringify(args[2]) : 'Days');
      case 'datediff': return dateDiff(args[0], args[1], args[2] != null ? stringify(args[2]) : 'Days');
      // ---- json / data ----------------------------------------------------
      case 'parsejson': { try { return typeof args[0] === 'string' ? JSON.parse(args[0]) : args[0]; } catch { return null; } }
      case 'json': { try { return JSON.stringify(args[0]); } catch { return ''; } }
      case 'datasourceinfo': return null;
      case 'guid': return args[0] != null && args[0] !== '' ? stringify(args[0]) : genGuid();
      // ---- string ---------------------------------------------------------
      case 'replace': { const s = stringify(args[0] ?? ''); const start = asNum(args[1]) - 1; const count = asNum(args[2]); return s.slice(0, start) + stringify(args[3] ?? '') + s.slice(start + count); }
      case 'find': { const within = stringify(args[1] ?? ''); const start = args[2] != null ? asNum(args[2]) - 1 : 0; const idx = within.indexOf(stringify(args[0] ?? ''), start); return idx < 0 ? null : idx + 1; }
      case 'proper': return stringify(args[0] ?? '').replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
      case 'trimends': return stringify(args[0] ?? '').replace(/^\s+|\s+$/g, '');
      case 'char': return String.fromCharCode(asNum(args[0]));
      case 'unichar': return String.fromCodePoint(asNum(args[0]));
      case 'plaintext': return stringify(args[0] ?? '').replace(/<[^>]*>/g, '');
      case 'encodeurl': return encodeURIComponent(stringify(args[0] ?? ''));
      case 'ismatch': { try { return new RegExp(matchPattern(stringify(args[1] ?? ''))).test(stringify(args[0] ?? '')); } catch { return false; } }
      case 'isnumeric': return typeof args[0] === 'number' ? !isNaN(args[0]) : (args[0] != null && args[0] !== '' && !isNaN(Number(args[0])));
      case 'boolean': return truthy(args[0]);
      // ---- math -----------------------------------------------------------
      case 'trunc': { const f = Math.pow(10, asNum(args[1] ?? 0)); return Math.trunc(asNum(args[0]) * f) / f; }
      case 'exp': return Math.exp(asNum(args[0]));
      case 'ln': return Math.log(asNum(args[0]));
      case 'log': return args[1] != null ? Math.log(asNum(args[0])) / Math.log(asNum(args[1])) : Math.log10(asNum(args[0]));
      case 'pi': return Math.PI;
      case 'rand': return Math.random();
      case 'randbetween': { const lo = asNum(args[0]), hi = asNum(args[1]); return Math.floor(Math.random() * (hi - lo + 1)) + lo; }
      case 'sequence': { const n = asNum(args[0]); const start = args[1] != null ? asNum(args[1]) : 1; const step = args[2] != null ? asNum(args[2]) : 1; return Array.from({ length: Math.max(0, n) }, (_, i) => ({ Value: start + i * step })); }
      case 'colorfade': return args[0]; // pass-through (no real fade yet)
      default:
        return null;
    }
  }
}

const UNDEFINED = Symbol('undef');

function firstVal(rec: Record<string, any>): any { const ks = Object.keys(rec); return ks.length ? rec[ks[0]] : null; }

function eq(a: any, b: any): boolean {
  if (a == null && b == null) return true;
  if (typeof a === 'number' && typeof b === 'number') return a === b;
  if (typeof a === 'boolean' || typeof b === 'boolean') return Boolean(a) === Boolean(b);
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  return stringify(a) === stringify(b);
}

function cmp(a: any, b: any): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  const na = parseFloat(a), nb = parseFloat(b);
  if (!isNaN(na) && !isNaN(nb)) return na - nb;
  const sa = stringify(a), sb = stringify(b);
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}

function stringify(v: any): string {
  if (v == null) return '';
  if (v === true) return 'true';
  if (v === false) return 'false';
  if (typeof v === 'number') return fmtNum(v);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'object') return '';
  return String(v);
}

function toTable(v: any): any[] {
  if (Array.isArray(v)) return v;
  if (v == null) return [];
  if (isRecord(v)) return [v];
  return [];
}

function aggregate(name: string, vals: number[]): number {
  if (!vals.length) return 0;
  switch (name) {
    case 'max': return Math.max(...vals);
    case 'min': return Math.min(...vals);
    case 'sum': return vals.reduce((a, b) => a + b, 0);
    case 'average': return vals.reduce((a, b) => a + b, 0) / vals.length;
  }
  return 0;
}

function recordMatch(row: any, base: any, primaryKey?: string): boolean {
  if (!isRecord(row) || !isRecord(base)) return false;
  // Prefer the data source's declared primary key when we have one.
  const keys = primaryKey ? [primaryKey, 'id', 'ID', 'oid', 'gid', 'colId'] : ['id', 'ID', 'oid', 'gid', 'colId'];
  for (const k of keys) {
    if (k in base && k in row) { if (!eq(row[k], base[k])) return false; }
  }
  // require at least identity overlap
  return keys.some(k => k in base && k in row);
}

/** Blank value for a data-source column type (used by Defaults()). */
function defaultForType(ty: string): any {
  switch (String(ty).toLowerCase()) {
    case 'text': case 'string': case 'hyperlink': case 'email': return '';
    case 'number': case 'decimal': case 'float': case 'currency': return 0;
    case 'boolean': case 'yesno': return false;
    default: return null; // DateTime, GUID, Lookup, Choice, … start Blank
  }
}

function genGuid(): string {
  // RFC4122-ish v4 (good enough for fake Dataverse keys; no crypto dependency)
  let s = '';
  for (let i = 0; i < 32; i++) {
    if (i === 8 || i === 12 || i === 16 || i === 20) s += '-';
    if (i === 12) { s += '4'; continue; }
    if (i === 16) { s += ((Math.floor(Math.random() * 4)) + 8).toString(16); continue; }
    s += Math.floor(Math.random() * 16).toString(16);
  }
  return s;
}

/** Assigns a new primary key to a freshly inserted data-source record (if it has none). */
function mintKey(ds: DataSource | undefined, rec: any): any {
  if (!ds || !isRecord(rec)) return rec;
  const pk = ds.primaryKey;
  if (rec[pk] != null && rec[pk] !== '') return rec;
  if (ds.idKind === 'guid') rec[pk] = genGuid();
  else {
    const max = ds.rows.reduce((m, r) => { const n = Number(r?.[pk]); return Number.isFinite(n) && n > m ? n : m; }, 0);
    rec[pk] = max + 1;
  }
  return rec;
}

function toDate(v: any): Date | null {
  if (v instanceof Date) return v;
  if (typeof v === 'string' || typeof v === 'number') { const d = new Date(v); return isNaN(d.getTime()) ? null : d; }
  return null;
}

const unitNorm = (u: string) => u.replace(/^TimeUnit\./i, '').toLowerCase();

function dateAdd(date: any, n: number, units: string): Date | null {
  const d = toDate(date); if (!d) return null;
  const r = new Date(d.getTime());
  switch (unitNorm(units)) {
    case 'years': r.setFullYear(r.getFullYear() + n); break;
    case 'quarters': r.setMonth(r.getMonth() + n * 3); break;
    case 'months': r.setMonth(r.getMonth() + n); break;
    case 'days': r.setDate(r.getDate() + n); break;
    case 'hours': r.setHours(r.getHours() + n); break;
    case 'minutes': r.setMinutes(r.getMinutes() + n); break;
    case 'seconds': r.setSeconds(r.getSeconds() + n); break;
    case 'milliseconds': r.setMilliseconds(r.getMilliseconds() + n); break;
    default: r.setDate(r.getDate() + n);
  }
  return r;
}

function dateDiff(a: any, b: any, units: string): number {
  const da = toDate(a), db = toDate(b); if (!da || !db) return 0;
  const ms = db.getTime() - da.getTime();
  switch (unitNorm(units)) {
    case 'years': return db.getFullYear() - da.getFullYear();
    case 'quarters': return (db.getFullYear() - da.getFullYear()) * 4 + (Math.floor(db.getMonth() / 3) - Math.floor(da.getMonth() / 3));
    case 'months': return (db.getFullYear() - da.getFullYear()) * 12 + (db.getMonth() - da.getMonth());
    case 'hours': return Math.floor(ms / 3.6e6);
    case 'minutes': return Math.floor(ms / 6e4);
    case 'seconds': return Math.floor(ms / 1e3);
    case 'milliseconds': return ms;
    default: return Math.floor(ms / 8.64e7); // days
  }
}

/** Maps Power Fx Match.* enum patterns to a JS regex source; passes through raw regex. */
function matchPattern(p: string): string {
  const map: Record<string, string> = {
    'Match.Email': "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$", 'Email': "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$",
    'Match.Digit': "\\d", 'Match.Letter': "[A-Za-z]", 'Match.MultipleDigits': "\\d+",
    'Match.Any': '.', 'Match.Hyphen': '-', 'Match.Period': '\\.', 'Match.Comma': ',',
  };
  return map[p] ?? p;
}

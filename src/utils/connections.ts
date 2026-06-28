/**
 * Fake / local connection layer for the Canvas App Renderer.
 *
 * Real canvas apps talk to connectors (SharePoint, SQL, Dataverse, Office 365
 * Users, …). This module lets the renderer run those apps locally with NO
 * Microsoft backend by:
 *
 *   1. Registering **tabular data sources** (SharePoint list / SQL table /
 *      Dataverse table / Excel table) as in-memory tables, so Filter / LookUp /
 *      Sort / Patch / Collect / Remove behave like the real thing (including
 *      minting a new primary key on insert).
 *   2. Registering **connector namespace objects** (e.g. `Office365Users`,
 *      `Office365Outlook`) so method calls like `Office365Users.MyProfile()`
 *      resolve to fake, swagger-shaped responses.
 *
 * Everything is driven by a single editable JSON config (see ConnectionsConfig)
 * that can be bundled, dropped next to an app folder, or pasted in the UI.
 *
 * The connector model (apiId / connectionId / dataset / table / operationId)
 * mirrors what Power Apps actually uses; we collapse the real HTTP/proxy paths
 * into one in-memory dispatcher keyed by (namespace, operationId).
 */

import type { Store, DataSource, Connector, ConnectorOp, Evaluator } from './powerfx';

// ----------------------------------------------------------------------------
// Config shape (the editable "fake connections" file)
// ----------------------------------------------------------------------------

export interface DataSourceConfig {
  /** Connector this source belongs to, e.g. "shared_sharepointonline". Display only. */
  connector?: string;
  /** SharePoint site URL / SQL "server,db". Display only. */
  datasetName?: string;
  /** List GUID / table name. Display only. */
  tableName?: string;
  /** Primary key column. Defaults to "ID". */
  primaryKey?: string;
  /** How new keys are minted on insert. Defaults to "int". */
  idKind?: 'int' | 'guid';
  /** Column -> Power Fx type name (advisory; not enforced). */
  schema?: Record<string, string>;
  /** Seed rows. */
  rows?: any[];
}

export interface ConnectionsConfig {
  /** Optional connection-instance metadata (display only). */
  connections?: { connectionId: string; apiId: string; account?: string }[];
  /** Tabular data sources keyed by their Power Fx name (e.g. "Tasks", "My List"). */
  dataSources?: Record<string, DataSourceConfig>;
  /**
   * Canned responses for action connectors keyed by namespace then operationId,
   * e.g. { "Office365Users": { "MyProfile": {...}, "SearchUser": [...] } }.
   * These override the built-in smart handlers for those operations.
   */
  connectorResponses?: Record<string, Record<string, any>>;
}

export interface CurrentUser { Email?: string; FullName?: string; Image?: string; }

const clone = <T,>(v: T): T => (v == null ? v : JSON.parse(JSON.stringify(v)));

/** Coerces schema-typed Date/DateTime string columns into real Date objects so
 *  Text()/date functions format them like real SharePoint/Dataverse rows. */
function coerceRows(rows: any[], schema?: Record<string, string>): any[] {
  if (!schema) return rows;
  const dateCols = Object.entries(schema)
    .filter(([, t]) => /^(date|datetime|datetimetz|datetime-tz)$/i.test(String(t)))
    .map(([c]) => c);
  if (!dateCols.length) return rows;
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    for (const c of dateCols) {
      if (typeof row[c] === 'string' && row[c]) { const d = new Date(row[c]); if (!isNaN(d.getTime())) row[c] = d; }
    }
  }
  return rows;
}

// ----------------------------------------------------------------------------
// Built-in connectors (always available, overridable via connectorResponses)
// ----------------------------------------------------------------------------

/** A swagger-shaped Office 365 Users profile record. */
function profile(over: Partial<Record<string, any>> = {}): Record<string, any> {
  return {
    DisplayName: '', GivenName: '', Surname: '', Mail: '', UserPrincipalName: '',
    Id: '', JobTitle: '', Department: '', OfficeLocation: '', CompanyName: '',
    City: '', Country: '', MobilePhone: '', TelephoneNumber: '', AccountEnabled: true,
    ...over,
  };
}

function meProfile(user: CurrentUser): Record<string, any> {
  const full = user.FullName || 'Local Maker';
  const [given, ...rest] = full.split(' ');
  const mail = user.Email || 'local.maker@example.com';
  return profile({
    DisplayName: full, GivenName: given, Surname: rest.join(' '),
    Mail: mail, UserPrincipalName: mail, Id: 'me-0001',
    JobTitle: 'Maker', Department: 'Local Dev', CompanyName: 'Localhost',
  });
}

/** A tiny fake directory so SearchUser / UserProfile / Manager return something. */
function fakeDirectory(user: CurrentUser): Record<string, any>[] {
  return [
    meProfile(user),
    profile({ DisplayName: 'Ada Lovelace', GivenName: 'Ada', Surname: 'Lovelace', Mail: 'ada@example.com', UserPrincipalName: 'ada@example.com', Id: 'u-ada', JobTitle: 'Engineer', Department: 'R&D' }),
    profile({ DisplayName: 'Alan Turing', GivenName: 'Alan', Surname: 'Turing', Mail: 'alan@example.com', UserPrincipalName: 'alan@example.com', Id: 'u-alan', JobTitle: 'Cryptanalyst', Department: 'R&D' }),
    profile({ DisplayName: 'Grace Hopper', GivenName: 'Grace', Surname: 'Hopper', Mail: 'grace@example.com', UserPrincipalName: 'grace@example.com', Id: 'u-grace', JobTitle: 'Manager', Department: 'Engineering' }),
  ];
}

/** First positional arg, whether it's a bare value or a { id / searchTerm } record. */
function arg0(args: any[], ...keys: string[]): any {
  const a = args[0];
  if (a && typeof a === 'object' && !Array.isArray(a)) {
    for (const k of keys) if (a[k] != null) return a[k];
    const vals = Object.values(a); return vals.length ? vals[0] : undefined;
  }
  return a;
}

function office365UsersConnector(user: CurrentUser): Connector {
  const dir = fakeDirectory(user);
  const lookup = (idOrMail: any) => dir.find(u => u.Id === idOrMail || u.Mail === idOrMail || u.UserPrincipalName === idOrMail);
  const me = () => meProfile(user);
  const ops: Record<string, ConnectorOp> = {
    myprofile: me, myprofile_v2: me, myprofilev2: me,
    userprofile: (a) => lookup(arg0(a, 'id', 'userId', 'UserId')) ?? profile({ DisplayName: String(arg0(a) ?? 'Unknown User'), Id: String(arg0(a) ?? '') }),
    userprofile_v2: (a) => lookup(arg0(a, 'id', 'userId', 'UserId')) ?? profile({ DisplayName: String(arg0(a) ?? 'Unknown User'), Id: String(arg0(a) ?? '') }),
    searchuser: (a) => { const t = String(arg0(a, 'searchTerm', 'SearchTerm') ?? '').toLowerCase(); return t ? dir.filter(u => (u.DisplayName + u.Mail).toLowerCase().includes(t)) : dir.slice(); },
    searchuser_v2: (a) => { const t = String(arg0(a, 'searchTerm', 'SearchTerm') ?? '').toLowerCase(); return { value: t ? dir.filter(u => (u.DisplayName + u.Mail).toLowerCase().includes(t)) : dir.slice() }; },
    manager: () => dir.find(u => u.JobTitle === 'Manager') ?? null,
    manager_v2: () => dir.find(u => u.JobTitle === 'Manager') ?? null,
    directreports: () => [], directreports_v2: () => ({ value: [] }),
    userphoto: () => '', userphoto_v2: () => '', userphotometadata: () => ({ hasPhoto: false }),
  };
  return { name: 'shared_office365users', namespace: 'Office365Users', ops };
}

function outlookConnector(store: Store): Connector {
  const send: ConnectorOp = (a) => { store.outbox.push({ connector: 'Office365Outlook', op: 'SendEmail', payload: a[0] ?? null, at: new Date().toISOString() }); return null; };
  const empty: ConnectorOp = () => ({ value: [] });
  const ops: Record<string, ConnectorOp> = {
    sendemail: send, sendemailv2: send, sendemailv3: send, v2sendemail: send,
    getemails: empty, getemailsv3: empty, geteventscalendarviewv3: empty, getcalendarview: empty,
    v4calendarpostitem: (a) => { store.outbox.push({ connector: 'Office365Outlook', op: 'CreateEvent', payload: a[0] ?? null, at: new Date().toISOString() }); return a[0] ?? null; },
  };
  return { name: 'shared_office365', namespace: 'Office365Outlook', ops };
}

// ----------------------------------------------------------------------------
// Apply config to a store
// ----------------------------------------------------------------------------

/**
 * Seeds a Power Fx store with built-in fake connectors plus everything in the
 * supplied config. Safe to call once per store (clones seed data).
 */
export function applyConnectionsConfig(store: Store, config: ConnectionsConfig | null | undefined, user: CurrentUser = {}): void {
  // 1) Built-in connectors (Office 365 Users / Outlook) — always present.
  const builtins = [office365UsersConnector(user), outlookConnector(store)];
  for (const c of builtins) store.connectors[c.namespace.toLowerCase()] = c;
  // Alias legacy Outlook namespace.
  store.connectors['office365'] = store.connectors['office365outlook'];

  // 2) Canned connector responses (override built-ins, or add new connectors).
  const responses = config?.connectorResponses || {};
  for (const [ns, opsObj] of Object.entries(responses)) {
    const key = ns.toLowerCase();
    const existing = store.connectors[key];
    const conn: Connector = existing || { name: 'shared_' + key, namespace: ns, ops: {} };
    for (const [opName, value] of Object.entries(opsObj)) {
      conn.ops[opName.toLowerCase()] = () => clone(value);
    }
    store.connectors[key] = conn;
  }

  // 3) Tabular data sources.
  const sources = config?.dataSources || {};
  for (const [name, def] of Object.entries(sources)) {
    const ds: DataSource = {
      name,
      rows: coerceRows(clone(def.rows || []), def.schema),
      primaryKey: def.primaryKey || 'ID',
      idKind: def.idKind || (def.primaryKey && /id$/i.test(def.primaryKey) && def.primaryKey !== 'ID' ? 'guid' : 'int'),
      connector: def.connector,
      datasetName: def.datasetName,
      tableName: def.tableName,
      schema: def.schema,
    };
    store.dataSources[name] = ds;
  }
}

/** Parses a connections config JSON string, tolerating empty / invalid input. */
export function parseConnectionsConfig(text: string | null | undefined): ConnectionsConfig | null {
  if (!text || !text.trim()) return null;
  try { return JSON.parse(text) as ConnectionsConfig; }
  catch (e) { console.warn('[connections] invalid config JSON:', e); return null; }
}

// re-export for consumers that only import this module
export type { Evaluator };

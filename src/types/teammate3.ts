// Teammate 3 <-> Teammate 4 (Family Dashboard) message contract.
//
// All members share ONE base backend URL. Teammate 4 receives requests from
// teammate 3 (of any type), identifies the type, and sends responses back to
// teammate 3 through the same backend.
//
// IMPORTANT: The exact message shapes below are placeholders based on the
// existing project schemas. Replace/extend them with the real definitions from
// the master AI development document once available. The routing layer is
// designed so adding a new type is a single entry — see services/teammate3.ts.

/** Direction tag helps the backend/relay route messages to the right peer. */
export type PeerId = "teammate3" | "teammate4";

/**
 * Base fields every teammate-3 message is expected to carry.
 * `type` is what we identify on. `from`/`to` denote the peers.
 */
export interface Teammate3BaseMessage {
  type: string;
  from?: PeerId;
  to?: PeerId;
  request_id?: string;
  timestamp?: string;
  // Allow arbitrary extra fields until the real schema is known.
  [key: string]: unknown;
}

/**
 * Known/expected message types from teammate 3. These are best-effort
 * placeholders; adjust names/payloads to match the master document.
 */
export interface Teammate3Request extends Teammate3BaseMessage {
  type: "Teammate3Request";
  action: string;
  payload?: Record<string, unknown>;
}

export interface Teammate3Response extends Teammate3BaseMessage {
  type: "Teammate3Response";
  request_id?: string;
  status: "ok" | "error";
  payload?: Record<string, unknown>;
}

export interface Teammate3Ping extends Teammate3BaseMessage {
  type: "Teammate3Ping";
}

/** Union of all recognized teammate-3 messages. */
export type Teammate3Message =
  | Teammate3Request
  | Teammate3Response
  | Teammate3Ping;

/** Type guard: does an arbitrary parsed object look like a teammate-3 message? */
export function isTeammate3Message(value: unknown): value is Teammate3BaseMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    typeof (value as { type: unknown }).type === "string"
  );
}

/**
 * Event names shared between the axios interceptor and the network-status store.
 *
 * Deliberately a module with no imports of its own. The store reaches the server through
 * the reachability probe, which goes through axios, so if axios imported the store
 * directly the three would form a cycle. Keeping the bare string here breaks it.
 */

/** A request died with no response at all. A suspicion, not a verdict. */
export const SERVER_UNREACHABLE_EVENT = "pos:server-unreachable";

/**
 * dsh-model-organizer host half.
 * Pure UI plugin: the empty apply exists so the plugin appears in the host
 * cordis loader / bundle list; the browser half ships via the package.json
 * dsh.client declaration and the "./client" export.
 */
export const name = "model-organizer";

export function apply() {}

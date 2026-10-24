// Fire-and-forget a store write, reporting a failure through console.warn
// instead of letting it become an unhandled rejection (PBI-153). The fill has
// already succeeded, so a failed learning-state write must stay identifiable
// in the log — never silently swallowed. The typed errors from ../kv-store
// (KvStoreSaveError / KvStoreReadError) pass through as the logged value, so
// the log tells a store failure apart from an unexpected bug.
export function persistWrite(what: string, write: () => Promise<void>): void {
  write().catch((err) => {
    console.warn(`[JushoAI] ${what}の保存に失敗しました`, err);
  });
}

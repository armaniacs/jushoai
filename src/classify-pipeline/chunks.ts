import type { FieldMeta } from '../core/types';
import type { ClassifySchedule } from '../core/classifier';
import { TRANSFER_CHUNK_SIZE, TRANSFER_TOTAL_CAP } from '../llm/transfer-contract';

// チャンク計画の単一所有 (PBI-174)。送信側 (background-gateway) と実行側
// (pipeline run) はここから供給を受け、自前リテラルを持たない。cap・
// chunk 幅・schedule 生成の変更はこのファイルだけで両端に反映される。

export interface ChunkPlan {
  // cap 以降を落とした送信対象。
  kept: FieldMeta[];
  // cap が落とした末尾の件数 (0 のとき切り詰めなし)。
  truncatedCount: number;
  // kept を chunk 幅で切った送信順の断片。
  chunks: FieldMeta[][];
}

export function planChunks(
  fields: FieldMeta[],
  chunkSize: number = TRANSFER_CHUNK_SIZE,
  totalCap: number = TRANSFER_TOTAL_CAP,
): ChunkPlan {
  const truncatedCount = Math.max(0, fields.length - totalCap);
  const kept = fields.slice(0, totalCap);
  const chunks: FieldMeta[][] = [];
  for (let i = 0; i < kept.length; i += chunkSize) {
    chunks.push(kept.slice(i, i + chunkSize));
  }
  return { kept, truncatedCount, chunks };
}

// 実行位置の表示は分割実行時のみ付く (PBI-54 由来の規律): 単一チャンクの
// run は schedule なしで送り、監査ログの scheduling 欄に載せない。
export function scheduleFor(index: number, count: number): ClassifySchedule | undefined {
  return count > 1 ? { index, count } : undefined;
}

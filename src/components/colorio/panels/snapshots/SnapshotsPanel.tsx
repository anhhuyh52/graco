/**
 * SnapshotsPanel.tsx
 * Snapshot list with apply and delete actions.
 */

import { Show, For } from "solid-js";
import { useColorIO } from "../../../../context/ColorIOContext";

export function SnapshotsPanel() {
  const { activeMedia, applySnapshot, deleteSnapshot } = useColorIO();

  return (
    <div class="snapshots-list">
      <Show
        when={(activeMedia()?.snapshots?.length ?? 0) > 0}
        fallback={
          <div class="empty-snapshots">No snapshots yet — press ⌘S to save one</div>
        }
      >
        <For each={activeMedia()?.snapshots ?? []}>
          {(snap) => (
            <div
              class="snapshot-item"
              onClick={() => applySnapshot(snap.id)}
              title={`Apply "${snap.name}"`}
            >
              <span class="snapshot-name">{snap.name}</span>
              <span class="snapshot-date">
                {new Date(snap.date).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <span
                class="snapshot-delete"
                title="Delete snapshot"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSnapshot(snap.id);
                }}
              >
                ×
              </span>
            </div>
          )}
        </For>
      </Show>
    </div>
  );
}

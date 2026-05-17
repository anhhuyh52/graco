/**
 * PanelSection.tsx
 *
 * Collapsible panel shell with bypass toggle and reset button.
 * Extracted from Sidebar.tsx — no changes to behavior.
 */

import { Show } from "solid-js";

interface PanelSectionProps {
  id: string;
  title: string;
  icon: string;
  isOpen: boolean;
  bypassed?: boolean;
  onToggle: () => void;
  onBypassToggle?: () => void;
  onReset?: () => void;
  children: any;
}

export function PanelSection(props: PanelSectionProps) {
  const handleResetClick = (e: MouseEvent) => {
    e.stopPropagation();
    props.onReset?.();
  };

  const handleBypassClick = (e: MouseEvent) => {
    e.stopPropagation();
    props.onBypassToggle?.();
  };

  return (
    <div class={`panel-section ${props.bypassed ? "bypassed" : ""}`}>
      <div
        class="panel-header"
        id={`panel-header-${props.id}`}
      >
        <button
          class="panel-toggle-area"
          onClick={props.onToggle}
          aria-expanded={props.isOpen}
          title="Toggle panel"
        >
          <img src={props.icon} alt="" class="panel-icon" />
          <span class="panel-title">{props.title}</span>
        </button>

        <div class="panel-actions">
          <Show when={props.onBypassToggle}>
            <button
              class={`panel-bypass-btn ${props.bypassed ? "active" : ""}`}
              title={props.bypassed ? "Enable panel" : "Bypass panel"}
              onClick={handleBypassClick}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <circle cx="5" cy="5" r="4" stroke="currentColor" stroke-width="1.2" />
                <line x1="2.5" y1="2.5" x2="7.5" y2="7.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
              </svg>
            </button>
          </Show>

          <Show when={props.onReset}>
            <button
              class="panel-reset-btn"
              title="Reset to default"
              onClick={handleResetClick}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5a3 3 0 1 0 3-3H3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
                <path d="M3 2L2 5l3 0" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
          </Show>

          <button
            class="panel-chevron-btn"
            onClick={props.onToggle}
            aria-label="Toggle panel"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              class={`chevron ${props.isOpen ? "open" : ""}`}
            >
              <path
                d="M3 4.5L6 7.5L9 4.5"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      <div class={`panel-content-wrapper ${props.isOpen ? "" : "collapsed"}`}>
        <div class="panel-content">
          <div
            class="panel-content-inner"
            id={`panel-content-${props.id}`}
            role="region"
            aria-labelledby={`panel-header-${props.id}`}
          >
            {props.children}
          </div>
        </div>
      </div>
    </div>
  );
}

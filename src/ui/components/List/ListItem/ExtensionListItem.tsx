import { render } from 'preact';
import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { ICONS } from '@/constants/icons';
import { extensionManager, settingsManager } from '@/libs';
import type { EditorContext, ExtensionPackage } from '@/libs/extensionManager';
import { Icon } from '../../decorations';
import { Setting } from '../../obsidian/Setting';
import { ListItem } from './index';
import './ExtensionListItem.css';

function RawMarkup({ content, className }: { content: string | DocumentFragment; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    ref.current.empty();
    if (!content) return;
    if (typeof content === 'string') ref.current.textContent = content;
    else ref.current.appendChild(content.cloneNode(true));
  }, [content]);
  return <span ref={ref} className={className} />;
}

export function ExtensionListItem({
  package: pkg,
  isCore,
  context,
}: {
  package: ExtensionPackage;
  isCore?: boolean;
  context: EditorContext;
}) {
  const settingsRecord = settingsManager.settings.extensionSettings[context];
  const setting = settingsRecord[pkg.id];
  const [enabled, setEnabled] = useState(pkg.isBuiltin ? true : (setting?.enabled ?? pkg.defaultEnabled ?? true));
  const [values, setValues] = useState({ ...setting?.values });

  const updateSettings = async (partial: { enabled?: boolean; values?: Record<string, unknown> }) => {
    const settingsRecord = settingsManager.settings.extensionSettings[context];
    let s = settingsRecord[pkg.id];
    if (!s && (partial.enabled !== undefined || partial.values)) {
      s = {
        id: pkg.id,
        enabled: pkg.isBuiltin ? true : (setting?.enabled ?? pkg.defaultEnabled ?? true),
        values: { ...setting?.values },
      };
      settingsRecord[pkg.id] = s;
    }

    if (s) {
      if (partial.enabled !== undefined) s.enabled = partial.enabled;
      if (partial.values) s.values = { ...s.values, ...partial.values };
    }

    await settingsManager.saveSettings();
    extensionManager.reconfigure(pkg.id);
  };

  const updateValue = async (key: string, val: unknown) => {
    setValues((v: Record<string, unknown>) => {
      const next = { ...v, [key]: val };
      updateSettings({ values: next });
      return next;
    });
  };

  return (
    <div className={`typstmate-extension-wrapper ${isCore ? 'is-core' : ''}`}>
      <ListItem
        summary={
          <div className={`typstmate-extension-list-item-summary ${!enabled && !pkg.isBuiltin ? 'is-disabled' : ''}`}>
            <div className="typstmate-extension-list-item-icon">
              <Icon icon={pkg.icon || ICONS.None} className="typstmate-extension-icon" />
            </div>

            <div className="typstmate-extension-list-item-info">
              <span className="typstmate-extension-list-item-name">
                {pkg.name}
                {0 < pkg.settings.length && (
                  <Icon icon={ICONS.Settings} className="typstmate-extension-has-settings-icon" />
                )}
              </span>
              <RawMarkup content={pkg.description} className="typstmate-extension-list-item-desc" />
            </div>

            <div className="typstmate-extension-list-item-tags">
              {pkg.tags.map((tag: any) => (
                <span key={tag} className="typstmate-tag">
                  #{tag}
                </span>
              ))}
            </div>

            <div className="typstmate-extension-list-item-controls" onClick={(e) => e.stopPropagation()}>
              <Setting
                build={(s) =>
                  s.addToggle((t) =>
                    t
                      .setValue(enabled)
                      .setDisabled(pkg.isBuiltin)
                      .onChange(async (v) => {
                        setEnabled(v);
                        await updateSettings({ enabled: v });
                      }),
                  )
                }
              />
              <div className="typstmate-extension-footer">
                {pkg.scope.map((s: any) => (
                  <Icon
                    key={s}
                    icon={s === 'markdown' ? ICONS.Pencil : ICONS.TypstStroke}
                    className="typstmate-extension-scope-icon"
                    title={s}
                  />
                ))}
              </div>
            </div>
          </div>
        }
        isVertical={true}
      >
        {pkg.settings.length > 0 && (
          <div className="typstmate-extension-settings-panel" onClick={(e) => e.stopPropagation()}>
            {pkg.settings.map((item: any) => {
              const val = values[item.key] ?? item.defaultValue;

              return (
                <Setting
                  key={item.key}
                  build={(s) => {
                    switch (item.type) {
                      case 'toggle':
                        s.setName(item.title).setDesc(item.description);
                        s.addToggle((t) => t.setValue(!!val).onChange((v: any) => updateValue(item.key, v)));
                        break;
                      case 'slider':
                        s.setName(item.title).setDesc(item.description);
                        s.addSlider((sl) =>
                          sl
                            .setLimits(item.min!, item.max!, item.step!)
                            .setValue(val as number)
                            .setDynamicTooltip()
                            .onChange((v: any) => updateValue(item.key, v)),
                        );
                        break;
                      case 'dropdown':
                        s.setName(item.title).setDesc(item.description);
                        s.addDropdown((d) => {
                          const options = Object.fromEntries(
                            item.options!.map((opt: any) => [
                              typeof opt === 'string' ? opt : opt.value,
                              typeof opt === 'string' ? opt : opt.label,
                            ]),
                          );
                          d.addOptions(options)
                            .setValue(val as string)
                            .onChange((v: any) => updateValue(item.key, v));
                        });
                        break;
                      case 'text':
                        s.setName(item.title).setDesc(item.description);
                        s.addText((t) =>
                          t
                            .setValue(val as string)
                            .onChange((v: any) => updateValue(item.key, v))
                            .inputEl.classList.add('typstmate-ext-text-input'),
                        );
                        break;
                      case 'keymap':
                        s.setName(item.title).setDesc(item.description);
                        render(
                          <KeyRecorder value={val as string} onChange={(v: any) => updateValue(item.key, v)} />,
                          s.controlEl,
                        );
                        break;
                      case 'header':
                        s.settingEl.classList.add('typstmate-ext-setting-header');
                        s.setName(item.title);
                        break;
                    }
                  }}
                />
              );
            })}
          </div>
        )}
      </ListItem>
    </div>
  );
}

function KeyRecorder({ value, onChange }: { value: string; onChange: (k: string) => void }) {
  const [recording, setRecording] = useState(false);
  return (
    <div className="typstmate-ext-keymap-wrap">
      <input
        type="text"
        className={`typstmate-ext-text-input typstmate-ext-keymap-input ${recording ? 'is-recording' : ''}`}
        readOnly
        value={value}
        placeholder={recording ? 'Press key...' : 'Click to record...'}
        onFocus={() => setRecording(true)}
        onBlur={() => setRecording(false)}
        onKeyDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (e.key === 'Backspace' || e.key === 'Delete') {
            onChange('');
            return;
          }
          const parts = [];
          if (e.metaKey) parts.push('Meta');
          if (e.ctrlKey) parts.push('Ctrl');
          if (e.altKey) parts.push('Alt');
          if (e.shiftKey) parts.push('Shift');
          let key = e.key;
          if (['Control', 'Meta', 'Alt', 'Shift', 'CapsLock', 'Tab'].includes(key)) return;
          if (key === ' ') key = 'Space';
          else if (key.length === 1) key = key.toLowerCase();
          parts.push(key);
          onChange(parts.join('-'));
          (e.target as HTMLInputElement).blur();
        }}
      />
      <button
        className="typstmate-ext-keymap-clear"
        onClick={(e) => {
          e.stopPropagation();
          onChange('');
        }}
      >
        ✕
      </button>
    </div>
  );
}

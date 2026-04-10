import { useState } from 'hono/jsx/dom';
import { render } from 'hono/jsx/dom';
import { ICONS } from '@/constants/icons';
import { extensionManager, settingsManager } from '@/libs';
import type { ExtensionInfo } from '@/libs/extensionManager';
import { Icon } from '../../decorations';
import { Setting } from '../../obsidian/Setting';
import { ListItem } from './index';
import './ExtensionListItem.css';

export function ExtensionListItem({ info, isCore }: { info: ExtensionInfo; isCore?: boolean }) {
  const { markdown, typst } = settingsManager.settings.extensionSettings;
  const setting = markdown[info.id] || typst[info.id];
  const [enabled, setEnabled] = useState(info.isBuiltin ? true : (setting?.enabled ?? true));
  const [values, setValues] = useState({ ...setting?.values });

  const updateSettings = async (partial: { enabled?: boolean; values?: Record<string, unknown> }) => {
    const extSettings = settingsManager.settings.extensionSettings;
    [extSettings.markdown, extSettings.typst].forEach((record) => {
      let s = record[info.id];
      if (!s && (partial.enabled !== undefined || partial.values)) {
        s = {
          id: info.id,
          enabled: info.isBuiltin ? true : (setting?.enabled ?? true),
          values: { ...setting?.values },
        };
        record[info.id] = s;
      }

      if (s) {
        if (partial.enabled !== undefined) s.enabled = partial.enabled;
        if (partial.values) s.values = { ...s.values, ...partial.values };
      }
    });

    await settingsManager.saveSettings();
    extensionManager.reconfigure(info.id);
  };

  const updateValue = async (key: string, val: unknown) => {
    setValues((v) => {
      const next = { ...v, [key]: val };
      updateSettings({ values: next });
      return next;
    });
  };

  return (
    <div className={`typstmate-extension-wrapper ${isCore ? 'is-core' : ''}`}>
      <ListItem
        summary={
          <div className={`typstmate-extension-list-item-summary ${!enabled && !info.isBuiltin ? 'is-disabled' : ''}`}>
            <div className="typstmate-extension-list-item-icon">
              <Icon icon={info.icon || ICONS.None} className="typstmate-extension-icon" />
            </div>

            <div className="typstmate-extension-list-item-info">
              <span className="typstmate-extension-list-item-name">{info.name}</span>
              <span className="typstmate-extension-list-item-desc">{info.description}</span>
            </div>

            <div className="typstmate-extension-list-item-tags">
              {info.tags.map((tag) => (
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
                      .setDisabled(info.isBuiltin)
                      .onChange(async (v) => {
                        setEnabled(v);
                        await updateSettings({ enabled: v });
                      }),
                  )
                }
              />
              <div className="typstmate-extension-footer">
                {info.scope.map((s) => (
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
        {info.settings.length > 0 && (
          <div className="typstmate-extension-settings-panel" onClick={(e) => e.stopPropagation()}>
            {info.settings.map((item) => {
              const val = values[item.key] ?? item.defaultValue;

              return (
                <Setting
                  key={item.key}
                  build={(s) => {
                    s.setName(item.title).setDesc(item.description);
                    switch (item.type) {
                      case 'toggle':
                        s.addToggle((t) => t.setValue(!!val).onChange((v) => updateValue(item.key, v)));
                        break;
                      case 'slider':
                        s.addSlider((sl) =>
                          sl
                            .setLimits(item.min, item.max, item.step)
                            .setValue(val as number)
                            .setDynamicTooltip()
                            .onChange((v) => updateValue(item.key, v)),
                        );
                        break;
                      case 'dropdown':
                        s.addDropdown((d) => {
                          const options = Object.fromEntries(
                            item.options.map((opt) => [
                              typeof opt === 'string' ? opt : opt.value,
                              typeof opt === 'string' ? opt : opt.label,
                            ]),
                          );
                          d.addOptions(options)
                            .setValue(val as string)
                            .onChange((v) => updateValue(item.key, v));
                        });
                        break;
                      case 'text':
                        s.addText((t) =>
                          t
                            .setValue(val as string)
                            .onChange((v) => updateValue(item.key, v))
                            .inputEl.classList.add('typstmate-ext-text-input'),
                        );
                        break;
                      case 'keymap':
                        render(
                          <KeyRecorder value={val as string} onChange={(v) => updateValue(item.key, v)} />,
                          s.controlEl,
                        );
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

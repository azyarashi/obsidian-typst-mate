import { Setting } from '@components/obsidian/Setting';
import { useState } from 'preact/hooks';
import { DEFAULT_SETTINGS } from '@/data/settings';
import { t, tFragment } from '@/i18n';
import { appUtils, settingsManager, typstManager } from '@/libs';

import './renderer.css';

export function RendererTab() {
  const [backgroundRendering, setBackgroundRendering] = useState(settingsManager.settings.enableBackgroundRendering);
  const [patchPDFExport, setPatchPDFExport] = useState(
    settingsManager.settings.patchPDFExport ?? DEFAULT_SETTINGS.patchPDFExport!,
  );
  const [autoBaseColor, setAutoBaseColor] = useState(settingsManager.settings.autoBaseColor);
  const [baseColor, setBaseColor] = useState(settingsManager.settings.baseColor);
  const [offset, setOffset] = useState(settingsManager.settings.offset ?? 0);
  const [fitProfile, setFitProfile] = useState(() => {
    const currentProfileName = settingsManager.settings.fitToNoteWidthProfile;
    const profiles = settingsManager.settings.fitToNoteWidthProfiles ?? [];
    const profile = profiles.find((p) => p.name === currentProfileName);
    return profile ? profile.name : 'Live';
  });
  const [profiles, setProfiles] = useState([...(settingsManager.settings.fitToNoteWidthProfiles ?? [])]);

  const updateProfiles = async (newProfiles: typeof profiles) => {
    setProfiles([...newProfiles]);
    settingsManager.settings.fitToNoteWidthProfiles = newProfiles;
    await settingsManager.saveSettings();
    typstManager.updateNoteWidth();
  };

  const profileOptions: Record<string, string> = { Live: 'Live' };
  profiles.forEach((p) => {
    profileOptions[p.name] = p.name;
  });

  return (
    <>
      {/* Background Rendering */}
      <Setting
        build={(setting) =>
          setting
            .setName(t('settings.renderer.enableBackgroundRendering'))
            .setDesc(t('settings.renderer.enableBackgroundRenderingDesc'))
            .addToggle((toggle) =>
              toggle.setValue(backgroundRendering).onChange(async (v) => {
                setBackgroundRendering(v);
                settingsManager.settings.enableBackgroundRendering = v;
                await settingsManager.saveSettings();
                await appUtils.reloadPlugin(true);
              }),
            )
        }
      />

      {/* Patch PDF Export */}
      <Setting
        build={(setting) =>
          setting
            .setName(t('settings.renderer.patchPdfExport'))
            .setDesc(t('settings.renderer.patchPdfExportDesc'))
            .addToggle((toggle) =>
              toggle.setValue(patchPDFExport).onChange(async (v) => {
                setPatchPDFExport(v);
                settingsManager.settings.patchPDFExport = v;
                await settingsManager.saveSettings();
              }),
            )
        }
      />

      {/* Auto Base Color */}
      <Setting
        build={(setting) =>
          setting
            .setName(t('settings.renderer.useThemeTextColor'))
            .setDesc(t('settings.renderer.useThemeTextColorDesc'))
            .addToggle((toggle) =>
              toggle.setValue(autoBaseColor).onChange(async (v) => {
                setAutoBaseColor(v);
                settingsManager.settings.autoBaseColor = v;
                appUtils.applyBaseColor();
                await settingsManager.saveSettings();
              }),
            )
        }
      />

      {/* Base Color */}
      <Setting
        build={(setting) => {
          setting.setName(t('settings.renderer.baseColor')).setDesc(tFragment('settings.renderer.baseColorDesc'));
          const colorPickerInput = document.createElement('input');
          colorPickerInput.type = 'color';
          colorPickerInput.value = baseColor;
          colorPickerInput.oninput = async (e) => {
            const val = (e.target as HTMLInputElement).value;
            setBaseColor(val);
            settingsManager.settings.baseColor = val;
            appUtils.applyBaseColor();
            await settingsManager.saveSettings();
          };
          setting.controlEl.appendChild(colorPickerInput);
        }}
      />

      {/* Offset */}
      <Setting
        build={(setting) =>
          setting
            .setName(t('settings.renderer.offset'))
            .setDesc(t('settings.renderer.offsetDesc'))
            .addSlider((slider) =>
              slider
                .setLimits(-0.5, 0.5, 0.05)
                .setValue(offset)
                .setDynamicTooltip()
                .onChange(async (v) => {
                  setOffset(v);
                  settingsManager.settings.offset = v;
                  await settingsManager.saveSettings();
                  await typstManager.wasm.setOffset(v);
                }),
            )
        }
      />

      {/* Fit Note Width Profile */}
      <Setting
        build={(setting) =>
          setting
            .setHeading()
            .setName(t('settings.renderer.fitToNoteWidthProfile'))
            .setDesc(t('settings.renderer.fitToNoteWidthProfileDesc'))
            .addDropdown((dropdown) =>
              dropdown
                .addOptions(profileOptions)
                .setValue(fitProfile)
                .onChange(async (v) => {
                  setFitProfile(v);
                  settingsManager.settings.fitToNoteWidthProfile = v;
                  await settingsManager.saveSettings();
                  typstManager.updateNoteWidth();
                }),
            )
        }
      />

      {/* Profiles (Add Button) */}
      <Setting
        build={(setting) =>
          setting
            .setName(t('settings.renderer.profiles'))
            .setDesc(t('settings.renderer.profilesDesc'))
            .addButton((button) =>
              button.setButtonText(t('settings.renderer.addProfile')).onClick(async () => {
                const newProfiles = [...profiles, { name: t('settings.renderer.newProfileName'), width: '500pt' }];
                await updateProfiles(newProfiles);
              }),
            )
        }
      />

      {profiles.map((profile, index) => (
        <Setting
          key={index}
          build={(setting) =>
            setting
              .addText((text) =>
                text
                  .setPlaceholder(t('settings.renderer.profileNamePlaceholder'))
                  .setValue(profile.name)
                  .onChange(async (val) => {
                    const oldName = profiles[index]?.name;
                    const newProfiles = [...profiles];
                    if (newProfiles[index]) {
                      newProfiles[index].name = val;
                      if (fitProfile === oldName) setFitProfile(val);
                      await updateProfiles(newProfiles);
                    }
                  }),
              )
              .addText((text) =>
                text
                  .setPlaceholder(t('settings.renderer.profileWidthPlaceholder'))
                  .setValue(profile.width)
                  .onChange(async (val) => {
                    const newProfiles = [...profiles];
                    if (newProfiles[index]) {
                      newProfiles[index].width = val;
                      await updateProfiles(newProfiles);
                    }
                  }),
              )
              .addButton((button) =>
                button
                  .setIcon('trash')
                  .setTooltip(t('settings.renderer.deleteProfile'))
                  .onClick(async () => {
                    const p = profiles[index];
                    if (!p) return;
                    const oldName = p.name;
                    const newProfiles = profiles.filter((_, i) => i !== index);
                    if (fitProfile === oldName) setFitProfile('Live');
                    await updateProfiles(newProfiles);
                  }),
              )
          }
        />
      ))}
    </>
  );
}

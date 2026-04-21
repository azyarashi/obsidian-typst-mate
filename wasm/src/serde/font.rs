use serde::Serialize;
use tsify::Tsify;

use typst::text::{
    FontFlags, FontInfo as TypstFontInfo, FontStretch as TypstFontStretch,
    FontWeight as TypstFontWeight,
};

#[derive(Serialize, Tsify, Copy, Clone)]
#[serde(rename_all = "lowercase")]
pub enum FontWeight {
    Thin,
    ExtraLight,
    Light,
    Regular,
    Medium,
    SemiBold,
    Bold,
    ExtraBold,
    Black,
    Unknown,
}

impl From<TypstFontWeight> for FontWeight {
    fn from(w: TypstFontWeight) -> Self {
        if w == TypstFontWeight::THIN {
            Self::Thin
        } else if w == TypstFontWeight::EXTRALIGHT {
            Self::ExtraLight
        } else if w == TypstFontWeight::LIGHT {
            Self::Light
        } else if w == TypstFontWeight::REGULAR {
            Self::Regular
        } else if w == TypstFontWeight::MEDIUM {
            Self::Medium
        } else if w == TypstFontWeight::SEMIBOLD {
            Self::SemiBold
        } else if w == TypstFontWeight::BOLD {
            Self::Bold
        } else if w == TypstFontWeight::EXTRABOLD {
            Self::ExtraBold
        } else if w == TypstFontWeight::BLACK {
            Self::Black
        } else {
            Self::Unknown
        }
    }
}

#[derive(Serialize, Tsify, Copy, Clone)]
#[serde(rename_all = "kebab-case")]
pub enum FontStretch {
    UltraCondensed,
    ExtraCondensed,
    Condensed,
    SemiCondensed,
    Normal,
    SemiExpanded,
    Expanded,
    ExtraExpanded,
    UltraExpanded,
    Unknown,
}

impl From<TypstFontStretch> for FontStretch {
    fn from(s: TypstFontStretch) -> Self {
        if s == TypstFontStretch::ULTRA_CONDENSED {
            Self::UltraCondensed
        } else if s == TypstFontStretch::EXTRA_CONDENSED {
            Self::ExtraCondensed
        } else if s == TypstFontStretch::CONDENSED {
            Self::Condensed
        } else if s == TypstFontStretch::SEMI_CONDENSED {
            Self::SemiCondensed
        } else if s == TypstFontStretch::NORMAL {
            Self::Normal
        } else if s == TypstFontStretch::SEMI_EXPANDED {
            Self::SemiExpanded
        } else if s == TypstFontStretch::EXPANDED {
            Self::Expanded
        } else if s == TypstFontStretch::EXTRA_EXPANDED {
            Self::ExtraExpanded
        } else if s == TypstFontStretch::ULTRA_EXPANDED {
            Self::UltraExpanded
        } else {
            Self::Unknown
        }
    }
}

#[derive(Serialize, Tsify)]
#[serde(rename_all = "lowercase")]
pub enum FontFlag {
    Monospace,
    Serif,
    Math,
    Variable,
}

#[derive(Serialize, Tsify)]
#[serde(rename_all = "camelCase")]
pub struct FontVariant {
    pub style: String,
    pub weight: String,
    pub stretch: String,
}

#[derive(Serialize, Tsify)]
#[serde(rename_all = "camelCase")]
pub struct FontInfo {
    pub family: String,
    pub variant: FontVariant,
    pub flags: String,
    pub coverage: Vec<u32>,
}

impl From<&TypstFontInfo> for FontInfo {
    fn from(info: &TypstFontInfo) -> Self {
        let weight_enum = FontWeight::from(info.variant.weight);
        let weight_name = serde_json::to_value(weight_enum)
            .unwrap()
            .as_str()
            .unwrap()
            .to_string();

        let stretch_enum = FontStretch::from(info.variant.stretch);
        let stretch_name = serde_json::to_value(stretch_enum)
            .unwrap()
            .as_str()
            .unwrap()
            .to_string();

        let mut flags_list = Vec::new();
        if info.flags.contains(FontFlags::MONOSPACE) {
            flags_list.push(FontFlag::Monospace);
        }
        if info.flags.contains(FontFlags::SERIF) {
            flags_list.push(FontFlag::Serif);
        }
        if info.flags.contains(FontFlags::MATH) {
            flags_list.push(FontFlag::Math);
        }
        if info.flags.contains(FontFlags::VARIABLE) {
            flags_list.push(FontFlag::Variable);
        }

        let flags_str = if flags_list.is_empty() {
            "none".into()
        } else {
            flags_list
                .iter()
                .map(|f| {
                    serde_json::to_value(f)
                        .unwrap()
                        .as_str()
                        .unwrap()
                        .to_string()
                })
                .collect::<Vec<_>>()
                .join(", ")
        };

        FontInfo {
            family: info.family.clone(),
            variant: FontVariant {
                style: format!("{:?}", info.variant.style).to_lowercase(),
                weight: format!("{} ({})", weight_name, info.variant.weight.to_number()),
                stretch: format!(
                    "{} ({}%)",
                    stretch_name,
                    (info.variant.stretch.to_ratio().get() * 100.0) as u16
                ),
            },
            flags: flags_str,
            coverage: info.coverage.iter().collect(),
        }
    }
}

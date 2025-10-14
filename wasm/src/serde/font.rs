use serde::Serialize;

use crate::typst::text::{FontInfo, FontStyle};

#[derive(Serialize)]
pub struct FontVariantSer {
    pub style: String,
    pub weight: u16,
    pub stretch: u16,
}

#[derive(Serialize)]
pub struct FontInfoSer {
    pub family: String,
    pub variant: FontVariantSer,
    pub flags: u32,
    pub coverage: Vec<u32>,
}

impl From<&FontInfo> for FontInfoSer {
    fn from(info: &FontInfo) -> Self {
        FontInfoSer {
            family: info.family.clone(),
            variant: FontVariantSer {
                style: match info.variant.style {
                    FontStyle::Normal => "Normal".into(),
                    FontStyle::Italic => "Italic".into(),
                    FontStyle::Oblique => "Oblique".into(),
                },
                weight: info.variant.weight.to_number(),
                stretch: info.variant.stretch.to_ratio().get() as u16,
            },
            flags: info.flags.bits(),
            coverage: info.coverage.iter().collect(),
        }
    }
}

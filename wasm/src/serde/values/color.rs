use serde::Serialize;
use tsify::Tsify;
use typst::foundations::Repr;

use typst::visualize::Color as TypstColor;

#[derive(Serialize, Tsify)]
pub struct Color {
    pub repr: String,
    pub hex: String,
}

impl From<&TypstColor> for Color {
    fn from(color: &TypstColor) -> Self {
        let [r, g, b, a] = color.to_vec4_u8();
        let hex = format!("#{:02x}{:02x}{:02x}{:02x}", r, g, b, a);

        Color {
            repr: color.repr().to_string(),
            hex,
        }
    }
}

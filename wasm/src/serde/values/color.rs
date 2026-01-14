use serde::Serialize;
use tsify::Tsify;

use typst::visualize::Color;

#[derive(Serialize, Tsify)]
pub struct ColorSer {
    pub hex: String,
}

impl From<&Color> for ColorSer {
    fn from(color: &Color) -> Self {
        let [r, g, b, a] = color.to_vec4_u8();
        let hex = format!("#{:02x}{:02x}{:02x}{:02x}", r, g, b, a);

        ColorSer { hex }
    }
}

use serde::Serialize;
use tsify::Tsify;
use typst::foundations::Repr;

use typst::layout::Ratio as TypstRatio;

#[derive(Serialize, Tsify)]
pub struct Ratio {
    pub repr: String,
    pub percentage: String,
}

impl From<&TypstRatio> for Ratio {
    fn from(ratio: &TypstRatio) -> Self {
        let value = ratio.get();

        Ratio {
            repr: ratio.repr().to_string(),
            percentage: format!("{:.3}%", (value * 100.0).round() / 100.0),
        }
    }
}

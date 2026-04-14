use serde::Serialize;
use tsify::Tsify;

use typst::layout::Ratio as TypstRatio;

#[derive(Serialize, Tsify)]
pub struct Ratio {
    pub percentage: String,
}

impl From<&TypstRatio> for Ratio {
    fn from(ratio: &TypstRatio) -> Self {
        let value = ratio.get();

        Ratio {
            percentage: format!("{:.3}%", (value * 100.0).round() / 100.0),
        }
    }
}

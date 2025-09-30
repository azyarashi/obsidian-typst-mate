use serde::Serialize;
use tsify::Tsify;

use typst::layout::Ratio;

#[derive(Serialize, Tsify)]
pub struct RatioSer {
    pub percentage: String,
}

impl From<&Ratio> for RatioSer {
    fn from(ratio: &Ratio) -> Self {
        let value = ratio.get();

        RatioSer {
            percentage: format!("{:.3}%", (value * 100.0).round() / 100.0),
        }
    }
}

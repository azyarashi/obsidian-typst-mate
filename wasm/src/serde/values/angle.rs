use serde::Serialize;
use tsify::Tsify;

use typst::layout::Angle;

#[derive(Serialize, Tsify)]
pub struct AngleSer {
    pub rad: String,
}

impl From<&Angle> for AngleSer {
    fn from(angle: &Angle) -> Self {
        AngleSer {
            rad: format!("{:.3} π rad", angle.to_rad()),
        }
    }
}

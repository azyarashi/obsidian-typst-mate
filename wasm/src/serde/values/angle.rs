use serde::Serialize;
use tsify::Tsify;

use typst::layout::Angle;

#[derive(Serialize, Tsify)]
pub struct AngleSer {
    pub deg: String,
    pub rad: String,
}

impl From<&Angle> for AngleSer {
    fn from(angle: &Angle) -> Self {
        AngleSer {
            deg: format!("{:.3}°", angle.to_deg()),
            rad: format!("{:.3}π rad", angle.to_rad() / std::f64::consts::PI),
        }
    }
}

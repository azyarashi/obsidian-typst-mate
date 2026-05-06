use serde::Serialize;
use tsify::Tsify;
use typst::foundations::Repr;

use typst::layout::Angle as TypstAngle;

#[derive(Serialize, Tsify)]
pub struct Angle {
    pub repr: String,
    pub deg: String,
    pub rad: String,
}

impl From<&TypstAngle> for Angle {
    fn from(angle: &TypstAngle) -> Self {
        Angle {
            repr: angle.repr().to_string(),
            deg: format!("{:.3}°", angle.to_deg()),
            rad: format!("{:.3}π rad", angle.to_rad() / std::f64::consts::PI),
        }
    }
}

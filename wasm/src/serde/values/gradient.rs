use serde::Serialize;
use tsify::Tsify;

use typst::{foundations::Repr, visualize::Gradient};

// TODO
#[derive(Serialize, Tsify)]
pub struct GradientSer {
    pub repr: String,
}

impl From<&Gradient> for GradientSer {
    fn from(gradient: &Gradient) -> Self {
        GradientSer {
            repr: gradient.repr().to_string(),
        }
    }
}

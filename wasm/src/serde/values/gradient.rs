use serde::Serialize;
use tsify::Tsify;

use typst::{foundations::Repr, visualize::Gradient as TypstGradient};

#[derive(Serialize, Tsify)]
pub struct Gradient {
    pub repr: String,
}

impl From<&TypstGradient> for Gradient {
    fn from(gradient: &TypstGradient) -> Self {
        Gradient {
            repr: gradient.repr().to_string(),
        }
    }
}

use serde::Serialize;
use typst::foundations::Repr;
use tsify::Tsify;

use typst::layout::{Length, Rel};

use crate::serde::values::Ratio;

#[derive(Serialize, Tsify)]
pub struct Relative {
    pub repr: String,
    #[serde(flatten)]
    pub ratio: Ratio,
}

impl From<&Rel<Length>> for Relative {
    fn from(relative: &Rel<Length>) -> Self {
        Relative {
            repr: relative.repr().to_string(),
            ratio: Ratio::from(&relative.rel),
        }
    }
}

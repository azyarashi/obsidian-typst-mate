use serde::Serialize;
use tsify::Tsify;

use typst::layout::{Length, Rel};

use crate::serde::values::Ratio;

#[derive(Serialize, Tsify)]
pub struct Relative {
    #[serde(flatten)]
    pub ratio: Ratio,
}

impl From<&Rel<Length>> for Relative {
    fn from(relative: &Rel<Length>) -> Self {
        Relative {
            ratio: Ratio::from(&relative.rel),
        }
    }
}

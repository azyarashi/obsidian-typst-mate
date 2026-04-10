use serde::Serialize;
use tsify::Tsify;

use typst::layout::{Length, Rel};

use crate::serde::values::RatioSer;

#[derive(Serialize, Tsify)]
pub struct RelativeSer {
    #[serde(flatten)]
    pub ratio: RatioSer,
}

impl From<&Rel<Length>> for RelativeSer {
    fn from(relative: &Rel<Length>) -> Self {
        RelativeSer {
            ratio: RatioSer::from(&relative.rel),
        }
    }
}

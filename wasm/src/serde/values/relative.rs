use serde::Serialize;
use tsify::Tsify;

use typst::layout::Rel;

use crate::serde::values::RatioSer;

#[derive(Serialize, Tsify)]
pub struct RelativeSer {
    #[serde(flatten)]
    pub ratio: RatioSer,
}

impl From<&Rel<typst::layout::Length>> for RelativeSer {
    fn from(relative: &Rel<typst::layout::Length>) -> Self {
        RelativeSer {
            ratio: RatioSer::from(&relative.rel),
        }
    }
}

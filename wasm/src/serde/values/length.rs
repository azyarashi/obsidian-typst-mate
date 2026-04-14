use serde::Serialize;
use tsify::Tsify;

use typst::layout::Length as TypstLength;

#[derive(Serialize, Tsify)]
pub struct Length {
    pub em: String,
    pub abs: String,
}

impl From<&TypstLength> for Length {
    fn from(length: &TypstLength) -> Self {
        Length {
            em: format!("{:.3} em", length.em.get()),
            abs: format!("{:.3} pt", length.abs.to_pt()),
        }
    }
}

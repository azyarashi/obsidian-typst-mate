use serde::Serialize;
use tsify::Tsify;

use typst::layout::Length;

#[derive(Serialize, Tsify)]
pub struct LengthSer {
    pub em: String,
    pub abs: String,
}

impl From<&Length> for LengthSer {
    fn from(length: &Length) -> Self {
        LengthSer {
            em: format!("{:.3} em", length.em.get()),
            abs: format!("{:.3} pt", length.abs.to_pt()),
        }
    }
}

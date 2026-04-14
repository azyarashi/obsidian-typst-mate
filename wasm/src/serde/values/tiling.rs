use serde::Serialize;
use tsify::Tsify;

use typst::{foundations::Repr, visualize::Tiling as TypstTiling};

#[derive(Serialize, Tsify)]
pub struct Tiling {
    pub repr: String,
}

impl From<&TypstTiling> for Tiling {
    fn from(tiling: &TypstTiling) -> Self {
        Tiling {
            repr: tiling.repr().to_string(),
        }
    }
}

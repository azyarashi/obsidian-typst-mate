use serde::Serialize;
use tsify::Tsify;

use typst::{foundations::Repr, visualize::Tiling};

// TODO
#[derive(Serialize, Tsify)]
pub struct TilingSer {
    repr: String,
}

impl From<&Tiling> for TilingSer {
    fn from(tiling: &Tiling) -> Self {
        TilingSer {
            repr: tiling.repr().to_string(),
        }
    }
}

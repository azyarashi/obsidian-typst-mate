use serde::Serialize;
use tsify::Tsify;

use typst::foundations::{Repr, Styles};

// TODO
#[derive(Serialize, Tsify)]
pub struct StylesSer {
    repr: String,
}

impl From<&Styles> for StylesSer {
    fn from(styles: &Styles) -> Self {
        StylesSer {
            repr: styles.repr().to_string(),
        }
    }
}

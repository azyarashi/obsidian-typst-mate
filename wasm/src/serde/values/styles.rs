use serde::Serialize;
use tsify::Tsify;

use typst::foundations::{Repr, Styles as TypstStyles};

#[derive(Serialize, Tsify)]
pub struct Styles {
    pub repr: String,
}

impl From<&TypstStyles> for Styles {
    fn from(styles: &TypstStyles) -> Self {
        Styles {
            repr: styles.repr().to_string(),
        }
    }
}

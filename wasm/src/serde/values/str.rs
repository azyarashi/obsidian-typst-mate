use serde::Serialize;
use typst::foundations::Repr;
use tsify::Tsify;

use typst::foundations::Str as TypstStr;

#[derive(Serialize, Tsify)]
pub struct Str {
    pub repr: String,
    pub value: String,
}

impl From<&TypstStr> for Str {
    fn from(str_: &TypstStr) -> Self {
        Str {
            repr: str_.repr().to_string(),
            value: str_.to_string(),
        }
    }
}

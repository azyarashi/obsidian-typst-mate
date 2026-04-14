use serde::Serialize;
use tsify::Tsify;

use typst::foundations::Str as TypstStr;

#[derive(Serialize, Tsify)]
pub struct Str {
    pub value: String,
}

impl From<&TypstStr> for Str {
    fn from(str_: &TypstStr) -> Self {
        Str {
            value: str_.to_string(),
        }
    }
}

use serde::Serialize;
use tsify::Tsify;

use crate::typst::foundations::Str;

#[derive(Serialize, Tsify)]
pub struct StrSer {
    pub value: String,
}

impl From<&Str> for StrSer {
    fn from(str_: &Str) -> Self {
        StrSer {
            value: str_.to_string(),
        }
    }
}

use serde::Serialize;
use tsify::Tsify;
use typst::foundations::Repr;
use typst::foundations::Value as TypstValue;

#[derive(Serialize, Tsify)]
pub struct Bool {
    pub repr: String,
    pub value: bool,
}

impl From<bool> for Bool {
    fn from(value: bool) -> Self {
        Bool {
            repr: TypstValue::Bool(value).repr().to_string(),
            value,
        }
    }
}

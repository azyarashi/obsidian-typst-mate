use serde::Serialize;
use tsify::Tsify;
use typst::foundations::Repr;
use typst::foundations::Value as TypstValue;

#[derive(Serialize, Tsify)]
pub struct Int {
    pub repr: String,
    pub value: i64,
}

impl From<i64> for Int {
    fn from(value: i64) -> Self {
        Int {
            repr: TypstValue::Int(value).repr().to_string(),
            value,
        }
    }
}

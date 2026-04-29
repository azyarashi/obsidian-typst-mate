use serde::Serialize;
use tsify::Tsify;
use typst::foundations::Repr;
use typst::foundations::Value as TypstValue;

#[derive(Serialize, Tsify)]
pub struct Float {
    pub repr: String,
    pub value: f64,
}

impl From<f64> for Float {
    fn from(value: f64) -> Self {
        Float {
            repr: TypstValue::Float(value).repr().to_string(),
            value,
        }
    }
}

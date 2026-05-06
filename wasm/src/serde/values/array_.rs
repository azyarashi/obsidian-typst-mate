use serde::Serialize;
use tsify::Tsify;
use typst::foundations::Repr;

use typst::foundations::Array as TypstArray;

use crate::serde::values::Value;

#[derive(Serialize, Tsify)]
pub struct Array_ {
    pub repr: String,
    pub elements: Vec<Value>,
}

impl From<&TypstArray> for Array_ {
    fn from(array: &TypstArray) -> Self {
        Array_ {
            repr: array.repr().to_string(),
            elements: array.iter().map(|v| Value::from(v)).collect(),
        }
    }
}

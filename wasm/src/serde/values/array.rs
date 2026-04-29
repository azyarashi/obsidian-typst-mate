use serde::Serialize;
use typst::foundations::Repr;
use tsify::Tsify;

use typst::foundations::Array as TypstArray;

use crate::serde::values::Value;

#[derive(Serialize, Tsify)]
pub struct Array {
    pub repr: String,
    pub elements: Vec<Value>,
}

impl From<&TypstArray> for Array {
    fn from(array: &TypstArray) -> Self {
        Array {
            repr: array.repr().to_string(),
            elements: array.iter().map(|v| Value::from(v)).collect(),
        }
    }
}

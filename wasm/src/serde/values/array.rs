use serde::Serialize;
use tsify::Tsify;

use typst::foundations::Array as TypstArray;

use crate::serde::values::Value;

#[derive(Serialize, Tsify)]
pub struct Array {
    pub elements: Vec<Value>,
}

impl From<&TypstArray> for Array {
    fn from(array: &TypstArray) -> Self {
        Array {
            elements: array.iter().map(|v| Value::from(v)).collect(),
        }
    }
}

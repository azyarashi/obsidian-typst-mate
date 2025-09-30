use serde::Serialize;
use tsify::Tsify;

use typst::foundations::Array;

use crate::serde::values::ValueSer;

#[derive(Serialize, Tsify)]
pub struct ArraySer {
    pub elements: Vec<ValueSer>,
}

impl From<&Array> for ArraySer {
    fn from(array: &Array) -> Self {
        ArraySer {
            elements: array.iter().map(|v| ValueSer::from(v)).collect(),
        }
    }
}

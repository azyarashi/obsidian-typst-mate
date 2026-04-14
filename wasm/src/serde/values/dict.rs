use std::collections::BTreeMap;

use serde::Serialize;
use tsify::Tsify;

use typst::foundations::Dict as TypstDict;

use crate::serde::values::Value;

#[derive(Serialize, Tsify)]
pub struct Dict(pub BTreeMap<String, Value>);

impl From<&TypstDict> for Dict {
    fn from(dict: &TypstDict) -> Self {
        let mut map = BTreeMap::new();
        for (key, value) in dict.iter() {
            map.insert(key.to_string(), Value::from(value));
        }
        Dict(map)
    }
}

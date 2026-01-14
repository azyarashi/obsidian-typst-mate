use std::collections::BTreeMap;

use serde::Serialize;
use tsify::Tsify;

use typst::foundations::Dict;

use crate::serde::values::ValueSer;

#[derive(Serialize, Tsify)]
pub struct DictSer(pub BTreeMap<String, ValueSer>);

impl From<&Dict> for DictSer {
    fn from(dict: &Dict) -> Self {
        let mut map = BTreeMap::new();
        for (key, value) in dict.iter() {
            map.insert(key.to_string(), ValueSer::from(value));
        }
        DictSer(map)
    }
}

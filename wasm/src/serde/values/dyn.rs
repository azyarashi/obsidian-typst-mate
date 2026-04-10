use serde::Serialize;
use tsify::Tsify;

use typst::foundations::Dynamic;

#[derive(Serialize, Tsify)]
pub struct DynSer {
    pub repr: String,
}

impl From<&Dynamic> for DynSer {
    fn from(v: &Dynamic) -> Self {
        DynSer {
            repr: format!("{:?}", v),
        }
    }
}

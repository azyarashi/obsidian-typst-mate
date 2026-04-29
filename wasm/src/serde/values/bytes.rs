use serde::Serialize;
use typst::foundations::Repr;
use tsify::Tsify;

use typst::foundations::Bytes as TypstBytes;

#[derive(Serialize, Tsify)]
pub struct Bytes {
    pub repr: String,
    pub length: usize,
}

impl From<&TypstBytes> for Bytes {
    fn from(bytes: &TypstBytes) -> Self {
        Bytes {
            repr: bytes.repr().to_string(),
            length: bytes.len(),
        }
    }
}

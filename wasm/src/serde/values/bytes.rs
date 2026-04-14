use serde::Serialize;
use tsify::Tsify;

use typst::foundations::Bytes as TypstBytes;

#[derive(Serialize, Tsify)]
pub struct Bytes {
    pub length: usize,
}

impl From<&TypstBytes> for Bytes {
    fn from(bytes: &TypstBytes) -> Self {
        Bytes {
            length: bytes.len(),
        }
    }
}

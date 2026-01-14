use serde::Serialize;
use tsify::Tsify;

use typst::foundations::Bytes;

#[derive(Serialize, Tsify)]
pub struct BytesSer {
    pub length: usize,
}

impl From<&Bytes> for BytesSer {
    fn from(bytes: &Bytes) -> Self {
        BytesSer {
            length: bytes.len(),
        }
    }
}

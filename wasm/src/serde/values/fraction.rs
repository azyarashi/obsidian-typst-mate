use serde::Serialize;
use tsify::Tsify;

use typst::{foundations::Repr, layout::Fr};

// TODO
#[derive(Serialize, Tsify)]
pub struct FrSer {
    pub repr: String,
    pub numerator: f64,
    pub denominator: f64,
    pub decimal_value: f64,
    pub is_whole: bool,
}

impl From<&Fr> for FrSer {
    fn from(fr: &Fr) -> Self {
        let numerator = fr.get() as f64;
        let denominator = 1.0;
        let decimal_value = numerator / denominator;

        FrSer {
            repr: fr.repr().to_string(),
            numerator,
            denominator,
            decimal_value,
            is_whole: (numerator % denominator) == 0.0,
        }
    }
}

use serde::Serialize;
use tsify::Tsify;

use typst::foundations::{Decimal, Repr};

// TODO
#[derive(Serialize, Tsify)]
pub struct DecimalSer {
    pub repr: String,
    pub value: f64,
    pub integer_part: i64,
    pub fractional_part: f64,
    pub is_integer: bool,
}

impl From<&Decimal> for DecimalSer {
    fn from(decimal: &Decimal) -> Self {
        let value_str = decimal.repr().to_string();
        let value = value_str.parse::<f64>().unwrap_or(0.0);
        let integer_part = value.trunc() as i64;
        let fractional_part = value.fract();

        DecimalSer {
            repr: decimal.repr().to_string(),
            value,
            integer_part,
            fractional_part,
            is_integer: fractional_part == 0.0,
        }
    }
}

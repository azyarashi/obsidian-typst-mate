use serde::Serialize;
use typst::foundations::Repr;
use tsify::Tsify;

use typst::foundations::Datetime as TypstDatetime;

#[derive(Serialize, Tsify)]
pub struct Datetime {
    pub repr: String,
    pub year: i32,
    pub month: u8,
    pub day: u8,

    pub hour: u8,
    pub minute: u8,
    pub second: u8,

    pub weekday: String,
}

impl From<&TypstDatetime> for Datetime {
    fn from(datetime: &TypstDatetime) -> Self {
        Datetime {
            repr: datetime.repr().to_string(),
            year: datetime.year().unwrap_or(0),
            month: datetime.month().unwrap_or(0),
            day: datetime.day().unwrap_or(0),

            hour: datetime.hour().unwrap_or(0),
            minute: datetime.minute().unwrap_or(0),
            second: datetime.second().unwrap_or(0),

            weekday: datetime
                .weekday()
                .map(|w| w.to_string())
                .unwrap_or_default(),
        }
    }
}

use serde::Serialize;
use tsify::Tsify;

use typst::foundations::Datetime;

#[derive(Serialize, Tsify)]
pub struct DatetimeSer {
    pub year: i32,
    pub month: u8,
    pub day: u8,

    pub hour: u8,
    pub minute: u8,
    pub second: u8,

    pub weekday: String,
}

impl From<&Datetime> for DatetimeSer {
    fn from(datetime: &Datetime) -> Self {
        DatetimeSer {
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

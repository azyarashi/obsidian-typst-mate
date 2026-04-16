use serde::Serialize;
use tsify::Tsify;

use typst::foundations::Duration as TypstDuration;

#[derive(Serialize, Tsify)]
pub struct DurationValue {
    pub seconds: f64,
    pub minutes: f64,
    pub hours: f64,

    pub days: f64,
    pub weeks: f64,
}

impl From<&TypstDuration> for DurationValue {
    fn from(duration: &TypstDuration) -> Self {
        DurationValue {
            seconds: duration.seconds(),
            minutes: duration.minutes(),
            hours: duration.hours(),

            days: duration.days(),
            weeks: duration.weeks(),
        }
    }
}

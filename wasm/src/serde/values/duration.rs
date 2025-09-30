use serde::Serialize;
use tsify::Tsify;

use typst::foundations::Duration;

#[derive(Serialize, Tsify)]
pub struct DurationSer {
    pub seconds: f64,
    pub minutes: f64,
    pub hours: f64,

    pub days: f64,
    pub weeks: f64,
}

impl From<&Duration> for DurationSer {
    fn from(duration: &Duration) -> Self {
        DurationSer {
            seconds: duration.seconds(),
            minutes: duration.minutes(),
            hours: duration.hours(),

            days: duration.days(),
            weeks: duration.weeks(),
        }
    }
}

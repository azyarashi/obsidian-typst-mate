use serde::Serialize;
use tsify::Tsify;

use typst::foundations::Duration as TypstDuration;

#[derive(Serialize, Tsify)]
pub struct Duration {
    pub seconds: f64,
    pub minutes: f64,
    pub hours: f64,

    pub days: f64,
    pub weeks: f64,
}

impl From<&TypstDuration> for Duration {
    fn from(duration: &TypstDuration) -> Self {
        Duration {
            seconds: duration.seconds(),
            minutes: duration.minutes(),
            hours: duration.hours(),

            days: duration.days(),
            weeks: duration.weeks(),
        }
    }
}

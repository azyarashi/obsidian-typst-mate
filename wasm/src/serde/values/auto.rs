use serde::Serialize;
use tsify::Tsify;

#[derive(Serialize, Tsify)]
pub struct Auto {
    pub repr: String,
}

impl Default for Auto {
    fn default() -> Self {
        Auto {
            repr: "auto".to_string(),
        }
    }
}

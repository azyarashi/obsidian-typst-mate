use serde::Serialize;
use tsify::Tsify;

#[derive(Serialize, Tsify)]
pub struct None {
    pub repr: String,
}

impl Default for None {
    fn default() -> Self {
        None {
            repr: "none".to_string(),
        }
    }
}

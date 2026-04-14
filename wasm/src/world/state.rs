use std::sync::atomic::AtomicBool;

pub static PENDING: AtomicBool = AtomicBool::new(false);

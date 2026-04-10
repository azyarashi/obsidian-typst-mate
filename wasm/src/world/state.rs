use std::sync::Mutex;
use std::sync::atomic::AtomicBool;
use send_wrapper::SendWrapper;

pub static CALL_OBSIDIAN: Mutex<Option<SendWrapper<js_sys::Function>>> = Mutex::new(None);
pub static PENDING: AtomicBool = AtomicBool::new(false);

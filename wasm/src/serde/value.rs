use typst::ecow::EcoVec;
use typst::foundations::{Array, Dict, Value};
use wasm_bindgen::JsValue;

pub fn js_to_value(js: JsValue) -> Value {
    if js.is_null() || js.is_undefined() {
        return Value::None;
    }
    if let Some(b) = js.as_bool() {
        return Value::Bool(b);
    }
    if let Some(n) = js.as_f64() {
        return Value::Float(n);
    }
    if let Some(s) = js.as_string() {
        return Value::Str(s.into());
    }
    if js.is_array() {
        let arr = js_sys::Array::from(&js);
        let mut results = EcoVec::new();
        for i in 0..arr.length() {
            results.push(js_to_value(arr.get(i)));
        }
        return Value::Array(Array::from(results));
    }
    if js.is_function() {
        return Value::Str("<function>".into());
    }
    if js.is_object() {
        let mut dict = Dict::new();
        if let Ok(keys) = js_sys::Reflect::own_keys(&js) {
            for i in 0..keys.length() {
                let key = keys.get(i);
                if let Some(key_str) = key.as_string() {
                    let val = js_sys::Reflect::get(&js, &key).unwrap_or(JsValue::UNDEFINED);
                    dict.insert(key_str.into(), js_to_value(val));
                }
            }
        }
        return Value::Dict(dict);
    }
    Value::None
}

pub fn value_to_js(val: Value) -> JsValue {
    match val {
        Value::None => JsValue::NULL,
        Value::Bool(b) => JsValue::from_bool(b),
        Value::Int(i) => JsValue::from_f64(i as f64),
        Value::Float(f) => JsValue::from_f64(f),
        Value::Str(s) => JsValue::from_str(s.as_str()),
        Value::Bytes(b) => {
            let u8arr = js_sys::Uint8Array::new_with_length(b.len() as u32);
            u8arr.copy_from(&b);
            u8arr.into()
        }
        Value::Array(arr) => {
            let js_arr = js_sys::Array::new();
            for v in arr {
                js_arr.push(&value_to_js(v));
            }
            js_arr.into()
        }
        Value::Dict(dict) => {
            let obj = js_sys::Object::new();
            for (k, v) in dict {
                js_sys::Reflect::set(&obj, &JsValue::from_str(k.as_str()), &value_to_js(v)).ok();
            }
            obj.into()
        }
        _ => JsValue::UNDEFINED,
    }
}

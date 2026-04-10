use std::sync::atomic::Ordering;
use wasm_bindgen::JsValue;

use typst::diag::SourceResult;
use typst::ecow::EcoString;
use typst::foundations::{Args, Func, Module, Scope, Value, func};
use typst::syntax::Span;
use typst::{Library, World};

use super::super::state::{CALL_OBSIDIAN, PENDING};
use crate::serde::value::{js_to_value, value_to_js};

pub fn setup(library: &mut Library) {
    let mut obsidian_scope = Scope::new();
    obsidian_scope.define_func::<obsidian_call>();
    obsidian_scope.define_func::<obsidian_get>();
    obsidian_scope.define_func::<obsidian_attr>();

    let obsidian_module = Module::new("obsidian", obsidian_scope);
    library
        .global
        .scope_mut()
        .define("obsidian", obsidian_module);
}

pub(crate) fn obsidian_call_internal(name: EcoString, args: Option<Vec<Value>>) -> SourceResult<Value> {
    let call_js = CALL_OBSIDIAN.lock().unwrap();
    if let Some(f) = call_js.as_ref() {
        let js_args = if let Some(a) = args {
            let arr = js_sys::Array::new();
            for arg in a {
                arr.push(&value_to_js(arg));
            }
            JsValue::from(arr)
        } else {
            JsValue::NULL
        };

        match f.call2(&JsValue::NULL, &JsValue::from_str(name.as_str()), &js_args) {
            Ok(v) => Ok(js_to_value(v)),
            Err(e) => {
                if let Some(code) = e.as_f64() {
                    if code == 0.0 {
                        PENDING.store(true, Ordering::Relaxed);
                        return Ok(Value::None);
                    }
                }
                Err(typst::ecow::eco_vec![typst::diag::SourceDiagnostic::error(
                    Span::detached(),
                    format!("Obsidian call failed: {:?}", e),
                )])
            }
        }
    } else {
        Err(typst::ecow::eco_vec![typst::diag::SourceDiagnostic::error(
            Span::detached(),
            "Obsidian call function not initialized".to_string(),
        )])
    }
}

/// ```example
/// #obsidian.call("app.vault.getName")
/// ```
#[func(name = "call")]
fn obsidian_call(args: &mut Args) -> SourceResult<Value> {
    let name: EcoString = args.expect("function name")?;
    let mut call_args = Vec::new();
    while let Some(arg) = args.eat::<Value>()? {
        call_args.push(arg);
    }
    obsidian_call_internal(name, Some(call_args))
}

/// ```example
/// #let getName = obsidian.get("app.vault.getName")
/// ```
#[func(name = "get")]
fn obsidian_get(engine: &mut typst::engine::Engine, name: EcoString) -> SourceResult<Value> {
    let obsidian_val = engine
        .world
        .library()
        .global
        .scope()
        .get("obsidian")
        .unwrap()
        .read()
        .clone();
    let call_func = obsidian_val
        .cast::<Module>()
        .unwrap()
        .field("call", ())
        .map_err(|e| {
            typst::ecow::eco_vec![typst::diag::SourceDiagnostic::error(Span::detached(), e)]
        })?
        .clone()
        .cast::<Func>()
        .unwrap();

    let mut curried_args = Args::new(Span::detached(), [Value::Str(name.into())]);
    Ok(Value::Func(call_func.with(&mut curried_args)))
}

/// ```example
/// #obsidian.attr("app.vault.name")
/// ```
#[func(name = "attr")]
fn obsidian_attr(name: EcoString) -> SourceResult<Value> {
    obsidian_call_internal(name, None)
}

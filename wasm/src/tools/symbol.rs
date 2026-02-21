use serde::{Deserialize, Serialize};
use std::{collections::BTreeMap, fs, path::PathBuf};
use typst::ecow::EcoString;
use typst::foundations::eco_format;
use unicode_names2::name as unicode_name;

use typst::LibraryExt;
use typst::foundations::{Module, Value};
#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(non_snake_case)]
pub struct SymbolData {
    pub sym: String,
    pub unicName: String,
    pub name: String,
    pub shorthand: Option<String>,
    pub mathClass: String,
    pub latexName: String,
}

fn main() {
    let out: PathBuf = "../src/data/symbols.json".into();

    let lib = typst_library::Library::builder().build();

    let sym_binding = lib
        .global
        .scope()
        .get("sym")
        .expect("module `sym` not found");
    let Value::Module(sym_mod) = sym_binding.read() else {
        panic!("sym is not a module")
    };

    let mut all = Vec::new();
    all.extend(collect_symbols_from_module(&sym_mod, "sym"));
    all.extend(get_ops());

    let mut json_map: BTreeMap<String, SymbolData> = BTreeMap::new();
    for s in all {
        if let Some(sh) = &s.shorthand {
            json_map.insert(sh.clone(), s.clone());
        }
        json_map.insert(s.name.clone(), s);
    }

    fs::create_dir_all(out.parent().unwrap()).unwrap();
    fs::write(&out, serde_json::to_string(&json_map).unwrap()).unwrap();
    eprintln!("wrote {}", out.display());
}

fn collect_symbols_from_module(module: &Module, _kind: &str) -> Vec<SymbolData> {
    let mut out = Vec::new();

    for (base_name, binding) in module.scope().iter() {
        let v: &Value = binding.read();

        let Value::Symbol(sym_val) = v else { continue };

        for (variant, value, _deprecation_message) in sym_val.variants() {
            let full_name: EcoString = if variant.is_empty() {
                base_name.clone().into()
            } else {
                eco_format!("{}.{}", base_name, variant.as_str())
            };

            let ch = value.chars().next().expect("symbol value is empty");
            let unic_name = unicode_name(ch).map(|n| n.to_string()).unwrap_or_default();

            let shorthand: Option<String> = None;
            let latex_name = String::new();
            let math_class = String::new();

            out.push(SymbolData {
                sym: ch.to_string(),
                unicName: unic_name,
                name: full_name.to_string(),
                shorthand,
                mathClass: math_class,
                latexName: latex_name,
            });
        }
    }

    out
}

fn get_ops() -> Vec<SymbolData> {
    let mut ops = Vec::new();

    let difs = ["dif", "Dif"];
    for name in difs {
        ops.push(SymbolData {
            sym: name.to_string(),
            unicName: String::new(),
            name: name.to_string(),
            shorthand: None,
            mathClass: "Op".to_string(),
            latexName: String::new(),
        });
    }

    let limits = [
        "det", "gcd", "lcm", "inf", "lim", "liminf", "limsup", "max", "min", "Pr", "sup",
    ];
    for name in limits {
        ops.push(SymbolData {
            sym: name.to_string(),
            unicName: String::new(),
            name: name.to_string(),
            shorthand: None,
            mathClass: "op".to_string(),
            latexName: String::new(),
        });
    }

    let others = [
        "arccos", "arcsin", "arctan", "arg", "cos", "cosh", "cot", "coth", "csc", "csch", "ctg",
        "deg", "dim", "exp", "hom", "id", "im", "inf", "ker", "lg", "ln", "log", "mod", "sec",
        "sech", "sin", "sinc", "sinh", "tan", "tanh", "tg", "tr",
    ];
    for name in others {
        ops.push(SymbolData {
            sym: name.to_string(),
            unicName: String::new(),
            name: name.to_string(),
            shorthand: None,
            mathClass: "op".to_string(),
            latexName: String::new(),
        });
    }

    let spacings = [
        ("thin", "thin (1/6 em)"),
        ("med", "medium (2/9 em)"),
        ("thick", "thick (5/18 em)"),
        ("quad", "quad (1 em)"),
        ("wide", "wide (2 em)"),
    ];
    for (name, desc) in spacings {
        ops.push(SymbolData {
            sym: name.to_string(),
            unicName: String::new(),
            name: desc.to_string(),
            shorthand: None,
            mathClass: "spacing".to_string(),
            latexName: String::new(),
        });
    }

    ops
}

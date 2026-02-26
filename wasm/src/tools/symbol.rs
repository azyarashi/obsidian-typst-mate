use serde::{Deserialize, Serialize};
use std::{collections::HashMap, fs, path::PathBuf};
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

const OP_LATEX: &[(&str, &str)] = &[
    ("arccos", "arccos"),
    ("arcsin", "arcsin"),
    ("arctan", "arctan"),
    ("arg", "arg"),
    ("cos", "cos"),
    ("cosh", "cosh"),
    ("cot", "cot"),
    ("coth", "coth"),
    ("csc", "csc"),
    ("csch", "operatorname{csch}"),
    ("ctg", "ctg"),
    ("deg", "deg"),
    ("det", "det"),
    ("dif", "partial"),
    ("Dif", "partial"),
    ("dim", "dim"),
    ("exp", "exp"),
    ("gcd", "gcd"),
    ("hom", "hom"),
    ("id", "operatorname{id}"),
    ("im", "operatorname{im}"),
    ("inf", "inf"),
    ("ker", "ker"),
    ("lcm", "operatorname{lcm}"),
    ("lg", "lg"),
    ("lim", "lim"),
    ("liminf", "liminf"),
    ("limsup", "limsup"),
    ("ln", "ln"),
    ("log", "log"),
    ("max", "max"),
    ("min", "min"),
    ("mod", "bmod"),
    ("Pr", "Pr"),
    ("sec", "sec"),
    ("sech", "operatorname{sech}"),
    ("sin", "sin"),
    ("sinc", "operatorname{sinc}"),
    ("sinh", "sinh"),
    ("sup", "sup"),
    ("tan", "tan"),
    ("tanh", "tanh"),
    ("tg", "operatorname{tg}"),
    ("tr", "operatorname{tr}"),
];

const LIMIT_OPS: &[&str] = &[
    "det", "gcd", "lcm", "inf", "lim", "liminf", "limsup", "max", "min", "Pr", "sup",
];

const DIF_OPS: &[&str] = &["dif", "Dif"];

const SPACINGS: &[(&str, &str)] = &[
    ("thin", "thin (1/6 em)"),
    ("med", "medium (2/9 em)"),
    ("thick", "thick (5/18 em)"),
    ("quad", "quad (1 em)"),
    ("wide", "wide (2 em)"),
];

fn main() {
    // 対象は sym モジュール内の symbol 型の値と math モジュール内の content 型の値
    let out: PathBuf = "../src/data/symbols.json".into();

    let lib = typst_library::Library::builder().build();

    let sym_binding = lib
        .global
        .scope()
        .get("sym")
        .expect("module `sym` not found");
    let Value::Module(sym_mod) = sym_binding.read() else {
        panic!("`sym` is not a module")
    };

    let latex_by_char = parse_unicode_math_table();
    let op_latex: HashMap<&str, &str> = OP_LATEX.iter().copied().collect();

    let mut all = Vec::new();
    all.extend(collect_symbols_from_module(&sym_mod, &latex_by_char));
    all.extend(build_op_entries(&op_latex));

    let mut json_map: std::collections::BTreeMap<String, SymbolData> =
        std::collections::BTreeMap::new();
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

fn collect_symbols_from_module(
    module: &Module,
    latex_by_char: &HashMap<char, String>,
) -> Vec<SymbolData> {
    let mut out = Vec::new();

    for (base_name, binding) in module.scope().iter() {
        let Value::Symbol(sym_val) = binding.read() else {
            continue;
        };

        for (variant, value, _deprecation_message) in sym_val.variants() {
            let full_name: EcoString = if variant.is_empty() {
                base_name.clone().into()
            } else {
                eco_format!("{}.{}", base_name, variant.as_str())
            };

            let ch = value.chars().next().expect("symbol value is empty");
            let unic_name = unicode_name(ch).map(|n| n.to_string()).unwrap_or_default();

            let value_char = value.parse::<char>().ok();
            let shorthand = |list: &[(&'static str, char)]| {
                value_char.and_then(|c| list.iter().copied().find(|&(_, x)| x == c).map(|(s, _)| s))
            };

            let math_shorthand = shorthand(typst::syntax::ast::MathShorthand::LIST);
            let markup_shorthand = shorthand(typst::syntax::ast::Shorthand::LIST);
            let final_shorthand = math_shorthand.or(markup_shorthand).map(|s| s.to_string());
            let math_class = format_math_class(ch);
            let latex_name = latex_by_char.get(&ch).cloned().unwrap_or_default();

            out.push(SymbolData {
                sym: ch.to_string(),
                unicName: unic_name,
                name: full_name.to_string(),
                shorthand: final_shorthand,
                mathClass: math_class,
                latexName: latex_name,
            });
        }
    }

    out
}

fn format_math_class(ch: char) -> String {
    typst::utils::default_math_class(ch)
        .map(|c| match c {
            unicode_math_class::MathClass::Normal => "Normal",
            unicode_math_class::MathClass::Alphabetic => "Alphabetic",
            unicode_math_class::MathClass::Binary => "Binary",
            unicode_math_class::MathClass::Closing => "Closing",
            unicode_math_class::MathClass::Diacritic => "Diacritic",
            unicode_math_class::MathClass::Fence => "Fence",
            unicode_math_class::MathClass::GlyphPart => "Glyph Part",
            unicode_math_class::MathClass::Large => "Large",
            unicode_math_class::MathClass::Opening => "Opening",
            unicode_math_class::MathClass::Punctuation => "Punctuation",
            unicode_math_class::MathClass::Relation => "Relation",
            unicode_math_class::MathClass::Space => "Space",
            unicode_math_class::MathClass::Unary => "Unary",
            unicode_math_class::MathClass::Vary => "Vary",
            unicode_math_class::MathClass::Special => "Special",
        })
        .unwrap_or("")
        .to_string()
}

fn build_op_entries(op_latex: &HashMap<&str, &str>) -> Vec<SymbolData> {
    let mut ops = Vec::new();
    let mut seen = std::collections::HashSet::new();

    let special: std::collections::HashSet<&str> = DIF_OPS
        .iter()
        .chain(LIMIT_OPS.iter())
        .chain(SPACINGS.iter().map(|(name, _)| name))
        .copied()
        .collect();

    for &name in DIF_OPS {
        seen.insert(name);
        ops.push(make_op(name, "op", op_latex));
    }
    for &name in LIMIT_OPS {
        if seen.insert(name) {
            ops.push(make_op(name, "op", op_latex));
        }
    }

    for &(name, _) in OP_LATEX {
        if special.contains(name) {
            continue;
        }
        if seen.insert(name) {
            ops.push(make_op(name, "op", op_latex));
        }
    }

    for &(name, desc) in SPACINGS {
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

fn make_op(name: &str, math_class: &str, op_latex: &HashMap<&str, &str>) -> SymbolData {
    SymbolData {
        sym: name.to_string(),
        unicName: String::new(),
        name: name.to_string(),
        shorthand: None,
        mathClass: math_class.to_string(),
        latexName: op_latex.get(name).unwrap_or(&"").to_string(),
    }
}

fn parse_unicode_math_table() -> HashMap<char, String> {
    let table_path = concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/src/tools/unicode-math-table.tex"
    );
    let content = fs::read_to_string(table_path).expect("failed to read unicode-math-table.tex");

    let mut map: HashMap<char, String> = HashMap::new();

    for line in content.lines() {
        let line = line.trim();

        // \UnicodeMathSymbol{"XXXXX}{\cmdname }{...}{...}
        let Some(rest) = line.strip_prefix("\\UnicodeMathSymbol{") else {
            continue;
        };

        // コードポイント
        let Some(cp_end) = rest.find('}') else {
            continue;
        };
        let cp_str = rest[..cp_end].trim_start_matches('"');
        let Ok(codepoint) = u32::from_str_radix(cp_str, 16) else {
            continue;
        };
        let Some(ch) = char::from_u32(codepoint) else {
            continue;
        };

        // コマンド名
        let rest = &rest[cp_end + 1..];
        let Some(cmd_start) = rest.find('{') else {
            continue;
        };
        let cmd_body = &rest[cmd_start + 1..];
        let Some(cmd_end) = cmd_body.find('}') else {
            continue;
        };
        let cmd = cmd_body[..cmd_end].trim().trim_start_matches('\\');

        map.entry(ch).or_insert_with(|| cmd.to_string());
    }

    map
}

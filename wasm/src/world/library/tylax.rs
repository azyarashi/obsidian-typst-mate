use tylax::{latex_document_to_typst, latex_to_typst, typst_document_to_latex, typst_to_latex};
use typst::Library;
use typst::diag::SourceResult;
use typst::ecow::EcoString;
use typst::foundations::{Args, Module, Scope, Value, func};

pub fn setup(library: &mut Library) {
    let mut tylax_scope = Scope::new();
    tylax_scope.define_func::<latex_to_typst_func>();
    tylax_scope.define_func::<typst_to_latex_func>();

    let tylax_module = Module::new("tylax", tylax_scope);
    library.global.scope_mut().define("tylax", tylax_module);
}

/// ```example
/// #tylax.l2t("\frac{1}{2} + \alpha", full: false)
/// ```
#[func(name = "l2t")]
fn latex_to_typst_func(args: &mut Args) -> SourceResult<Value> {
    let code: EcoString = args.expect("latex code")?;
    let full: bool = args.named("full")?.unwrap_or(false);

    let result = if full {
        latex_document_to_typst(code.as_str())
    } else {
        latex_to_typst(code.as_str())
    };

    Ok(Value::Str(result.into()))
}

/// ```example
/// #tylax.t2l("1/2 + alpha", full: false)
/// ```
#[func(name = "t2l")]
fn typst_to_latex_func(args: &mut Args) -> SourceResult<Value> {
    let code: EcoString = args.expect("typst code")?;
    let full: bool = args.named("full")?.unwrap_or(false);

    let result = if full {
        typst_document_to_latex(code.as_str())
    } else {
        typst_to_latex(code.as_str())
    };

    Ok(Value::Str(result.into()))
}

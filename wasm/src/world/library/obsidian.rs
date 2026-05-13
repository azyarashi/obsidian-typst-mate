use typst::diag::SourceResult;
use typst::ecow::EcoString;
use typst::foundations::{Args, Content, Module, NativeElement, Scope, Value, func};
use typst::model::{Destination, LinkElem, Url};
use typst::text::{TextElem, UnderlineElem};

pub fn get_module() -> Module {
    let mut scope = Scope::new();
    scope.define_func::<wikilink>();

    let module = Module::new("obsidian", scope);
    module
}

/// # Example
/// ```example
/// #typstmate.wikilink("MyFile#Header")
/// #typstmate.wikilink("MyFile#Header")[Display Content]
/// ```
#[func]
fn wikilink(args: &mut Args) -> SourceResult<Value> {
    let linktext: EcoString = args.expect("linktext")?;
    let body: Option<Content> = args.eat()?;

    let encoded_target: String = js_sys::encode_uri_component(linktext.as_str()).into();
    let wikilink_uri = format!("obsidian://openLinkText?linktext={encoded_target}");

    let content = if let Some(body) = body {
        body
    } else {
        UnderlineElem::new(TextElem::new(linktext.into()).pack()).pack()
    };

    Ok(Value::Content(
        LinkElem::new(
            Destination::Url(Url::new(wikilink_uri).unwrap()).into(),
            content,
        )
        .pack(),
    ))
}

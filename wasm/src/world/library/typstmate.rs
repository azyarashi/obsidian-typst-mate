use typst::Library;
use typst::diag::SourceResult;
use typst::ecow::EcoString;
use typst::foundations::{Args, Content, Module, NativeElement, Scope, Value, func};
use typst::model::{Destination, LinkElem, Url};
use typst::text::{TextElem, UnderlineElem};

use super::obsidian::obsidian_call_internal;

pub fn setup(library: &mut Library) {
    let mut typstmate_scope = Scope::new();
    typstmate_scope.define_func::<wikilink>();

    let typstmate_module = Module::new("typstmate", typstmate_scope);
    library
        .global
        .scope_mut()
        .define("typstmate", typstmate_module);
}

/// ## Implementation
/// ```typ
/// #import "@preview/percencode:0.1.0": percent-encode
///
/// #let wikilink(linktext, ..body) = {
///   let body = body.pos().at(0, default: none)
///   let wikilink-uri = percent-encode("obsidian://open?file=" + linktext)
///
///   link(
///     wikilink-uri,
///     if (body == none) { underline(linktext) } else { body },
///   )
/// }
/// ```
///
/// ## Example
/// ```example
/// #typstmate.wikilink("MyFile#Header")
/// #typstmate.wikilink("MyFile#Header")[Display Content]
/// ```
#[func]
fn wikilink(args: &mut Args) -> SourceResult<Value> {
    let linktext: EcoString = args.expect("linktext")?;
    let body: Option<Content> = args.eat()?;

    let res = obsidian_call_internal(
        "parseLinktext".into(),
        Some(vec![Value::Str(linktext.clone().into())]),
    )?;
    let (path, subpath) = if let Value::Dict(dict) = res {
        let path = dict
            .at("path".into(), None)
            .ok()
            .and_then(|v| v.cast::<EcoString>().ok())
            .unwrap_or_default();
        let subpath = dict
            .at("subpath".into(), None)
            .ok()
            .and_then(|v| v.cast::<EcoString>().ok())
            .unwrap_or_default();
        (path, subpath)
    } else {
        ("".into(), "".into())
    };

    let target = format!("{}{}", path, subpath);
    let encoded_target: String = js_sys::encode_uri_component(target.as_str()).into();
    let wikilink_uri = format!("obsidian://open?file={}", encoded_target);

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

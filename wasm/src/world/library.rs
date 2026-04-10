use std::str::FromStr;

use typst::foundations::{
    Content, Element, NativeElement, Property, Recipe, Selector, Smart, Style, Styles,
    Transformation, Value, func,
};
use typst::layout::{Abs, BoxElem, Em, Length, Rel, Sides};
use typst::syntax::Span;
use typst::text::{FontList, SmallcapsElem, TextElem};
use typst::visualize::{Color, Paint, Stroke};
use typst::{Feature, Features, Library, LibraryExt};

pub mod obsidian;
pub mod tylax;
pub mod typstmate;

pub fn build_library(fontsize: f64) -> Library {
    let mut library = Library::builder()
        .with_features(Features::from_iter([Feature::A11yExtras, Feature::Html]))
        .build();

    // ライブラリのグローバル・数学定義
    // #let fontsize = (16 / 1.25) * 1pt
    let fontsize_abs = Abs::pt(fontsize / 1.25);
    let fontsize_val = Value::Length(Length::from(fontsize_abs));
    library.global.scope_mut().define("fontsize", fontsize_val);

    // #let CURSOR = text(fill: rgb("#44f"))[▮]
    let cursor_elem = TextElem::new("▮".into());
    let cursor_paint = Paint::Solid(Color::from_str("#44f").unwrap());
    let cursor_style = Style::Property(Property::new(TextElem::fill, cursor_paint));
    let cursor_val = Value::Content(Content::new(cursor_elem).styled(cursor_style));
    library.global.scope_mut().define("CURSOR", cursor_val);

    library.global.scope_mut().define_func::<boxed>();
    library.math.scope_mut().define_func::<boxed>();

    obsidian::setup(&mut library);
    typstmate::setup(&mut library);
    tylax::setup(&mut library);

    // ライブラリのスタイル定義
    // #show smallcaps: set text(font: "")
    // See https://github.com/azyarashi/obsidian-typst-mate/issues/21 .
    let font_list = FontList(Vec::new());
    let text_style = Style::Property(Property::new(TextElem::font, font_list));
    let selector = Selector::Elem(Element::of::<SmallcapsElem>(), None);
    let transformation = Transformation::Style(Styles::from(text_style));
    let recipe = Style::Recipe(Recipe::new(
        Some(selector),
        transformation,
        Span::detached(),
    ));
    library.styles.push(recipe);

    library
}

/// ```typc
/// let boxed(it) = box(
///   if type(it) == content {it} else [#it],
///   inset: 0.25em,
///   stroke: black + 1pt
/// )
/// ```
#[func]
fn boxed(it: Value) -> Content {
    let content = if let Value::Content(c) = it {
        c
    } else {
        it.display()
    };

    let inset = Rel::from(Length::from(Em::new(0.25)));
    let inset_sides = Sides::splat(Some(inset));

    let paint = Paint::Solid(Color::BLACK);
    let thickness = Length::from(Abs::pt(1.0));
    let stroke = Stroke {
        paint: Smart::Custom(paint),
        thickness: Smart::Custom(thickness),
        ..Default::default()
    };
    let stroke_sides = Sides::splat(Some(Some(stroke)));

    BoxElem::new()
        .with_body(Some(content))
        .with_inset(inset_sides)
        .with_stroke(stroke_sides)
        .pack()
}

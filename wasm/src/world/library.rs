use typst::foundations::{
    Element, Module, Property, Recipe, Scope, Selector, Style, Styles, Transformation,
};
use typst::syntax::Span;
use typst::text::{FontList, SmallcapsElem, TextElem};
use typst::{Feature, Features, Library, LibraryExt};

mod latex;
mod obsidian;
mod tylax;

pub fn build_library() -> Library {
    let mut library = Library::builder()
        .with_features(Features::from_iter([Feature::A11yExtras, Feature::Html]))
        .build();

    // * global definitions
    let mut typstmate_scope = Scope::new();

    typstmate_scope.define("tylax", tylax::get_module());
    typstmate_scope.define("latex", latex::get_module());
    typstmate_scope.define("obsidian", obsidian::get_module());

    let typstmate_module = Module::new("typstmate", typstmate_scope);
    library
        .global
        .scope_mut()
        .define("_typstmate", typstmate_module);

    // * styles definitions
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

use typst::foundations::{Content, Module, NativeElement, Scope, Smart, Value, func};
use typst::layout::{Abs, BoxElem, Corners, Em, Length, Rel, Sides, Sizing};
use typst::visualize::{Color, Paint, Stroke};

pub fn get_module() -> Module {
    let mut scope = Scope::new();
    scope.define_func::<boxed>();

    let module = Module::new("latex", scope);
    module
}

/// # Implementation
/// ```typc
/// let boxed(body, ..box_arguments) = box(
///   if type(it) == content {it} else [#it],
///   inset: 0.25em,
///   stroke: black + 1pt,
///   ..box_arguments
/// )
/// ```
#[func]
fn boxed(args: &mut typst::foundations::Args) -> typst::diag::SourceResult<Content> {
    // * prepare BoxElem
    let body: Option<Value> = args.eat()?;
    let content = body.map(|v| {
        if let Value::Content(c) = v {
            c
        } else {
            v.display()
        }
    });
    let mut box_elem = BoxElem::new().with_body(content);

    // * apply default styles
    let default_inset = Rel::from(Length::from(Em::new(0.25)));
    let mut inset = Sides::splat(Some(default_inset));
    if let Some(user_inset) = args.named::<Sides<Option<Rel<Length>>>>("inset")? {
        inset = user_inset;
    }
    box_elem = box_elem.with_inset(inset);

    let default_paint = Paint::Solid(Color::BLACK);
    let default_thickness = Length::from(Abs::pt(1.0));
    let default_stroke = Stroke {
        paint: Smart::Custom(default_paint),
        thickness: Smart::Custom(default_thickness),
        ..Default::default()
    };
    let mut stroke = Sides::splat(Some(Some(default_stroke)));
    if let Some(user_stroke) = args.named::<Sides<Option<Option<Stroke>>>>("stroke")? {
        stroke = user_stroke;
    }
    box_elem = box_elem.with_stroke(stroke);

    // * apply other arguments
    if let Some(width) = args.named::<Sizing>("width")? {
        box_elem = box_elem.with_width(width);
    }
    if let Some(height) = args.named::<Smart<Rel<Length>>>("height")? {
        box_elem = box_elem.with_height(height);
    }
    if let Some(baseline) = args.named::<Rel<Length>>("baseline")? {
        box_elem = box_elem.with_baseline(baseline);
    }
    if let Some(fill) = args.named::<Option<Paint>>("fill")? {
        box_elem = box_elem.with_fill(fill);
    }
    if let Some(radius) = args.named::<Corners<Option<Rel<Length>>>>("radius")? {
        box_elem = box_elem.with_radius(radius);
    }
    if let Some(outset) = args.named::<Sides<Option<Rel<Length>>>>("outset")? {
        box_elem = box_elem.with_outset(outset);
    }
    if let Some(clip) = args.named::<bool>("clip")? {
        box_elem = box_elem.with_clip(clip);
    }

    Ok(box_elem.pack())
}

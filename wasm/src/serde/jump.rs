use serde::Serialize;
use tsify::Tsify;

use typst::World;
use typst::introspection::PagedPosition;
use typst_ide::Jump as TypstJump;

#[derive(Serialize, Tsify)]
#[serde(rename_all = "camelCase", tag = "type")]
pub enum Jump {
    File {
        package: Option<String>,
        path: String,
        pos: Option<usize>,
    },
    Url {
        url: String,
    },
    Position {
        page: usize,
        x: f64,
        y: f64,
    },
}

impl Jump {
    pub fn from_jump<W>(jump: &TypstJump, world: &W) -> Self
    where
        W: World,
    {
        match jump {
            TypstJump::File(id, pos) => {
                let package = match id.root() {
                    typst::syntax::VirtualRoot::Project => None,
                    typst::syntax::VirtualRoot::Package(spec) => Some(spec.to_string()),
                };
                let path = id.vpath().get_without_slash().to_string();

                let source = world.source(*id).unwrap();
                let pos = source.lines().byte_to_utf16(*pos).unwrap_or(0);

                Jump::File {
                    package,
                    path,
                    pos: Some(pos),
                }
            }
            TypstJump::Url(url) => Jump::Url {
                url: url.to_string(),
            },
            TypstJump::Position(pos) => Self::from_position(*pos),
        }
    }

    pub fn from_position(pos: PagedPosition) -> Self {
        PointPosition::from_position(pos)
    }
}

pub struct PointPosition;
impl PointPosition {
    pub fn from_position(pos: PagedPosition) -> Jump {
        Jump::Position {
            page: pos.page.get(),
            x: pos.point.x.to_pt(),
            y: pos.point.y.to_pt(),
        }
    }
}

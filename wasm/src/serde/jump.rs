use serde::Serialize;

use tsify::Tsify;
use typst::{World, syntax::VirtualRoot};
use typst_ide::Jump;

#[derive(Serialize, Tsify)]
#[serde(rename_all = "camelCase", tag = "type")]
pub enum JumpSer {
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

impl JumpSer {
    pub fn from_jump<W>(jump: &Jump, world: &W) -> Self
    where
        W: World,
    {
        match jump {
            Jump::File(id, pos) => {
                let package = match id.root() {
                    VirtualRoot::Package(spec) => Some(spec.to_string()),
                    _ => None,
                };
                let path = id.vpath().get_without_slash().to_string();

                let source = world.source(*id).unwrap();
                let pos = source.lines().byte_to_utf16(*pos).unwrap_or(0);

                JumpSer::File {
                    package,
                    path,
                    pos: Some(pos),
                }
            }
            Jump::Url(url) => JumpSer::Url {
                url: url.to_string(),
            },
            Jump::Position(pos) => JumpSer::Position {
                page: pos.page.into(),
                x: pos.point.x.to_pt(),
                y: pos.point.y.to_pt(),
            },
        }
    }
}

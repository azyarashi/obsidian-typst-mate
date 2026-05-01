use std::{num::NonZeroUsize, sync::LazyLock};
use typst::{
    foundations::Regex,
    layout::{Abs, Frame, FrameItem, PageRanges},
};
use typst_docs::link::resolve;

pub fn parse_page_ranges(s: &str) -> Option<PageRanges> {
    let mut ranges = Vec::new();
    for part in s.split(',') {
        let part = part.trim();
        if part.is_empty() {
            continue;
        }
        if part.contains('-') {
            let mut subparts = part.split('-');
            let start = subparts.next()?.trim();
            let end_part = subparts.next();

            let start = if start.is_empty() {
                None
            } else {
                Some(start.parse().ok()?)
            };
            let end = if let Some(e) = end_part {
                let e = e.trim();
                if e.is_empty() {
                    None
                } else {
                    Some(e.parse().ok()?)
                }
            } else {
                start
            };
            ranges.push(start..=end);
        } else {
            let val: NonZeroUsize = part.parse().ok()?;
            ranges.push(Some(val)..=Some(val));
        }
    }
    Some(PageRanges::new(ranges))
}

pub fn find_baseline(frame: &Frame, offset_y: Abs) -> Option<Abs> {
    let mut stack: Vec<(&Frame, Abs)> = Vec::with_capacity(16);
    stack.push((frame, offset_y));

    while let Some((cur, cur_offset)) = stack.pop() {
        for (pos, item) in cur.items().rev() {
            if let FrameItem::Text(text) = item {
                if text.text.as_bytes() == b"mnomnomno" {
                    return Some(cur_offset + pos.y);
                }
            } else if let FrameItem::Group(group) = item {
                stack.push((&group.frame, cur_offset + pos.y));
            }
        }
    }
    None
}

pub fn resolve_docs(docs: &str) -> String {
    static RE: LazyLock<Regex> =
        LazyLock::new(|| Regex::new(r#"\[([^\]]+)\]\(([^)\s]+)\)"#).unwrap());

    RE.replace_all(docs, |caps: &regex::Captures| {
        let label = &caps[1];
        let dest = &caps[2];

        let should_resolve =
            dest.starts_with('$') || dest.starts_with('#') || dest.starts_with("http");

        if !should_resolve {
            return caps[0].to_string();
        }

        let resolved =
            resolve(dest, "https://typst.app/docs/").unwrap_or_else(|_| dest.to_string());
        format!("[{label}]({resolved})")
    })
    .into_owned()
}

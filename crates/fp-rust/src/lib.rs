use std::fs;
use std::path::Path;

use once_cell::sync::OnceCell;
use tokio::runtime::Runtime;
use serde::{Serialize};
use fs_extra::copy_items;
use fs_extra::dir::CopyOptions;

use neon::prelude::*;

// Return a global tokio runtime or create one if it doesn't exist.
// Throws a JavaScript exception if the `Runtime` fails to create.
fn runtime<'a, C: Context<'a>>(cx: &mut C) -> NeonResult<&'static Runtime> {
    static RUNTIME: OnceCell<Runtime> = OnceCell::new();

    RUNTIME.get_or_try_init(|| Runtime::new().or_else(|err| cx.throw_error(err.to_string())))
}

fn hello(mut cx: FunctionContext) -> JsResult<JsString> {
    Ok(cx.string("hello node"))
}

fn echo(mut cx: FunctionContext) -> JsResult<JsString> {
    Ok(cx.argument(0)?)
}

fn gen_content_tree(mut cx: FunctionContext) -> JsResult<JsPromise> {
    let root_handle = cx.argument::<JsString>(0)?;
    let root = root_handle.value(&mut cx);

    let rt = runtime(&mut cx)?;
    let channel = cx.channel();
    let (deferred, promise) = cx.promise();

    rt.spawn(async move {
        let res = gen_content_tree_internal(root.as_str()).await;

        deferred.settle_with(&channel, move |mut cx| {
            match res {
                Ok(node) => {
                    let json = serde_json::to_string(&node).unwrap();
                    let n = cx.string(json);
                    return Ok(n);
                },
                Err(err) => {
                    return cx.throw_error(err.to_string());
                }
            }
        });
    });

    Ok(promise)
}

async fn gen_content_tree_internal(root: &str) -> Result<ContentTreeNode, Box<dyn std::error::Error + Send + Sync>> {
    let children = load_branch(std::path::Path::new(root))?;
    let children_total: usize = children.iter().map(|n| n.count).sum();
    let count = children.len() + children_total;
    let node = ContentTreeNode {
        name: String::from("content"),
        expanded: true,
        node_type: String::from("directory"),
        size: 0,
        children,
        count,
    };
    return Ok(node);
}

fn load_branch(root: &std::path::Path) -> Result<Vec<ContentTreeNode>, Box<dyn std::error::Error + Send + Sync>> {
    let mut nodes: Vec<ContentTreeNode> = Vec::new();
    let dir = std::fs::read_dir(root)?;
    for entry in dir {
        let entry = entry?;
        let path = entry.path();
        if path.is_dir() {
            let children = load_branch(path.as_path())?;
            let children_total: usize = children.iter().map(|n| n.count).sum();
            let count = children.len() + children_total;
            let node = ContentTreeNode {
                name: String::from(path.file_name().unwrap().to_str().unwrap()),
                expanded: true,
                node_type: String::from("directory"),
                children,
                size: 0,
                count
            };
            nodes.push(node);
        } else {
            let node = ContentTreeNode {
                name: String::from(path.file_name().unwrap().to_str().unwrap()),
                expanded: true,
                node_type: String::from("file"),
                children: Vec::new(),
                size: path.metadata()?.len(), 
                count: 0
            };
            nodes.push(node);
        }
    }
    return Ok(nodes);
}

fn copy_folder(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    let root_handle = cx.argument::<JsString>(0)?;
    let root = root_handle.value(&mut cx);
    let dest_handle = cx.argument::<JsString>(1)?;
    let dest = dest_handle.value(&mut cx);

    let root_path = Path::new(root.as_str());
    let dest_path = Path::new(dest.as_str());
    fs::create_dir_all(dest_path).unwrap();

    let options = CopyOptions::new(); //Initialize default values for CopyOptions

    // copy dir1 and file1.txt to target/dir1 and target/file1.txt
    let mut from_paths = Vec::new();
    from_paths.push(root_path);
    match copy_items(&from_paths, dest_path, &options) {
        Ok(_) => {
            Ok(cx.boolean(true))
        },
        Err(err) => {
            cx.throw_error(err.to_string())
        }
    }
}

#[neon::main]
fn main(mut cx: ModuleContext) -> NeonResult<()> {
    cx.export_function("hello", hello)?;
    cx.export_function("echo", echo)?;
    cx.export_function("genContentTree", gen_content_tree)?;
    cx.export_function("copyFolder", copy_folder)?;
    Ok(())
}

#[derive(Serialize)]
struct ContentTreeNode {
    name: String,
    expanded: bool,
    size: u64,
    #[serde(rename = "type")] 
    node_type: String,
    children: Vec<ContentTreeNode>,
    count: usize
}

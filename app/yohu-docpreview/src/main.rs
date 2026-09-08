#![windows_subsystem = "windows"]

fn main() {
    if let Err(e) = yohu_docpreview_lib::run() {
        eprintln!("fatal: {e}");
        std::process::exit(1);
    }
}

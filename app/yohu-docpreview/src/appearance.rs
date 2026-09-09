//! 窗口底色与系统主题：启动即按 settings.theme 上色，避免先闪深色/浅色。

use tauri::{webview::Color, Manager, Theme as WindowTheme, WebviewWindow};

use yohu_protocol::Theme;

/// `system` 不钉死 WebView 主题，否则 `prefers-color-scheme` 不再跟随 Windows。
pub fn window_theme_override(theme: Theme) -> Option<WindowTheme> {
    match theme {
        Theme::Light => Some(WindowTheme::Light),
        Theme::Dark => Some(WindowTheme::Dark),
        Theme::System => None,
    }
}

pub fn apply_to_window(window: &WebviewWindow, theme: Theme) {
    let system_dark = system_prefers_dark();
    let (r, g, b) = theme.window_fill_rgb(system_dark);
    let _ = window.set_background_color(Some(Color(r, g, b, 255)));
    let _ = window.set_theme(window_theme_override(theme));
}

pub fn apply_to_app(app: &tauri::AppHandle, theme: Theme) {
    if let Some(window) = app.get_webview_window("main") {
        apply_to_window(&window, theme);
    }
}

pub fn system_prefers_dark() -> bool {
    #[cfg(windows)]
    {
        windows_apps_use_light_theme() == Some(false)
    }
    #[cfg(not(windows))]
    {
        false
    }
}

#[cfg(windows)]
fn windows_apps_use_light_theme() -> Option<bool> {
    let subkey: Vec<u16> = "Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize\0"
        .encode_utf16()
        .collect();
    let value_name: Vec<u16> = "AppsUseLightTheme\0".encode_utf16().collect();
    let mut data: u32 = 1;
    let mut data_size = std::mem::size_of::<u32>() as u32;
    let mut data_type = 0u32;
    let status = unsafe {
        RegGetValueW(
            HKEY_CURRENT_USER,
            subkey.as_ptr(),
            value_name.as_ptr(),
            RRF_RT_REG_DWORD,
            &mut data_type,
            std::ptr::from_mut(&mut data).cast(),
            &mut data_size,
        )
    };
    if status == 0 {
        Some(data != 0)
    } else {
        None
    }
}

#[cfg(windows)]
type HKEY = isize;

#[cfg(windows)]
const HKEY_CURRENT_USER: HKEY = 0x8000_0001u32 as HKEY;

#[cfg(windows)]
const RRF_RT_REG_DWORD: u32 = 0x0000_0010;

#[cfg(windows)]
#[link(name = "advapi32")]
extern "system" {
    fn RegGetValueW(
        hkey: HKEY,
        lp_sub_key: *const u16,
        lp_value: *const u16,
        dw_flags: u32,
        pdw_type: *mut u32,
        pv_data: *mut core::ffi::c_void,
        pcb_data: *mut u32,
    ) -> i32;
}

#[cfg(test)]
mod tests {
    use tauri::Theme as WindowTheme;
    use yohu_protocol::Theme;

    use super::window_theme_override;

    #[test]
    fn fill_rgb_follows_resolved_appearance() {
        assert_eq!(Theme::System.window_fill_rgb(true), Theme::FILL_DARK);
        assert_eq!(Theme::System.window_fill_rgb(false), Theme::FILL_LIGHT);
    }

    #[test]
    fn system_leaves_webview_theme_to_os() {
        assert_eq!(window_theme_override(Theme::Light), Some(WindowTheme::Light));
        assert_eq!(window_theme_override(Theme::Dark), Some(WindowTheme::Dark));
        assert_eq!(window_theme_override(Theme::System), None);
    }
}

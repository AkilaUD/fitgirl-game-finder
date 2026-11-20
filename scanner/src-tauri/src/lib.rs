mod hardware;

use reqwest::blocking::Client;
use tauri::command;

#[command]
fn collect_hardware() -> Result<String, String> {
    hardware::collect_report_json()
}

#[command]
fn upload_report(api_base: String, pairing_code: String, report_json: String) -> Result<(), String> {
    let base = api_base.trim_end_matches('/');
    let url = format!("{base}/api/pc-scan/complete");
    let report: serde_json::Value =
        serde_json::from_str(&report_json).map_err(|e| format!("Invalid report JSON: {e}"))?;

    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?;

    let res = client
        .post(&url)
        .json(&serde_json::json!({
            "pairingCode": pairing_code,
            "report": report,
        }))
        .send()
        .map_err(|e| format!("Network error: {e}"))?;

    let status = res.status();
    let body = res.text().unwrap_or_default();
    if !status.is_success() {
        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&body) {
            if let Some(err) = parsed.get("error").and_then(|v| v.as_str()) {
                return Err(err.to_string());
            }
        }
        return Err(if body.is_empty() {
            format!("Upload failed (HTTP {status})")
        } else {
            body
        });
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![collect_hardware, upload_report])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
extern crate cpuid;

#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![get_model, get_thread_count])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

#[tauri::command]
fn get_model() -> String {
  match cpuid::identify() {
    Ok(info) => {
      return info.brand;
    },
    Err(err) => println!("cpuid error: {}", err)
  };
} 

#[tauri::command]
fn get_thread_count() -> u8 {
  match cpuid::identify() {
    Ok(info) => {
      return info.total_logical_cpus;
    },
    Err(err) => println!("cpuid error: {}", err)
  };
} 
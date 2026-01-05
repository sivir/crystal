use irelia::ws::{Subscriber, LcuWebSocket, types::EventKind};
use irelia::rest::LcuClient;
use std::{sync::Arc, time::Duration};
use tauri::{
	menu::{Menu, MenuItem},
	tray::TrayIconBuilder,
	AppHandle, Emitter, Manager, State
};
use tokio::sync::Mutex;

struct LcuEventHandler {
	app_handle: AppHandle,
	event_name: &'static str,
}

impl Subscriber for LcuEventHandler {
	fn on_event(&mut self, event: &irelia::ws::types::Event, _: &mut bool) {
		if self.event_name == "gameflow" {
			println!("gameflow event: {:?}", event.2.data["map"]["gameModeName"]);
		}
		let _ = self.app_handle.emit(self.event_name, event.2.clone());
	}
}

pub struct Data {
	pub lcu_client: Option<LcuClient<irelia::requests::RequestClientType>>,
	pub ws_client: Option<LcuWebSocket>,
	pub connected: bool,
}

impl Data {
	fn new() -> Self {
		Self {
			lcu_client: None,
			ws_client: None,
			connected: false,
		}
	}

	fn connect(&mut self, app_handle: AppHandle) -> Result<(), irelia::requests::Error> {
		self.lcu_client = Some(LcuClient::connect()?);

		let mut ws_client = LcuWebSocket::new();
		ws_client.subscribe(
			EventKind::json_api_event_callback("/lol-champ-select/v1/session"),
			LcuEventHandler { app_handle: app_handle.clone(), event_name: "champ-select" },
		);
		ws_client.subscribe(
			EventKind::json_api_event_callback("/lol-gameflow/v1/session"),
			LcuEventHandler { app_handle: app_handle.clone(), event_name: "gameflow" },
		);
		self.ws_client = Some(ws_client);

		Ok(())
	}
}

#[tauri::command]
async fn lcu_request(state: State<'_, Arc<Mutex<Data>>>, method: String, path: String, body: Option<serde_json::Value>) -> Result<serde_json::Value, String> {
	let state = state.lock().await;

	match &state.lcu_client {
		Some(client) => match method.to_lowercase().as_str() {
			"get" => client.get(&path).await.map_err(|e| e.to_string()),
			"post" => client.post(&path, body.unwrap()).await.map_err(|e| e.to_string()),
			"put" => client.put(&path, body.unwrap()).await.map_err(|e| e.to_string()),
			_ => Err("Invalid method".to_string()),
		},
		None => Err("Not connected to League client".to_string()),
	}
}

#[tauri::command]
async fn http_request(url: String) -> Result<serde_json::Value, String> {
	let response = reqwest::get(url).await.map_err(|e| e.to_string())?;
	let json = response.json().await.map_err(|e| e.to_string())?;
	Ok(json)
}

#[tauri::command]
async fn get_connected(state: State<'_, Arc<Mutex<Data>>>) -> Result<bool, String> {
	Ok(state.lock().await.connected)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
	tauri::Builder::default()
		.plugin(tauri_plugin_clipboard_manager::init())
		.plugin(tauri_plugin_store::Builder::new().build())
		.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
			let main_window = app.get_window("main").unwrap();
			main_window.show().unwrap();
			main_window.set_focus().unwrap();
		}))
		.setup(|app| {
			let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
			let show_i = MenuItem::with_id(app, "show", "Show/Hide", true, None::<&str>)?;
			let menu = Menu::with_items(app, &[&quit_i, &show_i])?;

			TrayIconBuilder::with_id("main")
				.on_menu_event(|app, event| match event.id.as_ref() {
					"quit" => {
						app.exit(0);
					}
					"show" => {
						let main_window = app.get_window("main").unwrap();
						if main_window.is_visible().unwrap() {
							main_window.hide().unwrap();
						} else {
							main_window.show().unwrap();
							main_window.set_focus().unwrap();
						}
					}
					_ => {
						println!("menu item {:?} not handled", event.id);
					}
				})
				.menu(&menu)
				.tooltip("crystal")
				.show_menu_on_left_click(false)
				.icon(app.default_window_icon().unwrap().clone())
				.build(app)?;

			let state = Arc::new(Mutex::new(Data::new()));
			app.manage(state.clone());

			let thread_state = state.clone();
			let app_handle = app.app_handle().clone();

			tauri::async_runtime::spawn(async move {
				loop {
					let mut state = thread_state.lock().await;

					if !state.connected {
						match state.connect(app_handle.clone()) {
							Ok(()) => {
								println!("Successfully connected to League client");
								state.connected = true;
								app_handle.emit("connection", true).unwrap();
							}
							Err(e) => println!("{}", e),
						}
					} else {
						if let Some(client) = &state.lcu_client {
							if let Err(_) = client.get::<String>("/riotclient/auth-token").await {
								println!("Lost connection to League client");
								state.connected = false;
								state.lcu_client = None;
								state.ws_client = None;
								app_handle.emit("connection", false).unwrap();
							}
						}
					}

					app_handle.tray_by_id("main").unwrap().set_tooltip(Some(format!("crystal | {}", if state.connected { "connected" } else { "disconnected" }))).unwrap();

					drop(state);
					tokio::time::sleep(Duration::from_secs(20)).await;
				}
			});

			Ok(())
		})
		.invoke_handler(tauri::generate_handler![lcu_request, get_connected, http_request])
		.run(tauri::generate_context!()).expect("error while running tauri application");
}

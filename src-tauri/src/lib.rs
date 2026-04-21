use irelia::ws::{ErrorHandler, Flow, LcuWebSocket, Subscriber, WebSocketError, types::EventKind};
use irelia::rest::LcuClient;
use std::{ops::ControlFlow, sync::Arc, time::Duration};
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

struct ManagedWsErrorHandler;

impl Subscriber for LcuEventHandler {
	fn on_event(&mut self, event: &irelia::ws::types::Event, _: &mut bool) {
		// println!(
		// 	"LCU websocket event [{}] {} {}",
		// 	self.event_name,
		// 	event.2.event_type,
		// 	event.2.uri
		// );
		// if self.event_name == "gameflow" {
		// 	println!("gameflow event: {:?}", event.2.data["map"]["gameModeName"]);
		// }
		let _ = self.app_handle.emit(self.event_name, event.2.clone());
	}
}

impl ErrorHandler for ManagedWsErrorHandler {
	fn on_error(&mut self, error: WebSocketError) -> ControlFlow<(), Flow> {
		eprintln!("LCU websocket error: {error}");
		ControlFlow::Break(())
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

	fn build_ws(app_handle: AppHandle) -> LcuWebSocket {
		println!("Creating LCU websocket worker and registering subscriptions");
		let mut ws_client = LcuWebSocket::new_with_error_handler(ManagedWsErrorHandler);
		ws_client.subscribe(
			EventKind::json_api_event_callback("/lol-champ-select/v1/session"),
			LcuEventHandler { app_handle: app_handle.clone(), event_name: "champ-select" },
		);
		ws_client.subscribe(
			EventKind::json_api_event_callback("/lol-gameflow/v1/session"),
			LcuEventHandler { app_handle: app_handle.clone(), event_name: "gameflow" },
		);
		ws_client
	}

	fn websocket_finished(&self) -> bool {
		self.ws_client.as_ref().map(|ws| ws.is_finished()).unwrap_or(true)
	}

	fn rebuild_websocket(&mut self, app_handle: AppHandle) {
		println!("Rebuilding LCU websocket subscriptions");
		if let Some(ws_client) = self.ws_client.take() {
			let _ = ws_client.abort();
		}
		self.ws_client = Some(Self::build_ws(app_handle));
	}

	fn disconnect(&mut self) {
		if let Some(ws_client) = self.ws_client.take() {
			let _ = ws_client.abort();
		}
		self.lcu_client = None;
		self.connected = false;
	}
}

// #[tauri::command]
// async fn lcu_request(state: State<'_, Arc<Mutex<Data>>>, method: String, path: String, body: Option<serde_json::Value>) -> Result<serde_json::Value, String> {
// 	let client = { state.lock().await.lcu_client.clone() };
//
// 	match client {
// 		Some(client) => match method.to_lowercase().as_str() {
// 			"get" => client.get(&path).await.map_err(|e| e.to_string()),
// 			"post" => client.post(&path, body.unwrap()).await.map_err(|e| e.to_string()),
// 			"put" => client.put(&path, body.unwrap()).await.map_err(|e| e.to_string()),
// 			_ => Err("Invalid method".to_string()),
// 		},
// 		None => Err("Not connected to League client".to_string()),
// 	}
// }

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
				let mut consecutive_health_check_failures = 0u8;
				const HEALTH_CHECK_FAILURE_THRESHOLD: u8 = 3;

				loop {
					let (connected, client, websocket_finished) = {
						let state = thread_state.lock().await;
						(state.connected, state.lcu_client.clone(), state.websocket_finished())
					};

					let mut tooltip_connected = connected;

					if !connected {
						match LcuClient::connect() {
							Ok(client) => {
								if let Err(e) = client.get::<serde_json::Value>("/lol-summoner/v1/current-summoner").await {
									tooltip_connected = false;
									println!("LCU client connected but health check failed: {}", e);
								} else {
									consecutive_health_check_failures = 0;
									println!("LCU REST client connected, starting websocket worker");
									let ws_client = Data::build_ws(app_handle.clone());
									let mut state = thread_state.lock().await;
									state.lcu_client = Some(client);
									state.ws_client = Some(ws_client);
									if !state.connected {
										println!("Successfully connected to League client");
										state.connected = true;
										tooltip_connected = true;
										let _ = app_handle.emit("connection", true);
									}
								}
							}
							Err(e) => {
								tooltip_connected = false;
								println!("{}", e);
							}
						}
					} else {
						let connection_lost = match client.clone() {
							Some(client) => client.get::<serde_json::Value>("/lol-summoner/v1/current-summoner").await.is_err(),
							None => true,
						};

						if connection_lost {
							consecutive_health_check_failures = consecutive_health_check_failures.saturating_add(1);
							if consecutive_health_check_failures < HEALTH_CHECK_FAILURE_THRESHOLD {
								println!(
									"LCU health check failed ({}/{}), waiting before refreshing client",
									consecutive_health_check_failures,
									HEALTH_CHECK_FAILURE_THRESHOLD
								);
								tooltip_connected = true;
							} else {
								consecutive_health_check_failures = 0;
								match LcuClient::connect() {
									Ok(fresh_client) => {
										println!("Refreshing LCU client after repeated failed health checks");
										let mut state = thread_state.lock().await;
										if state.connected {
											state.lcu_client = Some(fresh_client);
											if state.websocket_finished() {
												state.rebuild_websocket(app_handle.clone());
											} else {
												println!("LCU websocket still running; skipping rebuild");
											}
										let _ = app_handle.emit("lcu-refresh", true);
											tooltip_connected = true;
										}
									}
									Err(_) => {
										let mut state = thread_state.lock().await;
										if state.connected {
											println!("Lost connection to League client");
											state.disconnect();
											tooltip_connected = false;
											let _ = app_handle.emit("connection", false);
										}
									}
								}
							}
					} else {
						consecutive_health_check_failures = 0;
						tooltip_connected = true;
						if websocket_finished {
							println!("LCU websocket thread finished, rebuilding subscriptions");
							let mut state = thread_state.lock().await;
							if state.connected && state.websocket_finished() {
								state.rebuild_websocket(app_handle.clone());
									let _ = app_handle.emit("lcu-refresh", true);
							}
						}
					}
				}

				app_handle
					.tray_by_id("main")
					.unwrap()
					.set_tooltip(Some(format!("crystal | {}", if tooltip_connected { "connected" } else { "disconnected" })))
					.unwrap();

					tokio::time::sleep(Duration::from_secs(5)).await;
				}
			});

			Ok(())
		})
		.invoke_handler(tauri::generate_handler![lcu_request, get_connected, http_request])
		.run(tauri::generate_context!()).expect("error while running tauri application");
}

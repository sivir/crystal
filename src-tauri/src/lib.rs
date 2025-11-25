use irelia::ws::types::EventKind;
use irelia::ws::Subscriber;
use irelia::{rest::LcuClient, ws::LcuWebSocket};
use serde_derive::{Deserialize, Serialize};
use std::{sync::Arc, thread, time::Duration};
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Emitter, Manager, State,
};
use tokio::runtime::Runtime;
use tokio::sync::Mutex;

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
        struct ChampSelectEventHandler {
            app_handle: AppHandle,
        }

        impl Subscriber for ChampSelectEventHandler {
            fn on_event(&mut self, event: &irelia::ws::types::Event, _: &mut bool) {
                //println!("Champ select event: {:?}", event);
                self.app_handle
                    .emit("champ-select", event.2.clone())
                    .unwrap();
            }
        }

        struct GameflowEventHandler {
            app_handle: AppHandle,
        }

        impl Subscriber for GameflowEventHandler {
            fn on_event(&mut self, event: &irelia::ws::types::Event, _: &mut bool) {
                //println!("Gameflow event: {:?}", event);
                self.app_handle.emit("gameflow", event.2.clone()).unwrap();
            }
        }

        match LcuClient::connect() {
            Ok(client) => {
                self.lcu_client = Some(client);
                let mut ws_client = LcuWebSocket::new();
                ws_client.subscribe(
                    EventKind::json_api_event_callback("/lol-champ-select/v1/session"),
                    ChampSelectEventHandler {
                        app_handle: app_handle.clone(),
                    },
                );
                ws_client.subscribe(
                    EventKind::json_api_event_callback("/lol-gameflow/v1/session"),
                    GameflowEventHandler {
                        app_handle: app_handle.clone(),
                    },
                );
                self.ws_client = Some(ws_client);
                Ok(())
            }
            Err(e) => Err(e),
        }
    }
}

#[tauri::command]
async fn lcu_request(
    state: State<'_, Arc<Mutex<Data>>>,
    method: String,
    path: String,
    body: Option<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    let state = state.lock().await;

    match &state.lcu_client {
        Some(client) => match method.to_lowercase().as_str() {
            "get" => client.get(&path).await.map_err(|e| e.to_string()),
            "post" => client
                .post(&path, body.unwrap())
                .await
                .map_err(|e| e.to_string()),
            "put" => client
                .put(&path, body.unwrap())
                .await
                .map_err(|e| e.to_string()),
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

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RerollPoints {
    pub current_points: i64,
    pub max_rolls: i64,
    pub number_of_rolls: i64,
    pub points_cost_to_roll: i64,
    pub points_to_reroll: i64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CurrentSummoner {
    pub account_id: i64,
    pub display_name: String,
    pub game_name: String,
    pub internal_name: String,
    pub name_change_flag: bool,
    pub percent_complete_for_next_level: i64,
    pub privacy: String,
    pub profile_icon_id: i64,
    pub puuid: String,
    pub reroll_points: RerollPoints,
    pub summoner_id: i64,
    pub summoner_level: i64,
    pub tag_line: String,
    pub unnamed: bool,
    pub xp_since_last_level: i64,
    pub xp_until_next_level: i64,
}

#[tauri::command]
async fn get_connected(state: State<'_, Arc<Mutex<Data>>>) -> Result<bool, String> {
    Ok(state.lock().await.connected)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let main_window = app.get_window("main").unwrap();
            main_window.show().unwrap();
            main_window.set_focus().unwrap();
        }))
        .setup(|app| {
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app, "show", "Show/Hide", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&quit_i, &show_i])?;

            TrayIconBuilder::new()
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
                .show_menu_on_left_click(false)
                .icon(app.default_window_icon().unwrap().clone())
                .build(app)?;

            let state = Arc::new(Mutex::new(Data::new()));
            app.manage(state.clone());

            let thread_state = state.clone();
            let app_handle = app.app_handle().clone();
            let rt = Runtime::new().unwrap();
            thread::spawn(move || {
                rt.block_on(async {
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
                                if let Err(_) = client
                                    .get::<CurrentSummoner>("/lol-summoner/v1/current-summoner")
                                    .await
                                {
                                    println!("Lost connection to League client");
                                    state.connected = false;
                                    state.lcu_client = None;
                                    state.ws_client = None;
                                    app_handle.emit("connection", false).unwrap();
                                }
                            }
                        }

                        drop(state);
                        tokio::time::sleep(Duration::from_secs(5)).await;
                    }
                });
            });

            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            lcu_request,
            get_connected,
            http_request
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

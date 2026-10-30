#!/usr/bin/env python3
"""
BarberIA - Generador de Video Explicativo: Funcionalidad Agendar por Voz
Crea un video MP4 profesional (1080p) con locución neuronal, animaciones,
interfaz fiel a la app y subtítulos sincronizados.
"""

import os
import subprocess
import json
import time

BASE_DIR = "/home/develop/Escritorio/barberIA/video-agendar-por-voz"
ASSETS_DIR = os.path.join(BASE_DIR, "assets")
EDGE_TTS_BIN = "/home/develop/.local/bin/edge-tts"
VOICE = "es-CO-GonzaloNeural"  # Voz natural, clara y profesional

SCENES = [
    {
        "id": "scene1_intro",
        "title": "BarberIA: Agendar por Voz",
        "subtitle": "La forma más rápida de gestionar tus citas",
        "voice_text": "En la barbería, tus manos siempre están ocupadas con las tijeras y la máquina. Por eso, BarberIA cuenta con la función inteligente de agendar citas por voz.",
        "badge": "INNOVACIÓN PARA BARBEROS",
        "screen_type": "welcome"
    },
    {
        "id": "scene2_activation",
        "title": "Activación en un Solo Toque",
        "subtitle": "Micrófono siempre a tu alcance",
        "voice_text": "Para comenzar, solo tocas el botón del micrófono en la barra inferior, o seleccionas Cliente Casual si vas a registrar a quien ya está en tu sillón.",
        "badge": "PASO 1: ACTIVACIÓN",
        "screen_type": "main_list"
    },
    {
        "id": "scene3_dialog",
        "title": "Asistente Guiado por Voz",
        "subtitle": "Conversación inteligente paso a paso",
        "voice_text": "El asistente te habla en voz alta y te escucha. Te pide el nombre del cliente, la fecha, la hora y el valor del servicio, con una cuenta regresiva visible.",
        "badge": "PASO 2: CONVERSACIÓN",
        "screen_type": "voice_modal"
    },
    {
        "id": "scene4_resilience",
        "title": "Flexibilidad & Modo Teclado",
        "subtitle": "Se adapta al ritmo de tu barbería",
        "voice_text": "Si hay ruido de fondo o falla el micrófono, no te preocupes: puedes alternar al teclado al instante sin perder nada de lo que ya habías dicho.",
        "badge": "PASO 3: FLEXIBILIDAD",
        "screen_type": "text_fallback"
    },
    {
        "id": "scene5_review",
        "title": "Revisión y Confirmación",
        "subtitle": "Total control antes de agendar",
        "voice_text": "Al finalizar, revisas el resumen completo: cliente, fecha, hora y precio. Puedes editar cualquier detalle o confirmar para guardar la cita de inmediato.",
        "badge": "PASO 4: CONFIRMACIÓN",
        "screen_type": "review_modal"
    },
    {
        "id": "scene6_outro",
        "title": "BarberIA",
        "subtitle": "Menos tiempo en la pantalla, más tiempo para tu arte",
        "voice_text": "La cita queda programada y lista en tu agenda. Con BarberIA, agendar citas es tan simple y rápido como hablar.",
        "badge": "PRODUCTIVIDAD MÁXIMA",
        "screen_type": "final_result"
    }
]

def get_audio_duration(filepath):
    cmd = [
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", filepath
    ]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    return float(res.stdout.strip())

def generate_voiceovers():
    print("=== Generando locuciones con Edge TTS ===")
    for scene in SCENES:
        audio_file = os.path.join(ASSETS_DIR, f"{scene['id']}.mp3")
        cmd = [
            EDGE_TTS_BIN,
            "--voice", VOICE,
            "--text", scene["voice_text"],
            "--write-media", audio_file
        ]
        subprocess.run(cmd, check=True)
        duration = get_audio_duration(audio_file)
        scene["duration"] = duration + 1.2  # Margen de pausa natural
        scene["audio_file"] = audio_file
        print(f"[{scene['id']}] Audio generado: {duration:.2f}s -> Escena: {scene['duration']:.2f}s")

def get_html_for_scene(scene):
    st = scene["screen_type"]

    # Mockup content based on scene type
    phone_content = ""
    if st == "welcome":
        phone_content = """
        <div class="app-screen welcome-screen">
            <div class="logo-box">
                <div class="scissors-icon">✂️</div>
                <h1>Barber<span>IA</span></h1>
                <p>Gestión inteligente para tu barbería</p>
            </div>
            <div class="feature-card">
                <div class="mic-pulse-big">🎙️</div>
                <h3>Agendar por Voz</h3>
                <p>Control manos libres con Inteligencia Artificial</p>
            </div>
            <div class="status-pill">● Sistema listo</div>
        </div>
        """
    elif st == "main_list":
        phone_content = """
        <div class="app-screen appt-screen">
            <div class="app-header">
                <div class="header-top">
                    <span class="header-title">Citas de hoy</span>
                    <span class="user-pill">Barbería Elite</span>
                </div>
                <div class="day-nav-bar">
                    <button class="nav-btn">‹</button>
                    <div class="day-pill">
                        <span class="day-num">29</span>
                        <span class="day-mon">OCTUBRE</span>
                    </div>
                    <button class="nav-btn">›</button>
                    <div class="walk-in-btn pulse-glow">+ Casual</div>
                </div>
            </div>
            <div class="app-list">
                <div class="appt-card completed">
                    <div class="appt-card-top">
                        <span class="time">10:00 AM</span>
                        <span class="name">Mateo Rivera</span>
                        <span class="badge badge-success">Completada</span>
                    </div>
                    <div class="appt-card-bottom">
                        <span>Corte clásico + Barba</span>
                        <strong>$ 25.000</strong>
                    </div>
                </div>
                <div class="appt-card active">
                    <div class="appt-card-top">
                        <span class="time">11:30 AM</span>
                        <span class="name">Andrés Castro</span>
                        <span class="badge badge-warn">En curso</span>
                    </div>
                    <div class="appt-card-bottom">
                        <span>Degradado + Cejas</span>
                        <strong>$ 22.000</strong>
                    </div>
                </div>
                <div class="appt-card">
                    <div class="appt-card-top">
                        <span class="time">02:00 PM</span>
                        <span class="name">Daniel Mora</span>
                        <span class="badge badge-pending">Pendiente</span>
                    </div>
                    <div class="appt-card-bottom">
                        <span>Corte fade premium</span>
                        <strong>$ 20.000</strong>
                    </div>
                </div>
            </div>
            <div class="app-bottom-bar highlight-action">
                <div class="mic-callout">
                    <span>¡Toca aquí para agendar!</span>
                    <div class="arrow-down"></div>
                </div>
                <div class="bottom-actions">
                    <div class="action-btn mic-btn active-press">
                        <div class="mic-inner">🎙️</div>
                        <span>Hablar</span>
                    </div>
                    <div class="action-btn key-btn">
                        <div class="key-inner">⌨️</div>
                        <span>Escribir</span>
                    </div>
                </div>
            </div>
        </div>
        """
    elif st == "voice_modal":
        phone_content = """
        <div class="app-screen voice-modal-screen">
            <div class="modal-card">
                <div class="modal-status">
                    <span class="ai-badge">ASISTENTE ACTIVO</span>
                    <span class="close-btn">✕</span>
                </div>
                <div class="modal-question">
                    <span class="q-label">Pregunta del asistente:</span>
                    <h2 class="q-text">"¿Para qué fecha es la cita?"</h2>
                </div>
                <div class="voice-timer-box active">
                    <div class="sound-wave">
                        <span class="bar bar-1"></span>
                        <span class="bar bar-2"></span>
                        <span class="bar bar-3"></span>
                        <span class="bar bar-4"></span>
                        <span class="bar bar-5"></span>
                    </div>
                    <div class="timer-circle">8</div>
                    <span class="listening-text">Escuchando tu respuesta...</span>
                </div>
                <div class="captured-answer">
                    <span class="ans-label">Tu respuesta por voz:</span>
                    <p class="ans-text">"Para mañana viernes"</p>
                </div>
                <div class="steps-progress">
                    <div class="step-chip done">✓ Cliente: Juan Pérez</div>
                    <div class="step-chip current">● Fecha: Mañana</div>
                    <div class="step-chip">○ Hora</div>
                    <div class="step-chip">○ Precio</div>
                </div>
            </div>
        </div>
        """
    elif st == "text_fallback":
        phone_content = """
        <div class="app-screen text-mode-screen">
            <div class="modal-card">
                <div class="modal-status">
                    <span class="ai-badge text-mode-badge">MODO TEXTO / TECLADO</span>
                    <span class="close-btn">✕</span>
                </div>
                <div class="fallback-banner">
                    <span>🔇 ¿Ruido en el salón? Escribe tu respuesta</span>
                </div>
                <div class="modal-question">
                    <span class="q-label">Pregunta:</span>
                    <h2 class="q-text">"¿A qué hora será la cita?"</h2>
                </div>
                <div class="input-simulation-box">
                    <div class="input-field">
                        <span class="typed-text">4:00 PM</span>
                        <span class="cursor">|</span>
                    </div>
                    <button class="send-btn">Enviar ➔</button>
                </div>
                <div class="switch-back-bar">
                    <button class="btn-switch-voice">🎙️ Volver a hablar</button>
                    <span class="keep-data-note">✓ Los datos anteriores se conservan</span>
                </div>
                <div class="steps-progress">
                    <div class="step-chip done">✓ Cliente: Juan Pérez</div>
                    <div class="step-chip done">✓ Fecha: Mañana</div>
                    <div class="step-chip current">● Hora: 4:00 PM</div>
                    <div class="step-chip">○ Precio</div>
                </div>
            </div>
        </div>
        """
    elif st == "review_modal":
        phone_content = """
        <div class="app-screen review-screen">
            <div class="modal-card">
                <div class="modal-status">
                    <span class="ai-badge confirm-badge">VERIFICACIÓN FINAL</span>
                </div>
                <div class="review-title">
                    <h2>Revisa los datos de la cita</h2>
                    <p>Todo listo para registrar en el sistema</p>
                </div>
                <div class="summary-list">
                    <div class="summary-item">
                        <span class="icon">👤</span>
                        <div class="item-info">
                            <span class="label">CLIENTE</span>
                            <strong class="val">Juan Pérez</strong>
                        </div>
                    </div>
                    <div class="summary-item">
                        <span class="icon">📅</span>
                        <div class="item-info">
                            <span class="label">FECHA</span>
                            <strong class="val">Viernes, 30 de Octubre</strong>
                        </div>
                    </div>
                    <div class="summary-item">
                        <span class="icon">⏰</span>
                        <div class="item-info">
                            <span class="label">HORA</span>
                            <strong class="val">04:00 PM</strong>
                        </div>
                    </div>
                    <div class="summary-item highlight-price">
                        <span class="icon">💵</span>
                        <div class="item-info">
                            <span class="label">PRECIO DEL SERVICIO</span>
                            <strong class="val">$ 25.000 COP</strong>
                        </div>
                    </div>
                </div>
                <div class="review-buttons">
                    <button class="btn-confirm pulse-glow">✓ Confirmar Cita</button>
                    <button class="btn-edit">✎ Editar un dato</button>
                </div>
            </div>
        </div>
        """
    elif st == "final_result":
        phone_content = """
        <div class="app-screen appt-screen final-screen">
            <div class="success-banner">
                <div class="success-icon">✓</div>
                <div class="success-text">
                    <strong>¡Cita Agendada con Éxito!</strong>
                    <span>Registrada con el asistente por voz</span>
                </div>
            </div>
            <div class="app-list">
                <div class="appt-card new-created pulse-border">
                    <div class="appt-card-top">
                        <span class="time">04:00 PM</span>
                        <span class="name">Juan Pérez ⭐ NUEVA</span>
                        <span class="badge badge-pending">Agendada por Voz</span>
                    </div>
                    <div class="appt-card-bottom">
                        <span>Corte y estilizado</span>
                        <strong>$ 25.000</strong>
                    </div>
                    <div class="card-quick-actions">
                        <span class="act-btn">Completar</span>
                        <span class="act-btn">Reactivar</span>
                        <span class="act-btn cancel">Cancelar</span>
                    </div>
                </div>
            </div>
            <div class="brand-footer-card">
                <h3>BarberIA</h3>
                <p>Tu asistente inteligente en cada corte</p>
            </div>
        </div>
        """

    html = f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
* {{
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}}
body {{
    width: 1920px;
    height: 1080px;
    background: radial-gradient(circle at 75% 25%, #1e2638 0%, #0d111a 100%);
    color: #ffffff;
    display: flex;
    overflow: hidden;
    position: relative;
}}

/* Ambient Background Lights */
.bg-glow-1 {{
    position: absolute;
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(212, 175, 55, 0.15) 0%, transparent 70%);
    top: -100px;
    right: 200px;
    filter: blur(80px);
}}
.bg-glow-2 {{
    position: absolute;
    width: 700px;
    height: 700px;
    background: radial-gradient(circle, rgba(37, 99, 235, 0.2) 0%, transparent 70%);
    bottom: -150px;
    left: 100px;
    filter: blur(100px);
}}

/* Left Info Column */
.info-col {{
    width: 980px;
    height: 100%;
    padding: 100px 90px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    z-index: 10;
}}
.top-brand {{
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 28px;
}}
.brand-badge {{
    background: linear-gradient(135deg, #d4af37 0%, #aa820a 100%);
    color: #0b0e14;
    font-weight: 800;
    font-size: 13px;
    letter-spacing: 2px;
    padding: 6px 14px;
    border-radius: 20px;
    text-transform: uppercase;
}}
.app-name-tag {{
    font-size: 20px;
    font-weight: 700;
    letter-spacing: 1px;
    color: #e2e8f0;
}}
.app-name-tag span {{
    color: #d4af37;
}}
.scene-title {{
    font-size: 56px;
    font-weight: 800;
    line-height: 1.15;
    margin-bottom: 20px;
    background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}}
.scene-subtitle {{
    font-size: 26px;
    color: #d4af37;
    font-weight: 600;
    margin-bottom: 35px;
}}
.scene-script-card {{
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-left: 5px solid #d4af37;
    padding: 26px 30px;
    border-radius: 16px;
    font-size: 22px;
    line-height: 1.5;
    color: #f1f5f9;
    box-shadow: 0 20px 40px rgba(0,0,0,0.4);
}}
.feature-highlights {{
    display: flex;
    gap: 16px;
    margin-top: 35px;
}}
.highlight-pill {{
    background: rgba(30, 41, 59, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 10px 18px;
    border-radius: 30px;
    font-size: 16px;
    font-weight: 500;
    color: #94a3b8;
    display: flex;
    align-items: center;
    gap: 8px;
}}
.highlight-pill strong {{
    color: #38bdf8;
}}

/* Right Phone Mockup Column */
.phone-col {{
    width: 940px;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
}}
.phone-mockup {{
    width: 440px;
    height: 890px;
    background: #0b0f19;
    border-radius: 54px;
    border: 8px solid #2a3447;
    box-shadow: 0 35px 80px rgba(0, 0, 0, 0.8), 0 0 40px rgba(212, 175, 55, 0.2);
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}}
.phone-camera {{
    position: absolute;
    top: 14px;
    left: 50%;
    transform: translateX(-50%);
    width: 120px;
    height: 25px;
    background: #182030;
    border-radius: 20px;
    z-index: 999;
}}

/* Inner Screen Layouts */
.app-screen {{
    width: 100%;
    height: 100%;
    background: #0f172a;
    display: flex;
    flex-direction: column;
    padding-top: 45px;
}}

/* Welcome screen */
.welcome-screen {{
    justify-content: center;
    align-items: center;
    text-align: center;
    padding: 50px 30px;
    background: linear-gradient(180deg, #111827 0%, #0b0f17 100%);
}}
.logo-box .scissors-icon {{
    font-size: 60px;
    margin-bottom: 15px;
    filter: drop-shadow(0 0 20px rgba(212, 175, 55, 0.6));
}}
.logo-box h1 {{
    font-size: 44px;
    font-weight: 900;
    letter-spacing: 2px;
}}
.logo-box h1 span {{ color: #d4af37; }}
.logo-box p {{
    color: #94a3b8;
    font-size: 16px;
    margin-top: 8px;
}}
.feature-card {{
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(212, 175, 55, 0.3);
    border-radius: 24px;
    padding: 35px 25px;
    margin: 45px 0 25px 0;
    width: 100%;
}}
.mic-pulse-big {{
    font-size: 55px;
    margin-bottom: 15px;
    filter: drop-shadow(0 0 25px #d4af37);
}}
.feature-card h3 {{
    font-size: 24px;
    color: #f8fafc;
    margin-bottom: 8px;
}}
.feature-card p {{
    color: #94a3b8;
    font-size: 15px;
}}
.status-pill {{
    color: #22c55e;
    font-size: 14px;
    font-weight: 600;
}}

/* Main List Screen */
.appt-screen {{
    padding: 45px 20px 20px 20px;
}}
.app-header {{
    margin-bottom: 18px;
}}
.header-top {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
}}
.header-title {{
    font-size: 22px;
    font-weight: 800;
    color: #f1f5f9;
}}
.user-pill {{
    font-size: 12px;
    background: rgba(212, 175, 55, 0.15);
    color: #d4af37;
    padding: 4px 10px;
    border-radius: 12px;
    font-weight: 600;
}}
.day-nav-bar {{
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #1e293b;
    padding: 8px 12px;
    border-radius: 16px;
}}
.nav-btn {{
    background: transparent;
    border: none;
    color: #94a3b8;
    font-size: 22px;
    cursor: pointer;
}}
.day-pill {{
    text-align: center;
}}
.day-num {{
    font-size: 20px;
    font-weight: 800;
    color: #ffffff;
    display: block;
}}
.day-mon {{
    font-size: 11px;
    letter-spacing: 1px;
    color: #d4af37;
    font-weight: 700;
}}
.walk-in-btn {{
    background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
    color: #ffffff;
    padding: 6px 12px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 700;
}}

.app-list {{
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    gap: 12px;
}}
.appt-card {{
    background: #1e293b;
    border-radius: 18px;
    padding: 16px;
    border-left: 4px solid #38bdf8;
}}
.appt-card.completed {{ border-left-color: #22c55e; opacity: 0.8; }}
.appt-card.active {{ border-left-color: #f59e0b; background: #243046; }}
.appt-card-top {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
}}
.appt-card-top .time {{
    font-size: 13px;
    color: #94a3b8;
    font-weight: 600;
}}
.appt-card-top .name {{
    font-size: 16px;
    font-weight: 700;
    color: #ffffff;
}}
.badge {{
    font-size: 11px;
    padding: 3px 8px;
    border-radius: 10px;
    font-weight: 600;
}}
.badge-success {{ background: rgba(34, 197, 94, 0.2); color: #4ade80; }}
.badge-warn {{ background: rgba(245, 158, 11, 0.2); color: #fbbf24; }}
.badge-pending {{ background: rgba(56, 189, 248, 0.2); color: #38bdf8; }}

.appt-card-bottom {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
    color: #cbd5e1;
}}
.appt-card-bottom strong {{
    color: #d4af37;
    font-size: 15px;
}}

/* Bottom Bar & Mic CTA */
.app-bottom-bar {{
    position: relative;
    padding-top: 25px;
    border-top: 1px solid #1e293b;
}}
.mic-callout {{
    position: absolute;
    top: -24px;
    left: 20px;
    background: #d4af37;
    color: #000;
    font-size: 12px;
    font-weight: 800;
    padding: 4px 10px;
    border-radius: 8px;
}}
.bottom-actions {{
    display: flex;
    justify-content: space-around;
    align-items: center;
    background: #1e293b;
    padding: 10px 20px;
    border-radius: 24px;
}}
.action-btn {{
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: #94a3b8;
}}
.mic-btn.active-press .mic-inner {{
    width: 60px;
    height: 60px;
    background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    box-shadow: 0 0 25px rgba(239, 68, 68, 0.8);
    transform: translateY(-10px);
}}
.key-inner {{
    width: 44px;
    height: 44px;
    background: #334155;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
}}

/* Voice Modal Screen */
.voice-modal-screen {{
    padding: 50px 20px 25px 20px;
    background: radial-gradient(circle at 50% 30%, #1e293b 0%, #0b0f19 100%);
}}
.modal-card {{
    display: flex;
    flex-direction: column;
    height: 100%;
}}
.modal-status {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}}
.ai-badge {{
    background: rgba(212, 175, 55, 0.2);
    border: 1px solid #d4af37;
    color: #d4af37;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 1.5px;
    padding: 4px 10px;
    border-radius: 12px;
}}
.close-btn {{
    color: #64748b;
    font-size: 18px;
}}
.modal-question {{
    margin-bottom: 24px;
}}
.q-label {{
    font-size: 12px;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 1px;
}}
.q-text {{
    font-size: 24px;
    font-weight: 800;
    color: #ffffff;
    margin-top: 6px;
    line-height: 1.3;
}}

.voice-timer-box {{
    background: #182234;
    border-radius: 24px;
    padding: 30px 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 24px;
    border: 1px solid rgba(239, 68, 68, 0.4);
}}
.sound-wave {{
    display: flex;
    align-items: center;
    gap: 6px;
    height: 40px;
    margin-bottom: 15px;
}}
.sound-wave .bar {{
    width: 6px;
    background: #ef4444;
    border-radius: 6px;
}}
.bar-1 {{ height: 16px; }}
.bar-2 {{ height: 36px; }}
.bar-3 {{ height: 26px; }}
.bar-4 {{ height: 40px; }}
.bar-5 {{ height: 20px; }}

.timer-circle {{
    width: 70px;
    height: 70px;
    border-radius: 50%;
    border: 4px solid #ef4444;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
    font-weight: 900;
    color: #ef4444;
    margin-bottom: 10px;
    box-shadow: 0 0 20px rgba(239, 68, 68, 0.4);
}}
.listening-text {{
    color: #f87171;
    font-size: 14px;
    font-weight: 600;
}}

.captured-answer {{
    background: rgba(255, 255, 255, 0.05);
    border-radius: 16px;
    padding: 16px;
    margin-bottom: 20px;
}}
.ans-label {{
    font-size: 11px;
    color: #94a3b8;
    text-transform: uppercase;
}}
.ans-text {{
    font-size: 18px;
    color: #38bdf8;
    font-weight: 700;
    margin-top: 4px;
}}
.steps-progress {{
    margin-top: auto;
    display: flex;
    flex-direction: column;
    gap: 8px;
}}
.step-chip {{
    font-size: 13px;
    padding: 8px 14px;
    border-radius: 10px;
    background: #1e293b;
    color: #94a3b8;
}}
.step-chip.done {{
    background: rgba(34, 197, 94, 0.15);
    color: #4ade80;
    font-weight: 600;
}}
.step-chip.current {{
    background: rgba(56, 189, 248, 0.2);
    color: #38bdf8;
    font-weight: 700;
    border: 1px solid #38bdf8;
}}

/* Text Fallback Screen */
.text-mode-screen {{
    padding: 50px 20px 25px 20px;
    background: #0f172a;
}}
.text-mode-badge {{
    background: rgba(56, 189, 248, 0.2);
    border-color: #38bdf8;
    color: #38bdf8;
}}
.fallback-banner {{
    background: rgba(245, 158, 11, 0.15);
    border: 1px solid #f59e0b;
    color: #fef3c7;
    padding: 10px 14px;
    border-radius: 12px;
    font-size: 13px;
    margin-bottom: 20px;
}}
.input-simulation-box {{
    display: flex;
    gap: 8px;
    margin-bottom: 20px;
}}
.input-field {{
    flex: 1;
    background: #1e293b;
    border: 2px solid #38bdf8;
    border-radius: 14px;
    padding: 12px 16px;
    display: flex;
    align-items: center;
    font-size: 18px;
    font-weight: 700;
    color: #ffffff;
}}
.cursor {{
    color: #38bdf8;
    font-weight: 300;
    margin-left: 2px;
}}
.send-btn {{
    background: #38bdf8;
    color: #0b0f19;
    border: none;
    border-radius: 14px;
    padding: 0 18px;
    font-weight: 800;
    font-size: 14px;
}}
.switch-back-bar {{
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 20px;
}}
.btn-switch-voice {{
    background: rgba(239, 68, 68, 0.15);
    border: 1px solid #ef4444;
    color: #f87171;
    padding: 10px;
    border-radius: 12px;
    font-weight: 700;
    font-size: 13px;
}}
.keep-data-note {{
    font-size: 12px;
    color: #4ade80;
    text-align: center;
}}

/* Review Screen */
.review-screen {{
    padding: 50px 20px 25px 20px;
}}
.confirm-badge {{
    background: rgba(34, 197, 94, 0.2);
    border-color: #22c55e;
    color: #4ade80;
}}
.review-title {{
    margin-bottom: 20px;
}}
.review-title h2 {{
    font-size: 22px;
    font-weight: 800;
    color: #ffffff;
}}
.review-title p {{
    font-size: 13px;
    color: #94a3b8;
    margin-top: 4px;
}}
.summary-list {{
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 24px;
}}
.summary-item {{
    background: #1e293b;
    border-radius: 14px;
    padding: 12px 16px;
    display: flex;
    align-items: center;
    gap: 14px;
}}
.summary-item .icon {{
    font-size: 22px;
}}
.summary-item .item-info .label {{
    font-size: 10px;
    letter-spacing: 1px;
    color: #94a3b8;
    display: block;
}}
.summary-item .item-info .val {{
    font-size: 16px;
    color: #ffffff;
}}
.summary-item.highlight-price {{
    border: 1px solid rgba(212, 175, 55, 0.4);
    background: rgba(212, 175, 55, 0.1);
}}
.summary-item.highlight-price .val {{
    color: #d4af37;
    font-size: 18px;
    font-weight: 800;
}}
.review-buttons {{
    margin-top: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
}}
.btn-confirm {{
    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
    color: #ffffff;
    border: none;
    border-radius: 14px;
    padding: 16px;
    font-size: 16px;
    font-weight: 800;
    box-shadow: 0 10px 25px rgba(34, 197, 94, 0.4);
}}
.btn-edit {{
    background: transparent;
    border: 1px solid #475569;
    color: #cbd5e1;
    border-radius: 14px;
    padding: 12px;
    font-size: 14px;
    font-weight: 600;
}}

/* Final Result Screen */
.final-screen {{
    padding: 50px 20px 25px 20px;
    display: flex;
    flex-direction: column;
}}
.success-banner {{
    background: linear-gradient(135deg, #15803d 0%, #166534 100%);
    border-radius: 18px;
    padding: 18px;
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 24px;
    box-shadow: 0 15px 30px rgba(22, 101, 52, 0.4);
}}
.success-icon {{
    width: 44px;
    height: 44px;
    background: #ffffff;
    color: #15803d;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    font-weight: 900;
}}
.success-text strong {{
    font-size: 16px;
    display: block;
}}
.success-text span {{
    font-size: 12px;
    color: #dcfce7;
}}
.new-created {{
    border-left: 4px solid #22c55e !important;
    background: #1e3329 !important;
}}
.pulse-border {{
    box-shadow: 0 0 25px rgba(34, 197, 94, 0.4);
}}
.card-quick-actions {{
    display: flex;
    gap: 8px;
    margin-top: 14px;
    padding-top: 10px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
}}
.act-btn {{
    font-size: 11px;
    background: rgba(255, 255, 255, 0.08);
    padding: 4px 10px;
    border-radius: 8px;
    color: #94a3b8;
}}
.act-btn.cancel {{
    color: #f87171;
}}
.brand-footer-card {{
    margin-top: auto;
    text-align: center;
    padding: 20px;
}}
.brand-footer-card h3 {{
    font-size: 20px;
    font-weight: 800;
    color: #d4af37;
}}
.brand-footer-card p {{
    font-size: 13px;
    color: #64748b;
    margin-top: 4px;
}}

/* Utility Animations & Glows */
.pulse-glow {{
    animation: glowPulse 2s infinite alternate;
}}
@keyframes glowPulse {{
    0% {{ box-shadow: 0 0 10px rgba(212, 175, 55, 0.3); }}
    100% {{ box-shadow: 0 0 25px rgba(212, 175, 55, 0.7); }}
}}
</style>
</head>
<body>
    <div class="bg-glow-1"></div>
    <div class="bg-glow-2"></div>

    <div class="info-col">
        <div class="top-brand">
            <span class="brand-badge">{scene["badge"]}</span>
            <span class="app-name-tag">Barber<span>IA</span> Mobile</span>
        </div>
        <h1 class="scene-title">{scene["title"]}</h1>
        <h3 class="scene-subtitle">{scene["subtitle"]}</h3>
        <div class="scene-script-card">
            "{scene["voice_text"]}"
        </div>
        <div class="feature-highlights">
            <div class="highlight-pill">🎙️ <strong>Manos Libres</strong></div>
            <div class="highlight-pill">⚡ <strong>Rápido y Preciso</strong></div>
            <div class="highlight-pill">🤖 <strong>IA Conversacional</strong></div>
        </div>
    </div>

    <div class="phone-col">
        <div class="phone-mockup">
            <div class="phone-camera"></div>
            {phone_content}
        </div>
    </div>
</body>
</html>
"""
    return html

def render_scene_images():
    print("=== Renderizando imágenes de escenas con Google Chrome headless ===")
    for scene in SCENES:
        html_content = get_html_for_scene(scene)
        html_file = os.path.join(ASSETS_DIR, f"{scene['id']}.html")
        png_file = os.path.join(ASSETS_DIR, f"{scene['id']}.png")

        with open(html_file, "w", encoding="utf-8") as f:
            f.write(html_content)

        cmd = [
            "google-chrome",
            "--headless=new",
            "--disable-gpu",
            "--window-size=1920,1080",
            f"--screenshot={png_file}",
            html_file
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        scene["png_file"] = png_file
        print(f"[{scene['id']}] Frame 1080p generado -> {png_file}")

def generate_background_music(total_duration):
    """Genera una pista de audio ambiental agradable y moderna con síntesis pura en ffmpeg."""
    music_file = os.path.join(ASSETS_DIR, "bg_music.mp3")
    print(f"=== Generando música de fondo ambiental ({total_duration:.1f}s) ===")
    cmd = [
        "ffmpeg", "-y", "-f", "lavfi",
        f"-i", f"sine=frequency=220:sample_rate=44100:duration={total_duration}",
        "-f", "lavfi",
        f"-i", f"sine=frequency=330:sample_rate=44100:duration={total_duration}",
        "-filter_complex",
        f"[0:a][1:a]amix=inputs=2:weights=0.5 0.3,lowpass=f=400,volume=0.08,afade=t=in:ss=0:d=2,afade=t=out:st={total_duration-3}:d=3[out]",
        "-map", "[out]",
        "-ac", "2",
        music_file
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return music_file

def create_scene_videos():
    print("=== Creando clips de video individuales con ffmpeg ===")
    scene_videos = []
    for scene in SCENES:
        dur = scene["duration"]
        video_out = os.path.join(ASSETS_DIR, f"{scene['id']}.mp4")

        # Filtro de sutil movimiento tipo zoom in para dinamismo cinematográfico
        vf = f"zoompan=z='min(zoom+0.0004,1.03)':d={int(dur*30)}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=30"

        cmd = [
            "ffmpeg", "-y",
            "-loop", "1", "-i", scene["png_file"],
            "-i", scene["audio_file"],
            "-vf", vf,
            "-c:v", "libx264", "-tune", "stillimage", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "192k",
            "-t", str(dur),
            video_out
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        scene["video_file"] = video_out
        scene_videos.append(video_out)
        print(f"[{scene['id']}] Video escena creado ({dur:.2f}s) -> {video_out}")
    return scene_videos

def concat_videos_and_add_music():
    print("=== Concatenando escenas y mezclando música final ===")
    concat_list = os.path.join(ASSETS_DIR, "concat_list.txt")
    with open(concat_list, "w") as f:
        for scene in SCENES:
            f.write(f"file '{scene['video_file']}'\n")

    unmixed_video = os.path.join(ASSETS_DIR, "video_unmixed.mp4")
    cmd_concat = [
        "ffmpeg", "-y",
        "-f", "concat", "-safe", "0",
        "-i", concat_list,
        "-c", "copy",
        unmixed_video
    ]
    subprocess.run(cmd_concat, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    total_dur = get_audio_duration(unmixed_video)
    bg_music = generate_background_music(total_dur)

    final_output = os.path.join(BASE_DIR, "BarberIA_Agendar_Por_Voz.mp4")

    # Mezcla del audio de voz con la música de fondo ambiental
    cmd_final = [
        "ffmpeg", "-y",
        "-i", unmixed_video,
        "-i", bg_music,
        "-filter_complex",
        "[0:a][1:a]amix=inputs=2:duration=first:weights=1.0 0.25[aout]",
        "-map", "0:v",
        "-map", "[aout]",
        "-c:v", "copy",
        "-c:a", "aac", "-b:a", "192k",
        final_output
    ]
    subprocess.run(cmd_final, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    final_size_mb = os.path.getsize(final_output) / (1024 * 1024)
    print(f"\n=======================================================")
    print(f"✅ VIDEO FINAL GENERADO EXITOSAMENTE:")
    print(f"   Ruta: {final_output}")
    print(f"   Duración: {total_dur:.1f} segundos")
    print(f"   Tamaño: {final_size_mb:.2f} MB")
    print(f"   Resolución: 1920x1080 Full HD (30 fps)")
    print(f"=======================================================\n")
    return final_output

def main():
    start_time = time.time()
    generate_voiceovers()
    render_scene_images()
    create_scene_videos()
    output_path = concat_videos_and_add_music()
    elapsed = time.time() - start_time
    print(f"Proceso completado en {elapsed:.1f}s")

if __name__ == "__main__":
    main()
